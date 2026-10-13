import datetime

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from tasks.models import Task

User = get_user_model()
URL = "/api/tasks/"


@pytest.fixture
def alice(db):
    return User.objects.create_user("alice", "alice@example.com", "Str0ng-pass-123")


@pytest.fixture
def bob(db):
    return User.objects.create_user("bob", "bob@example.com", "Str0ng-pass-123")


@pytest.fixture
def api(alice):
    """An API client already authenticated as alice."""
    client = APIClient()
    client.force_authenticate(user=alice)
    return client


def test_requires_authentication(db):
    assert APIClient().get(URL).status_code == 401


def test_create_sets_owner_from_token(api, alice, bob):
    # Even if a client tries to set "owner", the server uses the logged-in user.
    res = api.post(URL, {"title": "Buy milk", "priority": "high", "owner": bob.id}, format="json")

    assert res.status_code == 201
    task = Task.objects.get(id=res.data["id"])
    assert task.owner == alice
    assert task.status == "todo"  # default


def test_full_crud_cycle(api):
    created = api.post(URL, {"title": "Write report"}, format="json").data
    detail = f"{URL}{created['id']}/"

    assert api.get(detail).data["title"] == "Write report"

    res = api.patch(detail, {"status": "done"}, format="json")
    assert res.status_code == 200
    assert res.data["status"] == "done"

    assert api.delete(detail).status_code == 204
    assert api.get(detail).status_code == 404


def test_users_cannot_see_or_change_each_others_tasks(api, bob):
    bobs_task = Task.objects.create(owner=bob, title="Bob's secret")
    detail = f"{URL}{bobs_task.id}/"

    assert api.get(URL).data["count"] == 0
    assert api.get(detail).status_code == 404
    assert api.patch(detail, {"title": "hacked"}, format="json").status_code == 404
    assert api.delete(detail).status_code == 404
    bobs_task.refresh_from_db()
    assert bobs_task.title == "Bob's secret"


def test_filter_by_status_and_search_by_title(api, alice):
    Task.objects.create(owner=alice, title="Buy groceries", status="todo")
    Task.objects.create(owner=alice, title="Grocery budget", status="done")
    Task.objects.create(owner=alice, title="Call mom", status="done")

    done = api.get(URL, {"status": "done"}).data
    assert {t["title"] for t in done["results"]} == {"Grocery budget", "Call mom"}

    search = api.get(URL, {"search": "grocer"}).data
    assert {t["title"] for t in search["results"]} == {"Buy groceries", "Grocery budget"}

    both = api.get(URL, {"status": "done", "search": "grocer"}).data
    assert [t["title"] for t in both["results"]] == ["Grocery budget"]


def test_list_is_paginated(api, alice):
    Task.objects.bulk_create(Task(owner=alice, title=f"Task {i}") for i in range(15))

    page1 = api.get(URL).data
    assert page1["count"] == 15
    assert len(page1["results"]) == 10
    assert page1["next"] is not None

    page2 = api.get(URL, {"page": 2}).data
    assert len(page2["results"]) == 5


def test_list_query_count_does_not_grow_with_tasks(api, alice):
    """select_related keeps the list at a fixed number of queries (no N+1)."""
    Task.objects.bulk_create(Task(owner=alice, title=f"Task {i}") for i in range(10))

    with CaptureQueriesContext(connection) as ctx:
        res = api.get(URL)
    assert res.status_code == 200
    # One COUNT for pagination + one SELECT joined with the user table.
    assert len(ctx.captured_queries) == 2


def test_validation_errors(api):
    assert api.post(URL, {"title": "   "}, format="json").status_code == 400
    assert api.post(URL, {"title": "x", "status": "someday"}, format="json").status_code == 400

    yesterday = timezone.localdate() - datetime.timedelta(days=1)
    res = api.post(URL, {"title": "Late", "due_date": yesterday.isoformat()}, format="json")
    assert res.status_code == 400
    assert "due_date" in res.data
