from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()


@receiver(post_save, sender=UserProfile)
def log_weight_on_profile_update(sender, instance, **kwargs):
    if instance.weight is None:
        return
    from progress.models import WeightEntry
    WeightEntry.objects.update_or_create(
        user=instance.user,
        date=timezone.now().date(),
        defaults={'weight': instance.weight},
    )
