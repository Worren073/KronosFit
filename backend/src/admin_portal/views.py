from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from config.permissions import IsSuperAdmin
from gyms.models import (
    Gym,
    GymMembership,
    GymPlan,
    GymSubscription,
    GymAttendance,
    GymEvent,
)
from gyms.utils import generate_gym_qr
from .serializers import AdminUserSerializer, AdminGymSerializer, GymAdminCreateSerializer

User = get_user_model()


class AdminStatsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        today = date.today()
        subscriptions = GymSubscription.objects.filter(
            gym__is_active=True,
        )
        active = subscriptions.filter(
            status=GymSubscription.Status.ACTIVE,
            end_date__gte=today,
        ).count()
        expired = subscriptions.filter(
            status=GymSubscription.Status.EXPIRED,
        ).count()
        expired += subscriptions.filter(
            status=GymSubscription.Status.ACTIVE,
            end_date__lt=today,
        ).count()
        return Response({
            'gyms': Gym.objects.count(),
            'memberships': GymMembership.objects.filter(is_active=True).count(),
            'plans': GymPlan.objects.count(),
            'active_subscriptions': active,
            'expired_subscriptions': expired,
            'today_attendance': GymAttendance.objects.filter(date=today).count(),
            'events': GymEvent.objects.filter(is_active=True).count(),
            'users': User.objects.count(),
        })


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [IsSuperAdmin]
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        if role:
            qs = qs.filter(role=role)
        if is_active in ('true', 'false'):
            qs = qs.filter(is_active=(is_active == 'true'))
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        return qs.order_by('-date_joined')

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_superuser:
            return Response(
                {'detail': 'No podés modificar un superusuario desde esta API.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        managed_gym = instance.managed_gym
        if instance.role == 'gym_admin' and managed_gym:
            GymMembership.objects.get_or_create(
                user=instance,
                gym=managed_gym,
                defaults={'role': GymMembership.Role.ADMIN},
            )
        elif instance.role != 'gym_admin' and managed_gym:
            instance.managed_gym = None
            instance.save(update_fields=['managed_gym'])

        return Response(AdminUserSerializer(instance).data)


class AdminGymViewSet(viewsets.ModelViewSet):
    serializer_class = AdminGymSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = 'slug'
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Gym.objects.all()

    def perform_create(self, serializer):
        gym_admin_id = self.request.data.get('gym_admin_id')
        new_gym_admin = self.request.data.get('new_gym_admin')
        if gym_admin_id and new_gym_admin:
            raise ValidationError(
                'Elegí crear una cuenta nueva o asignar un encargado existente, no ambos.'
            )
        admin_serializer = None
        if isinstance(new_gym_admin, dict):
            admin_serializer = GymAdminCreateSerializer(data=new_gym_admin)
            admin_serializer.is_valid(raise_exception=True)
        gym = serializer.save(owner=self.request.user)
        generate_gym_qr(gym, self.request.build_absolute_uri('/'))
        if gym_admin_id:
            self._assign_admin(gym, gym_admin_id)
        elif admin_serializer is not None:
            admin_serializer.create(admin_serializer.validated_data, gym=gym)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        gym_admin_id = request.data.get('gym_admin_id')
        if gym_admin_id:
            self._assign_admin(instance, gym_admin_id)
        data = {k: v for k, v in request.data.items() if k != 'gym_admin_id'}
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        gym = self.get_object()
        User.objects.filter(managed_gym=gym).update(role='user', managed_gym=None)
        return super().destroy(request, *args, **kwargs)

    def _assign_admin(self, gym, gym_admin_id):
        try:
            admin = User.objects.get(id=gym_admin_id, is_active=True)
        except User.DoesNotExist:
            raise NotFound('Usuario administrador no encontrado o inactivo.')
        admin.role = 'gym_admin'
        admin.managed_gym = gym
        admin.save(update_fields=['role', 'managed_gym'])
        GymMembership.objects.get_or_create(
            user=admin,
            gym=gym,
            defaults={'role': GymMembership.Role.ADMIN},
        )