from django.conf import settings
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import LoginSerializer, RegisterSerializer, UserProfileSerializer
from .services import clear_auth_cookies, set_auth_cookies, sync_current_week_daily_goals, sync_daily_goal


class AuthViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()

    def get_permissions(self):
        if self.action in {"register", "login", "refresh"}:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        sync_current_week_daily_goals(user, timezone.localdate())

        refresh = RefreshToken.for_user(user)
        response = Response(
            {"message": "Registration successful.", "user": UserProfileSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if not user:
            raise AuthenticationFailed("Invalid username or password.")

        sync_current_week_daily_goals(user, timezone.localdate())
        refresh = RefreshToken.for_user(user)
        response = Response({"message": "Login successful.", "user": UserProfileSerializer(user).data})
        set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response

    @action(detail=False, methods=["post"])
    def logout(self, request):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"])
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass

        response = Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def refresh(self, request):
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"])
        if not refresh_token:
            raise InvalidToken("Refresh token not found.")

        try:
            incoming_refresh = RefreshToken(refresh_token)
            user = get_object_or_404(User, id=incoming_refresh["user_id"])
            new_refresh = RefreshToken.for_user(user)
            if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION", False):
                try:
                    incoming_refresh.blacklist()
                except TokenError:
                    pass
        except TokenError as exc:
            response = Response({"message": "Refresh token expired."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(response)
            raise InvalidToken("Refresh token is invalid.") from exc

        response = Response({"message": "Token refreshed.", "user": UserProfileSerializer(user).data})
        set_auth_cookies(response, str(new_refresh.access_token), str(new_refresh))
        return response

    @action(detail=False, methods=["get", "put"])
    def me(self, request):
        if request.method == "GET":
            sync_daily_goal(request.user, timezone.localdate())
            return Response(UserProfileSerializer(request.user).data)

        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        sync_current_week_daily_goals(request.user, timezone.localdate())
        return Response(UserProfileSerializer(request.user).data)
