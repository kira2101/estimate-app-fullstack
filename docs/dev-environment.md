# 🧪 Dev окружение

Полное руководство по настройке и использованию development окружения.

## 🎯 Концепция

**Dev окружение** - это изолированная копия приложения для тестирования изменений:

```
Production:  https://app.iqbs.pro     (main branch) → Backend:8000, Frontend:3000
Development: https://dev.app.iqbs.pro (dev branch)  → Backend:8001, Frontend:3001
```

**Особенности dev окружения:**
- 🗄️ Использует **ту же базу данных**, что и продакшн
- ⚡ **Быстрый деплой** при push в ветку `dev` 
- 🔄 **Автоматические миграции** к общей БД
- 🚀 **Отдельные порты** для избежания конфликтов
- 🔍 **Отдельные логи** и мониторинг

## 🏗️ Первоначальная настройка

### 1. Настройка DNS

Добавьте A-запись для dev поддомена:
```
dev.app.iqbs.pro → 195.14.122.135
```

### 2. Настройка сервера

Выполните на сервере под root:

```bash
# Скачивание и запуск скрипта настройки
cd /var/www/estimate-app
wget https://raw.githubusercontent.com/yourusername/estimate-app-fullstack/main/deploy/setup-dev-environment.sh
chmod +x setup-dev-environment.sh
./setup-dev-environment.sh
```

Скрипт автоматически:
- ✅ Создаст директорию `/var/www/estimate-app-dev`
- ✅ Настроит nginx конфигурацию для `dev.app.iqbs.pro`
- ✅ Получит SSL сертификат через Let's Encrypt
- ✅ Создаст Docker сеть для dev окружения
- ✅ Установит управляющие скрипты

### 3. Проверка настройки

```bash
# Проверка nginx конфигурации
nginx -t

# Проверка SSL сертификата
curl -I https://dev.app.iqbs.pro

# Статус dev окружения
estimate-dev status
```

## 🚀 Workflow разработки

### Схема веток

```mermaid
graph LR
    A[feature/new-feature] --> B[dev branch]
    B --> C[dev.app.iqbs.pro]
    B --> D[main branch]  
    D --> E[app.iqbs.pro]
    
    style C fill:#e1f5fe
    style E fill:#e8f5e8
```

### Процесс разработки

**1. Создание feature ветки:**
```bash
git checkout dev
git pull origin dev
git checkout -b feature/new-functionality
```

**2. Разработка и тестирование:**
```bash
# Локальная разработка
git add .
git commit -m "feat: новая функциональность"
```

**3. Деплой в dev для тестирования:**
```bash
git checkout dev
git merge feature/new-functionality
git push origin dev
# → Автоматически запускается deploy-dev.yml
```

**4. Тестирование на dev.app.iqbs.pro**
- Проверка функциональности
- Тестирование UI/UX
- Проверка API

**5. Деплой в продакшн:**
```bash
git checkout main
git merge dev
git push origin main
# → Запускается deploy-production.yml
```

## ⚡ CI/CD для dev окружения

### GitHub Actions Workflow

При push в ветку `dev` автоматически:

1. **Сборка образов** с тегом `dev`
2. **Остановка** старых dev контейнеров
3. **Деплой новых контейнеров** на порты 8001/3001
4. **Применение миграций** к общей БД
5. **Health check** dev окружения

**Время деплоя**: ~3-5 минут

### Отличия от продакшн деплоя

| Параметр | Production | Development |
|----------|------------|-------------|
| **Тесты** | ✅ Полные | ❌ Пропуск |
| **Порты** | 8000/3000 | 8001/3001 |
| **Домен** | app.iqbs.pro | dev.app.iqbs.pro |
| **База данных** | Общая | Общая |
| **SSL** | Production cert | Dev cert |
| **Кеширование** | Включено | Отключено |

## 🛠️ Управление dev окружением

### Команды управления

```bash
# Статус контейнеров
estimate-dev status

# Перезапуск окружения
estimate-dev restart

# Просмотр логов
estimate-dev logs backend
estimate-dev logs frontend

# Остановка окружения
estimate-dev stop
```

### Мониторинг

**Проверка доступности:**
```bash
# Веб-интерфейс
curl -I https://dev.app.iqbs.pro

# API Health check  
curl https://dev.app.iqbs.pro/api/v1/health/

# Статус контейнеров
docker ps | grep dev
```

**Просмотр логов:**
```bash
# Backend логи
docker logs -f estimate-backend-dev

# Frontend логи  
docker logs -f estimate-frontend-dev

# Nginx логи для dev
tail -f /var/log/nginx/dev.app.iqbs.pro.access.log
tail -f /var/log/nginx/dev.app.iqbs.pro.error.log
```

## 🔧 Настройки dev окружения

### Переменные окружения

Dev окружение использует отдельный `.env` файл:

```bash
# /var/www/estimate-app-dev/.env
SECRET_KEY=dev-specific-secret
DATABASE_URL=postgresql://estimate_user:password@host.docker.internal:5432/estimate_app_db
ALLOWED_HOSTS=dev.app.iqbs.pro,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://dev.app.iqbs.pro,http://dev.app.iqbs.pro
CSRF_TRUSTED_ORIGINS=https://dev.app.iqbs.pro,http://dev.app.iqbs.pro
SSL_ENABLED=True
VITE_API_BASE_URL=https://dev.app.iqbs.pro/api/v1
```

### Особенности конфигурации

**Backend (порт 8001):**
- Отключено кеширование
- Расширенное логирование
- Та же БД что и продакшн

**Frontend (порт 3001):**
- Отключено кеширование
- Hot reload поддержка
- Dev API URL

**Nginx:**
- Отдельные логи для dev
- Заголовки указывающие на dev окружение
- Короткое время кеширования

## 🔍 Отладка и диагностика

### Частые проблемы

**❌ Dev сайт не открывается:**
```bash
# Проверка nginx
systemctl status nginx
nginx -t

# Проверка контейнеров
docker ps | grep dev

# Проверка портов
netstat -tulpn | grep -E ':8001|:3001'
```

**❌ API не отвечает:**
```bash
# Проверка backend контейнера
docker logs estimate-backend-dev

# Проверка подключения к БД
docker exec estimate-backend-dev python manage.py check --database default

# Тест прямого подключения
curl http://localhost:8001/api/v1/health/
```

**❌ SSL проблемы:**
```bash
# Проверка сертификата
openssl s_client -connect dev.app.iqbs.pro:443

# Обновление сертификата
certbot renew --cert-name dev.app.iqbs.pro
```

### Восстановление dev окружения

```bash
# Полное пересоздание
estimate-dev stop
docker rm estimate-backend-dev estimate-frontend-dev 2>/dev/null || true
docker rmi estimate-app-backend:dev estimate-app-frontend:dev 2>/dev/null || true

# Повторный деплой через GitHub Actions
git push origin dev --force-with-lease
```

## 📊 Мониторинг и метрики

### Автоматический мониторинг

Система автоматически проверяет каждые 5 минут:
- Доступность dev контейнеров
- Ответ API health check
- Использование ресурсов

### Ручная проверка

```bash
# Полная диагностика dev окружения
echo "=== DEV ENVIRONMENT STATUS ==="
echo "Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep dev

echo -e "\nAPI Health:"
curl -s https://dev.app.iqbs.pro/api/v1/health/ | python3 -m json.tool

echo -e "\nResource usage:"
docker stats --no-stream | grep dev

echo -e "\nRecent logs:"
docker logs estimate-backend-dev --tail 5
```

## 🔄 Синхронизация с продакшн

### База данных

Dev окружение использует **ту же БД**, поэтому:
- ✅ Изменения данных видны в обеих средах
- ⚠️ Миграции влияют на продакшн
- 🔒 Будьте осторожны с деструктивными операциями

### Файлы и медиа

Статические файлы разделены между окружениями:
```
/var/www/estimate-app/static/     # Production
/var/www/estimate-app-dev/static/ # Development
```

### Резервное копирование

Перед экспериментами рекомендуется создать бэкап:
```bash
# Бэкап БД
docker exec estimate-postgres pg_dump -U estimate_user estimate_app_db > dev_backup_$(date +%Y%m%d).sql

# Бэкап медиа файлов
tar -czf media_backup_$(date +%Y%m%d).tar.gz /var/www/estimate-app/media/
```

---

**Следующий раздел**: [🚀 CI/CD Setup](./ci-cd-setup.md)