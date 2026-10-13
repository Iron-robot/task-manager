"""REST API for tasks. One ViewSet gives list, create, retrieve, update and delete."""
from rest_framework import permissions, viewsets

from .filters import TaskFilter
from .models import Task
from .permissions import IsOwner
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwner)
    filterset_class = TaskFilter
    search_fields = ("title",)  # ?search=groceries
    ordering_fields = ("created_at", "due_date", "title")  # ?ordering=-due_date

    def get_queryset(self):
        # Scope every query to the current user: other users' tasks return 404,
        # so we never even reveal that they exist.
        # select_related joins the owner row in the same query, avoiding one
        # extra query per task when the serializer reads owner.username.
        return Task.objects.filter(owner=self.request.user).select_related("owner")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
