from django.db import transaction
from rest_framework import serializers
from .models import Routine, RoutineDay, RoutineExercise


class RoutineExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutineExercise
        fields = ['id', 'name', 'description', 'sets', 'reps', 'rest_seconds', 'weight', 'notes', 'order']


class RoutineDaySerializer(serializers.ModelSerializer):
    exercises = RoutineExerciseSerializer(many=True)
    muscle_groups = serializers.CharField()

    class Meta:
        model = RoutineDay
        fields = ['id', 'day_name', 'muscle_groups', 'order', 'exercises']

    def to_internal_value(self, data):
        if isinstance(data.get('muscle_groups'), list):
            data = {**data, 'muscle_groups': ', '.join(data['muscle_groups'])}
        return super().to_internal_value(data)


class RoutineSerializer(serializers.ModelSerializer):
    days = RoutineDaySerializer(many=True)

    class Meta:
        model = Routine
        fields = ['id', 'name', 'focus', 'days_per_week', 'estimated_duration_minutes', 'source', 'created_at', 'days']
        read_only_fields = ['source', 'created_at']

    @transaction.atomic
    def create(self, validated_data):
        days_data = validated_data.pop('days', [])
        routine = Routine.objects.create(**validated_data)
        for day_data in days_data:
            exercises_data = day_data.pop('exercises', [])
            day = RoutineDay.objects.create(routine=routine, **day_data)
            for exercise_data in exercises_data:
                RoutineExercise.objects.create(routine_day=day, **exercise_data)
        return routine

    @transaction.atomic
    def update(self, instance, validated_data):
        days_data = validated_data.pop('days', [])
        instance.name = validated_data.get('name', instance.name)
        instance.focus = validated_data.get('focus', instance.focus)
        instance.days_per_week = validated_data.get('days_per_week', instance.days_per_week)
        instance.estimated_duration_minutes = validated_data.get('estimated_duration_minutes', instance.estimated_duration_minutes)
        instance.save()

        instance.days.all().delete()
        for day_data in days_data:
            exercises_data = day_data.pop('exercises', [])
            day = RoutineDay.objects.create(routine=instance, **day_data)
            for exercise_data in exercises_data:
                RoutineExercise.objects.create(routine_day=day, **exercise_data)
        return instance
