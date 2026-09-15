from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from config.permissions import IsOwner, IsStandardUser
from .models import Routine
from .serializers import RoutineSerializer


class RoutineViewSet(viewsets.ModelViewSet):
    serializer_class = RoutineSerializer
    permission_classes = [IsAuthenticated, IsOwner, IsStandardUser]

    def get_queryset(self):
        return Routine.objects.filter(user=self.request.user).prefetch_related('days__exercises')

    def perform_create(self, serializer):
        with transaction.atomic():
            locked_ids = list(
                Routine.objects.filter(user=self.request.user)
                .select_for_update()
                .values_list('id', flat=True)
            )
            if len(locked_ids) >= Routine.MAX_PER_USER:
                raise RoutineLimitError()
            serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except RoutineLimitError:
            return Response(
                {'detail': f'Alcanzaste el límite de {Routine.MAX_PER_USER} rutinas. Eliminá una para crear otra.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class RoutineLimitError(Exception):
    pass
