from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = router.urls + [
    path('auth/register/', views.RegisterView.as_view(), name='auth_register'),
    path('auth/login/', views.CookieTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', views.CookieTokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth_logout'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='auth_change_password'),
    path('auth/check-username/', views.CheckUsernameView.as_view(), name='auth_check_username'),
    path('users/me/profile/', views.ProfileView.as_view(), name='user_profile'),
]
