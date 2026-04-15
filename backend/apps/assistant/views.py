from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import AssistantChatRequestSerializer, ConversationMessageSerializer
from .services import build_today_summary, build_user_context, create_conversation_turn, get_recent_messages


class AssistantViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get", "post"])
    def chat(self, request):
        if request.method == "GET":
            context = build_user_context(request.user)
            messages = get_recent_messages(request.user)
            return Response(
                {
                    "messages": ConversationMessageSerializer(messages, many=True).data,
                    "today_summary": build_today_summary(context),
                }
            )

        serializer = AssistantChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assistant_message = create_conversation_turn(
            request.user,
            serializer.validated_data["message"],
        )
        context = build_user_context(request.user)
        messages = get_recent_messages(request.user)

        return Response(
            {
                "message": ConversationMessageSerializer(assistant_message).data,
                "messages": ConversationMessageSerializer(messages, many=True).data,
                "today_summary": build_today_summary(context),
            },
            status=status.HTTP_201_CREATED,
        )
