# 🔍 Диагностика проблем

Полное руководство по решению проблем при развертывании и эксплуатации приложения.

## 🚨 Экстренная диагностика

### ⚡ Быстрая проверка

```bash
# Проверка доступности приложения
curl -I https://app.iqbs.pro

# Проверка API
curl https://app.iqbs.pro/api/v1/health/

# Статус контейнеров
docker ps --format "table {{.Names}}\t{{.Status}}"

# Использование ресурсов
docker stats --no-stream
```

### 📊 Dashboard быстрой диагностики

```bash
#!/bin/bash
echo "=== БЫСТРАЯ ДИАГНОСТИКА ==="
echo "1. Приложение:"
curl -s -o /dev/null -w "HTTP: %{http_code}\n" https://app.iqbs.pro
echo "2. API:"
curl -s -o /dev/null -w "API: %{http_code}\n" https://app.iqbs.pro/api/v1/health/
echo "3. Контейнеры:"
docker ps --format "{{.Names}}: {{.Status}}"
echo "4. Диск:"
df -h | grep -E "/$|/var"
echo "5. Память:"
free -h | grep Mem
```

## 🚫 Частые проблемы и решения

### 1. 🌐 Проблемы с доступностью

#### ❌ Сайт не открывается

**Симптомы:**
- Timeout при открытии сайта
- "This site can't be reached"
- ERR_CONNECTION_TIMED_OUT

**Диагностика:**
```bash
# Проверка DNS
nslookup app.iqbs.pro
dig app.iqbs.pro

# Проверка доступности сервера
ping 195.14.122.135
telnet 195.14.122.135 80
telnet 195.14.122.135 443

# Проверка nginx
ssh root@195.14.122.135 "systemctl status nginx"
```

**Решения:**
```bash
# Перезапуск nginx
systemctl restart nginx

# Проверка конфигурации
nginx -t

# Проверка портов
netstat -tulpn | grep -E ':80|:443'

# Проверка firewall
ufw status
iptables -L
```

#### ❌ SSL Certificate Error

**Симптомы:**
- "Your connection is not private"
- SSL_ERROR_BAD_CERT_DOMAIN
- Certificate has expired

**Диагностика:**
```bash
# Проверка сертификата
openssl s_client -connect app.iqbs.pro:443 -servername app.iqbs.pro

# Проверка даты истечения
echo | openssl s_client -connect app.iqbs.pro:443 2>/dev/null | openssl x509 -noout -dates

# Статус certbot
certbot certificates
```

**Решения:**
```bash
# Обновление сертификата
certbot renew

# Принудительное обновление
certbot certonly --force-renewal -d app.iqbs.pro

# Перезапуск nginx после обновления
systemctl reload nginx
```

### 2. 🐳 Проблемы с контейнерами

#### ❌ Backend не запускается

**Симптомы:**
- `docker ps` не показывает estimate-backend
- Контейнер в статусе "Restarting"
- Ошибки в логах

**Диагностика:**
```bash
# Проверка статуса
docker ps -a | grep estimate-backend

# Логи контейнера
docker logs estimate-backend --tail 50

# Проверка образа
docker images | grep estimate-app-backend

# Проверка сети
docker network ls | grep estimate
```

**Решения:**

**Если проблема с базой данных:**
```bash
# Проверка подключения к БД
docker exec estimate-backend python manage.py check --database default

# Применение миграций
docker exec estimate-backend python manage.py migrate

# Проверка настроек БД
docker exec estimate-backend python manage.py shell -c "from django.db import connection; print(connection.ensure_connection())"
```

**Если проблема с зависимостями:**
```bash
# Пересборка образа
cd /var/www/estimate-app
docker build -t estimate-app-backend:latest ./backend-src/
docker-compose up -d --no-deps backend
```

**Если проблема с правами:**
```bash
# Проверка прав на volumes
ls -la /var/www/estimate-app/logs/
chown -R 1000:1000 /var/www/estimate-app/logs/
```

#### ❌ Frontend не отвечает

**Симптомы:**
- Контейнер запущен, но страница не загружается
- 502 Bad Gateway
- Nginx не может подключиться к frontend

**Диагностика:**
```bash
# Проверка порта
docker port estimate-frontend
curl http://localhost:3000

# Логи frontend
docker logs estimate-frontend

# Проверка nginx конфигурации
nginx -t
```

**Решения:**
```bash
# Перезапуск frontend
docker restart estimate-frontend

# Проверка переменных окружения
docker exec estimate-frontend env | grep VITE

# Пересборка frontend
docker build -t estimate-app-frontend:latest ./frontend-src/
docker-compose up -d --no-deps frontend
```

### 3. 🔐 Проблемы с аутентификацией

#### ❌ "Invalid credentials"

**Симптомы:**
- Не получается войти с правильными данными
- API возвращает 401/403
- "Учетные данные не были предоставлены"

**Диагностика:**
```bash
# Проверка пользователей в БД
docker exec estimate-backend python manage.py shell -c "
from api.models import User
print('Users count:', User.objects.count())
for u in User.objects.all()[:5]:
    print(f'- {u.email} (active: {u.is_active})')
"

# Тест авторизации
curl -X POST https://app.iqbs.pro/api/v1/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email": "manager@example.com", "password": "password123"}'
```

**Решения:**
```bash
# Создание пользователей
docker exec estimate-backend python manage.py seed_db

# Сброс пароля
docker exec -it estimate-backend python manage.py shell -c "
from api.models import User
user = User.objects.get(email='manager@example.com')
user.set_password('password123')
user.save()
print('Password reset for', user.email)
"

# Создание суперпользователя
docker exec -it estimate-backend python manage.py createsuperuser
```

#### ❌ CORS ошибки

**Симптомы:**
- "Access to fetch at '...' from origin '...' has been blocked by CORS policy"
- Preflight OPTIONS requests fail

**Диагностика:**
```bash
# Проверка CORS настроек
docker exec estimate-backend python manage.py shell -c "
from django.conf import settings
print('CORS_ALLOWED_ORIGINS:', settings.CORS_ALLOWED_ORIGINS)
print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)
"

# Тест CORS
curl -H "Origin: https://app.iqbs.pro" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://app.iqbs.pro/api/v1/auth/login/
```

**Решения:**
```bash
# Обновление CORS настроек в .env
echo "CORS_ALLOWED_ORIGINS=https://app.iqbs.pro,http://app.iqbs.pro" >> /var/www/estimate-app/.env

# Перезапуск backend
docker restart estimate-backend
```

### 4. 🗄️ Проблемы с базой данных

#### ❌ Database connection failed

**Симптомы:**
- "FATAL: password authentication failed"
- "could not connect to server"
- "database does not exist"

**Диагностика:**
```bash
# Проверка PostgreSQL
systemctl status postgresql
docker ps | grep postgres

# Проверка подключения
sudo -u postgres psql -c "\l"

# Тест подключения из контейнера
docker exec estimate-backend python manage.py dbshell
```

**Решения:**

**Если PostgreSQL на хосте:**
```bash
# Создание БД и пользователя
sudo -u postgres psql
CREATE USER estimate_user WITH PASSWORD 'secure_password_123';
CREATE DATABASE estimate_app_db OWNER estimate_user;
GRANT ALL PRIVILEGES ON DATABASE estimate_app_db TO estimate_user;
\q

# Обновление pg_hba.conf
echo "host estimate_app_db estimate_user 172.21.0.0/16 md5" >> /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql
```

**Если PostgreSQL в контейнере:**
```bash
# Запуск с новой БД
cd /var/www/estimate-app
docker-compose --profile new-db up -d postgres

# Проверка
docker exec estimate-postgres pg_isready -U estimate_user
```

#### ❌ Migration failed

**Симптомы:**
- "Migration 0001_initial failed"
- "relation already exists"
- "column does not exist"

**Диагностика:**
```bash
# Проверка миграций
docker exec estimate-backend python manage.py showmigrations

# Проверка состояния БД
docker exec estimate-backend python manage.py dbshell -c "\dt"
```

**Решения:**
```bash
# Ложные миграции (если БД пустая)
docker exec estimate-backend python manage.py migrate --fake-initial

# Откат миграций
docker exec estimate-backend python manage.py migrate api zero
docker exec estimate-backend python manage.py migrate

# Пересоздание миграций
docker exec estimate-backend python manage.py makemigrations
docker exec estimate-backend python manage.py migrate
```

### 5. 🚀 Проблемы с развертыванием

#### ❌ GitHub Actions failed

**Симптомы:**
- Красный статус в Actions
- "Process completed with exit code 1"
- Deployment не завершается

**Диагностика:**
```bash
# Проверка в GitHub Actions:
1. Перейти в Actions tab
2. Открыть последний failed workflow
3. Развернуть failed step
4. Изучить логи
```

**Частые причины и решения:**

**Tests failed:**
```bash
# Запуск тестов локально
cd backend
python manage.py test

# Исправление и коммит
git add .
git commit -m "fix: исправлены тесты"
git push
```

**SSH Connection failed:**
```bash
# Проверка SSH ключа
ssh -T git@github.com

# Проверка подключения к серверу
ssh root@195.14.122.135

# Перегенерация ключа (если нужно)
ssh-keygen -t rsa -b 4096 -C "deploy@app.iqbs.pro"
# Добавить новый ключ в GitHub Secrets
```

**Docker build failed:**
```bash
# Проверка сборки локально
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend

# Очистка кеша
docker builder prune

# Проверка места на диске
ssh root@195.14.122.135 "df -h"
```

#### ❌ Out of disk space

**Симптомы:**
- "No space left on device"
- Контейнеры не запускаются
- Build fails

**Диагностика:**
```bash
# Проверка места
df -h

# Docker использование
docker system df

# Поиск больших файлов
du -sh /var/lib/docker/*
find /var -size +100M -type f
```

**Решения:**
```bash
# Очистка Docker
docker system prune -f
docker image prune -a -f
docker volume prune -f

# Очистка логов
truncate -s 0 /var/log/nginx/*.log
journalctl --vacuum-time=7d

# Очистка apt кеша
apt autoremove -y
apt autoclean
```

## 🔧 Инструменты диагностики

### Скрипт полной диагностики

```bash
#!/bin/bash
# Файл: diagnose.sh

echo "=== ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ ==="
echo "Время: $(date)"
echo

echo "=== СИСТЕМА ==="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime -p)"
echo

echo "=== РЕСУРСЫ ==="
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | grep Mem | awk '{print $2 " total, " $3 " used, " $7 " available"}')"
echo "Disk: $(df -h | grep -E '/$' | awk '{print $2 " total, " $3 " used, " $4 " available"}')"
echo

echo "=== DOCKER ==="
echo "Version: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
echo "Compose: $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)"
docker system df
echo

echo "=== КОНТЕЙНЕРЫ ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo

echo "=== СЕТЬ ==="
echo "Nginx: $(systemctl is-active nginx)"
echo "PostgreSQL: $(systemctl is-active postgresql 2>/dev/null || echo 'not installed')"
netstat -tulpn | grep -E ':80|:443|:8000|:3000|:5432'
echo

echo "=== SSL ==="
if [ -f "/etc/letsencrypt/live/app.iqbs.pro/fullchain.pem" ]; then
    echo "SSL Certificate: ✓ Installed"
    echo "Expires: $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/app.iqbs.pro/fullchain.pem | cut -d= -f2)"
else
    echo "SSL Certificate: ✗ Not found"
fi
echo

echo "=== ПРИЛОЖЕНИЕ ==="
echo -n "Website: "
curl -s -o /dev/null -w "%{http_code}" https://app.iqbs.pro || echo "FAIL"
echo
echo -n "API: "
curl -s -o /dev/null -w "%{http_code}" https://app.iqbs.pro/api/v1/health/ || echo "FAIL"
echo

echo "=== ЛОГИ (последние 5 строк) ==="
echo "Backend:"
docker logs estimate-backend --tail 5 2>/dev/null || echo "Container not running"
echo
echo "Nginx error:"
tail -5 /var/log/nginx/error.log 2>/dev/null || echo "No error log"
echo

echo "=== ДИАГНОСТИКА ЗАВЕРШЕНА ==="
```

### Мониторинг в реальном времени

```bash
# Все логи приложения
tail -f /var/log/nginx/app.iqbs.pro.access.log \
        /var/log/nginx/app.iqbs.pro.error.log \
        <(docker logs -f estimate-backend 2>&1 | sed 's/^/[BACKEND] /') \
        <(docker logs -f estimate-frontend 2>&1 | sed 's/^/[FRONTEND] /')

# Мониторинг ресурсов
watch 'docker stats --no-stream; echo; df -h | head -2; echo; free -h'
```

### Автоматическое восстановление

```bash
#!/bin/bash
# Файл: auto-heal.sh
# Запуск через cron каждые 5 минут

# Проверка доступности API
if ! curl -f -s https://app.iqbs.pro/api/v1/health/ > /dev/null; then
    echo "$(date): API недоступен, перезапуск backend"
    docker restart estimate-backend
    sleep 30
fi

# Проверка frontend
if ! curl -f -s http://localhost:3000 > /dev/null; then
    echo "$(date): Frontend недоступен, перезапуск"
    docker restart estimate-frontend
    sleep 30
fi

# Проверка nginx
if ! systemctl is-active --quiet nginx; then
    echo "$(date): Nginx не активен, перезапуск"
    systemctl restart nginx
fi

# Очистка места при нехватке
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date): Диск заполнен на $DISK_USAGE%, очистка"
    docker system prune -f
    journalctl --vacuum-time=3d
fi
```

## 📞 Когда обращаться за помощью

### 🆘 Критические проблемы

Немедленно обращайтесь за помощью если:
- Приложение недоступно более 15 минут
- Потеря данных
- Подозрение на взлом
- Ошибки безопасности

### 📋 Информация для поддержки

При обращении за помощью предоставьте:

```bash
# Сбор информации для поддержки
echo "=== ИНФОРМАЦИЯ ДЛЯ ПОДДЕРЖКИ ===" > support-info.txt
echo "Дата: $(date)" >> support-info.txt
echo "Проблема: [ОПИШИТЕ ПРОБЛЕМУ]" >> support-info.txt
echo >> support-info.txt

echo "=== СИСТЕМА ===" >> support-info.txt
uname -a >> support-info.txt
lsb_release -a >> support-info.txt
echo >> support-info.txt

echo "=== DOCKER ===" >> support-info.txt
docker --version >> support-info.txt
docker ps -a >> support-info.txt
echo >> support-info.txt

echo "=== ЛОГИ BACKEND ===" >> support-info.txt
docker logs estimate-backend --tail 50 >> support-info.txt
echo >> support-info.txt

echo "=== ЛОГИ NGINX ===" >> support-info.txt
tail -50 /var/log/nginx/app.iqbs.pro.error.log >> support-info.txt
echo >> support-info.txt

echo "=== КОНФИГУРАЦИЯ ===" >> support-info.txt
cat /var/www/estimate-app/.env | grep -v PASSWORD | grep -v SECRET >> support-info.txt

# Отправка файла
# scp support-info.txt support@example.com:
```

---

**Следующий раздел**: [🛠️ Разработчику](./developer-guide.md)