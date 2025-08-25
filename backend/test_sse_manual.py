#!/usr/bin/env python3
"""
Ручное тестирование отправки SSE событий
"""
import os
import sys
import django
import time

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, Estimate, Project, Status
from api.sse_views import sse_manager

def send_test_event():
    """Отправляем тестовое SSE событие"""
    
    print("=== Ручная отправка SSE события ===")
    
    # Получаем первый проект
    project = Project.objects.first()
    if not project:
        print("❌ Нет проектов в базе данных")
        return
        
    print(f"📁 Проект: {project.project_name} (ID: {project.project_id})")
    
    # Создаем тестовое событие сметы
    event_data = {
        'estimate_id': 999,  # Тестовый ID
        'estimate_number': f'TEST_{int(time.time())}',
        'project_id': project.project_id,
        'project_name': project.project_name,
        'foreman_id': None,
        'foreman_name': None,
        'creator_id': None,
        'creator_name': None,
        'status': 'Черновик',
        'created_at': None,
        'test_event': True,  # Маркер тестового события
        'message': 'Это тестовое SSE событие для проверки обновления UI'
    }
    
    print("\n📤 Отправляем событие estimate.created для всех пользователей...")
    print(f"   Данные: {event_data}")
    
    # Отправляем событие всем подключенным пользователям
    sse_manager.broadcast_to_all(
        event_type='estimate.created',
        data=event_data
    )
    
    print("✅ Событие отправлено!")
    
    # Проверяем статистику
    stats = sse_manager.get_stats()
    print(f"\n📊 SSE статистика:")
    print(f"   Всего подключений: {stats['total_connections']}")
    if stats['users']:
        print(f"   Подключенные пользователи:")
        for user_id, connections in stats['users'].items():
            try:
                user = User.objects.get(user_id=user_id)
                print(f"     - {user.email} ({user.role.role_name}): {connections} подключений")
            except User.DoesNotExist:
                print(f"     - User ID {user_id}: {connections} подключений")
    else:
        print("   ⚠️ Нет активных SSE подключений!")
        print("   💡 Убедитесь, что пользователи подключены к приложению")

if __name__ == "__main__":
    send_test_event()