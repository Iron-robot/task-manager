"""Converts Task objects to/from JSON and validates input."""
from django.utils import timezone
from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    # Read-only extras for the UI. owner is never accepted from the client;
    # the view sets it from the logged-in user.
    owner = serializers.ReadOnlyField(source="owner.username")
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "owner", "title", "description",
            "status", "status_display", "priority", "priority_display",
            "due_date", "created_at", "updated_at",
        )
        read_only_fields = ("id", "owner", "created_at", "updated_at")

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be blank.")
        return value

    def validate_due_date(self, value):
        # Only block past dates on new tasks, so old tasks can still be edited.
        if value and self.instance is None and value < timezone.localdate():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value
