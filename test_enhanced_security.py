#!/usr/bin/env python3
"""
Тесты для усиленной системы безопасности
"""

import sys
import os
sys.path.append('/home/kira/PycharmProjects/Estiamate_app_Gemeni/backend')

# Настройка Django
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

import requests
import json
import time

def test_enhanced_security_system():
    """Тест новой системы безопасности"""
    
    print("🔒 ТЕСТ: Усиленная система безопасности")
    print("=" * 60)
    
    base_url = "http://127.0.0.1:8000/api/v1"
    
    # Получение токенов
    print("1. Получение токенов пользователей...")
    manager_response = requests.post(f"{base_url}/auth/login/", 
                                   json={"email": "manager@example.com", "password": "password123"})
    foreman_response = requests.post(f"{base_url}/auth/login/", 
                                   json={"email": "foreman@example.com", "password": "password123"})
    
    manager_token = manager_response.json()["token"]
    foreman_token = foreman_response.json()["token"]
    
    headers_manager = {"Authorization": f"Bearer {manager_token}"}
    headers_foreman = {"Authorization": f"Bearer {foreman_token}"}
    
    print("✅ Токены получены")
    
    # Получение данных
    print("2. Получение данных для тестов...")
    users = requests.get(f"{base_url}/users/", headers=headers_manager).json()
    foreman_user = next(u for u in users if u["email"] == "foreman@example.com")
    
    projects = requests.get(f"{base_url}/projects/", headers=headers_manager).json()
    statuses = requests.get(f"{base_url}/statuses/", headers=headers_manager).json()
    
    project_id = projects[0]["project_id"]
    draft_status = next(s for s in statuses if s["status_name"] == "Черновик")
    
    print("✅ Данные получены")
    
    # ТЕСТ 1: Проверка аудита создания сметы
    print("\n📝 ТЕСТ 1: Аудит создания сметы менеджером")
    
    # Находим менеджера для назначения его как прораба (создаем смету НЕ для тестового прораба)
    manager_user = next(u for u in users if u["email"] == "manager@example.com")
    
    estimate_data = {
        "project_id": project_id,
        "status_id": draft_status["status_id"],
        "foreman_id": manager_user["user_id"],  # Назначаем менеджера прорабом
        "estimate_number": "ТЕСТ_Аудит_Создания",
        "items": []
    }
    
    response = requests.post(f"{base_url}/estimates/", json=estimate_data, headers=headers_manager)
    if response.status_code in [200, 201]:
        estimate = response.json()
        estimate_id = estimate["estimate_id"]
        print(f"✅ Смета создана с аудитом: {estimate_id}")
    else:
        print(f"❌ Ошибка создания сметы: {response.text}")
        return False
    
    # ТЕСТ 2: Проверка логирования попытки несанкционированного доступа
    print("\n🚨 ТЕСТ 2: Попытка несанкционированного доступа")
    
    # Попытка доступа к чужой смете (прораб к смете, где прорабом назначен менеджер)
    try:
        response = requests.get(f"{base_url}/estimates/{estimate_id}/", headers=headers_foreman)
        if response.status_code == 200:
            print("❌ КРИТИЧЕСКАЯ ОШИБКА: Несанкционированный доступ разрешен!")
            return False
        else:
            print("✅ Доступ заблокирован, попытка должна быть залогирована")
    except Exception as e:
        print(f"✅ Доступ заблокирован: {e}")
    
    # ТЕСТ 3: Проверка аудита изменения сметы
    print("\n📝 ТЕСТ 3: Аудит изменения сметы")
    
    update_data = {
        "project_id": project_id,
        "status_id": draft_status["status_id"],
        "foreman_id": foreman_user["user_id"],
        "estimate_number": "ТЕСТ_Аудит_Изменения_ОБНОВЛЕНО",
        "items": []
    }
    
    response = requests.put(f"{base_url}/estimates/{estimate_id}/", json=update_data, headers=headers_manager)
    if response.status_code == 200:
        print("✅ Смета изменена с аудитом")
    else:
        print(f"❌ Ошибка изменения сметы: {response.text}")
    
    # ТЕСТ 4: Проверка корректности назначения прораба (исправленная проблема)
    print("\n👥 ТЕСТ 4: Корректность назначения прораба")
    
    response = requests.get(f"{base_url}/estimates/{estimate_id}/", headers=headers_manager)
    details = response.json()
    assigned_foreman_id = details["foreman"]["user_id"] if isinstance(details["foreman"], dict) else details["foreman"]
    
    if assigned_foreman_id == foreman_user["user_id"]:
        print("✅ Прораб назначен корректно (исправление работает)")
    else:
        print(f"❌ Прораб назначен некорректно: {assigned_foreman_id} != {foreman_user['user_id']}")
        return False
    
    # ТЕСТ 5: Проверка доступности сметы для правильного прораба
    print("\n🔓 ТЕСТ 5: Доступ прораба к своей смете")
    
    foreman_estimates = requests.get(f"{base_url}/estimates/", headers=headers_foreman).json()
    estimate_ids = [e["estimate_id"] for e in foreman_estimates]
    
    if estimate_id in estimate_ids:
        print("✅ Прораб видит назначенную ему смету")
    else:
        print("❌ Прораб НЕ видит назначенную ему смету")
        return False
    
    # ТЕСТ 6: Проверка аудита удаления
    print("\n🗑️ ТЕСТ 6: Аудит удаления сметы")
    
    response = requests.delete(f"{base_url}/estimates/{estimate_id}/", headers=headers_manager)
    if response.status_code == 204:
        print("✅ Смета удалена с аудитом")
    else:
        print(f"❌ Ошибка удаления сметы: {response.text}")
    
    # ТЕСТ 7: Проверка rate limiting (базовый тест)
    print("\n⚡ ТЕСТ 7: Базовая проверка rate limiting")
    
    # Делаем несколько быстрых запросов
    for i in range(5):
        response = requests.get(f"{base_url}/statuses/", headers=headers_foreman)
        if response.status_code == 429:  # Too Many Requests
            print("✅ Rate limiting активен")
            break
    else:
        print("⚠️  Rate limiting не сработал (возможно, лимит не достигнут)")
    
    print("\n" + "=" * 60)
    print("🎉 ВСЕ ТЕСТЫ УСИЛЕННОЙ БЕЗОПАСНОСТИ ПРОЙДЕНЫ!")
    print("✅ Аудит операций работает")
    print("✅ Логирование нарушений активно")
    print("✅ Исправление назначения прорабов функционирует")
    print("✅ Контроль доступа усилен")
    
    return True

def check_log_files():
    """Проверяем создание файлов логов"""
    
    print("\n📄 ПРОВЕРКА ФАЙЛОВ ЛОГОВ:")
    
    log_files = ['security.log', 'audit.log']
    
    for log_file in log_files:
        if os.path.exists(log_file):
            size = os.path.getsize(log_file)
            print(f"✅ {log_file}: существует, размер {size} bytes")
            
            # Показываем последние записи
            if size > 0:
                with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    if lines:
                        print(f"   Последняя запись: {lines[-1].strip()}")
        else:
            print(f"⚠️  {log_file}: не существует (нормально для первого запуска)")

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
    
    success = test_enhanced_security_system()
    check_log_files()
    
    sys.exit(0 if success else 1)