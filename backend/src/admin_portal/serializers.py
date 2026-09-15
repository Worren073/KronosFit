from rest_framework import serializers
from django.contrib.auth import get_user_model
from gyms.serializers import GymSerializer
from gyms.models import GymMembership
from accounts.serializers import RegisterSerializer

User = get_user_model()


class GymAdminCreateSerializer(RegisterSerializer):
    def create(self, validated_data, gym):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role='gym_admin',
            managed_gym=gym,
        )
        GymMembership.objects.get_or_create(
            user=user,
            gym=gym,
            defaults={'role': GymMembership.Role.ADMIN},
        )
        return user


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'is_superuser', 'managed_gym',
            'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'is_superuser', 'date_joined', 'last_login']

    def validate_role(self, value):
        if value == 'admin':
            raise serializers.ValidationError('El rol admin no se asigna por API.')
        return value

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', 'user'))
        managed_gym = attrs.get('managed_gym', getattr(self.instance, 'managed_gym', None))
        if role == 'gym_admin':
            if not managed_gym:
                raise serializers.ValidationError(
                    {'managed_gym': 'Un administrador de gimnasio requiere un gimnasio asignado.'}
                )
        elif managed_gym is not None:
            attrs['managed_gym'] = None
        return attrs


class AdminGymSerializer(GymSerializer):
    managed_admins = serializers.SerializerMethodField()

    class Meta(GymSerializer.Meta):
        fields = GymSerializer.Meta.fields + ['managed_admins']

    def get_managed_admins(self, obj):
        admins = User.objects.filter(role='gym_admin', managed_gym=obj)
        return [
            {'id': u.id, 'username': u.username, 'email': u.email, 'is_active': u.is_active}
            for u in admins
        ]