import pytest
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
