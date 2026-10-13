from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """Object-level check: only the task's owner may view or change it."""

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id
