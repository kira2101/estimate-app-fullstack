"""
Декораторы безопасности для дополнительной защиты критических операций.
"""

from functools import wraps
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
import logging

# Настройка логгеров
security_logger = logging.getLogger('security')
audit_logger = logging.getLogger('audit')

def ensure_estimate_access(func):
    """
    Декоратор для проверки доступа к смете.
    Используется как дополнительная защита в методах ViewSet.
    """
    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        from .models import Estimate
        from .permissions import CanAccessEstimate
        
        # Получаем ID сметы из разных источников
        estimate_id = (
            kwargs.get('estimate_id') or 
            kwargs.get('pk') or 
            request.data.get('estimate_id') or
            getattr(request, 'estimate_id', None)
        )
        
        if estimate_id:
            try:
                estimate = Estimate.objects.get(pk=estimate_id)
                permission_check = CanAccessEstimate()
                
                if not permission_check.has_object_permission(request, self, estimate):
                    audit_logger.warning(
                        f"БЛОКИРОВАН: Несанкционированная попытка доступа к смете {estimate_id} "
                        f"пользователем {request.user.email} в методе {func.__name__}"
                    )
                    raise DRFPermissionDenied("Нет доступа к данной смете")
                    
            except Estimate.DoesNotExist:
                security_logger.error(
                    f"Попытка доступа к несуществующей смете {estimate_id} "
                    f"пользователем {request.user.email}"
                )
                raise DRFPermissionDenied("Смета не найдена")
        
        return func(self, request, *args, **kwargs)
    return wrapper

def audit_critical_action(action_name):
    """
    Декоратор для аудита критически важных действий.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            user_email = getattr(request.user, 'email', 'unknown')
            user_role = getattr(getattr(request.user, 'role', None), 'role_name', 'unknown')
            
            # Логируем начало операции
            audit_logger.info(
                f"НАЧАЛО {action_name}: Пользователь {user_email} (роль: {user_role}) "
                f"выполняет {func.__name__} с параметрами: args={args}, kwargs={kwargs}"
            )
            
            try:
                result = func(self, request, *args, **kwargs)
                
                # Логируем успешное завершение
                audit_logger.info(
                    f"УСПЕХ {action_name}: Пользователь {user_email} успешно выполнил {func.__name__}"
                )
                
                return result
                
            except Exception as e:
                # Логируем ошибку
                security_logger.error(
                    f"ОШИБКА {action_name}: Пользователь {user_email} получил ошибку при выполнении {func.__name__}: {str(e)}"
                )
                raise
                
        return wrapper
    return decorator

def rate_limit_user(max_requests_per_minute=60):
    """
    Простой декоратор для ограничения частоты запросов пользователя.
    """
    from django.core.cache import cache
    from django.http import HttpResponse
    import time
    
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            user_id = getattr(request.user, 'user_id', None)
            if not user_id:
                return func(self, request, *args, **kwargs)
            
            # Создаем ключ для кэша
            cache_key = f"rate_limit_user_{user_id}"
            current_time = int(time.time() / 60)  # Текущая минута
            
            # Получаем данные из кэша
            cache_data = cache.get(cache_key, {'minute': current_time, 'count': 0})
            
            # Если новая минута, сбрасываем счетчик
            if cache_data['minute'] != current_time:
                cache_data = {'minute': current_time, 'count': 0}
            
            # Проверяем лимит
            if cache_data['count'] >= max_requests_per_minute:
                security_logger.warning(
                    f"RATE LIMIT: Превышен лимит запросов для пользователя {request.user.email} "
                    f"({cache_data['count']} запросов в минуту)"
                )
                return HttpResponse("Too Many Requests", status=429)
            
            # Увеличиваем счетчик
            cache_data['count'] += 1
            cache.set(cache_key, cache_data, 60)  # Сохраняем на минуту
            
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator

def require_role(required_role):
    """
    Декоратор для проверки роли пользователя.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            user_role = getattr(getattr(request.user, 'role', None), 'role_name', None)
            
            if user_role != required_role:
                security_logger.warning(
                    f"ОТКАЗ В ДОСТУПЕ: Пользователь {request.user.email} (роль: {user_role}) "
                    f"попытался получить доступ к ресурсу, требующему роль '{required_role}'"
                )
                raise DRFPermissionDenied(f"Требуется роль: {required_role}")
            
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator

def log_data_change(model_name):
    """
    Декоратор для логирования изменений в важных данных.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            user_email = getattr(request.user, 'email', 'unknown')
            
            # Получаем данные запроса для логирования
            request_data = getattr(request, 'data', {})
            
            audit_logger.info(
                f"ИЗМЕНЕНИЕ ДАННЫХ {model_name}: Пользователь {user_email} "
                f"изменяет данные через {func.__name__}. Данные: {request_data}"
            )
            
            result = func(self, request, *args, **kwargs)
            
            audit_logger.info(
                f"ЗАВЕРШЕНО ИЗМЕНЕНИЕ {model_name}: Пользователь {user_email} "
                f"успешно выполнил изменения"
            )
            
            return result
        return wrapper
    return decorator