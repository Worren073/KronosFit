from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from config.permissions import IsOwner, IsStandardUser
from workouts.models import Workout
from nutrition.models import Meal, WaterIntake
from .models import WeightEntry
from .serializers import WeightEntrySerializer


class WeightEntryViewSet(viewsets.ModelViewSet):
    serializer_class = WeightEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner, IsStandardUser]
    pagination_class = None

    def get_queryset(self):
        return WeightEntry.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry, created = WeightEntry.objects.update_or_create(
            user=request.user,
            date=serializer.validated_data['date'],
            defaults={'weight': serializer.validated_data['weight']},
        )
        out = self.get_serializer(entry)
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStandardUser]

    def get(self, request):
        today = timezone.now().date()
        last_30_days = today - timedelta(days=30)

        workout_daily = (
            Workout.objects
            .filter(user=request.user, date__date__gte=last_30_days)
            .annotate(date_only=TruncDate('date'))
            .values('date_only')
            .annotate(
                duration=Sum('duration_minutes'),
                count=Count('id'),
            )
            .order_by('date_only')
        )
        workout_map = {
            entry['date_only'].isoformat(): {
                'duration': entry['duration'] or 0,
                'count': entry['count'],
            }
            for entry in workout_daily
        }

        meal_daily = (
            Meal.objects
            .filter(user=request.user, date__gte=last_30_days)
            .annotate(date_only=TruncDate('date'))
            .values('date_only')
            .annotate(
                calories=Sum('calories'),
                protein=Sum('protein_grams'),
                carbs=Sum('carbs_grams'),
                fat=Sum('fat_grams'),
            )
            .order_by('date_only')
        )
        meal_map = {
            entry['date_only'].isoformat(): {
                'calories': entry['calories'] or 0,
                'protein': entry['protein'] or 0,
                'carbs': entry['carbs'] or 0,
                'fat': entry['fat'] or 0,
            }
            for entry in meal_daily
        }

        water_daily = (
            WaterIntake.objects
            .filter(user=request.user, date__gte=last_30_days)
            .values('date')
            .annotate(total_ml=Sum('milliliters'))
            .order_by('date')
        )
        water_map = {
            entry['date'].isoformat(): entry['total_ml'] or 0
            for entry in water_daily
        }

        workout_data = []
        nutrition_data = []
        for i in range(30, -1, -1):
            date = today - timedelta(days=i)
            date_str = date.isoformat()

            w = workout_map.get(date_str, {'duration': 0, 'count': 0})
            workout_data.append({'date': date_str, **w})

            m = meal_map.get(date_str, {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0})
            nutrition_data.append({
                'date': date_str,
                **m,
                'water': water_map.get(date_str, 0),
            })

        totals = Workout.objects.filter(user=request.user).aggregate(
            total_workouts=Count('id'),
            total_minutes=Sum('duration_minutes'),
        )
        totals['total_minutes'] = totals['total_minutes'] or 0

        totals['total_calories_burned'] = (
            Workout.objects
            .filter(user=request.user)
            .aggregate(total=Sum('calories_burned'))['total'] or 0
        )
        totals['total_meals'] = Meal.objects.filter(user=request.user).count()
        totals['total_water_ml'] = (
            WaterIntake.objects
            .filter(user=request.user)
            .aggregate(total=Sum('milliliters'))['total'] or 0
        )

        weight_entries = (
            WeightEntry.objects
            .filter(user=request.user, date__gte=last_30_days)
            .order_by('-date')
            .values('date', 'weight')
        )
        weight_map = {
            entry['date'].isoformat(): float(entry['weight'])
            for entry in weight_entries
        }

        profile = getattr(request.user, 'profile', None)
        if profile and profile.weight:
            weight_map.setdefault(today.isoformat(), float(profile.weight))

        weight_data = [
            {'date': date_str, 'weight': weight_map[date_str]}
            for i in range(30, -1, -1)
            if (date_str := (today - timedelta(days=i)).isoformat()) in weight_map
        ]

        return Response({
            'workouts': workout_data,
            'nutrition': nutrition_data,
            'weight': weight_data,
            'totals': totals,
        })
