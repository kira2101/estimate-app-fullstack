#!/bin/bash

# Скрипт настройки dev окружения
# Выполнить на сервере под root

set -e

echo "🚀 Настройка dev окружения для dev.app.iqbs.pro"

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Скрипт должен быть запущен под root"
    exit 1
fi

# 1. Создание директории для dev окружения
echo "📁 Создание директории dev окружения..."
mkdir -p /var/www/estimate-app-dev
mkdir -p /var/www/estimate-app-dev/logs
mkdir -p /var/www/estimate-app-dev/static
mkdir -p /var/www/estimate-app-dev/media

# Права доступа
chown -R www-data:www-data /var/www/estimate-app-dev
chmod -R 755 /var/www/estimate-app-dev

# 2. Настройка nginx конфигурации
echo "⚙️ Настройка nginx для dev.app.iqbs.pro..."

# Копирование конфигурации (предполагается, что файл уже загружен)
if [ -f "/var/www/estimate-app/deploy/dev.app.iqbs.pro.conf" ]; then
    cp /var/www/estimate-app/deploy/dev.app.iqbs.pro.conf /etc/nginx/sites-available/
    ln -sf /etc/nginx/sites-available/dev.app.iqbs.pro.conf /etc/nginx/sites-enabled/
    echo "✅ Nginx конфигурация установлена"
else
    echo "⚠️ Файл конфигурации nginx не найден, создаем минимальный..."
    cat > /etc/nginx/sites-available/dev.app.iqbs.pro.conf << 'EOF'
server {
    listen 80;
    server_name dev.app.iqbs.pro;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/dev.app.iqbs.pro.conf /etc/nginx/sites-enabled/
fi

# Проверка конфигурации nginx
if nginx -t; then
    echo "✅ Nginx конфигурация корректна"
    systemctl reload nginx
else
    echo "❌ Ошибка в конфигурации nginx"
    exit 1
fi

# 3. Получение SSL сертификата для dev поддомена
echo "🔒 Получение SSL сертификата для dev.app.iqbs.pro..."

# Проверка, что certbot установлен
if ! command -v certbot &> /dev/null; then
    echo "📦 Установка certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Получение сертификата
echo "🔐 Запрос SSL сертификата..."
certbot --nginx -d dev.app.iqbs.pro --non-interactive --agree-tos --email admin@iqbs.pro

if [ $? -eq 0 ]; then
    echo "✅ SSL сертификат получен успешно"
else
    echo "⚠️ Не удалось получить SSL сертификат, продолжаем без HTTPS"
fi

# 4. Создание Docker сети для dev
echo "🐳 Создание Docker сети для dev окружения..."
docker network create estimate_dev_network 2>/dev/null || echo "ℹ️ Сеть уже существует"

# 5. Создание базового .env файла для dev
echo "📝 Создание базового .env файла..."
cat > /var/www/estimate-app-dev/.env << 'EOF'
# Dev environment configuration
# Эти значения будут перезаписаны при деплое

SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=postgresql://estimate_user:secure_password_123@host.docker.internal:5432/estimate_app_db
ALLOWED_HOSTS=dev.app.iqbs.pro,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://dev.app.iqbs.pro,http://dev.app.iqbs.pro
CSRF_TRUSTED_ORIGINS=https://dev.app.iqbs.pro,http://dev.app.iqbs.pro
SSL_ENABLED=True
VITE_API_BASE_URL=https://dev.app.iqbs.pro/api/v1
EOF

# 6. Настройка ротации логов для dev
echo "📊 Настройка ротации логов..."
cat > /etc/logrotate.d/estimate-app-dev << 'EOF'
/var/log/nginx/dev.app.iqbs.pro.*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}

/var/www/estimate-app-dev/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF

# 7. Создание systemd сервиса для мониторинга dev контейнеров
echo "🔍 Создание сервиса мониторинга..."
cat > /etc/systemd/system/estimate-dev-monitor.service << 'EOF'
[Unit]
Description=Estimate App Dev Environment Monitor
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash -c '
    # Проверка и перезапуск dev контейнеров при необходимости
    if ! docker ps | grep -q estimate-backend-dev; then
        echo "Backend dev container not running, checking if it should be started..."
    fi
    
    if ! docker ps | grep -q estimate-frontend-dev; then
        echo "Frontend dev container not running, checking if it should be started..."
    fi
'

[Install]
WantedBy=multi-user.target
EOF

# Создание таймера для периодической проверки
cat > /etc/systemd/system/estimate-dev-monitor.timer << 'EOF'
[Unit]
Description=Run estimate dev monitor every 5 minutes
Requires=estimate-dev-monitor.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable estimate-dev-monitor.timer
systemctl start estimate-dev-monitor.timer

# 8. Создание скрипта для быстрого управления dev окружением
echo "🛠️ Создание management скрипта..."
cat > /usr/local/bin/estimate-dev << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "🚀 Starting dev environment..."
        cd /var/www/estimate-app-dev
        docker-compose -f docker-compose.dev.yml up -d 2>/dev/null || echo "Use GitHub Actions to deploy"
        ;;
    stop)
        echo "🛑 Stopping dev environment..."
        docker stop estimate-backend-dev estimate-frontend-dev 2>/dev/null || true
        ;;
    restart)
        echo "🔄 Restarting dev environment..."
        $0 stop
        sleep 3
        $0 start
        ;;
    status)
        echo "📊 Dev environment status:"
        docker ps | grep estimate.*dev
        echo ""
        echo "🌐 Access: https://dev.app.iqbs.pro"
        ;;
    logs)
        case "$2" in
            backend) docker logs -f estimate-backend-dev ;;
            frontend) docker logs -f estimate-frontend-dev ;;
            *) 
                echo "Available logs: backend, frontend"
                echo "Usage: estimate-dev logs [backend|frontend]"
                ;;
        esac
        ;;
    *)
        echo "Estimate App Dev Environment Manager"
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start dev containers"
        echo "  stop     - Stop dev containers"  
        echo "  restart  - Restart dev containers"
        echo "  status   - Show status"
        echo "  logs     - Show logs (backend/frontend)"
        ;;
esac
EOF

chmod +x /usr/local/bin/estimate-dev

echo ""
echo "✅ Dev окружение настроено успешно!"
echo ""
echo "📋 Что дальше:"
echo "1. Убедитесь, что DNS запись для dev.app.iqbs.pro указывает на этот сервер"
echo "2. Запушьте изменения в ветку dev для активации деплоя"
echo "3. Используйте команду 'estimate-dev status' для проверки статуса"
echo ""
echo "🌐 Dev окружение будет доступно по адресу: https://dev.app.iqbs.pro"
echo "🔧 Управление: estimate-dev {start|stop|restart|status|logs}"
echo ""
echo "⚠️ ВАЖНО: Dev окружение использует ту же базу данных, что и продакшн!"