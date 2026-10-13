import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
PASSWORD = "Str0ng-pass-123"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_register_creates_user_with_hashed_password(api_client):
    res = api_client.post("/api/auth/register/", {
        "username": "alice", "email": "alice@example.com",
        "password": PASSWORD, "password2": PASSWORD,
    }, format="json")

    assert res.status_code == 201
    user = User.objects.get(username="alice")
    assert user.password != PASSWORD          # stored hashed
    assert user.check_password(PASSWORD)
    assert "password" not in res.data         # never echoed back


@pytest.mark.django_db
def test_register_rejects_mismatched_passwords(api_client):
    res = api_client.post("/api/auth/register/", {
        "username": "bob", "email": "bob@example.com",
        "password": PASSWORD, "password2": "different-123",
    }, format="json")

    assert res.status_code == 400
    assert "password2" in res.data


@pytest.mark.django_db
def test_login_returns_tokens_and_me_works(api_client):
    User.objects.create_user("carol", "carol@example.com", PASSWORD)

    res = api_client.post("/api/auth/login/", {"username": "carol", "password": PASSWORD}, format="json")
    assert res.status_code == 200
    assert {"access", "refresh"} <= res.data.keys()

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    me = api_client.get("/api/auth/me/")
    assert me.status_code == 200
    assert me.data["username"] == "carol"


@pytest.mark.django_db
def test_login_with_wrong_password_fails(api_client):
    User.objects.create_user("dave", "dave@example.com", PASSWORD)
    res = api_client.post("/api/auth/login/", {"username": "dave", "password": "nope"}, format="json")
    assert res.status_code == 401


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(api_client):
    User.objects.create_user("erin", "erin@example.com", PASSWORD)
    tokens = api_client.post("/api/auth/login/", {"username": "erin", "password": PASSWORD}, format="json").data

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    res = api_client.post("/api/auth/logout/", {"refresh": tokens["refresh"]}, format="json")
    assert res.status_code == 205

    # The old refresh token can no longer be used to get new access tokens.
    res = api_client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
    assert res.status_code == 401
