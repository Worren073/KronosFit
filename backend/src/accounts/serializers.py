import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()

USERNAME_REGEX = re.compile(r'^[a-zA-Z0-9_]+$')
PASSWORD_REGEX = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$')


class UserProfileSerializer(serializers.ModelSerializer):
    is_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'first_name', 'last_name', 'gender', 'age', 'weight', 'height',
            'profile_picture', 'gym_name', 'trainer_name', 'experience', 'is_complete',
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_superuser', 'managed_gym', 'profile']
        read_only_fields = ['id', 'role', 'is_superuser', 'managed_gym']


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        error_messages={'invalid': 'Ingresa un email válido.'},
    )
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def validate_username(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("El usuario debe tener al menos 3 caracteres.")
        if len(value) > 30:
            raise serializers.ValidationError("El usuario no puede tener más de 30 caracteres.")
        if not USERNAME_REGEX.match(value):
            raise serializers.ValidationError("El usuario solo puede contener letras, números y guiones bajos.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este usuario ya está en uso.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value

    def validate_password(self, value):
        if not PASSWORD_REGEX.match(value):
            raise serializers.ValidationError(
                "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
