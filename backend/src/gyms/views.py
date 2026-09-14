from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, NotFound, MethodNotAllowed
from rest_framework.response import Response

from progress.models import WeightEntry
from workouts.models import Workout
from nutrition.models import Meal, WaterIntake
from accounts.serializers import UserProfileSerializer
from .models import (
    Gym,
    GymMembership,
    GymPlan,
    GymSubscription,
    GymAttendance,
    GymEvent,
)
from .serializers import (
    GymSerializer,
    GymMembershipSerializer,
    GymPlanSerializer,
    GymSubscriptionSerializer,
    GymAttendanceSerializer,
    GymEventSerializer,
)
from .utils import generate_gym_qr, user_is_gym_admin, gym_is_active


def _member_name(user):
    profile = getattr(user, 'profile', None)
    first = profile.first_name or user.first_name
    last = profile.last_name or user.last_name
    return first, last


class GymViewSet(viewsets.ModelViewSet):
    serializer_class = GymSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'

    def create(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed(request.method)

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Gym.objects.all()
        if user.role == 'gym_admin' and user.managed_gym_id:
            return Gym.objects.filter(id=user.managed_gym_id)
        return Gym.objects.filter(memberships__user=user).distinct()

    def perform_create(self, serializer):
        gym = serializer.save(owner=self.request.user)
        generate_gym_qr(gym, self.request.build_absolute_uri('/'))
        GymMembership.objects.create(user=self.request.user, gym=gym, role=GymMembership.Role.ADMIN)

    def _ensure_admin(self, user, gym):
        if not user_is_gym_admin(user, gym):
            raise PermissionDenied('Necesitás rol de admin en este gimnasio.')

    def _ensure_gym_active(self, gym):
        if not gym_is_active(gym):
            raise PermissionDenied('Este gimnasio está desactivado.')

    def _ensure_membership(self, user, gym):
        membership = gym.memberships.filter(user=user, is_active=True).first()
        if not membership:
            raise PermissionDenied('No pertenecés a este gimnasio.')
        return membership

    def _member_payload(self, user):
        profile = getattr(user, 'profile', None)
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': profile.first_name if profile else '',
            'last_name': profile.last_name if profile else '',
        }

    @action(detail=False, methods=['post'], url_path='join')
    @method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True))
    def join(self, request):
        slug = request.data.get('slug', '').strip()
        if not slug:
            return Response(
                {'slug': 'El slug del gimnasio es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            gym = Gym.objects.get(slug=slug)
        except Gym.DoesNotExist:
            raise NotFound('Gimnasio no encontrado.')
        self._ensure_gym_active(gym)

        membership, created = GymMembership.objects.get_or_create(
            user=request.user,
            gym=gym,
            defaults={'role': GymMembership.Role.MEMBER},
        )
        if not created:
            if membership.is_active:
                return Response(
                    {'detail': 'Ya sos miembro de este gimnasio.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            membership.is_active = True
            membership.save(update_fields=['is_active'])

        serializer = GymMembershipSerializer(membership)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my-gym')
    def my_gym(self, request):
        memberships = list(
            request.user.gym_memberships.filter(is_active=True).select_related('gym')
        )
        if not memberships:
            return Response({
                'gym': None,
                'membership': None,
                'subscription': None,
                'days_remaining': None,
                'attendance_count': 0,
                'events': [],
                'roles': {'is_admin': False, 'is_trainer': False, 'is_member': False},
            })
        membership = memberships[0]
        gym = membership.gym
        today = date.today()

        subs = list(
            gym.subscriptions.filter(user=request.user).order_by('-end_date')
        )
        subscription = None
        days_remaining = None
        for sub in subs:
            if sub.status == GymSubscription.Status.ACTIVE and sub.end_date >= today:
                subscription = {
                    'id': sub.id,
                    'status': sub.status,
                    'start_date': sub.start_date.isoformat(),
                    'end_date': sub.end_date.isoformat(),
                    'plan': GymPlanSerializer(sub.plan).data if sub.plan else None,
                }
                days_remaining = (sub.end_date - today).days
                break

        attendance_count = gym.attendance_records.filter(user=request.user).count()
        events = gym.events.filter(is_active=True, starts_at__gte=timezone.now())
        return Response({
            'gym': GymSerializer(gym, context={'request': request}).data,
            'membership': GymMembershipSerializer(membership).data,
            'subscription': subscription,
            'days_remaining': days_remaining,
            'attendance_count': attendance_count,
            'events': GymEventSerializer(events, many=True).data,
            'roles': {
                'is_admin': user_is_gym_admin(request.user, gym),
                'is_trainer': membership.role == GymMembership.Role.TRAINER,
                'is_member': True,
            },
        })

    @action(detail=True, methods=['post'], url_path='check-in')
    @method_decorator(ratelimit(key='user', rate='10/m', method='POST', block=True))
    def check_in(self, request, slug=None):
        gym = self.get_object()
        self._ensure_gym_active(gym)
        self._ensure_membership(request.user, gym)

        target_user = request.user
        user_id = request.data.get('user_id')
        if user_id is not None:
            if not str(user_id).isdigit():
                return Response(
                    {'user_id': 'Identificador de atleta inválido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            is_staff = user_is_gym_admin(request.user, gym) or gym.memberships.filter(
                user=request.user, role=GymMembership.Role.TRAINER, is_active=True
            ).exists()
            if not is_staff:
                raise PermissionDenied('Solo el staff puede registrar entradas de otros atletas.')
            try:
                target_user = GymMembership.objects.get(
                    id=user_id, gym=gym, is_active=True
                ).user
            except GymMembership.DoesNotExist:
                raise NotFound('Atleta no encontrado en este gimnasio.')

        today = date.today()
        if GymAttendance.objects.filter(gym=gym, user=target_user, date=today).exists():
            return Response(
                {'detail': 'Este atleta ya tiene una entrada registrada hoy.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        attendance = GymAttendance.objects.create(
            gym=gym,
            user=target_user,
            date=today,
            registered_by=request.user,
        )
        return Response(
            GymAttendanceSerializer(attendance).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, slug=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        serializer = GymMembershipSerializer(
            gym.memberships.filter(is_active=True).select_related('user', 'assigned_trainer'),
            many=True,
        )
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path=r'members/(?P<membership_id>\d+)')
    def update_member(self, request, slug=None, membership_id=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        self._ensure_gym_active(gym)
        membership = get_object_or_404(
            GymMembership,
            id=membership_id,
            gym=gym,
        )
        if membership.user == request.user:
            raise PermissionDenied('No podés modificar tu propio rol.')

        role = request.data.get('role')
        is_active = request.data.get('is_active')
        assigned_trainer = request.data.get('assigned_trainer')
        if role is not None:
            if role not in GymMembership.Role.values:
                return Response(
                    {'role': 'Rol inválido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            membership.role = role
            if role != GymMembership.Role.TRAINER:
                membership.assigned_trainer = None
        if is_active is not None:
            membership.is_active = bool(is_active)
        if assigned_trainer is not None:
            if assigned_trainer == '':
                membership.assigned_trainer = None
            else:
                trainer_membership = get_object_or_404(
                    GymMembership,
                    id=assigned_trainer,
                    gym=gym,
                    role=GymMembership.Role.TRAINER,
                    is_active=True,
                )
                membership.assigned_trainer = trainer_membership
        membership.save()

        serializer = GymMembershipSerializer(membership)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path=r'members/(?P<membership_id>\d+)/kick')
    def kick_member(self, request, slug=None, membership_id=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        self._ensure_gym_active(gym)
        membership = get_object_or_404(
            GymMembership,
            id=membership_id,
            gym=gym,
            is_active=True,
        )
        if membership.user == request.user:
            raise PermissionDenied('No podés expulsarte a vos mismo.')
        membership.is_active = False
        membership.assigned_trainer = None
        membership.save(update_fields=['is_active', 'assigned_trainer'])
        gym.subscriptions.filter(
            user=membership.user,
            status=GymSubscription.Status.ACTIVE,
        ).update(status=GymSubscription.Status.CANCELLED)
        return Response({'detail': 'Atleta expulsado del gimnasio.'})

    @action(detail=True, methods=['get'], url_path='athletes')
    def athletes(self, request, slug=None):
        gym = self.get_object()
        trainer_membership = gym.memberships.filter(
            user=request.user,
            role=GymMembership.Role.TRAINER,
            is_active=True,
        ).first()
        if not trainer_membership:
            raise PermissionDenied('Necesitás ser entrenador de este gimnasio.')
        athletes = gym.memberships.filter(
            assigned_trainer=trainer_membership,
            is_active=True,
        ).select_related('user', 'user__profile')
        today = date.today()
        result = []
        for m in athletes:
            sub = m.user.gym_subscriptions.filter(gym=gym).order_by('-end_date').first()
            result.append({
                'membership_id': m.id,
                'user': self._member_payload(m.user),
                'role': m.role,
                'subscription': {
                    'status': sub.status,
                    'end_date': sub.end_date.isoformat(),
                    'days_remaining': (sub.end_date - today).days,
                } if sub else None,
                'attendance_count': gym.attendance_records.filter(user=m.user).count(),
            })
        return Response(result)

    @action(detail=True, methods=['get'], url_path=r'athletes/(?P<athlete_id>\d+)/dashboard')
    def athlete_dashboard(self, request, slug=None, athlete_id=None):
        gym = self.get_object()
        trainer_membership = gym.memberships.filter(
            user=request.user,
            role=GymMembership.Role.TRAINER,
            is_active=True,
        ).first()
        if not trainer_membership:
            raise PermissionDenied('Necesitás ser entrenador de este gimnasio.')
        athlete_ms = get_object_or_404(
            GymMembership,
            id=athlete_id,
            gym=gym,
            assigned_trainer=trainer_membership,
            is_active=True,
        )
        athlete = athlete_ms.user
        today = date.today()
        now = timezone.now()
        month_ago = now - timedelta(days=30)

        last_weight = WeightEntry.objects.filter(user=athlete).order_by('-date').first()
        meals_today = Meal.objects.filter(user=athlete, date=today)
        kcal_today = sum(m.calories for m in meals_today)
        water_today = sum(w.milliliters for w in WaterIntake.objects.filter(user=athlete, date=today))
        sub = athlete.gym_subscriptions.filter(gym=gym).order_by('-end_date').first()

        return Response({
            'user': self._member_payload(athlete),
            'profile': UserProfileSerializer(athlete.profile).data if hasattr(athlete, 'profile') else None,
            'last_weight': {
                'date': last_weight.date.isoformat(),
                'weight': str(last_weight.weight),
            } if last_weight else None,
            'workouts_30d': Workout.objects.filter(user=athlete, date__gte=month_ago).count(),
            'nutrition_today': {
                'calories': kcal_today,
                'water_ml': water_today,
            },
            'subscription': {
                'status': sub.status,
                'end_date': sub.end_date.isoformat(),
                'days_remaining': (sub.end_date - today).days,
            } if sub else None,
            'attendance_count': gym.attendance_records.filter(user=athlete).count(),
        })

    @action(detail=True, methods=['get'], url_path='dashboard')
    def admin_dashboard(self, request, slug=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        today = date.today()
        month_start = today.replace(day=1)
        tomorrow = today + timedelta(days=1)

        subs = list(gym.subscriptions.select_related('user', 'user__profile', 'plan'))
        active_subs = [
            s for s in subs
            if s.status == GymSubscription.Status.ACTIVE and s.end_date >= today
        ]
        expired_subs = [
            s for s in subs
            if (s.status == GymSubscription.Status.EXPIRED or
                (s.status == GymSubscription.Status.ACTIVE and s.end_date < today))
        ]
        new_month = [
            s for s in subs
            if s.start_date >= month_start and s.end_date >= today
        ]
        today_attendance = gym.attendance_records.filter(date=today).count()
        trainers = list(gym.memberships.filter(
            role=GymMembership.Role.TRAINER, is_active=True,
        ).select_related('user', 'user__profile'))
        members = list(gym.memberships.filter(is_active=True).select_related('user', 'user__profile'))

        member_list = []
        for m in members:
            sub = next((s for s in subs if s.user_id == m.user_id and s.end_date >= today), None)
            member_list.append({
                'membership_id': m.id,
                'role': m.role,
                'user': self._member_payload(m.user),
                'subscription': {
                    'id': sub.id,
                    'status': sub.status,
                    'end_date': sub.end_date.isoformat(),
                    'days_remaining': (sub.end_date - today).days,
                    'plan': GymPlanSerializer(sub.plan).data if sub.plan else None,
                } if sub else None,
                'trainer': GymMembershipSerializer(m.assigned_trainer).data if m.assigned_trainer_id else None,
            })

        return Response({
            'active_subscriptions': len(active_subs),
            'expired_subscriptions': len(expired_subs),
            'today_attendance': today_attendance,
            'new_members_month': len(new_month),
            'athletes_count': sum(1 for m in members if m.role == GymMembership.Role.MEMBER),
            'trainers_count': len(trainers),
            'members': member_list,
        })

    @action(detail=True, methods=['post'], url_path='subscriptions')
    def create_subscription(self, request, slug=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        self._ensure_gym_active(gym)
        user_id = request.data.get('user')
        plan_id = request.data.get('plan')
        duration_days = request.data.get('duration_days')
        start_value = request.data.get('start_date')

        membership = gym.memberships.filter(user_id=user_id, is_active=True).first()
        if not membership:
            return Response(
                {'user': 'El atleta debe pertenecer al gimnasio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if gym.subscriptions.filter(
            user_id=user_id, status=GymSubscription.Status.ACTIVE,
        ).exists():
            return Response(
                {'detail': 'Este atleta ya tiene una mensualidad activa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = None
        if plan_id:
            plan = get_object_or_404(GymPlan, id=plan_id, gym=gym)
            duration_days = plan.duration_days
        if not plan_id and not duration_days:
            return Response(
                {'detail': 'Indicá un plan o la duración en días.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            duration_days = int(duration_days)
        except (TypeError, ValueError):
            return Response(
                {'duration_days': 'La duración debe ser un número.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if duration_days <= 0:
            return Response(
                {'duration_days': 'La duración debe ser positiva.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_date = None
        if start_value:
            try:
                start_date = date.fromisoformat(str(start_value))
            except ValueError:
                return Response(
                    {'start_date': 'Formato de fecha inválido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if start_date is None:
            start_date = date.today()
        subscription = GymSubscription.objects.create(
            gym=gym,
            user=membership.user,
            plan=plan,
            start_date=start_date,
            end_date=start_date + timedelta(days=duration_days),
            status=GymSubscription.Status.ACTIVE,
        )
        return Response(
            GymSubscriptionSerializer(subscription).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['patch'], url_path=r'subscriptions/(?P<subscription_id>\d+)')
    def update_subscription(self, request, slug=None, subscription_id=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        self._ensure_gym_active(gym)
        subscription = get_object_or_404(GymSubscription, id=subscription_id, gym=gym)

        action_value = request.data.get('action')
        if action_value == 'cancel':
            subscription.status = GymSubscription.Status.CANCELLED
            subscription.save(update_fields=['status'])
        elif action_value == 'renew':
            today = date.today()
            if subscription.status == GymSubscription.Status.CANCELLED:
                raise PermissionDenied('No podés renovar una mensualidad cancelada.')
            plan = subscription.plan
            duration_days = request.data.get('duration_days')
            if duration_days is None and plan:
                duration_days = plan.duration_days
            if not duration_days:
                return Response(
                    {'detail': 'Indicá la duración en días para renovar.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                duration = int(duration_days)
            except (TypeError, ValueError):
                return Response(
                    {'duration_days': 'La duración debe ser un número.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            subscription.start_date = today
            base = max(today, subscription.end_date) if subscription.end_date > today else today
            subscription.end_date = base + timedelta(days=duration)
            subscription.status = GymSubscription.Status.ACTIVE
            subscription.save()
        else:
            return Response(
                {'detail': "Acción inválida. Usá 'renew' o 'cancel'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(GymSubscriptionSerializer(subscription).data)

    @action(detail=True, methods=['get', 'post'], url_path='events')
    def events(self, request, slug=None):
        gym = self.get_object()
        if request.method == 'POST':
            self._ensure_admin(request.user, gym)
            self._ensure_gym_active(gym)
            serializer = GymEventSerializer(
                data={**request.data, 'gym': gym.id},
                context={'request': request},
            )
            serializer.is_valid(raise_exception=True)
            event = serializer.save(gym=gym, created_by=request.user)
            return Response(GymEventSerializer(event).data, status=status.HTTP_201_CREATED)
        self._ensure_membership(request.user, gym)
        qs = gym.events.all() if user_is_gym_admin(request.user, gym) else gym.events.filter(is_active=True, starts_at__gte=timezone.now())
        return Response(GymEventSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'events/(?P<event_id>\d+)')
    def event_detail(self, request, slug=None, event_id=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        self._ensure_gym_active(gym)
        event = get_object_or_404(GymEvent, id=event_id, gym=gym)
        if request.method == 'DELETE':
            event.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = GymEventSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='plans')
    def plans(self, request, slug=None):
        gym = self.get_object()
        if request.method == 'POST':
            self._ensure_admin(request.user, gym)
            self._ensure_gym_active(gym)
            serializer = GymPlanSerializer(data={**request.data, 'gym': gym.id})
            serializer.is_valid(raise_exception=True)
            plan = serializer.save(gym=gym)
            return Response(GymPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
        self._ensure_membership(request.user, gym)
        qs = gym.plans.all() if user_is_gym_admin(request.user, gym) else gym.plans.filter(is_active=True)
        return Response(GymPlanSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'plans/(?P<plan_id>\d+)')
    def plan_detail(self, request, slug=None, plan_id=None):
        gym = self.get_object()
        self._ensure_admin(request.user, gym)
        self._ensure_gym_active(gym)
        plan = get_object_or_404(GymPlan, id=plan_id, gym=gym)
        if request.method == 'DELETE':
            if plan.subscriptions.exists():
                return Response(
                    {'detail': 'Este plan tiene mensualidades asociadas.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            plan.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = GymPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GymMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = GymMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GymMembership.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='leave')
    def leave(self, request, pk=None):
        membership = self.get_object()
        membership.is_active = False
        membership.assigned_trainer = None
        membership.save(update_fields=['is_active', 'assigned_trainer'])
        membership.gym.subscriptions.filter(
            user=request.user,
            status=GymSubscription.Status.ACTIVE,
        ).update(status=GymSubscription.Status.CANCELLED)
        return Response({'detail': 'Te diste de alta del gimnasio.'})