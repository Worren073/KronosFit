from rest_framework import serializers
from .models import Meal, WaterIntake


class MealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meal
        fields = ['id', 'name', 'date', 'calories', 'protein_grams', 'carbs_grams', 'fat_grams', 'created_by']
        read_only_fields = ['created_by']

    def validate(self, attrs):
        macros = sum([
            attrs.get('protein_grams') or getattr(self.instance, 'protein_grams', 0) or 0,
            attrs.get('carbs_grams') or getattr(self.instance, 'carbs_grams', 0) or 0,
            attrs.get('fat_grams') or getattr(self.instance, 'fat_grams', 0) or 0,
        ])
        for field in ('protein_grams', 'carbs_grams', 'fat_grams'):
            value = attrs.get(field) if field in attrs else getattr(self.instance, field, 0)
            if value is not None and value < 0:
                raise serializers.ValidationError({field: 'Los macronutrientes no pueden ser negativos.'})
        calories = attrs.get('calories') or getattr(self.instance, 'calories', 0) or 0
        if calories > 0 and macros == 0:
            raise serializers.ValidationError(
                'Registra al menos un macronutriente cuando la comida tiene calorías.'
            )
        return attrs


class WaterIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterIntake
        fields = ['id', 'date', 'milliliters', 'created_by']
        read_only_fields = ['created_by']
