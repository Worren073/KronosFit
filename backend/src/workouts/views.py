from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from calendar import monthrange
from config.permissions import IsOwner, IsStandardUser
from .models import Workout, Exercise, ExerciseSet
from .serializers import WorkoutSerializer, ExerciseSerializer, ExerciseSetSerializer
from routines.models import Routine, RoutineDay


class WorkoutViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner, IsStandardUser]

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, created_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='start-from-routine-day')
    def start_from_routine_day(self, request):
        routine_id = request.data.get('routine_id')
        day_id = request.data.get('day_id')
        routine = get_object_or_404(Routine, id=routine_id, user=request.user)
        day = get_object_or_404(RoutineDay, id=day_id, routine=routine)

        with transaction.atomic():
            workout = Workout.objects.create(
                user=request.user,
                created_by=request.user,
                name=f'{routine.name} - {day.day_name}',
                duration_minutes=routine.estimated_duration_minutes,
                notes='',
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

    @action(detail=True, methods=['post'], url_path='complete-set')
    def complete_set(self, request, pk=None):
        exercise_id = request.data.get('exercise_id')
        set_id = request.data.get('set_id')
        reps = request.data.get('reps')
        weight = request.data.get('weight')

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
        exercise_set.reps = reps
        exercise_set.weight = weight
        exercise_set.completed_at = timezone.now()
        exercise_set.save()

        serializer = ExerciseSetSerializer(exercise_set)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='finish')
    def finish(self, request, pk=None):
        workout = self.get_object()
        duration = request.data.get('duration_minutes')
        if duration is not None:
            workout.duration_minutes = duration
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

    def perform_create(self, serializer):
        workout_id = self.kwargs.get('workout_pk')
        try:
            workout = Workout.objects.get(id=workout_id, user=self.request.user)
        except Workout.DoesNotExist:
            raise PermissionDenied('Workout not found or access denied.')
        serializer.save(workout=workout)
