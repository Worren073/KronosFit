from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'meals', views.MealViewSet, basename='meal')
router.register(r'water', views.WaterIntakeViewSet, basename='water-intake')

urlpatterns = router.urls