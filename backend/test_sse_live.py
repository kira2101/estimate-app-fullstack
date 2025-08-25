#!/usr/bin/env python3
"""
Живое тестирование SSE с созданием реальной сметы
"""
import os
import sys
import django
import time
import threading

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, Estimate, Project, Status, AuthToken
from api.sse_views import sse_manager
import requests
import json

def listen_sse(token_str):
    """Слушаем SSE события в отдельном потоке"""
    sse_url = f'http://localhost:8000/api/v1/sse/events/?token={token_str}'
    print(f"🎧 Подключаемся к SSE: {sse_url[:50]}...")
    
    try:
        headers = {'Accept': 'text/event-stream', 'Cache-Control': 'no-cache'}
        response = requests.get(sse_url, headers=headers, stream=True, timeout=30)
        
        if response.status_code == 200:
            print("✅ SSE подключен, слушаем события...")
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        try:
                            data = json.loads(decoded_line[6:])
                            if data.get('event') != 'keepalive':
                                print(f"📨 SSE Событие: {data.get('event')} - {data}")
                        except json.JSONDecodeError:
                            pass
    except Exception as e:
        print(f"❌ SSE ошибка: {e}")

def test_sse_with_estimate():
    """Тестируем SSE с созданием реальной сметы"""
    
    print("=== Тестирование SSE с реальной сметой ===\n")
    
    # Получаем пользователей
    try:
        # Менеджер будет слушать события
        manager = User.objects.get(email='manager@example.com')
        manager_token = AuthToken.objects.filter(user=manager).first()
        
        # Прораб будет создавать смету
        foreman = User.objects.get(email='foreman@example.com')
        
        print(f"👨‍💼 Менеджер: {manager.email} (ID: {manager.user_id})")
        print(f"👷 Прораб: {foreman.email} (ID: {foreman.user_id})")
        
        # Запускаем SSE listener для менеджера в отдельном потоке
        if manager_token:
            listener_thread = threading.Thread(
                target=listen_sse, 
                args=(str(manager_token.token),),
                daemon=True
            )
            listener_thread.start()
            print("🎧 SSE listener запущен для менеджера\n")
            
            # Даем время на подключение
            time.sleep(2)
        
        # Проверяем активные SSE подключения
        stats = sse_manager.get_stats()
        print(f"📊 SSE подключения до создания сметы:")
        print(f"   Всего: {stats['total_connections']}")
        if stats['users']:
            for user_id, connections in stats['users'].items():
                try:
                    user = User.objects.get(user_id=user_id)
                    print(f"   - {user.email}: {connections} подключений")
                except:
                    pass
        
        # Создаем тестовую смету от имени прораба
        project = Project.objects.first()
        status = Status.objects.filter(status_name='Черновик').first()
        
        if project and status:
            print(f"\n📝 Создаем смету от имени прораба...")
            print(f"   Проект: {project.project_name}")
            print(f"   Статус: {status.status_name}")
            
            # Создаем смету
            estimate = Estimate.objects.create(
                project=project,
                estimate_number=f"SSE_Live_Test_{int(time.time())}",
                creator=foreman,
                foreman=foreman,
                status=status
            )
            
            print(f"✅ Смета создана: {estimate.estimate_number}")
            print(f"   ID: {estimate.estimate_id}")
            
            # Ждем обработки события
            print("\n⏳ Ждем 3 секунды для обработки SSE событий...")
            time.sleep(3)
            
            # Проверяем статистику после создания
            stats_after = sse_manager.get_stats()
            print(f"\n📊 SSE подключения после создания сметы:")
            print(f"   Всего: {stats_after['total_connections']}")
            
            # Удаляем тестовую смету
            print(f"\n🗑️ Удаляем тестовую смету...")
            estimate.delete()
            print("✅ Смета удалена")
            
            # Ждем обработки события удаления
            time.sleep(2)
            
    except User.DoesNotExist as e:
        print(f"❌ Пользователь не найден: {e}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sse_with_estimate()
    print("\n✅ Тест завершен")