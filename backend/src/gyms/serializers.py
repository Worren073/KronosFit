from rest_framework import serializers
from .models import Gym, GymMembership, GymPlan, GymSubscription, GymAttendance, GymEvent
from .utils import generate_gym_slug


class GymSerializer(serializers.ModelSerializer):
    qr_url = serializers.SerializerMethodField()
    slug = serializers.SlugField(required=False, allow_blank=True)

    class Meta:
        model = Gym
        fields = ['id', 'name', 'slug', 'address', 'phone', 'owner', 'is_active', 'qr_url', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def get_qr_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None

    def validate(self, attrs):
        slug = (attrs.get('slug') or '').strip()
        if not slug:
            attrs['slug'] = generate_gym_slug()
        return attrs


class GymMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymMembership
        fields = ['id', 'user', 'gym', 'role', 'assigned_trainer', 'is_active', 'joined_at']
        read_only_fields = ['id', 'joined_at', 'user', 'role']


class GymPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymPlan
        fields = ['id', 'name', 'description', 'price', 'duration_days', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class GymSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymSubscription
        fields = ['id', 'gym', 'user', 'plan', 'start_date', 'end_date', 'status', 'created_at']
        read_only_fields = ['id', 'created_at', 'start_date', 'status']


class GymAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymAttendance
        fields = ['id', 'gym', 'user', 'date', 'registered_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class GymEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymEvent
        fields = ['id', 'gym', 'title', 'description', 'starts_at', 'is_active', 'created_at']
        read_only_fields = ['id', 'gym', 'created_at']