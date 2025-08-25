#!/usr/bin/env python3
"""
Тестирование отправки SSE событий между пользователями
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

def test_sse_broadcast():
    """Тестируем отправку SSE событий"""
    
    # Получаем пользователей
    try:
        manager = User.objects.get(email='manager@example.com')
        foreman = User.objects.get(email='foreman@example.com')
        
        print(f"Менеджер: {manager.email} (ID: {manager.user_id}, Роль: {manager.role.role_name})")
        print(f"Прораб: {foreman.email} (ID: {foreman.user_id}, Роль: {foreman.role.role_name})")
        
        # Проверяем текущие подключения
        print("\n=== Текущие SSE подключения ===")
        stats = sse_manager.get_stats()
        print(f"Всего подключений: {stats['total_connections']}")
        print(f"Подключенные пользователи: {stats['users']}")
        
        # Создаем тестовую смету
        project = Project.objects.first()
        status = Status.objects.filter(status_name='Черновик').first()
        if not status:
            status = Status.objects.first()
            
        if project and status:
            print(f"\n=== Создаем тестовую смету ===")
            print(f"Проект: {project.project_name}")
            print(f"Статус: {status.status_name}")
            
            # Создаем смету от имени прораба
            test_estimate = Estimate.objects.create(
                project=project,
                estimate_number=f"SSE_Test_{int(time.time())}",
                creator=foreman,
                foreman=foreman,
                status=status
            )
            
            print(f"✅ Создана смета: {test_estimate.estimate_number}")
            print(f"   ID: {test_estimate.estimate_id}")
            print(f"   Создатель: {test_estimate.creator.email}")
            print(f"   Прораб: {test_estimate.foreman.email}")
            
            # SSE события должны отправиться автоматически через сигналы
            print("\n⚡ SSE события должны быть отправлены автоматически через Django сигналы")
            
            # Ждем немного для обработки
            time.sleep(1)
            
            # Проверяем статистику после создания
            stats_after = sse_manager.get_stats()
            print(f"\n=== SSE статистика после создания ===")
            print(f"Подключения: {stats_after}")
            
    except User.DoesNotExist as e:
        print(f"❌ Ошибка: Пользователь не найден - {e}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sse_broadcast()