"""Query-string filters for the task list, e.g. ?status=done&due_before=2026-12-31."""
import django_filters

from .models import Task


class TaskFilter(django_filters.FilterSet):
    due_before = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    due_after = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")

    class Meta:
        model = Task
        fields = ("status", "priority", "due_before", "due_after")
