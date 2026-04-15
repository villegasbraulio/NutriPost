from rest_framework import serializers

from .models import ConversationMessage


class ConversationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationMessage
        fields = ("id", "role", "content", "created_at")
        read_only_fields = fields


class AssistantChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_message(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Please enter a message for NutriCoach.")
        return cleaned
