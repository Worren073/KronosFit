from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from config.permissions import IsOwner, IsStandardUser
from .models import Routine
from .serializers import RoutineSerializer


class RoutineViewSet(viewsets.ModelViewSet):
    serializer_class = RoutineSerializer
    permission_classes = [IsAuthenticated, IsOwner, IsStandardUser]

    def get_queryset(self):
        return Routine.objects.filter(user=self.request.user).prefetch_related('days__exercises')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
