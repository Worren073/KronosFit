from django.db import models
from django.conf import settings
from django.utils import timezone


class Meal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='meals')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='meals_created',
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    date = models.DateField(default=timezone.localdate)
    calories = models.PositiveIntegerField()
    protein_grams = models.PositiveIntegerField(default=0)
    carbs_grams = models.PositiveIntegerField(default=0)
    fat_grams = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f'{self.name} - {self.user.username}'

class WaterIntake(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='water_intakes')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='water_intakes_created',
        null=True,
        blank=True,
    )
    date = models.DateField(default=timezone.localdate)
    milliliters = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f'{self.user.username} - {self.date}'
