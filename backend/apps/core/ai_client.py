import re
from dataclasses import dataclass

from django.conf import settings
from openai import OpenAI
from rest_framework.exceptions import APIException


class GroqServiceError(APIException):
    status_code = 503
    default_code = "groq_unavailable"
    default_detail = "NutriCoach is temporarily unavailable right now."


def get_configured_api_key() -> str:
    """Return a usable Groq API key or raise a clear API error for missing backend config."""

    api_key = getattr(settings, "GROQ_API_KEY", "").strip()
    if not api_key or api_key in {"your_key_here", "your_groq_api_key_here"}:
        raise GroqServiceError("Groq API key is not configured on the backend.")
    return api_key


def sanitize_provider_error(exc: Exception) -> str:
    """Return a browser-safe provider error message without leaking secrets."""

    raw_message = str(exc) or exc.__class__.__name__
    safe_message = re.sub(r"gsk_[0-9A-Za-z_-]{20,}", "gsk_***", raw_message)
    safe_message = re.sub(r"(?i)(api[_-]?key=)[^&\s]+", r"\1***", safe_message)
    safe_message = safe_message.strip()
    if len(safe_message) > 700:
        safe_message = f"{safe_message[:700]}..."
    return f"{exc.__class__.__name__}: {safe_message}"


def raise_groq_error(prefix: str, exc: Exception):
    """Raise a consistent APIException with enough context for browser console debugging."""

    raise GroqServiceError(f"{prefix} {sanitize_provider_error(exc)}") from exc


@dataclass
class GroqResponse:
    text: str


class GroqModel:
    """OpenAI-compatible Groq adapter so app services keep a provider-neutral interface."""

    def __init__(self, *, system_instruction=None, temperature=0.7, model_name=None, max_tokens=1000):
        self.model_name = model_name or settings.GROQ_MODEL_NAME
        self.system_instruction = system_instruction
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.client = OpenAI(
            api_key=get_configured_api_key(),
            base_url=settings.GROQ_API_BASE_URL,
        )

    def start_chat(self, history=None):
        messages = []
        if self.system_instruction:
            messages.append({"role": "system", "content": self.system_instruction})

        for item in history or []:
            role = "assistant" if item.get("role") in {"assistant", "model"} else "user"
            parts = item.get("parts") or []
            content = "\n".join(
                part.get("text", str(part)) if isinstance(part, dict) else str(part)
                for part in parts
            ).strip()
            if content:
                messages.append({"role": role, "content": content})

        return GroqChat(
            client=self.client,
            model_name=self.model_name,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

    def generate_messages(self, messages: list[dict]):
        prepared_messages = []
        if self.system_instruction:
            prepared_messages.append({"role": "system", "content": self.system_instruction})
        prepared_messages.extend(messages)

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=prepared_messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
        except Exception as exc:  # pragma: no cover - provider/network failures depend on runtime state
            raise_groq_error("Groq could not complete the request:", exc)

        return GroqResponse(text=response.choices[0].message.content or "")

    def generate_content(self, prompt: str):
        return self.generate_messages([{"role": "user", "content": prompt}])


class GroqChat:
    """Wrap Groq chat calls so provider failures become consistent API errors."""

    def __init__(self, *, client, model_name: str, messages: list[dict], temperature: float, max_tokens: int):
        self.client = client
        self.model_name = model_name
        self.messages = messages
        self.temperature = temperature
        self.max_tokens = max_tokens

    def send_message(self, message: str):
        messages = [*self.messages, {"role": "user", "content": message}]
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
        except Exception as exc:  # pragma: no cover - provider/network failures depend on runtime state
            raise_groq_error("Groq could not complete the chat response:", exc)

        return GroqResponse(text=response.choices[0].message.content or "")


def get_model(system_instruction=None, temperature=0.7):
    """
    Returns a configured Groq model instance.
    Centralized so model name and config are changed in one place.
    """

    return GroqModel(system_instruction=system_instruction, temperature=temperature)


def get_vision_model(system_instruction=None, temperature=0.1):
    """
    Returns a Groq vision-capable model instance for image-based routine parsing.
    """

    return GroqModel(
        system_instruction=system_instruction,
        temperature=temperature,
        model_name=settings.GROQ_VISION_MODEL_NAME,
        max_tokens=1400,
    )
