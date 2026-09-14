from django.db import models
from django.conf import settings
from django.utils import timezone


class Gym(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_gyms',
    )
    is_active = models.BooleanField(default=True)
    qr_code = models.ImageField(upload_to='gyms/qr/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class GymMembership(models.Model):
    class Role(models.TextChoices):
        MEMBER = 'member', 'Member'
        TRAINER = 'trainer', 'Trainer'
        ADMIN = 'admin', 'Admin'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gym_memberships',
    )
    gym = models.ForeignKey(
        Gym,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    assigned_trainer = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_athletes',
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'gym']
        ordering = ['-joined_at']

    def __str__(self):
        return f'{self.user.username} - {self.gym.name} ({self.role})'


class GymPlan(models.Model):
    gym = models.ForeignKey(
        Gym,
        on_delete=models.CASCADE,
        related_name='plans',
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    duration_days = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.duration_days}d)'


class GymSubscription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    gym = models.ForeignKey(
        Gym,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gym_subscriptions',
    )
    plan = models.ForeignKey(
        GymPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscriptions',
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-end_date']
        constraints = [
            models.UniqueConstraint(
                fields=['gym', 'user'],
                condition=models.Q(status='active'),
                name='unique_active_subscription_per_user_gym',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} en {self.gym.name} ({self.status})'


class GymAttendance(models.Model):
    gym = models.ForeignKey(
        Gym,
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gym_attendance_records',
    )
    date = models.DateField(default=timezone.localdate)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        constraints = [
            models.UniqueConstraint(
                fields=['gym', 'user', 'date'],
                name='unique_attendance_per_user_gym_day',
            ),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.date} ({self.gym.name})'


class GymEvent(models.Model):
    gym = models.ForeignKey(
        Gym,
        on_delete=models.CASCADE,
        related_name='events',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['starts_at']

    def __str__(self):
        return f'{self.title} ({self.gym.name})'
