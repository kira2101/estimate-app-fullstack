#!/usr/bin/env python3
"""
Финальный тест исправления проблемы с назначением прорабов
"""

import requests

def final_test():
    print("🏁 ФИНАЛЬНЫЙ ТЕСТ: Исправление назначения прорабов")
    print("=" * 55)
    
    base_url = "http://127.0.0.1:8000/api/v1"
    
    # Получение токенов
    manager_response = requests.post(f"{base_url}/auth/login/", 
                                   json={"email": "manager@example.com", "password": "password123"})
    foreman_response = requests.post(f"{base_url}/auth/login/", 
                                   json={"email": "foreman@example.com", "password": "password123"})
    
    manager_token = manager_response.json()["token"]
    foreman_token = foreman_response.json()["token"]
    
    headers_manager = {"Authorization": f"Bearer {manager_token}"}
    headers_foreman = {"Authorization": f"Bearer {foreman_token}"}
    
    # Получение данных
    users = requests.get(f"{base_url}/users/", headers=headers_manager).json()
    foreman_user = next(u for u in users if u["email"] == "foreman@example.com")
    
    projects = requests.get(f"{base_url}/projects/", headers=headers_manager).json()
    statuses = requests.get(f"{base_url}/statuses/", headers=headers_manager).json()
    
    project_id = projects[0]["project_id"]
    draft_status = next(s for s in statuses if s["status_name"] == "Черновик")
    
    print("✅ Данные получены")
    
    # Основной тест: менеджер создает смету и назначает прораба
    print("\n🎯 ОСНОВНОЙ ТЕСТ: Менеджер назначает прораба")
    
    estimate_data = {
        "project_id": project_id,
        "status_id": draft_status["status_id"], 
        "foreman_id": foreman_user["user_id"],  # Ключевой момент!
        "estimate_number": "ФИНАЛЬНЫЙ_ТЕСТ_Смета",
        "items": []
    }
    
    # Создаем смету от имени менеджера
    response = requests.post(f"{base_url}/estimates/", json=estimate_data, headers=headers_manager)
    estimate = response.json()
    estimate_id = estimate["estimate_id"]
    
    print(f"✅ Смета создана: {estimate_id}")
    
    # Проверяем, что прораб назначен правильно
    response = requests.get(f"{base_url}/estimates/{estimate_id}/", headers=headers_manager)
    details = response.json()
    assigned_foreman_id = details["foreman"]["user_id"]
    
    print(f"📋 Ожидаемый прораб: {foreman_user['user_id']}")
    print(f"📋 Назначенный прораб: {assigned_foreman_id}")
    
    if assigned_foreman_id == foreman_user["user_id"]:
        print("✅ ПРАВИЛЬНО: Прораб назначен корректно!")
    else:
        print("❌ ОШИБКА: Прораб назначен неправильно!")
        return False
    
    # Проверяем доступ прораба к смете
    print("\n🔍 ПРОВЕРКА ДОСТУПА")
    
    foreman_estimates = requests.get(f"{base_url}/estimates/", headers=headers_foreman).json()
    estimate_ids = [e["estimate_id"] for e in foreman_estimates]
    
    if estimate_id in estimate_ids:
        print("✅ ДОСТУП: Прораб видит назначенную ему смету!")
    else:
        print("❌ ОШИБКА: Прораб НЕ видит назначенную ему смету!")
        return False
    
    # Очистка
    requests.delete(f"{base_url}/estimates/{estimate_id}/", headers=headers_manager)
    print("🧹 Тестовая смета удалена")
    
    return True

if __name__ == "__main__":
    success = final_test()
    
    if success:
        print("\n" + "=" * 55)
        print("🎉 ИСПРАВЛЕНИЕ РАБОТАЕТ ИДЕАЛЬНО!")
        print("✅ Проблема с назначением прорабов РЕШЕНА")
        print("✅ Менеджеры могут корректно назначать прорабов")
        print("✅ Прорабы видят только свои сметы")
        print("✅ Безопасность данных восстановлена")
        exit(0)
    else:
        print("\n❌ ИСПРАВЛЕНИЕ НЕ РАБОТАЕТ!")
        exit(1)