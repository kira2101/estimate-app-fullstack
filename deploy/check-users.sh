#!/bin/bash

echo "🔍 Проверка пользователей в базе данных"
echo "======================================"
echo ""

echo "📋 Команды для проверки пользователей:"
echo ""

echo "1. Проверка всех пользователей в Django:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev python manage.py shell -c \"from django.contrib.auth.models import User; print([u.username for u in User.objects.all()])\"'"
echo ""

echo "2. Создание тестового superuser:"
echo "ssh root@195.14.122.135 'docker exec -it estimate-backend-dev python manage.py createsuperuser'"
echo ""

echo "3. Создание тестового пользователя через shell:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev python manage.py shell -c \"from django.contrib.auth.models import User; User.objects.create_user(username='dev@test.com', email='dev@test.com', password='password123'); print('User created')\"'"
echo ""

echo "4. Проверка кастомной модели пользователя:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev python manage.py shell -c \"from django.conf import settings; print(settings.AUTH_USER_MODEL)\"'"
echo ""

echo "5. Тест авторизации с dev@test.com:"
echo "curl -s https://dev.app.iqbs.pro/api/v1/auth/login/ -X POST -H 'Content-Type: application/json' -d '{\"email\":\"dev@test.com\",\"password\":\"password123\"}'"
echo ""

echo "💡 Возможные причины проблем с авторизацией:"
echo "- В dev базе нет пользователей (dev использует ту же БД что продакшн, но разный SECRET_KEY)"
echo "- Нужно создать тестового пользователя для dev окружения"  
echo "- Токены с продакшн не работают из-за другого SECRET_KEY"