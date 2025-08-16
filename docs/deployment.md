# 📦 Развертывание приложения

Детальное руководство по процессу развертывания и управлению production окружением.

## 🏗️ Архитектура развертывания

```
┌─────────────────────────────────────────────────────────────────┐
│                          Production Server                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │   Nginx     │  │   Docker     │  │       PostgreSQL        │  │
│  │   (SSL)     │  │  Containers  │  │    (Host/Container)     │  │
│  │    :80      │  │              │  │         :5432           │  │
│  │   :443      │  │              │  │                         │  │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘  │
│         │                  │                        │            │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌───────────▼──────────┐  │
│  │  Frontend   │  │    Backend      │  │       Redis         │  │
│  │ (React App) │  │   (Django)      │  │     (Optional)      │  │
│  │   :3000     │  │     :8000       │  │       :6379         │  │
│  └─────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Процесс развертывания

### 1. Автоматический деплой

#### Полный деплой (main ветка)

```bash
# Триггер
git push origin main

# Этапы выполнения:
1. 🧪 Tests          # 3-5 минут
2. 🏗️ Build          # 5-8 минут  
3. 🚀 Deploy         # 2-4 минуты
4. ✅ Health Check   # 1 минута
```

#### Быстрый деплой (dev ветка)

```bash
# Триггер
git push origin dev

# Этапы выполнения:
1. 📋 Analyze        # 30 секунд
2. ⚡ Quick Deploy   # 1-2 минуты
3. ✅ Health Check   # 30 секунд
```

### 2. Ручной деплой

#### На сервере

```bash
# Подключение
ssh root@195.14.122.135

# Переход в проект
cd /var/www/estimate-app

# Полный деплой
bash deploy.sh

# Быстрый деплой
bash quick-deploy.sh
```

#### Локально

```bash
# Синхронизация кода
./deploy/sync-code.sh

# Ручная сборка и отправка
docker build -t estimate-backend ./backend
docker save estimate-backend > backend.tar
scp backend.tar root@195.14.122.135:/var/www/estimate-app/
```

## 📁 Структура на сервере

```
/var/www/estimate-app/
├── docker-compose.yml          # Конфигурация контейнеров
├── .env                        # Переменные окружения
├── backend-image.tar           # Docker образ backend
├── frontend-image.tar          # Docker образ frontend
├── deploy.sh                   # Скрипт полного деплоя
├── quick-deploy.sh             # Скрипт быстрого деплоя
├── nginx.conf                  # Конфигурация nginx (legacy)
├── logs/                       # Логи приложения
│   ├── django.log
│   ├── security.log
│   └── audit.log
├── static/                     # Статические файлы Django
├── media/                      # Загруженные файлы
├── ssl/                        # SSL сертификаты (legacy)
└── backups/                    # Резервные копии БД
    └── db_backup_YYYYMMDD_HHMMSS.sql
```

## 🐳 Docker конфигурация

### docker-compose.production.yml

```yaml
version: '3.8'

services:
  # PostgreSQL (опционально, если не установлен на хосте)
  postgres:
    image: postgres:15
    container_name: estimate-postgres
    environment:
      POSTGRES_DB: estimate_app_db
      POSTGRES_USER: estimate_user
      POSTGRES_PASSWORD: secure_password_123
    profiles:
      - new-db  # Запускается только при необходимости

  # Backend Django
  backend:
    image: estimate-app-backend:latest
    container_name: estimate-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
      - SSL_ENABLED=${SSL_ENABLED}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - estimate_network

  # Frontend React
  frontend:
    image: estimate-app-frontend:latest
    container_name: estimate-frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL}
    networks:
      - estimate_network

networks:
  estimate_network:
    external: true  # Создается отдельно в deploy.sh
```

### Управление контейнерами

```bash
# Просмотр статуса
docker ps -a

# Перезапуск сервиса
docker restart estimate-backend
docker restart estimate-frontend

# Просмотр логов
docker logs -f estimate-backend
docker logs -f estimate-frontend

# Вход в контейнер
docker exec -it estimate-backend bash
docker exec -it estimate-frontend sh

# Остановка всех сервисов
docker-compose down

# Запуск сервисов
docker-compose up -d
```

## 🌐 Nginx конфигурация

### Системный Nginx

Приложение использует системный nginx, а не контейнерный.

**Конфигурация**: `/etc/nginx/sites-available/app.iqbs.pro.conf`

```nginx
# HTTP configuration (без SSL)
server {
    listen 80;
    server_name app.iqbs.pro;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Frontend proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**HTTPS конфигурация**: `/etc/nginx/sites-available/app.iqbs.pro-ssl.conf`

Активируется автоматически после получения SSL сертификатов.

### Управление Nginx

```bash
# Проверка конфигурации
nginx -t

# Перезагрузка конфигурации
systemctl reload nginx

# Перезапуск службы
systemctl restart nginx

# Просмотр статуса
systemctl status nginx

# Логи
tail -f /var/log/nginx/app.iqbs.pro.access.log
tail -f /var/log/nginx/app.iqbs.pro.error.log
```

## 🔐 SSL сертификаты

### Автоматическое получение

SSL сертификаты получаются автоматически во время деплоя через Let's Encrypt.

### Ручное получение

```bash
# Установка certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot certonly --webroot -w /var/www/html -d app.iqbs.pro

# Или через nginx
certbot --nginx -d app.iqbs.pro
```

### Управление сертификатами

```bash
# Список сертификатов
certbot certificates

# Обновление сертификатов
certbot renew

# Тест обновления
certbot renew --dry-run

# Автоматическое обновление (cron)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🗄️ База данных

### PostgreSQL на хосте (рекомендуется)

```bash
# Установка
apt install -y postgresql postgresql-contrib

# Создание пользователя и БД
sudo -u postgres psql
CREATE USER estimate_user WITH PASSWORD 'secure_password_123';
CREATE DATABASE estimate_app_db OWNER estimate_user;
GRANT ALL PRIVILEGES ON DATABASE estimate_app_db TO estimate_user;
\q

# Настройка подключения
echo "DATABASE_URL=postgresql://estimate_user:secure_password_123@host.docker.internal:5432/estimate_app_db" >> /var/www/estimate-app/.env
```

### PostgreSQL в контейнере

```bash
# Запуск с профилем new-db
docker-compose --profile new-db up -d postgres

# Проверка
docker exec estimate-postgres pg_isready
```

### Управление БД

```bash
# Миграции
docker exec estimate-backend python manage.py migrate

# Создание суперпользователя
docker exec -it estimate-backend python manage.py createsuperuser

# Заполнение начальными данными
docker exec estimate-backend python manage.py seed_db

# Резервное копирование
docker exec estimate-postgres pg_dump -U estimate_user estimate_app_db > backup.sql

# Восстановление
docker exec -i estimate-postgres psql -U estimate_user estimate_app_db < backup.sql
```

## 📊 Мониторинг развертывания

### Health Checks

```bash
# Проверка API
curl https://app.iqbs.pro/api/v1/health/

# Ожидаемый ответ:
{
  "status": "healthy",
  "service": "estimate-backend",
  "version": "1.0.0"
}
```

### Статус сервисов

```bash
# Docker контейнеры
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Системные службы
systemctl status nginx
systemctl status postgresql  # если используется

# Использование ресурсов
docker stats
htop
df -h
```

### Логи развертывания

```bash
# Логи деплоя
journalctl -u docker -f

# Логи приложения
docker logs -f estimate-backend
docker logs -f estimate-frontend

# Логи nginx
tail -f /var/log/nginx/app.iqbs.pro.error.log

# Системные логи
journalctl -f
```

## 🔧 Конфигурация среды

### Переменные окружения

**Файл**: `/var/www/estimate-app/.env`

```env
# Основные настройки
SECRET_KEY=your_secret_key_here_50_characters_minimum
DEBUG=False
SSL_ENABLED=True

# Домен и сеть
ALLOWED_HOSTS=195.14.122.135,localhost,app.iqbs.pro,iqbs.pro
CORS_ALLOWED_ORIGINS=https://app.iqbs.pro,http://app.iqbs.pro
CSRF_TRUSTED_ORIGINS=https://app.iqbs.pro,http://app.iqbs.pro

# База данных
DATABASE_URL=postgresql://estimate_user:secure_password_123@host.docker.internal:5432/estimate_app_db

# Frontend
VITE_API_BASE_URL=https://app.iqbs.pro/api/v1

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
```

### Обновление конфигурации

```bash
# Редактирование .env
nano /var/www/estimate-app/.env

# Перезапуск после изменений
docker restart estimate-backend
```

## 🚀 Стратегии развертывания

### Blue-Green Deployment

```bash
# Создание копии
cp docker-compose.yml docker-compose.blue.yml

# Обновление green
docker-compose -f docker-compose.green.yml up -d

# Переключение nginx на green
ln -sf /etc/nginx/sites-available/app.iqbs.pro-green.conf /etc/nginx/sites-enabled/app.iqbs.pro.conf
nginx -s reload

# Остановка blue
docker-compose -f docker-compose.blue.yml down
```

### Rolling Update

```bash
# Поочередное обновление сервисов
docker-compose up -d --no-deps backend
sleep 30
docker-compose up -d --no-deps frontend
```

### Canary Deployment

```bash
# Развертывание на часть трафика
# Настраивается через nginx upstream
```

## 🔄 Откат (Rollback)

### Быстрый откат

```bash
# Откат к предыдущему коммиту
git reset --hard HEAD~1
git push --force

# Или откат к тегу
git checkout v1.0.0
git push --force
```

### Откат базы данных

```bash
# Восстановление из backup
docker exec -i estimate-postgres psql -U estimate_user estimate_app_db < /var/www/estimate-app/backups/backup_YYYYMMDD.sql
```

### Откат Docker образов

```bash
# Использование предыдущих образов
docker tag estimate-app-backend:v1.0.0 estimate-app-backend:latest
docker-compose up -d --no-deps backend
```

## 📈 Оптимизация развертывания

### Кеширование образов

```bash
# Сохранение образов локально
docker save estimate-app-backend:latest | gzip > backend.tar.gz
docker save estimate-app-frontend:latest | gzip > frontend.tar.gz

# Загрузка образов
gunzip < backend.tar.gz | docker load
gunzip < frontend.tar.gz | docker load
```

### Параллельное развертывание

```bash
# Одновременная сборка образов
docker build -t backend ./backend &
docker build -t frontend ./frontend &
wait
```

### Минимизация времени простоя

```bash
# Предварительная загрузка
docker pull postgres:15 &
docker pull nginx:alpine &

# Прогрев кеша
curl -s https://app.iqbs.pro/api/v1/health/ > /dev/null
```

## 🚨 Аварийное восстановление

### Полное восстановление

```bash
# 1. Остановка всех сервисов
docker-compose down
systemctl stop nginx

# 2. Очистка
docker system prune -f
docker volume prune -f

# 3. Восстановление из backup
git clone https://github.com/yourusername/estimate-app-fullstack.git /var/www/estimate-app-new
cd /var/www/estimate-app-new

# 4. Развертывание
bash deploy/deploy.sh

# 5. Восстановление данных
docker exec -i estimate-postgres psql -U estimate_user estimate_app_db < backup.sql
```

### Проверка целостности

```bash
# Проверка файловой системы
fsck /dev/sda1

# Проверка Docker
docker system df
docker system events

# Проверка сети
netstat -tulpn
iptables -L
```

---

**Следующий раздел**: [🔍 Диагностика проблем](./troubleshooting.md)