# 🎯 Анализ структуры работы приложения на удаленном сервере

**Дата анализа:** 22 августа 2025  
**Сервер:** 195.14.122.135  
**Статус:** Приложения запущены, но dev окружение требует обновления

## 📁 Структура проектов

| **Параметр** | **Продакшн** (`app.iqbs.pro`) | **Dev** (`dev.app.iqbs.pro`) |
|--------------|-------------------------------|------------------------------|
| **Путь проекта** | `/var/www/estimate-app/` | `/var/www/estimate-app-dev/` |
| **Домен** | `app.iqbs.pro` | `dev.app.iqbs.pro` |
| **Git статус** | Последнее обновление: 21.08.2025 | ⚠️ Последнее обновление: 16.08.2025 |
| **Файл .env** | ✅ `/var/www/estimate-app/.env` | ❌ Отсутствует в корне |

## 🌐 Сетевая архитектура и порты

### Схема портов
```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (80/443)                          │
├─────────────────────────┬───────────────────────────────────┤
│   app.iqbs.pro         │        dev.app.iqbs.pro           │
│   ┌─────────────────┐   │   ┌─────────────────────────────┐  │
│   │ Frontend :3000  │   │   │ Frontend :3001              │  │
│   │ Backend  :8000  │   │   │ Backend  :8001              │  │
│   └─────────────────┘   │   └─────────────────────────────┘  │
└─────────────────────────┴───────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │    :5432    │
                    └─────────────┘
```

### Активные порты на сервере
| **Сервис** | **Продакшн** | **Dev** | **Статус** | **Назначение** |
|------------|--------------|---------|-------------|----------------|
| **Nginx** | 80, 443 | 80, 443 | ✅ Работает | Веб-сервер и прокси |
| **Django Backend** | 8000 | 8001 | ✅ Работает | API сервер (Gunicorn) |
| **React Frontend** | 3000 | 3001 | ❓ Не проверен | Веб-интерфейс |
| **PostgreSQL** | 5432 | 5432 | ✅ Работает | База данных (общая) |
| **Дополнительные** | 5000, 8081 | - | ✅ Работает | Другие приложения |

## 🗄️ Конфигурация базы данных

### PostgreSQL контейнеры
```bash
# Основная база данных для estimate app
CONTAINER: estimate-postgres
IMAGE: postgres:15
PORTS: 0.0.0.0:5432->5432/tcp
STATUS: Up 5 days (healthy)

# Дополнительная база (logistics-bot)  
CONTAINER: logistics-bot-postgres
IMAGE: postgres:15-alpine
PORTS: 0.0.0.0:5433->5432/tcp
STATUS: Up 2 weeks (healthy)
```

### Настройки подключения к БД

**Продакшн конфигурация:**
```env
DATABASE_URL=postgresql://estimate_user:secure_password_123@postgres:5432/estimate_app_db
POSTGRES_DB=estimate_app_db
POSTGRES_USER=estimate_user
POSTGRES_PASSWORD=secure_password_123
```

**Dev конфигурация:**
```env
DATABASE_URL=postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db
```

## ⚙️ Переменные окружения

### Продакшн (`/var/www/estimate-app/.env`)
```env
# Django Configuration
DEBUG=False
SECRET_KEY=CHANGE_THIS_SECRET_KEY_IN_PRODUCTION_TO_SOMETHING_VERY_SECURE_AND_UNIQUE
ALLOWED_HOSTS=195.14.122.135,localhost,app.iqbs.pro,iqbs.pro

# Database
DATABASE_URL=postgresql://estimate_user:secure_password_123@postgres:5432/estimate_app_db

# Frontend
VITE_API_BASE_URL=https://app.iqbs.pro/api/v1

# CORS
CORS_ALLOWED_ORIGINS=http://195.14.122.135,https://195.14.122.135,https://app.iqbs.pro,http://app.iqbs.pro

# Security
SSL_ENABLED=False
CSRF_TRUSTED_ORIGINS=http://195.14.122.135,https://195.14.122.135,https://app.iqbs.pro,http://app.iqbs.pro

# Cache
REDIS_URL=redis://:redis_password@localhost:6379/1

# Admin
ADMIN_EMAIL=admin@iqbs.pro
```

### Dev (`/var/www/estimate-app-dev/backend/.env`)
```env
# Django Configuration
DEBUG=True
SECRET_KEY=django-insecure-!vtbt30(a!5baes982bxfl&&%heydrskzv4)2$$ty4$@j@uvc9
ALLOWED_HOSTS=127.0.0.1,localhost,2d504e224bd7.ngrok-free.app,87844538116b.ngrok-free.app

# Database
DATABASE_URL=postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db

# CORS (development)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://2d504e224bd7.ngrok-free.app,https://4236a38964c6.ngrok-free.app
```

## 🔄 Nginx прокси-конфигурация

### Продакшн (app.iqbs.pro)
```nginx
# Frontend
location / {
    proxy_pass http://localhost:3000;
}

# Backend API
location /api/ {
    proxy_pass http://localhost:8000;
}
```

### Dev (dev.app.iqbs.pro)
```nginx
# Frontend
location / {
    proxy_pass http://localhost:3001;
}

# Backend API  
location /api/ {
    proxy_pass http://localhost:8001;
}

# Health check
location /health {
    proxy_pass http://localhost:8001/api/v1/health/;
}
```

### Активные конфигурации Nginx
```bash
/etc/nginx/sites-enabled/app.iqbs.pro.conf       # Продакшн
/etc/nginx/sites-enabled/dev.app.iqbs.pro.conf   # Dev
```

## 🐳 Запущенные процессы

### Django Backend (Gunicorn воркеры)

**Продакшн (порт 8000):**
```bash
USER: ubuntu
PROCESSES: 6 активных воркеров
COMMAND: /usr/local/bin/python3.10 /usr/local/bin/gunicorn --bind 0.0.0.0:8000 --workers 3 --worker-class sync --timeout 120 --keep-alive 2 --max-requests 1000 --max-requests-jitter 50 --preload core.wsgi:application
```

**Dev (порт 8001):**
- Процессы запущены на порту 8001
- Аналогичная конфигурация Gunicorn

### Дополнительные сервисы
```bash
PORT 5000: Gunicorn приложение (4 воркера, пользователь root)
PORT 8081: Docker-proxy сервис
```

## 🔍 API Health Status

### Проверка работоспособности
```bash
# Продакшн API
curl -s https://app.iqbs.pro/api/v1/health/
{"status":"healthy","service":"estimate-backend","version":"1.0.0"}

# Dev API  
curl -s https://dev.app.iqbs.pro/api/v1/health/
{"status":"healthy","service":"estimate-backend","version":"1.0.0"}

# Локальные порты на сервере
curl -s http://localhost:8000/api/v1/health/ # ✅ Работает
curl -s http://localhost:8001/api/v1/health/ # ✅ Работает
```

## ⚠️ Выявленные проблемы

### 1. **Dev окружение устарело**
- **Продакшн**: Обновлен до 21.08.2025 ✅
- **Dev**: Последнее обновление 16.08.2025 ❌
- **Причина**: GitHub Actions деплой не обновил dev проект

### 2. **Отсутствует .env в dev корне**
- Файл `.env` находится в `/var/www/estimate-app-dev/backend/.env`
- Может потребоваться копирование в корень проекта

### 3. **Кеширование статических файлов**
```bash
# Заголовки ответа показывают старые файлы
last-modified: Sat, 16 Aug 2025 16:46:50 GMT
```

## 💡 Рекомендации для исправления

### 1. **Принудительное обновление dev окружения**
```bash
# На сервере
cd /var/www/estimate-app-dev
git checkout dev
git pull origin dev

# Перезапуск сервисов dev
sudo systemctl restart estimate-app-dev  # если есть systemd сервис
# или
pkill -f "gunicorn.*8001"  # убить процессы на порту 8001
# затем перезапуск
```

### 2. **Очистка кеша nginx**
```bash
sudo nginx -s reload
```

### 3. **Проверка процессов деплоя**
```bash
# Проверить автоматизацию GitHub Actions
# Убедиться что webhook настроен для ветки dev
```

## 📊 Мониторинг

### Команды для проверки статуса
```bash
# Проверка процессов
ps aux | grep -E "(gunicorn|python)" | grep -v grep

# Проверка портов  
ss -tlnp | grep -E ":8000|:8001|:3000|:3001"

# Проверка Docker контейнеров
docker ps | grep postgres

# Проверка логов nginx
tail -f /var/log/nginx/app.iqbs.pro.access.log
tail -f /var/log/nginx/dev.app.iqbs.pro.access.log
```

## 🔐 Безопасность

### SSL/TLS статус
- **Продакшн**: HTTPS работает ✅
- **Dev**: HTTPS работает ✅  
- **Сертификаты**: Let's Encrypt автоматическое обновление

### Security Headers
```nginx
X-Frame-Options: DENY
X-Content-Type-Options: nosniff  
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

**Заключение**: Приложения работают стабильно, но dev окружение требует обновления кода и возможной перезагрузки сервисов для отображения последних изменений.