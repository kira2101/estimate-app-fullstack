#!/usr/bin/env python3
"""
Тестирование SSE напрямую
"""
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.sse_views import sse_manager
from api.models import User

# Получаем пользователей
try:
    manager = User.objects.get(email='manager@example.com')
    foreman = User.objects.get(email='foreman@example.com')
    
    print(f"Менеджер: {manager.email} (ID: {manager.user_id})")
    print(f"Прораб: {foreman.email} (ID: {foreman.user_id})")
    
    # Проверяем SSEManager
    print("\n=== Состояние SSEManager ===")
    stats = sse_manager.get_stats()
    print(f"Статистика подключений: {stats}")
    
    # Пробуем отправить тестовое событие
    print("\n=== Отправка тестового события ===")
    sse_manager.broadcast_to_all(
        event_type='test.message',
        data={'message': 'Тестовое SSE событие', 'timestamp': '2025-08-24T20:00:00'}
    )
    print("Событие отправлено (если есть подключенные клиенты)")
    
except User.DoesNotExist as e:
    print(f"Ошибка: Пользователь не найден - {e}")
except Exception as e:
    print(f"Ошибка: {e}")