"""Database model for a user's task."""
from django.conf import settings
from django.db import models


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,  # deleting a user deletes their tasks
        related_name="tasks",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        # Every query starts with "WHERE owner_id = ?", so each index leads with
        # owner and then the column we filter or sort by.
        indexes = [
            models.Index(fields=["owner", "status"], name="task_owner_status_idx"),
            models.Index(fields=["owner", "priority"], name="task_owner_priority_idx"),
            models.Index(fields=["owner", "due_date"], name="task_owner_due_idx"),
            models.Index(fields=["owner", "-created_at"], name="task_owner_created_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
