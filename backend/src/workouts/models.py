from django.db import models
from django.conf import settings

SESSION_TTL_HOURS = 5


class Workout(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'En progreso'
        FINISHED = 'finished', 'Finalizado'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workouts')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='workouts_created',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    duration_minutes = models.PositiveIntegerField(help_text='Duration in minutes')
    calories_burned = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.FINISHED)
    finished_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_expired(self):
        if self.status != self.Status.IN_PROGRESS or not self.date:
            return False
        from django.utils import timezone
        return self.date < timezone.now() - timezone.timedelta(hours=SESSION_TTL_HOURS)

    def __str__(self):
        return f'{self.name} - {self.user.username}'

class Exercise(models.Model):
    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name='exercises')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sets = models.PositiveIntegerField()
    reps = models.PositiveIntegerField()
    rest_seconds = models.PositiveIntegerField(default=60)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # in kg

    def __str__(self):
        return f'{self.name} ({self.sets}x{self.reps})'


class ExerciseSet(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='set_instances')
    set_number = models.PositiveIntegerField()
    reps = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['set_number']

    def __str__(self):
        return f'{self.exercise.name} - serie {self.set_number}'
