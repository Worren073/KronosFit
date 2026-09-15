from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from calendar import monthrange
from config.permissions import IsOwner, IsStandardUser
from .models import Workout, Exercise, ExerciseSet, SESSION_TTL_HOURS
from .serializers import WorkoutSerializer, ExerciseSerializer, ExerciseSetSerializer
from routines.models import Routine, RoutineDay


def _purge_expired_workouts(user):
    cutoff = timezone.now() - timezone.timedelta(hours=SESSION_TTL_HOURS)
    Workout.objects.filter(
        user=user,
        status=Workout.Status.IN_PROGRESS,
        date__lt=cutoff,
    ).delete()


class WorkoutViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner, IsStandardUser]

    def get_queryset(self):
        _purge_expired_workouts(self.request.user)
        return Workout.objects.filter(user=self.request.user).order_by('-date')

    def create(self, request, *args, **kwargs):
        return Response(
            {'detail': 'No se puede crear entrenamientos manualmente.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {'detail': 'No se puede editar entrenamientos del historial.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return Response(
            {'detail': 'No se puede editar entrenamientos del historial.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        workout = self.get_object()
        if workout.status != Workout.Status.IN_PROGRESS:
            return Response(
                {'detail': 'El historial es de solo lectura.'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='start-from-routine-day')
    def start_from_routine_day(self, request):
        _purge_expired_workouts(request.user)
        routine_id = request.data.get('routine_id')
        day_id = request.data.get('day_id')
        force = request.data.get('force') is True
        routine = get_object_or_404(Routine, id=routine_id, user=request.user)
        day = get_object_or_404(RoutineDay, id=day_id, routine=routine)

        active = Workout.objects.filter(user=request.user, status=Workout.Status.IN_PROGRESS).first()
        if active and not force:
            return Response(
                {'detail': 'Ya tenés un entrenamiento en progreso.', 'active_workout_id': active.id},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            if active:
                active.delete()
            workout = Workout.objects.create(
                user=request.user,
                created_by=request.user,
                name=f'{routine.name} - {day.day_name}',
                duration_minutes=routine.estimated_duration_minutes,
                notes='',
                status=Workout.Status.IN_PROGRESS,
            )

            for exercise in day.exercises.all().order_by('order', 'id'):
                ex = Exercise.objects.create(
                    workout=workout,
                    name=exercise.name,
                    description=exercise.description,
                    sets=exercise.sets,
                    reps=exercise.reps,
                    rest_seconds=exercise.rest_seconds,
                    weight=exercise.weight,
                )
                for i in range(1, exercise.sets + 1):
                    ExerciseSet.objects.create(exercise=ex, set_number=i)

        serializer = WorkoutSerializer(workout)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        _purge_expired_workouts(request.user)
        workout = Workout.objects.filter(user=request.user, status=Workout.Status.IN_PROGRESS).first()
        if not workout:
            return Response({'active': None})
        return Response({'active': WorkoutSerializer(workout).data})

    @action(detail=True, methods=['post'], url_path='complete-set')
    def complete_set(self, request, pk=None):
        workout = self.get_object()
        if workout.status != Workout.Status.IN_PROGRESS:
            return Response(
                {'detail': 'El entrenamiento no está en progreso.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exercise_id = request.data.get('exercise_id')
        set_id = request.data.get('set_id')
        reps = request.data.get('reps')
        weight = request.data.get('weight')

        if reps is None or str(reps).strip() == '':
            return Response({'detail': 'reps es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            reps_int = int(reps)
        except (TypeError, ValueError):
            return Response({'detail': 'reps debe ser un entero.'}, status=status.HTTP_400_BAD_REQUEST)
        if reps_int < 1:
            return Response({'detail': 'reps debe ser al menos 1.'}, status=status.HTTP_400_BAD_REQUEST)

        if weight is None or str(weight).strip() == '':
            return Response({'detail': 'weight es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            weight_dec = float(weight)
        except (TypeError, ValueError):
            return Response({'detail': 'weight debe ser un número.'}, status=status.HTTP_400_BAD_REQUEST)
        if weight_dec < 0:
            return Response({'detail': 'weight debe ser mayor o igual a 0.'}, status=status.HTTP_400_BAD_REQUEST)

        exercise = get_object_or_404(
            Exercise,
            id=exercise_id,
            workout__id=pk,
            workout__user=request.user,
        )
        exercise_set = get_object_or_404(
            ExerciseSet,
            id=set_id,
            exercise=exercise,
        )
        exercise_set.reps = reps_int
        exercise_set.weight = weight_dec
        exercise_set.completed_at = timezone.now()
        exercise_set.save()

        serializer = ExerciseSetSerializer(exercise_set)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='finish')
    def finish(self, request, pk=None):
        workout = self.get_object()
        duration = request.data.get('duration_minutes')

        if workout.status == Workout.Status.FINISHED:
            return Response(WorkoutSerializer(workout).data)

        if duration is not None:
            try:
                duration = int(duration)
            except (TypeError, ValueError):
                return Response({'detail': 'duration_minutes debe ser un entero.'}, status=status.HTTP_400_BAD_REQUEST)
            if duration < 1:
                return Response({'detail': 'duration_minutes debe ser al menos 1.'}, status=status.HTTP_400_BAD_REQUEST)
            workout.duration_minutes = duration

        workout.status = Workout.Status.FINISHED
        workout.finished_at = timezone.now()
        workout.save()
        serializer = WorkoutSerializer(workout)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        _, last_day = monthrange(year, month)
        workouts = Workout.objects.filter(
            user=request.user,
            date__year=year,
            date__month=month,
        )
        data = {}
        for workout in workouts:
            day = workout.date.day
            data.setdefault(day, []).append({
                'id': workout.id,
                'name': workout.name,
                'duration_minutes': workout.duration_minutes,
            })
        return Response({
            'year': year,
            'month': month,
            'days': data,
        })


class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated, IsStandardUser]

    def get_queryset(self):
        return Exercise.objects.filter(workout__user=self.request.user)

    def create(self, request, *args, **kwargs):
        return Response(
            {'detail': 'No se puede agregar ejercicios a entrenamientos del historial.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'El historial es de solo lectura.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
