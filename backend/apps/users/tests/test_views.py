import pytest
from django.conf import settings
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_login_with_invalid_credentials_returns_401():
    client = APIClient()

    response = client.post(
        "/api/v1/auth/login/",
        {"username": "missing-user", "password": "wrongpass123"},
        format="json",
    )

    assert response.status_code == 401
    assert response.data["message"] == "Invalid username or password."


@pytest.mark.django_db
@override_settings(PUBLIC_DEMO_ENABLED=False)
def test_demo_login_returns_404_when_public_demo_is_disabled():
    client = APIClient()

    response = client.post("/api/v1/auth/demo-login/", format="json")

    assert response.status_code == 404
    assert response.data["message"] == "Public demo is not enabled."


@pytest.mark.django_db
@override_settings(PUBLIC_DEMO_ENABLED=True, PUBLIC_DEMO_USERNAME="demo")
def test_demo_login_creates_session_for_anonymous_visitors():
    client = APIClient()

    response = client.post("/api/v1/auth/demo-login/", format="json")

    assert response.status_code == 200
    assert response.data["message"] == "Demo login successful."
    assert response.data["user"]["username"] == "demo"
    assert settings.SIMPLE_JWT["AUTH_COOKIE_ACCESS"] in response.cookies
    assert settings.SIMPLE_JWT["AUTH_COOKIE_REFRESH"] in response.cookies

    profile_response = client.get("/api/v1/auth/me/")

    assert profile_response.status_code == 200
    assert profile_response.data["username"] == "demo"
