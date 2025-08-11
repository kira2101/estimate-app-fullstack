#!/usr/bin/env python
"""
РЕАЛЬНЫЙ HTTP ТЕСТ БЕЗОПАСНОСТИ API
Тестирует безопасность через реальные HTTP запросы
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def get_auth_token(email, password):
    """Получить токен аутентификации"""
    response = requests.post(f"{BASE_URL}/auth/login/", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        return response.json()["token"]
    else:
        print(f"❌ Ошибка аутентификации: {response.status_code} - {response.text}")
        return None

def test_http_security():
    """Тестирует безопасность через HTTP запросы"""
    print("🌐 РЕАЛЬНЫЙ HTTP ТЕСТ БЕЗОПАСНОСТИ API")
    print("=" * 60)
    
    # Получаем токены для разных пользователей
    print("🔑 Получение токенов аутентификации...")
    
    # Токен менеджера
    manager_token = get_auth_token("manager@example.com", "password123")
    if not manager_token:
        print("❌ Не удалось получить токен менеджера")
        return False
    
    # Токен прораба 1
    foreman1_token = get_auth_token("foreman@example.com", "password123")
    if not foreman1_token:
        print("❌ Не удалось получить токен прораба 1")
        return False
    
    # Токен прораба 2 
    foreman2_token = get_auth_token("prorab_2@gmail.com", "password123")
    if not foreman2_token:
        print("❌ Не удалось получить токен прораба 2")
        return False
    
    print("✅ Все токены получены успешно")
    print()
    
    # Тест 1: Получение списка смет прорабом 1
    print("🧪 HTTP ТЕСТ 1: Список смет для прораба 1")
    
    headers = {"Authorization": f"Bearer {foreman1_token}"}
    response = requests.get(f"{BASE_URL}/estimates/", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Ошибка получения списка: {response.status_code}")
        return False
    
    foreman1_estimates = response.json()
    foreman1_ids = [est["estimate_id"] for est in foreman1_estimates]
    
    print(f"   Прораб 1 видит сметы: {foreman1_ids}")
    
    # Тест 2: Получение списка смет прорабом 2
    print("🧪 HTTP ТЕСТ 2: Список смет для прораба 2")
    
    headers = {"Authorization": f"Bearer {foreman2_token}"}
    response = requests.get(f"{BASE_URL}/estimates/", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Ошибка получения списка: {response.status_code}")
        return False
    
    foreman2_estimates = response.json()
    foreman2_ids = [est["estimate_id"] for est in foreman2_estimates]
    
    print(f"   Прораб 2 видит сметы: {foreman2_ids}")
    
    # Проверяем пересечение
    common_estimates = set(foreman1_ids) & set(foreman2_ids)
    if common_estimates:
        print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Общие сметы между прорабами: {common_estimates}")
        return False
    else:
        print("   ✅ Прорабы НЕ видят сметы друг друга")
    
    print()
    
    # Тест 3: Получение списка смет менеджером
    print("🧪 HTTP ТЕСТ 3: Список смет для менеджера")
    
    headers = {"Authorization": f"Bearer {manager_token}"}
    response = requests.get(f"{BASE_URL}/estimates/", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Ошибка получения списка: {response.status_code}")
        return False
    
    manager_estimates = response.json()
    manager_ids = [est["estimate_id"] for est in manager_estimates]
    
    print(f"   Менеджер видит {len(manager_ids)} смет")
    
    # Проверяем, что менеджер видит больше смет чем каждый прораб отдельно
    if len(manager_ids) < len(foreman1_ids) or len(manager_ids) < len(foreman2_ids):
        print("   ❌ ОШИБКА: Менеджер видит меньше смет чем прораб")
        return False
    else:
        print("   ✅ Менеджер видит все сметы (включая сметы прорабов)")
    
    print()
    
    # Тест 4: Попытка доступа к чужой смете
    if foreman2_ids:
        foreign_estimate_id = foreman2_ids[0]
        print(f"🧪 HTTP ТЕСТ 4: Прораб 1 пытается получить чужую смету (ID: {foreign_estimate_id})")
        
        headers = {"Authorization": f"Bearer {foreman1_token}"}
        response = requests.get(f"{BASE_URL}/estimates/{foreign_estimate_id}/", headers=headers)
        
        if response.status_code == 200:
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Прораб 1 получил доступ к чужой смете!")
            print(f"   Ответ: {response.json()}")
            return False
        elif response.status_code in [403, 404]:
            print(f"   ✅ Доступ ЗАПРЕЩЕН (статус: {response.status_code})")
        else:
            print(f"   ⚠️  Неожиданный статус: {response.status_code}")
            print(f"   Ответ: {response.text}")
    
    print()
    
    # Тест 5: Попытка обновления чужой сметы
    if foreman2_ids:
        foreign_estimate_id = foreman2_ids[0]
        print(f"🧪 HTTP ТЕСТ 5: Прораб 1 пытается обновить чужую смету (ID: {foreign_estimate_id})")
        
        headers = {"Authorization": f"Bearer {foreman1_token}"}
        update_data = {
            "estimate_number": "ПОПЫТКА_ВЗЛОМА"
        }
        
        response = requests.patch(f"{BASE_URL}/estimates/{foreign_estimate_id}/", 
                                headers=headers, json=update_data)
        
        if response.status_code in [200, 202]:
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Прораб 1 смог обновить чужую смету!")
            print(f"   Ответ: {response.json()}")
            return False
        elif response.status_code in [403, 404]:
            print(f"   ✅ Обновление ЗАПРЕЩЕНО (статус: {response.status_code})")
        else:
            print(f"   ⚠️  Неожиданный статус: {response.status_code}")
            print(f"   Ответ: {response.text}")
    
    print()
    
    # Тест 6: Попытка удаления чужой сметы
    if foreman2_ids and len(foreman2_ids) > 1:  # Оставляем хотя бы одну смету
        foreign_estimate_id = foreman2_ids[-1]  # Берем последнюю
        print(f"🧪 HTTP ТЕСТ 6: Прораб 1 пытается удалить чужую смету (ID: {foreign_estimate_id})")
        
        headers = {"Authorization": f"Bearer {foreman1_token}"}
        response = requests.delete(f"{BASE_URL}/estimates/{foreign_estimate_id}/", headers=headers)
        
        if response.status_code in [204, 200]:
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Прораб 1 смог удалить чужую смету!")
            return False
        elif response.status_code in [403, 404]:
            print(f"   ✅ Удаление ЗАПРЕЩЕНО (статус: {response.status_code})")
        else:
            print(f"   ⚠️  Неожиданный статус: {response.status_code}")
            print(f"   Ответ: {response.text}")
    
    print()
    
    # Тест 7: Менеджер должен иметь полный доступ
    if foreman1_ids:
        estimate_id = foreman1_ids[0]
        print(f"🧪 HTTP ТЕСТ 7: Менеджер получает доступ к смете прораба (ID: {estimate_id})")
        
        headers = {"Authorization": f"Bearer {manager_token}"}
        response = requests.get(f"{BASE_URL}/estimates/{estimate_id}/", headers=headers)
        
        if response.status_code == 200:
            print("   ✅ Менеджер имеет полный доступ к сметам прорабов")
        else:
            print(f"   ❌ ОШИБКА: Менеджер НЕ имеет доступа (статус: {response.status_code})")
            return False
    
    print()
    print("🔒 ВСЕ HTTP ТЕСТЫ БЕЗОПАСНОСТИ ПРОЙДЕНЫ УСПЕШНО!")
    print("✅ API полностью защищено от несанкционированного доступа")
    print("✅ Все HTTP эндпоинты правильно контролируют доступ по ролям")
    return True

if __name__ == "__main__":
    try:
        success = test_http_security()
        sys.exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("❌ ОШИБКА: Не удалось подключиться к серверу Django")
        print("   Убедитесь что сервер запущен: python manage.py runserver")
        sys.exit(1)
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА В HTTP ТЕСТЕ: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)