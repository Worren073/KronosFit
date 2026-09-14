from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'weight-entries', views.WeightEntryViewSet, basename='weight-entry')

urlpatterns = [
    path('progress/', views.ProgressView.as_view(), name='progress'),
    path('', include(router.urls)),
]
