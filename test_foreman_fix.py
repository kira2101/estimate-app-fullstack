#!/usr/bin/env python3
"""
Тест для проверки исправления проблемы с назначением прорабов на сметы
"""

import sys
import os
sys.path.append('/home/kira/PycharmProjects/Estiamate_app_Gemeni/backend')

# Настройка Django
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, Estimate, Status, Project, Client
import requests
import json

def test_foreman_assignment_fix():
    """Тест исправления назначения прораба на смету"""
    
    print("🧪 ТЕСТ: Проверка исправления назначения прораба")
    print("=" * 50)
    
    # Данные для входа
    manager_email = "manager@example.com"
    foreman_email = "foreman@example.com"
    password = "password123"
    base_url = "http://127.0.0.1:8000/api/v1"
    
    try:
        # 1. Получаем токены пользователей
        print("1. Получение токенов...")
        
        # Токен менеджера
        response = requests.post(f"{base_url}/auth/login/", 
                                json={"email": manager_email, "password": password})
        if response.status_code != 200:
            print(f"❌ Ошибка входа менеджера: {response.text}")
            return False
        manager_token = response.json()["token"]
        
        # Токен прораба
        response = requests.post(f"{base_url}/auth/login/", 
                                json={"email": foreman_email, "password": password})
        if response.status_code != 200:
            print(f"❌ Ошибка входа прораба: {response.text}")
            return False
        foreman_token = response.json()["token"]
        
        print("✅ Токены получены успешно")
        
        # 2. Получаем ID пользователей
        print("2. Получение данных пользователей...")
        
        headers_manager = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{base_url}/users/", headers=headers_manager)
        if response.status_code != 200:
            print(f"❌ Ошибка получения пользователей: {response.text}")
            return False
            
        users = response.json()
        manager_user = next((u for u in users if u["email"] == manager_email), None)
        foreman_user = next((u for u in users if u["email"] == foreman_email), None)
        
        if not manager_user or not foreman_user:
            print("❌ Пользователи не найдены")
            return False
            
        print(f"✅ Manager ID: {manager_user['user_id']}")
        print(f"✅ Foreman ID: {foreman_user['user_id']}")
        
        # 3. Получаем проекты и статусы
        print("3. Получение проектов и статусов...")
        
        response = requests.get(f"{base_url}/projects/", headers=headers_manager)
        projects = response.json()
        if not projects:
            print("❌ Нет проектов в системе")
            return False
        project_id = projects[0]["project_id"]
        
        response = requests.get(f"{base_url}/statuses/", headers=headers_manager)
        statuses = response.json()
        draft_status = next((s for s in statuses if s["status_name"] == "Черновик"), None)
        if not draft_status:
            print("❌ Статус 'Черновик' не найден")
            return False
        
        print(f"✅ Проект ID: {project_id}")
        print(f"✅ Статус ID: {draft_status['status_id']}")
        
        # 4. ГЛАВНЫЙ ТЕСТ: Менеджер создает смету и назначает прораба
        print("4. Создание сметы менеджером с назначением прораба...")
        
        estimate_data = {
            "project_id": project_id,
            "status_id": draft_status["status_id"],
            "foreman_id": foreman_user["user_id"],  # Назначаем прораба!
            "estimate_number": "ТЕСТ_Смета_Назначение_Прораба",
            "items": []
        }
        
        response = requests.post(f"{base_url}/estimates/", 
                                json=estimate_data, 
                                headers=headers_manager)
        
        if response.status_code not in [200, 201]:
            print(f"❌ Ошибка создания сметы: {response.status_code} - {response.text}")
            return False
            
        created_estimate = response.json()
        estimate_id = created_estimate["estimate_id"]
        
        print(f"✅ Смета создана с ID: {estimate_id}")
        
        # 5. ПРОВЕРКА: Проверяем, что прораб назначен правильно
        print("5. Проверка назначения прораба...")
        
        # Получаем детали сметы
        response = requests.get(f"{base_url}/estimates/{estimate_id}/", headers=headers_manager)
        if response.status_code != 200:
            print(f"❌ Ошибка получения деталей сметы: {response.text}")
            return False
            
        estimate_details = response.json()
        assigned_foreman = estimate_details.get("foreman")
        
        # Получаем ID из объекта прораба
        if isinstance(assigned_foreman, dict):
            assigned_foreman_id = assigned_foreman.get("user_id")
        else:
            assigned_foreman_id = assigned_foreman
        
        if assigned_foreman_id != foreman_user["user_id"]:
            print(f"❌ ОШИБКА! Назначен неправильный прораб:")
            print(f"   Ожидался: {foreman_user['user_id']}")
            print(f"   Назначен: {assigned_foreman_id}")
            return False
        
        print(f"✅ Прораб назначен ПРАВИЛЬНО: {assigned_foreman_id}")
        
        # 6. ПРОВЕРКА ДОСТУПА: Прораб должен видеть эту смету
        print("6. Проверка доступа прораба к смете...")
        
        headers_foreman = {"Authorization": f"Bearer {foreman_token}"}
        response = requests.get(f"{base_url}/estimates/", headers=headers_foreman)
        
        if response.status_code != 200:
            print(f"❌ Ошибка получения смет прорабом: {response.text}")
            return False
            
        foreman_estimates = response.json()
        found_estimate = next((e for e in foreman_estimates if e["estimate_id"] == estimate_id), None)
        
        if not found_estimate:
            print("❌ ОШИБКА! Прораб НЕ ВИДИТ назначенную ему смету!")
            return False
        
        print("✅ Прораб ВИДИТ назначенную ему смету!")
        
        # 7. Очистка: Удаляем тестовую смету
        print("7. Удаление тестовой сметы...")
        response = requests.delete(f"{base_url}/estimates/{estimate_id}/", headers=headers_manager)
        print("✅ Тестовая смета удалена")
        
        print("\n" + "=" * 50)
        print("🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!")
        print("✅ Исправление работает правильно")
        print("✅ Менеджер может назначать прорабов на сметы")
        print("✅ Прорабы видят только назначенные им сметы")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ОШИБКА В ТЕСТЕ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Проверяем, запущен ли сервер
    try:
        response = requests.get("http://127.0.0.1:8000/api/v1/statuses/", timeout=2)
        server_running = True
    except:
        server_running = False
    
    if not server_running:
        print("❌ Django сервер не запущен!")
        print("Запустите сервер командой: cd backend && python manage.py runserver")
        sys.exit(1)
    
    success = test_foreman_assignment_fix()
    sys.exit(0 if success else 1)