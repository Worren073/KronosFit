from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from config.permissions import IsOwner, IsStandardUser
from .models import Meal, WaterIntake
from .serializers import MealSerializer, WaterIntakeSerializer


class MealViewSet(viewsets.ModelViewSet):
    serializer_class = MealSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner, IsStandardUser]

    def get_queryset(self):
        qs = Meal.objects.filter(user=self.request.user)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        today = request.query_params.get('date')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        qs = Meal.objects.filter(user=request.user)

        if today:
            qs = qs.filter(date=today)
        elif date_from or date_to:
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)
        else:
            qs = qs.filter(date=timezone.localdate())

        agg = qs.aggregate(
            total_calories=Sum('calories'),
            total_protein=Sum('protein_grams'),
            total_carbs=Sum('carbs_grams'),
            total_fat=Sum('fat_grams'),
            meal_count=Count('id'),
        )
        return Response({
            'calories': agg['total_calories'] or 0,
            'protein': agg['total_protein'] or 0,
            'carbs': agg['total_carbs'] or 0,
            'fat': agg['total_fat'] or 0,
            'meal_count': agg['meal_count'],
        })


class WaterIntakeViewSet(viewsets.ModelViewSet):
    serializer_class = WaterIntakeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner, IsStandardUser]

    def get_queryset(self):
        qs = WaterIntake.objects.filter(user=self.request.user)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, created_by=self.request.user)
