from django.contrib import admin
from .models import Gym, GymMembership


@admin.register(Gym)
class GymAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'owner', 'is_active', 'created_at']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(GymMembership)
class GymMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'gym', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active']
