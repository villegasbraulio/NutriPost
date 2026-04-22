from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import exception_handler


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


def extract_error_message(details: Any) -> str:
    """Pull the most useful human-readable message from nested DRF validation errors."""

    if isinstance(details, dict):
        for key in ("detail", "message", "non_field_errors", "file", "raw_text"):
            if key in details:
                return extract_error_message(details[key])
        for value in details.values():
            message = extract_error_message(value)
            if message:
                return message
        return ""

    if isinstance(details, list):
        return extract_error_message(details[0]) if details else ""

    return str(details) if details is not None else ""


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response:
    response = exception_handler(exc, context)

    if response is None:
        return Response(
            {
                "error": True,
                "message": "An unexpected error occurred.",
                "code": "server_error",
                "details": {},
            },
            status=500,
        )

    details: Any = response.data
    message = "Request could not be processed."
    code = "api_error"

    if isinstance(details, dict):
        if "detail" in details:
            detail = details["detail"]
            message = str(detail)
            code = getattr(detail, "code", code)
        else:
            message = extract_error_message(details) or "Validation error."
            code = str(details.get("code") or "validation_error")
    elif isinstance(details, list):
        message = extract_error_message(details) or "Validation error."
        code = "validation_error"
    else:
        message = str(details)

    response.data = {
        "error": True,
        "message": message,
        "code": code,
        "details": details if isinstance(details, (dict, list)) else {},
    }
    return response
