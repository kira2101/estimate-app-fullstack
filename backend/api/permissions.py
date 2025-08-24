from rest_framework.permissions import BasePermission
import logging

# Настройка логгеров
security_logger = logging.getLogger('security')
audit_logger = logging.getLogger('audit')

class IsAuthenticatedCustom(BasePermission):
    """
    Custom permission to only allow access to authenticated users.
    """
    def has_permission(self, request, view):
        # Наша кастомная аутентификация возвращает юзера, если токен валиден.
        # Поэтому достаточно проверить, что request.user существует и не анонимен.
        is_authenticated = bool(request.user and request.user.is_authenticated)
        
        if not is_authenticated:
            security_logger.warning(
                f"Неаутентифицированная попытка доступа к {view.__class__.__name__} "
                f"с IP: {request.META.get('REMOTE_ADDR', 'unknown')}"
            )
        
        return is_authenticated

class IsManager(BasePermission):
    """
    Allows access only to users with the 'manager' role.
    """
    def has_permission(self, request, view):
        has_manager_role = bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role.role_name == 'менеджер'
        )
        
        if not has_manager_role and request.user and request.user.is_authenticated:
            security_logger.warning(
                f"Попытка доступа к менеджерскому ресурсу {view.__class__.__name__} "
                f"пользователем {request.user.email} с ролью {getattr(request.user.role, 'role_name', 'unknown')}"
            )
        
        return has_manager_role

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
        has_access = obj.foreman == request.user
        
        if not has_access:
            security_logger.warning(
                f"КРИТИЧНО: Попытка несанкционированного доступа к смете {obj.estimate_id} "
                f"пользователем {request.user.email}. Владелец сметы: {obj.foreman.email}"
            )
        
        return has_access

# НОВЫЕ PERMISSION КЛАССЫ ДЛЯ PRICE CHANGE REQUESTS

class CanCreatePriceRequest(BasePermission):
    """
    Прораб может создавать запросы на изменение цен только на свои сметы.
    """
    def has_permission(self, request, view):
        has_permission = (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and
            request.user.role.role_name == 'прораб'
        )
        
        if not has_permission and request.user and request.user.is_authenticated:
            security_logger.warning(
                f"Попытка создания запроса на изменение цены пользователем {request.user.email} "
                f"с ролью {getattr(request.user.role, 'role_name', 'unknown')}"
            )
        
        return has_permission
    
    def has_object_permission(self, request, view, obj):
        # obj может быть EstimateItem или Estimate
        from .models import Estimate, EstimateItem
        
        if isinstance(obj, EstimateItem):
            estimate = obj.estimate
        elif isinstance(obj, Estimate):
            estimate = obj
        else:
            security_logger.error(f"Неожиданный тип объекта в CanCreatePriceRequest: {type(obj)}")
            return False
        
        has_access = estimate.foreman == request.user
        
        if not has_access:
            security_logger.warning(
                f"КРИТИЧНО: Попытка создания запроса на изменение цены для чужой сметы {estimate.estimate_id} "
                f"пользователем {request.user.email}. Владелец сметы: {estimate.foreman.email}"
            )
        
        return has_access

class CanProcessPriceRequest(BasePermission):
    """
    Менеджер может обрабатывать запросы на изменение цен.
    """
    def has_permission(self, request, view):
        has_permission = (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and
            request.user.role.role_name == 'менеджер'
        )
        
        if not has_permission and request.user and request.user.is_authenticated:
            security_logger.warning(
                f"Попытка обработки запроса на изменение цены пользователем {request.user.email} "
                f"с ролью {getattr(request.user.role, 'role_name', 'unknown')}"
            )
        
        return has_permission

class CanViewOwnPriceRequests(BasePermission):
    """
    Прораб может просматривать только свои запросы на изменение цен.
    Менеджер может просматривать все запросы.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role')
        )
    
    def has_object_permission(self, request, view, obj):
        # obj - это PriceChangeRequest
        user_role = request.user.role.role_name
        
        if user_role == 'менеджер':
            return True
        elif user_role == 'прораб':
            # Прораб может видеть только свои запросы
            has_access = obj.estimate_item.estimate.foreman == request.user
            
            if not has_access:
                security_logger.warning(
                    f"КРИТИЧНО: Попытка просмотра чужого запроса на изменение цены {obj.id} "
                    f"пользователем {request.user.email}"
                )
            
            return has_access
        else:
            security_logger.warning(
                f"Попытка доступа к запросам на изменение цены пользователем {request.user.email} "
                f"с неизвестной ролью: {user_role}"
            )
            return False


class CanEditEstimateItem(BasePermission):
    """
    Permission для редактирования элементов смет с учетом авторства.
    Менеджер может редактировать любые работы.
    Прораб может редактировать только свои работы.
    """
    
    def has_object_permission(self, request, view, obj):
        # obj - это EstimateItem
        user = request.user
        
        # Менеджер может редактировать любые работы
        if user.role.role_name == 'менеджер':
            return True
            
        # Прораб может редактировать только свои работы
        has_access = obj.added_by == user
        
        if not has_access:
            security_logger.warning(
                f"КРИТИЧНО: Попытка несанкционированного редактирования работы {obj.item_id} "
                f"пользователем {user.email}. Автор работы: {obj.added_by.email if obj.added_by else 'Неизвестен'}"
            )
        
        return has_access