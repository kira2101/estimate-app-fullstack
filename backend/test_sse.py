#!/usr/bin/env python3
"""
Простая утилита для тестирования SSE endpoint
"""

import requests
import json
import time
import sys
import os

# Добавляем путь к Django проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from api.models import User, AuthToken

def get_user_token(email):
    """Получить токен пользователя по email"""
    try:
        user = User.objects.get(email=email)
        token, created = AuthToken.objects.get_or_create(user=user)
        return str(token.token)
    except User.DoesNotExist:
        print(f"❌ Пользователь {email} не найден")
        return None

def test_sse_connection(token, timeout=30):
    """Тестировать SSE подключение"""
    url = f"http://127.0.0.1:8000/api/v1/sse/events/?token={token}"
    
    print(f"🔌 Подключение к SSE: {url}")
    
    try:
        response = requests.get(url, stream=True, timeout=timeout)
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"❌ Ошибка подключения: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        print("✅ SSE подключение установлено!")
        print("📨 Ожидание событий...")
        print("   (Нажмите Ctrl+C для выхода)")
        
        start_time = time.time()
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]  # Remove 'data: '
                    try:
                        data = json.loads(data_str)
                        elapsed = time.time() - start_time
                        print(f"📨 [{elapsed:.1f}s] Событие: {data.get('event', 'unknown')}")
                        print(f"   Data: {json.dumps(data, indent=2, ensure_ascii=False)}")
                    except json.JSONDecodeError:
                        print(f"📝 [{elapsed:.1f}s] Raw: {data_str}")
                        
                # Проверяем таймаут
                if time.time() - start_time > timeout:
                    print(f"⏰ Таймаут {timeout}s достигнут")
                    break
                    
    except KeyboardInterrupt:
        print("\n🔌 Соединение закрыто пользователем")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка запроса: {e}")
        return False
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False
    
    return True

def test_sse_stats(token):
    """Тестировать статистику SSE"""
    url = "http://127.0.0.1:8000/api/v1/sse/stats/"
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(url, headers=headers)
        print(f"📊 SSE Stats Status: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print("📈 Статистика SSE:")
            print(f"   Всего пользователей: {stats.get('total_users', 0)}")
            print(f"   Всего подключений: {stats.get('total_connections', 0)}")
            print(f"   По пользователям: {stats.get('users', {})}")
            return True
        else:
            print(f"❌ Ошибка получения статистики: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка запроса статистики: {e}")
        return False

def create_test_estimate(token):
    """Создать тестовую смету для генерации SSE события"""
    url = "http://127.0.0.1:8000/api/v1/estimates/"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Получаем первый проект для теста
    try:
        projects_response = requests.get("http://127.0.0.1:8000/api/v1/projects/", headers=headers)
        if projects_response.status_code == 200:
            projects = projects_response.json()
            if projects.get('results'):
                project_id = projects['results'][0]['project_id']
            else:
                print("❌ Нет доступных проектов для теста")
                return False
        else:
            print("❌ Не удалось получить проекты")
            return False
    except Exception as e:
        print(f"❌ Ошибка получения проектов: {e}")
        return False
    
    test_data = {
        "estimate_number": f"Test_SSE_{int(time.time())}",
        "project": project_id,
        "description": "Тестовая смета для проверки SSE"
    }
    
    try:
        response = requests.post(url, headers=headers, json=test_data)
        print(f"📋 Create Estimate Status: {response.status_code}")
        
        if response.status_code == 201:
            estimate = response.json()
            print(f"✅ Создана тестовая смета: {estimate.get('estimate_number')}")
            print(f"   ID: {estimate.get('estimate_id')}")
            return estimate
        else:
            print(f"❌ Ошибка создания сметы: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка создания сметы: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🧪 SSE Integration Tester")
    print("=" * 40)
    
    # Список доступных пользователей
    users = {
        '1': 'manager@example.com',
        '2': 'foreman@example.com'
    }
    
    print("👥 Доступные пользователи:")
    for key, email in users.items():
        print(f"   {key}. {email}")
    
    user_choice = input("\n👤 Выберите пользователя (1-2): ").strip()
    
    if user_choice not in users:
        print("❌ Неверный выбор пользователя")
        return
    
    email = users[user_choice]
    token = get_user_token(email)
    
    if not token:
        print("❌ Не удалось получить токен")
        return
    
    print(f"🔑 Токен получен: {token[:10]}...")
    
    while True:
        print("\n🎯 Выберите тест:")
        print("   1. Проверить SSE подключение")
        print("   2. Проверить статистику SSE")
        print("   3. Создать тестовую смету (генерирует SSE событие)")
        print("   4. Полный тест (подключение + создание сметы)")
        print("   0. Выход")
        
        choice = input("\n🔸 Ваш выбор: ").strip()
        
        if choice == '0':
            print("👋 До свидания!")
            break
        elif choice == '1':
            timeout = int(input("⏰ Таймаут в секундах (30): ") or 30)
            test_sse_connection(token, timeout)
        elif choice == '2':
            test_sse_stats(token)
        elif choice == '3':
            create_test_estimate(token)
        elif choice == '4':
            print("🚀 Запуск полного теста...")
            
            # Сначала проверяем статистику
            print("\n1️⃣ Проверка статистики SSE...")
            test_sse_stats(token)
            
            # Создаем смету в отдельном процессе через 5 секунд
            import threading
            def delayed_create():
                time.sleep(5)
                print("\n🔄 Создание тестовой сметы через 5 секунд...")
                create_test_estimate(token)
            
            thread = threading.Thread(target=delayed_create)
            thread.daemon = True
            thread.start()
            
            # Подключаемся к SSE
            print("\n2️⃣ Подключение к SSE (ожидание событий)...")
            test_sse_connection(token, 15)
            
        else:
            print("❌ Неверный выбор")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🔌 Тестирование прервано пользователем")
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()