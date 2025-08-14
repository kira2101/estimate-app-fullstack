#!/usr/bin/env python3
"""
Тест edge cases для исправления проблемы с назначением прорабов
"""

import requests
import json

def test_edge_cases():
    """Тест различных сценариев назначения прорабов"""
    
    print("🧪 ТЕСТ: Edge Cases для назначения прорабов")
    print("=" * 60)
    
    # Данные для входа
    manager_email = "manager@example.com"
    foreman_email = "foreman@example.com"
    password = "password123"
    base_url = "http://127.0.0.1:8000/api/v1"
    
    try:
        # Получаем токены
        response = requests.post(f"{base_url}/auth/login/", 
                                json={"email": manager_email, "password": password})
        manager_token = response.json()["token"]
        
        response = requests.post(f"{base_url}/auth/login/", 
                                json={"email": foreman_email, "password": password})
        foreman_token = response.json()["token"]
        
        headers_manager = {"Authorization": f"Bearer {manager_token}"}
        headers_foreman = {"Authorization": f"Bearer {foreman_token}"}
        
        # Получаем данные
        response = requests.get(f"{base_url}/users/", headers=headers_manager)
        users = response.json()
        foreman_user = next((u for u in users if u["email"] == foreman_email), None)
        
        response = requests.get(f"{base_url}/projects/", headers=headers_manager)
        projects = response.json()
        project_id = projects[0]["project_id"]
        
        response = requests.get(f"{base_url}/statuses/", headers=headers_manager)
        statuses = response.json()
        draft_status = next((s for s in statuses if s["status_name"] == "Черновик"), None)
        
        print("✅ Подготовительные данные получены")
        
        # ТЕСТ 1: Прораб создает смету себе (старое поведение должно работать)
        print("\n📝 ТЕСТ 1: Прораб создает смету себе")
        estimate_data = {
            "project_id": project_id,
            "status_id": draft_status["status_id"],
            # Намеренно НЕ передаем foreman_id
            "estimate_number": "ТЕСТ_Прораб_Создает_Себе",
            "items": []
        }
        
        response = requests.post(f"{base_url}/estimates/", 
                                json=estimate_data, 
                                headers=headers_foreman)
        
        if response.status_code not in [200, 201]:
            print(f"❌ Ошибка: {response.text}")
            return False
            
        estimate_1 = response.json()
        estimate_1_id = estimate_1["estimate_id"]
        
        # Проверяем назначение
        response = requests.get(f"{base_url}/estimates/{estimate_1_id}/", headers=headers_foreman)
        details = response.json()
        assigned_foreman_id = details["foreman"]["user_id"] if isinstance(details["foreman"], dict) else details["foreman"]
        
        if assigned_foreman_id != foreman_user["user_id"]:
            print(f"❌ ОШИБКА! Прораб НЕ назначен на свою смету")
            return False
            
        print("✅ Прораб правильно назначен на свою смету")
        
        # ТЕСТ 2: Менеджер создает смету БЕЗ указания прораба (fallback)
        print("\n📝 ТЕСТ 2: Менеджер создает смету БЕЗ указания прораба")
        estimate_data = {
            "project_id": project_id,
            "status_id": draft_status["status_id"],
            # Намеренно НЕ передаем foreman_id
            "estimate_number": "ТЕСТ_Менеджер_Без_Прораба",
            "items": []
        }
        
        response = requests.post(f"{base_url}/estimates/", 
                                json=estimate_data, 
                                headers=headers_manager)
        
        if response.status_code not in [200, 201]:
            print(f"❌ Ошибка: {response.text}")
            return False
            
        estimate_2 = response.json()
        estimate_2_id = estimate_2["estimate_id"]
        
        # Проверяем назначение (должен быть назначен менеджер как fallback)
        response = requests.get(f"{base_url}/estimates/{estimate_2_id}/", headers=headers_manager)
        details = response.json()
        assigned_foreman_id = details["foreman"]["user_id"] if isinstance(details["foreman"], dict) else details["foreman"]
        
        manager_user = next((u for u in users if u["email"] == manager_email), None)
        if assigned_foreman_id != manager_user["user_id"]:
            print(f"❌ ОШИБКА! Fallback не работает")
            return False
            
        print("✅ Fallback работает правильно - менеджер назначен")
        
        # ТЕСТ 3: Менеджер создает смету с несуществующим foreman_id
        print("\n📝 ТЕСТ 3: Менеджер указывает несуществующий foreman_id")
        estimate_data = {
            "project_id": project_id,
            "status_id": draft_status["status_id"],
            "foreman_id": 999999,  # Несуществующий ID
            "estimate_number": "ТЕСТ_Несуществующий_Прораб",
            "items": []
        }
        
        response = requests.post(f"{base_url}/estimates/", 
                                json=estimate_data, 
                                headers=headers_manager)
        
        if response.status_code not in [200, 201]:
            print(f"❌ Ошибка: {response.text}")
            return False
            
        estimate_3 = response.json()
        estimate_3_id = estimate_3["estimate_id"]
        
        # Проверяем назначение (должен сработать fallback на менеджера)
        response = requests.get(f"{base_url}/estimates/{estimate_3_id}/", headers=headers_manager)
        details = response.json()
        assigned_foreman_id = details["foreman"]["user_id"] if isinstance(details["foreman"], dict) else details["foreman"]
        
        if assigned_foreman_id != manager_user["user_id"]:
            print(f"❌ ОШИБКА! Fallback при несуществующем пользователе не работает")
            return False
            
        print("✅ Fallback при несуществующем foreman_id работает правильно")
        
        # ТЕСТ 4: Проверяем доступность смет
        print("\n📝 ТЕСТ 4: Проверка доступности смет для прораба")
        
        # Прораб должен видеть только свою смету (estimate_1)
        response = requests.get(f"{base_url}/estimates/", headers=headers_foreman)
        foreman_estimates = response.json()
        
        foreman_estimate_ids = [e["estimate_id"] for e in foreman_estimates]
        
        if estimate_1_id not in foreman_estimate_ids:
            print("❌ ОШИБКА! Прораб НЕ видит свою смету")
            return False
            
        if estimate_2_id in foreman_estimate_ids or estimate_3_id in foreman_estimate_ids:
            print("❌ ОШИБКА! Прораб видит чужие сметы")
            return False
            
        print("✅ Прораб видит только свои сметы")
        
        # Очистка
        print("\n🧹 Очистка тестовых данных...")
        for est_id in [estimate_1_id, estimate_2_id, estimate_3_id]:
            requests.delete(f"{base_url}/estimates/{est_id}/", headers=headers_manager)
        
        print("\n" + "=" * 60)
        print("🎉 ВСЕ EDGE CASE ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        print("✅ Fallback механизм работает")
        print("✅ Старое поведение сохранено") 
        print("✅ Обработка ошибок корректна")
        print("✅ Доступы настроены правильно")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ОШИБКА В ТЕСТЕ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_edge_cases()
    exit(0 if success else 1)