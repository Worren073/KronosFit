from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'gyms', views.GymViewSet, basename='gym')
router.register(r'gym-memberships', views.GymMembershipViewSet, basename='gym-membership')

urlpatterns = [
    path('', include(router.urls)),
]
