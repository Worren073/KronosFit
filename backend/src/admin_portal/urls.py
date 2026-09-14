from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.AdminUserViewSet, basename='admin-user')
router.register(r'gyms', views.AdminGymViewSet, basename='admin-gym')

urlpatterns = [
    path('stats/', views.AdminStatsView.as_view(), name='admin_stats'),
    path('', include(router.urls)),
]