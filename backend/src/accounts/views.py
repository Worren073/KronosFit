from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from .models import UserProfile
from .serializers import UserSerializer, RegisterSerializer, UserProfileSerializer
from .cookies import set_auth_cookies, clear_auth_cookies

User = get_user_model()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response({
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.pop('access')
            refresh = response.data.pop('refresh')
            set_auth_cookies(response, access, refresh)
        return response


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            request.data['refresh'] = refresh_token

        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            access = response.data.pop('access')
            if 'refresh' in response.data:
                refresh = response.data.pop('refresh')
            else:
                refresh = refresh_token
            set_auth_cookies(response, access, refresh)
        return response


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, InvalidToken):
                pass

        response = Response({'detail': 'Sesión cerrada.'}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        user = request.user

        if not user.check_password(old_password):
            return Response(
                {'old_password': 'La contraseña actual es incorrecta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not new_password:
            return Response(
                {'new_password': 'La nueva contraseña es obligatoria.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({'new_password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Contraseña actualizada correctamente.'})


@method_decorator(ratelimit(key='ip', rate='5/m', method='GET', block=True), name='get')
class CheckUsernameView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return Response(
                {'detail': 'El parámetro username es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        available = not User.objects.filter(username__iexact=username).exists()
        return Response({'available': available})
