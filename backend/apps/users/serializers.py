from rest_framework import serializers

from .models import User
from .services import calculate_daily_goal_targets


class UserProfileSerializer(serializers.ModelSerializer):
    bmr = serializers.SerializerMethodField()
    tdee = serializers.SerializerMethodField()
    daily_goal_calories = serializers.SerializerMethodField()
    calorias_objetivo = serializers.SerializerMethodField()
    daily_goal_preview = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "weight_kg",
            "height_cm",
            "age",
            "gender",
            "activity_level",
            "goal",
            "bmr",
            "tdee",
            "daily_goal_calories",
            "calorias_objetivo",
            "daily_goal_preview",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "bmr",
            "tdee",
            "daily_goal_calories",
            "calorias_objetivo",
            "created_at",
            "updated_at",
            "daily_goal_preview",
        )

    def _get_targets(self, obj: User):
        cache = getattr(self, "_goal_target_cache", {})
        cache_key = obj.pk or id(obj)
        if cache_key not in cache:
            cache[cache_key] = calculate_daily_goal_targets(obj)
            self._goal_target_cache = cache
        return cache[cache_key]

    def get_daily_goal_preview(self, obj: User):
        return self._get_targets(obj)

    def get_bmr(self, obj: User):
        return self._get_targets(obj)["bmr"]

    def get_tdee(self, obj: User):
        return self._get_targets(obj)["tdee"]

    def get_daily_goal_calories(self, obj: User):
        return self._get_targets(obj)["daily_goal_calories"]

    def get_calorias_objetivo(self, obj: User):
        return self._get_targets(obj)["calorias_objetivo"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "weight_kg",
            "height_cm",
            "age",
            "gender",
            "activity_level",
            "goal",
        )

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
