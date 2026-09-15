from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
import logging

from config.permissions import IsStandardUser
from .services import chat_with_trainer, generate_routine
from routines.models import Routine, RoutineDay, RoutineExercise
from routines.serializers import RoutineSerializer
from workouts.models import Workout

logger = logging.getLogger(__name__) 


def workout_history_summary(user, limit=4, max_chars=1500):
    workouts = (
        Workout.objects.filter(user=user, status=Workout.Status.FINISHED)
        .prefetch_related('exercises__set_instances')
        .order_by('-finished_at')[:limit]
    )
    lines = []
    for workout in workouts:
        when = (workout.finished_at or workout.date).date()
        entries = []
        for exercise in workout.exercises.all():
            done = [s for s in exercise.set_instances.all() if s.completed_at]
            if not done:
                continue
            sets_desc = ', '.join(
                f"{s.reps or 0} reps" + (f' x {s.weight} kg' if s.weight is not None else '')
                for s in done
            )
            entries.append(f"{exercise.name} ({sets_desc})")
        if entries:
            lines.append(f"- {when} «{workout.name}»: " + '; '.join(entries))
    return '\n'.join(lines)[:max_chars]


@method_decorator(ratelimit(key='user', rate='20/m', method='POST', block=True), name='post')
class ChatView(APIView):
    permission_classes = [IsAuthenticated, IsStandardUser]

    def post(self, request):
        messages = request.data.get('messages', [])
        if not isinstance(messages, list) or not messages:
            return Response({'detail': 'messages es requerido y debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reply = chat_with_trainer(messages, workout_history_summary(request.user))
            return Response({'reply': reply})
        except RuntimeError as exc:
            logger.error('Chat service error: %s', exc)
            return Response({'detail': 'El asistente no está disponible en este momento. Intentá de nuevo.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            logger.error('Chat unexpected error: %s', exc, exc_info=True)
            return Response({'detail': 'Ocurrió un error inesperado en el asistente. Intentá de nuevo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(ratelimit(key='user', rate='10/h', method='POST', block=True), name='post')
class GenerateRoutineView(APIView):
    permission_classes = [IsAuthenticated, IsStandardUser]

    def post(self, request):
        preferences = request.data.get('preferences', {})
        required = ['goal', 'days_per_week', 'minutes_per_session', 'equipment', 'split_style']
        missing = [field for field in required if not preferences.get(field)]
        if missing:
            return Response({'detail': f'Faltan campos requeridos: {", ".join(missing)}.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
        profile_data = {
            'age': profile.age,
            'weight': str(profile.weight) if profile.weight else None,
            'height': str(profile.height) if profile.height else None,
            'gender': profile.get_gender_display() if profile.gender else None,
            'experience': profile.get_experience_display() if profile.experience else None,
            'injuries': preferences.get('injuries') or 'ninguna',
        }

        if Routine.objects.filter(user=request.user).count() >= Routine.MAX_PER_USER:
            return Response(
                {'detail': f'Alcanzaste el límite de {Routine.MAX_PER_USER} rutinas. Eliminá una para crear otra.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = generate_routine(profile_data, preferences)
            routine_data = result['routine']

            with transaction.atomic():
                locked_count = sum(1 for _ in Routine.objects.filter(user=request.user).select_for_update().values_list('id', flat=True))
                if locked_count >= Routine.MAX_PER_USER:
                    return Response(
                        {'detail': f'Alcanzaste el límite de {Routine.MAX_PER_USER} rutinas. Eliminá una para crear otra.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                routine = Routine.objects.create(
                    user=request.user,
                    name=routine_data.get('name', 'Rutina IA'),
                    focus=routine_data.get('focus', ''),
                    days_per_week=routine_data.get('days_per_week', preferences['days_per_week']),
                    estimated_duration_minutes=routine_data.get('estimated_duration_minutes', preferences['minutes_per_session']),
                    source=Routine.Source.AI,
                )
                for day_data in routine_data.get('days', []):
                    day = RoutineDay.objects.create(
                        routine=routine,
                        day_name=day_data.get('day_name', ''),
                        muscle_groups=', '.join(day_data['muscle_groups']) if isinstance(day_data.get('muscle_groups'), list) else day_data.get('muscle_groups', ''),
                        order=day_data.get('order', 0),
                    )
                    for exercise_data in day_data.get('exercises', []):
                        RoutineExercise.objects.create(
                            routine_day=day,
                            name=exercise_data.get('name', ''),
                            description=exercise_data.get('description', ''),
                            sets=exercise_data.get('sets', 3),
                            reps=exercise_data.get('reps', 10),
                            rest_seconds=exercise_data.get('rest_seconds', 60),
                            weight=exercise_data.get('weight'),
                            notes=exercise_data.get('notes', ''),
                            order=exercise_data.get('order', 0),
                        )

            return Response({
                'message': result['message'],
                'routine_id': routine.id,
                'routine': RoutineSerializer(routine).data,
            })
        except ValueError as exc:
            logger.error('Generate routine validation error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        except RuntimeError as exc:
            logger.error('Generate routine service error: %s', exc)
            return Response({'detail': 'El generador de rutinas no está disponible en este momento. Intentá de nuevo.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            logger.error('Generate routine unexpected error: %s', exc, exc_info=True)
            return Response({'detail': 'Ocurrió un error inesperado al generar la rutina. Intentá de nuevo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
