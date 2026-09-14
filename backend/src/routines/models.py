from django.db import models
from django.conf import settings


class Routine(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='routines')
    name = models.CharField(max_length=255)
    focus = models.CharField(max_length=255)
    days_per_week = models.PositiveIntegerField()
    estimated_duration_minutes = models.PositiveIntegerField()
    generated_by_ai = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} - {self.user.username}'


class RoutineDay(models.Model):
    routine = models.ForeignKey(Routine, on_delete=models.CASCADE, related_name='days')
    day_name = models.CharField(max_length=50)
    muscle_groups = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.routine.name} - {self.day_name}'


class RoutineExercise(models.Model):
    routine_day = models.ForeignKey(RoutineDay, on_delete=models.CASCADE, related_name='exercises')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sets = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    rest_seconds = models.PositiveIntegerField(default=60)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.name} ({self.sets}x{self.reps})'
