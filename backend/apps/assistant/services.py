from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.activities.models import ActivityLog
from apps.core.ai_client import GroqServiceError, get_model, raise_groq_error
from apps.nutrition.models import DailyGoal, FoodLog
from apps.users.services import calculate_daily_goal_targets

from .models import ConversationMessage


def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def build_user_context(user) -> dict:
    """Gather today's activity and nutrition totals for a personalized NutriCoach prompt."""

    today = timezone.localdate()
    activities_today = ActivityLog.objects.filter(user=user, logged_at__date=today).select_related("activity_type")
    foods_today = FoodLog.objects.filter(user=user, logged_at__date=today)
    daily_goal = DailyGoal.objects.filter(user=user, date=today).first()
    goal_preview = calculate_daily_goal_targets(user)

    activity_totals = activities_today.aggregate(total_burned=Sum("calories_burned"))
    food_totals = foods_today.aggregate(
        total_consumed=Sum("calories"),
        protein_consumed=Sum("protein_g"),
        carbs_consumed=Sum("carbs_g"),
        fat_consumed=Sum("fat_g"),
    )

    return {
        "name": user.first_name or "the user",
        "weight_kg": _to_float(user.weight_kg),
        "goal": user.goal,
        "tdee": goal_preview["tdee"],
        "daily_goal_calories": _to_float(daily_goal.calories_goal) if daily_goal else goal_preview["daily_goal_calories"],
        "calories_burned_today": _to_float(activity_totals["total_burned"]),
        "calories_consumed_today": _to_float(food_totals["total_consumed"]),
        "protein_consumed_g": _to_float(food_totals["protein_consumed"]),
        "carbs_consumed_g": _to_float(food_totals["carbs_consumed"]),
        "fat_consumed_g": _to_float(food_totals["fat_consumed"]),
        "activities_today": [
            f"{activity.activity_type.name} ({activity.duration_minutes} min, {round(_to_float(activity.calories_burned), 1)} kcal)"
            for activity in activities_today
        ],
        "foods_today": [
            (
                f"{food.food_name} ({round(_to_float(food.calories), 1)} kcal, "
                f"P:{round(_to_float(food.protein_g), 1)}g "
                f"C:{round(_to_float(food.carbs_g), 1)}g "
                f"F:{round(_to_float(food.fat_g), 1)}g)"
            )
            for food in foods_today
        ],
    }


def build_system_prompt(ctx: dict) -> str:
    """Create the NutriCoach system prompt with live user context for the current day."""

    return f"""
You are NutriCoach, an expert sports nutritionist and dietitian assistant
inside the NutriPost app. You give practical, evidence-based advice.

USER PROFILE:
- Name: {ctx['name']}
- Weight: {ctx['weight_kg']} kg
- Goal: {ctx['goal']} (lose / maintain / gain)
- Daily calorie goal: {ctx['daily_goal_calories']} kcal
- TDEE: {ctx['tdee']} kcal

TODAY'S DATA:
- Calories burned: {ctx['calories_burned_today']} kcal
- Calories consumed: {ctx['calories_consumed_today']} kcal
- Protein: {ctx['protein_consumed_g']}g
- Carbs: {ctx['carbs_consumed_g']}g
- Fat: {ctx['fat_consumed_g']}g
- Activities: {', '.join(ctx['activities_today']) or 'none logged yet'}
- Foods logged: {', '.join(ctx['foods_today']) or 'none logged yet'}

RULES:
- Always answer in the same language the user writes in
- Be warm, encouraging and concise (max 3 paragraphs)
- Base advice on ISSN and ACSM guidelines
- Never recommend intake below the user's BMR
- If asked about medical conditions, recommend a professional
- When suggesting foods, use Open Food Facts-searchable names
- Never invent calorie counts — use ranges if uncertain
""".strip()


def get_recent_messages(user, limit: int = 20) -> list[ConversationMessage]:
    """Return recent chat messages in chronological order for the chat UI."""

    recent_messages = list(
        ConversationMessage.objects.filter(user=user).order_by("-created_at")[:limit]
    )
    return list(reversed(recent_messages))


def build_today_summary(context: dict) -> dict:
    """Map the conversational context into a compact frontend summary card payload."""

    return {
        "daily_goal_calories": context["daily_goal_calories"],
        "calories_burned_today": context["calories_burned_today"],
        "calories_consumed_today": context["calories_consumed_today"],
        "protein_consumed_g": context["protein_consumed_g"],
        "carbs_consumed_g": context["carbs_consumed_g"],
        "fat_consumed_g": context["fat_consumed_g"],
        "activities_today": context["activities_today"],
        "foods_today": context["foods_today"],
    }


def get_ai_response_text(response) -> str:
    """Extract non-empty text from a provider response object."""

    text = getattr(response, "text", "").strip()
    if not text:
        raise GroqServiceError("Groq returned an empty response.")
    return text


def generate_ai_response_text(user, user_message: str) -> str:
    """Send the last 10 chat messages plus the new user input to Groq with full nutrition context."""

    context = build_user_context(user)
    system_prompt = build_system_prompt(context)
    history = ConversationMessage.objects.filter(user=user).order_by("-created_at")[:10]

    chat_history = []
    for message in reversed(history):
        chat_history.append(
            {
                "role": "user" if message.role == ConversationMessage.Role.USER else "assistant",
                "parts": [{"text": message.content}],
            }
        )

    try:
        model = get_model(system_instruction=system_prompt, temperature=0.7)
        chat = model.start_chat(history=chat_history)
        response = chat.send_message(user_message)
    except GroqServiceError:
        raise
    except Exception as exc:  # pragma: no cover - defensive guard around SDK/runtime errors
        raise_groq_error("Groq could not complete the chat response:", exc)
    return get_ai_response_text(response)


def create_conversation_turn(user, user_message: str) -> ConversationMessage:
    """Persist a user message and Groq reply as a single conversation turn."""

    assistant_text = generate_ai_response_text(user, user_message)

    with transaction.atomic():
        ConversationMessage.objects.create(
            user=user,
            role=ConversationMessage.Role.USER,
            content=user_message,
        )
        assistant_message = ConversationMessage.objects.create(
            user=user,
            role=ConversationMessage.Role.ASSISTANT,
            content=assistant_text,
        )

    return assistant_message


def get_ai_response(user, user_message: str) -> str:
    """
    Sends user message to Groq with full nutritional context.
    Keeps last 10 messages as conversation history.
    """

    return create_conversation_turn(user, user_message).content
