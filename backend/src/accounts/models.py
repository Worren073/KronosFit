from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class User(AbstractUser):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('trainer', 'Trainer'),
        ('gym_admin', 'Gym Admin'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    managed_gym = models.ForeignKey(
        'gyms.Gym',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_by',
    )


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'Masculino'),
        ('female', 'Femenino'),
        ('other', 'Otro'),
        ('prefer_not_to_say', 'Prefiero no decirlo'),
    ]

    EXPERIENCE_CHOICES = [
        ('mortal', 'Mortal'),
        ('hero_in_training', 'Héroe en entrenamiento'),
        ('argonaut', 'Argonauta'),
        ('demigod', 'Semidiós'),
        ('titan', 'Titán'),
        ('olympian_god', 'Dios del Olimpo'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    profile_picture = models.URLField(blank=True)
    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        blank=True,
    )
    gym_name = models.CharField(max_length=255, blank=True)
    trainer_name = models.CharField(max_length=255, blank=True)
    experience = models.CharField(
        max_length=20,
        choices=EXPERIENCE_CHOICES,
        blank=True,
    )

    @property
    def is_complete(self):
        return bool(
            self.first_name and self.last_name and self.gender and self.age and self.weight and self.height and self.experience
        )

    def __str__(self):
        return f'{self.user.username} profile'
