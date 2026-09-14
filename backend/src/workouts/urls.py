from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from . import views

router = DefaultRouter()
router.register(r'workouts', views.WorkoutViewSet, basename='workout')

workouts_router = NestedDefaultRouter(router, r'workouts', lookup='workout')
workouts_router.register(r'exercises', views.ExerciseViewSet, basename='workout-exercises')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(workouts_router.urls)),
]
