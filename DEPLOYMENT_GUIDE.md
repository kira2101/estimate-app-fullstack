# Руководство по развертыванию в продакшине

## 1. Предварительные требования

### Системные требования:
- **OS**: Ubuntu 20.04+ / CentOS 7+ / RHEL 8+
- **RAM**: Минимум 2GB, рекомендуется 4GB+
- **Disk**: Минимум 20GB свободного места
- **CPU**: 2+ ядра
- **Network**: Статический IP адрес

### Установка Docker и Docker Compose:
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагрузка для применения изменений группы
logout # и зайти снова
```

## 2. Подготовка сервера

### Обновление системы:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx
```

### Настройка файрволла:
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### Создание структуры каталогов:
```bash
sudo mkdir -p /opt/estimate-app
sudo mkdir -p /opt/estimate-app/backups
sudo mkdir -p /opt/estimate-app/logs
sudo mkdir -p /opt/estimate-app/ssl
sudo chown -R $USER:$USER /opt/estimate-app
```

## 3. Клонирование и настройка проекта

### Клонирование репозитория:
```bash
cd /opt/estimate-app
git clone https://github.com/kira2101/estimate-app-fullstack.git .
git checkout main  # или нужная ветка
```

### Настройка переменных окружения:
```bash
# Создание .env файла
cp backend/.env.example .env

# Редактирование .env файла
nano .env
```

### Пример содержимого .env:
```bash
# Django Settings
SECRET_KEY=your-very-secure-secret-key-minimum-50-characters-long-12345678901234567890
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,server-ip

# Database
DB_PASSWORD=secure_database_password_here
DATABASE_URL=postgresql://estimate_user:secure_database_password_here@db:5432/estimate_app_db

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Redis
REDIS_URL=redis://redis:6379/1

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
SERVER_EMAIL=server@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Backup
BACKUP_DIR=/opt/estimate-app/backups
BACKUP_RETENTION_DAYS=30
```

## 4. SSL сертификаты

### Получение Let's Encrypt сертификата:
```bash
# Временно остановить nginx если запущен
sudo systemctl stop nginx

# Получить сертификат
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Копировать сертификаты в проект
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*
```

### Автоматическое обновление сертификатов:
```bash
# Создать скрипт обновления
cat << 'EOF' > /opt/estimate-app/renew-ssl.sh
#!/bin/bash
certbot renew --quiet
if [ $? -eq 0 ]; then
    cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/estimate-app/ssl/cert.pem
    cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/estimate-app/ssl/key.pem
    docker-compose restart nginx
fi
EOF

chmod +x /opt/estimate-app/renew-ssl.sh

# Добавить в crontab
(crontab -l ; echo "0 3 * * * /opt/estimate-app/renew-ssl.sh") | crontab -
```

## 5. Развертывание приложения

### Сборка и запуск контейнеров:
```bash
cd /opt/estimate-app

# Сборка образов
docker-compose build

# Запуск в фоновом режиме
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### Инициализация базы данных:
```bash
# Применение миграций
docker-compose exec backend python manage.py migrate

# Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser

# Создание тестовых данных (опционально)
docker-compose exec backend python manage.py seed_db

# Сборка статических файлов
docker-compose exec backend python manage.py collectstatic --noinput
```

## 6. Мониторинг и логирование

### Просмотр логов:
```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f db
```

### Настройка logrotate:
```bash
sudo cat << 'EOF' > /etc/logrotate.d/estimate-app
/opt/estimate-app/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        docker-compose -f /opt/estimate-app/docker-compose.yml restart backend
    endscript
}
EOF
```

## 7. Резервное копирование

### Скрипт автоматического бэкапа:
```bash
cat << 'EOF' > /opt/estimate-app/backup.sh
#!/bin/bash
BACKUP_DIR="/opt/estimate-app/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Резервная копия базы данных
docker-compose exec -T db pg_dump -U estimate_user estimate_app_db > "$BACKUP_DIR/db_$DATE.sql"

# Резервная копия media файлов
tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" -C /opt/estimate-app media/

# Удаление старых резервных копий (старше 30 дней)
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# Отправка уведомления (опционально)
echo "Backup completed successfully at $(date)" | mail -s "Estimate App Backup" admin@yourdomain.com
EOF

chmod +x /opt/estimate-app/backup.sh

# Добавить в crontab (ежедневно в 2:00)
(crontab -l ; echo "0 2 * * * /opt/estimate-app/backup.sh") | crontab -
```

## 8. Мониторинг производительности

### Установка мониторинга:
```bash
# Добавить в docker-compose.yml
cat << 'EOF' >> docker-compose.yml

  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password

volumes:
  grafana_data:
EOF
```

## 9. Обновление приложения

### Процедура обновления:
```bash
#!/bin/bash
cd /opt/estimate-app

# Создание резервной копии
./backup.sh

# Получение обновлений
git pull origin main

# Остановка сервисов
docker-compose down

# Пересборка образов
docker-compose build --no-cache

# Запуск обновленных сервисов
docker-compose up -d

# Применение новых миграций
docker-compose exec backend python manage.py migrate

# Сборка статических файлов
docker-compose exec backend python manage.py collectstatic --noinput

# Проверка состояния
docker-compose ps
```

## 10. Troubleshooting

### Общие проблемы и решения:

#### Контейнер не запускается:
```bash
# Проверка логов
docker-compose logs service_name

# Проверка конфигурации
docker-compose config

# Пересборка образа
docker-compose build --no-cache service_name
```

#### База данных недоступна:
```bash
# Проверка состояния PostgreSQL
docker-compose exec db pg_isready -U estimate_user

# Подключение к базе
docker-compose exec db psql -U estimate_user -d estimate_app_db

# Восстановление из резервной копии
docker-compose exec -T db psql -U estimate_user -d estimate_app_db < backups/db_backup.sql
```

#### Проблемы с SSL:
```bash
# Проверка сертификата
openssl x509 -in ssl/cert.pem -text -noout

# Тестирование SSL
curl -I https://yourdomain.com
```

## 11. Проверка развертывания

### Чек-лист после развертывания:
- [ ] Все контейнеры запущены: `docker-compose ps`
- [ ] База данных работает: `curl -f http://localhost:8000/api/v1/work-categories/`
- [ ] HTTPS работает: `curl -I https://yourdomain.com`
- [ ] Статические файлы загружаются
- [ ] Аутентификация работает
- [ ] Excel экспорт функционирует
- [ ] Логирование настроено
- [ ] Резервное копирование настроено
- [ ] Мониторинг работает

### Нагрузочное тестирование:
```bash
# Установка инструментов
pip install locust

# Запуск тестов
locust -f load_test.py --host=https://yourdomain.com
```

## 12. Техническая поддержка

### Команды для диагностики:
```bash
# Использование ресурсов
docker stats

# Дисковое пространство
df -h
du -sh /opt/estimate-app/*

# Сетевые подключения
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# Процессы
ps aux | grep docker
```

### Контакты и документация:
- **Документация**: `/opt/estimate-app/README.md`
- **Логи**: `/opt/estimate-app/logs/`
- **Конфигурация**: `/opt/estimate-app/.env`
- **Резервные копии**: `/opt/estimate-app/backups/`