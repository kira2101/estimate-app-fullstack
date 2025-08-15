# 🚀 Production Deployment Guide

Этот документ содержит инструкции по автоматическому деплою на продакшн сервер 195.14.122.135.

## 📋 Предварительные требования

### 1. На сервере должны быть установлены:
- Docker
- Docker Compose
- SSH доступ для GitHub Actions

### 2. PostgreSQL на сервере:
- Убедитесь, что PostgreSQL контейнер запущен на сервере
- Или деплой создаст новый контейнер PostgreSQL

### 3. GitHub Secrets:
Добавьте в настройки репозитория GitHub следующие секреты:

```
PRODUCTION_SSH_KEY - Приватный SSH ключ для доступа к серверу 195.14.122.135
```

## 🔧 Настройка SSH ключей

### Создание SSH ключа для деплоя:

```bash
# На локальной машине
ssh-keygen -t rsa -b 4096 -C "deployment@estimate-app" -f ~/.ssh/estimate_deploy_key

# Копирование публичного ключа на сервер
ssh-copy-id -i ~/.ssh/estimate_deploy_key.pub root@195.14.122.135

# Тестирование подключения
ssh -i ~/.ssh/estimate_deploy_key root@195.14.122.135
```

### Добавление ключа в GitHub:

1. Откройте Settings → Secrets and variables → Actions
2. Добавьте новый секрет:
   - **Name**: `PRODUCTION_SSH_KEY`
   - **Value**: Содержимое файла `~/.ssh/estimate_deploy_key` (приватный ключ)

## 🏗️ Процесс деплоя

### Автоматический деплой:
Деплой запускается автоматически при пуше в ветку `main`:

```bash
git push origin main
```

### Ручной деплой:
Можно запустить деплой вручную через GitHub Actions:

1. Перейдите в GitHub → Actions
2. Выберите workflow "🚀 Deploy to Production Server"
3. Нажмите "Run workflow"
4. При необходимости активируйте "Force deploy" для пропуска тестов

## 📁 Структура деплоя на сервере

После деплоя на сервере создается следующая структура:

```
/var/www/estimate-app/
├── docker-compose.yml        # Продакшн конфигурация Docker
├── .env                     # Переменные окружения
├── nginx.conf               # Конфигурация Nginx
├── deploy.sh                # Скрипт деплоя
├── logs/                    # Логи приложения
├── backups/                 # Резервные копии БД
└── ssl/                     # SSL сертификаты (для HTTPS)
```

## 🔒 Переменные окружения

Основные переменные в файле `.env` на сервере:

```bash
# Database
DATABASE_URL=postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db

# Django
SECRET_KEY=CHANGE_THIS_SECRET_KEY_IN_PRODUCTION
DEBUG=False
ALLOWED_HOSTS=195.14.122.135,estimate-app.com

# CORS
CORS_ALLOWED_ORIGINS=http://195.14.122.135,https://195.14.122.135

# Frontend
VITE_API_BASE_URL=http://195.14.122.135/api/v1
```

## 🚦 Этапы деплоя

GitHub Actions выполняет следующие этапы:

### 1. **Тестирование** 🧪
- Устанавливает зависимости
- Запускает PostgreSQL для тестов
- Выполняет миграции БД
- Запускает тесты Django

### 2. **Сборка** 🏗️
- Собирает Docker образы для backend и frontend
- Сохраняет образы как артефакты

### 3. **Деплой** 🚀
- Подключается к серверу по SSH
- Копирует конфигурационные файлы
- Копирует Docker образы
- Запускает скрипт деплоя

### 4. **Уведомления** 📢
- Отправляет статус деплоя

## 🔄 Процесс деплоя на сервере

Скрипт `deploy.sh` выполняет:

1. **Проверка зависимостей** - Docker, Docker Compose
2. **Создание директорий** - logs, backups, ssl
3. **Проверка PostgreSQL** - определяет, нужен ли новый контейнер
4. **Резервное копирование** - создает backup БД (если есть)
5. **Загрузка образов** - загружает новые Docker образы
6. **Остановка старых контейнеров**
7. **Запуск новых контейнеров**
8. **Ожидание запуска сервисов**
9. **Миграции БД** - выполняет Django миграции
10. **Сбор статики** - собирает статические файлы
11. **Проверка работоспособности** - тестирует API и frontend
12. **Очистка** - удаляет старые образы

## 🌐 Доступ к приложению

После успешного деплоя приложение доступно по адресу:
- **Frontend**: http://195.14.122.135
- **API**: http://195.14.122.135/api/v1/
- **Admin**: http://195.14.122.135/admin/

## 🔧 Управление контейнерами

### Просмотр статуса:
```bash
cd /var/www/estimate-app
docker-compose ps
```

### Просмотр логов:
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### Перезапуск сервисов:
```bash
# Все сервисы
docker-compose restart

# Конкретный сервис
docker-compose restart backend
```

### Остановка/запуск:
```bash
# Остановка
docker-compose down

# Запуск
docker-compose up -d
```

## 🗄️ Управление базой данных

### Создание резервной копии:
```bash
docker exec estimate-backend python manage.py dbbackup
```

### Восстановление:
```bash
docker exec estimate-backend python manage.py dbrestore
```

### Выполнение миграций:
```bash
docker exec estimate-backend python manage.py migrate
```

### Доступ к Django shell:
```bash
docker exec -it estimate-backend python manage.py shell
```

## 🔐 Безопасность

### HTTPS настройка:
1. Получите SSL сертификат (Let's Encrypt рекомендуется)
2. Поместите сертификаты в `/var/www/estimate-app/ssl/`
3. Раскомментируйте HTTPS секцию в `nginx.conf`
4. Обновите переменные окружения для HTTPS

### Регулярные backup'ы:
Настройте cron для автоматических резервных копий:

```bash
# Добавьте в crontab
0 2 * * * cd /var/www/estimate-app && docker exec estimate-backend python manage.py dbbackup
```

## 📊 Мониторинг

### Проверка здоровья:
- **Health check**: http://195.14.122.135/health
- **API status**: http://195.14.122.135/api/v1/statuses/

### Логи приложения:
- Django: `/var/www/estimate-app/logs/django.log`
- Security: `/var/www/estimate-app/logs/security.log`
- Audit: `/var/www/estimate-app/logs/audit.log`
- Nginx: Docker logs

## ❌ Устранение неполадок

### Проблемы с деплоем:
1. Проверьте SSH подключение к серверу
2. Убедитесь, что GitHub Secrets настроены правильно
3. Проверьте логи GitHub Actions

### Проблемы с приложением:
1. Проверьте статус контейнеров: `docker-compose ps`
2. Просмотрите логи: `docker-compose logs`
3. Проверьте конфигурацию `.env`

### Проблемы с базой данных:
1. Убедитесь, что PostgreSQL запущен
2. Проверьте строку подключения `DATABASE_URL`
3. Выполните миграции вручную

## 🔄 Откат к предыдущей версии

Если деплой прошел неуспешно:

1. Остановите текущие контейнеры:
   ```bash
   cd /var/www/estimate-app
   docker-compose down
   ```

2. Восстановите из резервной копии:
   ```bash
   # Восстановить БД из backup
   docker exec estimate-backend python manage.py dbrestore
   
   # Запустить предыдущую версию
   docker-compose up -d
   ```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи GitHub Actions
2. Подключитесь к серверу и проверьте логи Docker
3. Убедитесь в корректности конфигурации
4. При необходимости выполните ручной деплой с сервера

**Удачного деплоя! 🚀**