"""
Server-Sent Events (SSE) views for real-time notifications
"""

import json
import time
import logging
from django.http import HttpResponse, StreamingHttpResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .permissions import IsAuthenticatedCustom
from .models import User, Estimate, Project
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import threading
import queue
import uuid

# Глобальные переменные для управления SSE подключениями
sse_clients = {}  # {user_id: {connection_id: queue}}
logger = logging.getLogger('api.sse')

class SSEManager:
    """Менеджер для управления SSE подключениями и отправки событий"""
    
    def __init__(self):
        self.clients = {}  # {user_id: {connection_id: queue}}
        self.lock = threading.Lock()
    
    def add_client(self, user_id, connection_id):
        """Добавить нового клиента"""
        with self.lock:
            if user_id not in self.clients:
                self.clients[user_id] = {}
            
            # Создаем очередь для этого подключения
            client_queue = queue.Queue(maxsize=100)
            self.clients[user_id][connection_id] = client_queue
            
            logger.info(f"SSE Client added: user_id={user_id}, connection_id={connection_id}")
            return client_queue
    
    def remove_client(self, user_id, connection_id):
        """Удалить клиента"""
        with self.lock:
            if user_id in self.clients and connection_id in self.clients[user_id]:
                del self.clients[user_id][connection_id]
                
                # Если у пользователя не осталось подключений, удаляем его из словаря
                if not self.clients[user_id]:
                    del self.clients[user_id]
                
                logger.info(f"SSE Client removed: user_id={user_id}, connection_id={connection_id}")
    
    def broadcast_to_user(self, user_id, event_type, data):
        """Отправить событие конкретному пользователю"""
        with self.lock:
            if user_id in self.clients:
                event_data = {
                    'event': event_type,
                    'data': data,
                    'timestamp': time.time()
                }
                
                # Отправляем всем подключениям этого пользователя
                for connection_id, client_queue in list(self.clients[user_id].items()):
                    try:
                        client_queue.put_nowait(event_data)
                        logger.debug(f"Event sent to user {user_id}, connection {connection_id}: {event_type}")
                    except queue.Full:
                        # Если очередь переполнена, удаляем подключение
                        logger.warning(f"Queue full for user {user_id}, connection {connection_id}. Removing client.")
                        del self.clients[user_id][connection_id]
    
    def broadcast_to_role(self, role_name, event_type, data, exclude_user_id=None):
        """Отправить событие всем пользователям с определенной ролью"""
        try:
            users_with_role = User.objects.filter(role__role_name=role_name)
            if exclude_user_id:
                users_with_role = users_with_role.exclude(user_id=exclude_user_id)
            
            for user in users_with_role:
                self.broadcast_to_user(user.user_id, event_type, data)
                
        except Exception as e:
            logger.error(f"Error broadcasting to role {role_name}: {e}")
    
    def broadcast_to_all(self, event_type, data, exclude_user_id=None):
        """Отправить событие всем подключенным пользователям"""
        with self.lock:
            for user_id in list(self.clients.keys()):
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                self.broadcast_to_user(user_id, event_type, data)
    
    def get_stats(self):
        """Получить статистику подключений"""
        with self.lock:
            total_connections = sum(len(connections) for connections in self.clients.values())
            return {
                'total_users': len(self.clients),
                'total_connections': total_connections,
                'users': {user_id: len(connections) for user_id, connections in self.clients.items()}
            }

# Глобальный экземпляр менеджера
sse_manager = SSEManager()


@method_decorator(never_cache, name='dispatch')
class SSEView(View):
    """
    Server-Sent Events endpoint для получения real-time уведомлений
    """
    
    def get(self, request):
        logger.info(f"SSE GET request received from {request.META.get('REMOTE_ADDR')}")
        logger.info(f"SSE Request headers: {request.META}")
        
        # Проверяем аутентификацию - пробуем несколько способов
        from .authentication import CustomTokenAuthentication
        from .models import AuthToken
        
        user = None
        
        # Способ 1: Стандартная аутентификация через заголовок
        auth = CustomTokenAuthentication()
        try:
            user_auth = auth.authenticate(request)
            if user_auth:
                user, token = user_auth
        except Exception as e:
            logger.debug(f"SSE Header auth failed: {e}")
        
        # Способ 2: Токен через URL параметр (для EventSource)
        if not user:
            token_param = request.GET.get('token')
            logger.info(f"SSE: Trying URL token auth, token param: {token_param[:20] if token_param else None}...")
            if token_param:
                try:
                    auth_token = AuthToken.objects.select_related('user').get(token=token_param)
                    user = auth_token.user
                    logger.info(f"SSE URL auth successful for user: {user.email}")
                except AuthToken.DoesNotExist:
                    logger.error(f"SSE URL auth failed: invalid token")
        
        if not user:
            logger.error("SSE Authentication failed: no valid user found")
            return HttpResponse(status=401)
        
        # Генерируем уникальный ID для этого подключения
        connection_id = str(uuid.uuid4())
        
        def event_stream():
            """Генератор для стриминга SSE событий"""
            logger.info(f"SSE: Starting event stream for user {user.email} (ID: {user.user_id})")
            
            # Добавляем клиента в менеджер
            client_queue = sse_manager.add_client(user.user_id, connection_id)
            
            try:
                # Отправляем начальное сообщение
                yield f"data: {json.dumps({'event': 'connected', 'message': 'SSE connection established'})}\n\n"
                
                # Основной цикл получения событий
                while True:
                    try:
                        # Ждем события из очереди (таймаут 5 сек для keep-alive)
                        event_data = client_queue.get(timeout=5)
                        
                        # Форматируем и отправляем событие
                        sse_data = json.dumps(event_data)
                        yield f"data: {sse_data}\n\n"
                        
                    except queue.Empty:
                        # Отправляем keep-alive сообщение
                        keep_alive = {
                            'event': 'keepalive',
                            'timestamp': time.time()
                        }
                        yield f"data: {json.dumps(keep_alive)}\n\n"
                        
            except GeneratorExit:
                # Клиент отключился
                logger.info(f"SSE Client disconnected: user_id={user.user_id}, connection_id={connection_id}")
            except Exception as e:
                logger.error(f"SSE Stream error for user {user.user_id}: {e}")
            finally:
                # Удаляем клиента из менеджера
                sse_manager.remove_client(user.user_id, connection_id)
        
        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream; charset=utf-8'
        )
        
        # Настраиваем заголовки для SSE
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['X-Accel-Buffering'] = 'no'  # Отключаем буферизацию для nginx
        
        # CORS заголовки
        origin = request.META.get('HTTP_ORIGIN', '*')
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Cache-Control, Content-Type, Authorization'
        
        return response


@api_view(['GET'])
@permission_classes([IsAuthenticatedCustom])
def sse_stats(request):
    """Получить статистику SSE подключений (для отладки)"""
    stats = sse_manager.get_stats()
    return Response(stats)


# Signal handlers для автоматической отправки событий при изменениях в БД

@receiver(post_save, sender=Estimate)
def handle_estimate_save(sender, instance, created, **kwargs):
    """Обработчик сохранения сметы"""
    print(f"🚨 SSE Signal received: Estimate save, created={created}, id={instance.estimate_id}")
    logger.info(f"Signal received: Estimate save, created={created}, id={instance.estimate_id}")
    
    # Запускаем обработку в отдельном потоке чтобы не блокировать основной запрос
    def send_sse_async():
        try:
            print(f"🚀 SSE async thread started for estimate {instance.estimate_id}")
            event_type = 'estimate.created' if created else 'estimate.updated'
            
            # Подготавливаем данные события
            event_data = {
                'estimate_id': instance.estimate_id,
                'estimate_number': instance.estimate_number,
                'name': instance.estimate_number,  # Используем estimate_number как имя
                'project_id': instance.project.project_id if instance.project else None,
                'project_name': instance.project.project_name if instance.project else None,
                'foreman_id': instance.foreman.user_id if instance.foreman else None,
                'foreman_name': instance.foreman.full_name if instance.foreman else None,
                'creator_id': instance.creator.user_id if instance.creator else None,
                'creator_name': instance.creator.full_name if instance.creator else None,
                'status': instance.status.status_name if instance.status else None,
                'created_at': instance.created_at.isoformat() if instance.created_at else None
            }
            
            # Отправляем событие всем подключенным пользователям, кроме того, кто создал/изменил
            # Это обеспечит синхронизацию между всеми пользователями
            current_user_id = None
            
            # Определяем, кто сделал изменение
            if created and instance.creator:
                current_user_id = instance.creator.user_id
            elif not created and hasattr(instance, '_current_user'):
                # Если есть информация о текущем пользователе (добавим позже)
                current_user_id = getattr(instance, '_current_user', None)
            
            # Отправляем всем пользователям кроме инициатора
            sse_manager.broadcast_to_all(
                event_type=event_type,
                data=event_data,
                exclude_user_id=current_user_id
            )
            
            print(f"✅ SSE Event broadcast completed: {event_type} for estimate {instance.estimate_id}")
            logger.info(f"SSE Event broadcast to all users: {event_type} for estimate {instance.estimate_id}, exclude_user={current_user_id}")
            
            logger.info(f"SSE Event sent: {event_type} for estimate {instance.estimate_id}")
            
        except Exception as e:
            logger.error(f"Error sending SSE event for estimate save: {e}")
    
    # Запускаем в отдельном потоке
    thread = threading.Thread(target=send_sse_async)
    thread.daemon = True
    thread.start()


@receiver(post_delete, sender=Estimate)
def handle_estimate_delete(sender, instance, **kwargs):
    """Обработчик удаления сметы"""
    def send_sse_async():
        try:
            event_data = {
                'estimate_id': instance.estimate_id,
                'estimate_number': instance.estimate_number,
                'project_id': instance.project.project_id if instance.project else None,
                'foreman_id': instance.foreman.user_id if instance.foreman else None,
            }
            
            # Уведомляем всех пользователей об удалении
            sse_manager.broadcast_to_all(
                event_type='estimate.deleted',
                data=event_data
            )
            
            logger.info(f"SSE Event sent: estimate.deleted for estimate {instance.estimate_id}")
            
        except Exception as e:
            logger.error(f"Error sending SSE event for estimate delete: {e}")
    
    # Запускаем в отдельном потоке
    thread = threading.Thread(target=send_sse_async)
    thread.daemon = True
    thread.start()


@receiver(post_save, sender=Project)
def handle_project_save(sender, instance, created, **kwargs):
    """Обработчик сохранения проекта"""
    try:
        event_type = 'project.created' if created else 'project.updated'
        
        event_data = {
            'project_id': instance.project_id,
            'project_name': instance.project_name,
            'address': getattr(instance, 'address', ''),
            'description': getattr(instance, 'description', ''),
            'created_at': instance.created_at.isoformat() if hasattr(instance, 'created_at') and instance.created_at else None
        }
        
        # Уведомляем всех аутентифицированных пользователей
        sse_manager.broadcast_to_all(
            event_type=event_type,
            data=event_data
        )
        
        logger.info(f"SSE Event sent: {event_type} for project {instance.project_id}")
        
    except Exception as e:
        logger.error(f"Error sending SSE event for project save: {e}")


# Функции для ручной отправки событий (можно вызывать из views)

def notify_estimate_event(event_type, estimate, exclude_user_id=None):
    """Ручная отправка события сметы"""
    event_data = {
        'estimate_id': estimate.estimate_id,
        'estimate_number': estimate.estimate_number,
        'project_id': estimate.project.project_id if estimate.project else None,
        'project_name': estimate.project.project_name if estimate.project else None,
        'foreman_id': estimate.foreman.user_id if estimate.foreman else None,
        'status': estimate.status.status_name if estimate.status else None
    }
    
    sse_manager.broadcast_to_all(
        event_type=event_type,
        data=event_data,
        exclude_user_id=exclude_user_id
    )


def notify_user_role(role_name, event_type, data, exclude_user_id=None):
    """Отправка события пользователям с определенной ролью"""
    sse_manager.broadcast_to_role(role_name, event_type, data, exclude_user_id)