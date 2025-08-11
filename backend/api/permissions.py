from rest_framework.permissions import BasePermission

class IsAuthenticatedCustom(BasePermission):
    """
    Custom permission to only allow access to authenticated users.
    """
    def has_permission(self, request, view):
        # Наша кастомная аутентификация возвращает юзера, если токен валиден.
        # Поэтому достаточно проверить, что request.user существует и не анонимен.
        return bool(request.user and request.user.is_authenticated)

class IsManager(BasePermission):
    """
    Allows access only to users with the 'manager' role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role.role_name == 'менеджер'
        )

class CanAccessEstimate(BasePermission):
    """
    Проверяет, может ли пользователь работать с конкретной сметой.
    Менеджеры видят все сметы, прорабы - только назначенные им.
    """
    def has_object_permission(self, request, view, obj):
        # Менеджеры имеют доступ ко всем сметам
        if request.user.role.role_name == 'менеджер':
            return True
            
        # Прорабы имеют доступ только к сметам, где они назначены прорабом
        return obj.foreman == request.user