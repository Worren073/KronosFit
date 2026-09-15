from rest_framework import serializers
from .models import Workout, Exercise, ExerciseSet


class ExerciseSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseSet
        fields = ['id', 'set_number', 'reps', 'weight', 'completed_at']


class ExerciseSerializer(serializers.ModelSerializer):
    set_logs = ExerciseSetSerializer(source='set_instances', many=True, read_only=True)

    class Meta:
        model = Exercise
        fields = ['id', 'name', 'description', 'sets', 'reps', 'rest_seconds', 'weight', 'workout', 'set_logs']
        read_only_fields = ['workout']


class WorkoutSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)

    class Meta:
        model = Workout
        fields = ['id', 'name', 'date', 'duration_minutes', 'calories_burned', 'notes', 'status', 'finished_at', 'exercises', 'created_by']
        read_only_fields = ['created_by']
