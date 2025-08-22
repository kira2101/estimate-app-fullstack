#!/bin/bash

# =============================================================================
# Создание тестового пользователя для dev окружения
# Использование: ./create-dev-user.sh
# =============================================================================

echo "👤 Создание тестового пользователя для dev окружения"
echo "=================================================="
echo ""

echo "📋 Команды для создания пользователя на сервере:"
echo ""

echo "1. Создание тестового пользователя dev@test.com:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev python manage.py shell -c \""
echo "from api.models import User, Role"
echo "from django.contrib.auth.hashers import make_password"
echo ""
echo "# Создаем роль менеджера если не существует"
echo "manager_role, created = Role.objects.get_or_create(name='менеджер')"
echo "if created:"
echo "    print('Роль менеджера создана')"
echo ""
echo "# Создаем тестового пользователя"
echo "test_user, created = User.objects.get_or_create("
echo "    email='dev@test.com',"
echo "    defaults={"
echo "        'password': make_password('password123'),"
echo "        'first_name': 'Dev',"
echo "        'last_name': 'User',"
echo "        'role': manager_role,"
echo "        'is_active': True,"
echo "        'is_staff': True"
echo "    }"
echo ")"
echo ""
echo "if created:"
echo "    print('Создан тестовый пользователь: dev@test.com / password123')"
echo "else:"
echo "    print('Пользователь dev@test.com уже существует')"
echo ""
echo "print(f'Всего пользователей в БД: {User.objects.count()}')"
echo "\"'"
echo ""

echo "2. Тест авторизации:"
echo "curl -s https://dev.app.iqbs.pro/api/v1/auth/login/ -X POST \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"dev@test.com\",\"password\":\"password123\"}'"
echo ""

echo "💡 Тестовые данные для входа:"
echo "  Email: dev@test.com"
echo "  Password: password123"
echo "  Роль: Менеджер"
echo ""

echo "🔗 Dev окружение: https://dev.app.iqbs.pro"