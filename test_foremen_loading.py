#!/usr/bin/env python3
"""
Тест проверки загрузки прорабов для ProjectAssignmentsPage
"""

import requests
import json

# Настройки для подключения к dev окружению
BASE_URL = "https://dev.app.iqbs.pro/api/v1"
# Данные для авторизации (менеджер должен видеть всех пользователей)
LOGIN_DATA = {
    "email": "manager@example.com",
    "password": "password123"
}

def test_foremen_loading():
    """Тестируем загрузку списка прорабов"""
    
    # Выполняем авторизацию
    print("🔐 Авторизация...")
    login_response = requests.post(f"{BASE_URL}/auth/login/", json=LOGIN_DATA)
    
    if login_response.status_code != 200:
        print(f"❌ Ошибка авторизации: {login_response.status_code}")
        print(f"Ответ: {login_response.text}")
        return False
    
    login_data = login_response.json()
    token = login_data["token"]
    user = login_data["user"]
    
    print(f"✅ Авторизация успешна. Пользователь: {user['full_name']} ({user['role']})")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Загружаем список всех пользователей
    print("\n👥 Загрузка списка пользователей...")
    users_response = requests.get(f"{BASE_URL}/users/", headers=headers)
    
    if users_response.status_code != 200:
        print(f"❌ Ошибка загрузки пользователей: {users_response.status_code}")
        print(f"Ответ: {users_response.text}")
        return False
    
    users_response_data = users_response.json()
    # Извлекаем массив пользователей из пагинированного ответа
    if isinstance(users_response_data, dict) and 'results' in users_response_data:
        users_data = users_response_data['results']
    else:
        users_data = users_response_data
    
    print(f"✅ Загружено пользователей: {len(users_data)}")
    
    # Фильтруем прорабов
    foremen = [user for user in users_data if isinstance(user, dict) and user.get('role') == 'прораб']
    print(f"👷 Найдено прорабов: {len(foremen)}")
    
    if len(foremen) == 0:
        print("⚠️  Прорабы не найдены!")
        print("Все пользователи:")
        for user in users_data:
            if isinstance(user, dict):
                print(f"  - {user.get('full_name')} ({user.get('role')})")
        return False
    
    print("Список прорабов:")
    for foreman in foremen:
        print(f"  - {foreman.get('full_name')} (ID: {foreman.get('user_id')})")
    
    # Загружаем проекты
    print("\n🏗️  Загрузка списка проектов...")
    projects_response = requests.get(f"{BASE_URL}/projects/", headers=headers)
    
    if projects_response.status_code != 200:
        print(f"❌ Ошибка загрузки проектов: {projects_response.status_code}")
        print(f"Ответ: {projects_response.text}")
        return False
    
    projects_data = projects_response.json()
    projects = projects_data.get('results', projects_data) if isinstance(projects_data, dict) else projects_data
    print(f"✅ Загружено проектов: {len(projects)}")
    
    # Загружаем существующие назначения
    print("\n📋 Загрузка существующих назначений...")
    assignments_response = requests.get(f"{BASE_URL}/project-assignments/", headers=headers)
    
    if assignments_response.status_code != 200:
        print(f"❌ Ошибка загрузки назначений: {assignments_response.status_code}")
        print(f"Ответ: {assignments_response.text}")
        return False
    
    assignments_data = assignments_response.json()
    print(f"✅ Загружено назначений: {len(assignments_data)}")
    
    print("Текущие назначения:")
    for assignment in assignments_data:
        if isinstance(assignment, dict):
            print(f"  - {assignment.get('project_name')} → {assignment.get('user_full_name')}")
        else:
            print(f"  - {assignment}")
    
    print("\n✅ Все данные загружены успешно!")
    print(f"📊 Итого: {len(projects)} проектов, {len(foremen)} прорабов, {len(assignments_data)} назначений")
    
    return True

if __name__ == "__main__":
    print("🧪 Тестирование загрузки данных для ProjectAssignmentsPage")
    print("=" * 60)
    
    try:
        success = test_foremen_loading()
        if success:
            print("\n🎉 Тест завершен успешно!")
        else:
            print("\n❌ Тест завершился с ошибками")
    except Exception as e:
        print(f"\n💥 Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()