# 🚀 Fast Dev Deploy - Быстрый деплой dev окружения

## 📁 Содержимое папки

### 🔧 Основные скрипты:

**`quick-deploy-dev.sh`** - Главный скрипт Docker деплоя dev окружения
- Останавливает старые контейнеры `estimate-backend-dev`, `estimate-frontend-dev`
- Собирает новые Docker образы из исходного кода
- Запускает контейнеры с правильными настройками
- **Использование**: `./quick-deploy-dev.sh`

**`diagnose-dev-containers.sh`** - Диагностика проблем dev окружения  
- Проверка доступности dev.app.iqbs.pro
- Health check API
- Команды для проверки на сервере
- **Использование**: `./diagnose-dev-containers.sh`

### ⚙️ Конфигурация:

**`.env.dev`** - Переменные окружения для dev контейнеров
- База данных, CORS, Django settings
- Пути к статике и медиа файлам
- Настройки безопасности для dev

**`TROUBLESHOOTING.md`** - Решение проблем деплоя
- Пошаговые инструкции по устранению ошибок
- Диагностика SSH, Docker, Nginx проблем
- Альтернативные способы деплоя

## 🎯 Быстрый старт

### 1. Автоматический деплой (рекомендуется):
```bash
git push origin dev
```
Запускает GitHub Actions workflow, который выполняет деплой автоматически.

### 2. Ручной деплой на сервере:
```bash
ssh root@195.14.122.135
cd /var/www/estimate-app-dev
./deploy/fast_dev_deploy/quick-deploy-dev.sh
```

### 3. Диагностика проблем:
```bash
./diagnose-dev-containers.sh
```

## 📊 Dev окружение

- **URL**: https://dev.app.iqbs.pro
- **API**: https://dev.app.iqbs.pro/api/v1/
- **Health**: https://dev.app.iqbs.pro/api/v1/health/

### Docker контейнеры:
- **Backend**: `estimate-backend-dev` (порт 8001)
- **Frontend**: `estimate-frontend-dev` (порт 3001)

### База данных:
- **Использует ту же БД** что и продакшн (`estimate_app_db`)
- **Подключение**: через контейнер `estimate-postgres`
- **SECRET_KEY**: отдельный для dev (`dev-secret-key-for-testing`)

## 🔍 Мониторинг

### Проверка статуса:
```bash
curl -s https://dev.app.iqbs.pro/api/v1/health/
```

### Логи контейнеров:
```bash
ssh root@195.14.122.135 'docker logs estimate-backend-dev --tail 30'
ssh root@195.14.122.135 'docker logs estimate-frontend-dev --tail 20'
```

### Статус контейнеров:
```bash
ssh root@195.14.122.135 'docker ps | grep estimate.*dev'
```

## ⚡ Ключевые особенности

✅ **Автоматический деплой** через GitHub Actions  
✅ **Docker контейнеризация** backend и frontend  
✅ **Отдельные порты** от продакшн (8001/3001 vs 8000/3000)  
✅ **Общая база данных** с продакшн  
✅ **Nginx конфигурация** с SSL и CORS  
✅ **Health checks** и мониторинг  

## 🛠️ Техническая информация

### Сеть Docker:
Dev контейнеры подключены к сети `estimate_network` для доступа к PostgreSQL.

### Переменные окружения:
- `SECRET_KEY=dev-secret-key-for-testing`
- `DATABASE_URL=postgresql://estimate_user:secure_password_123@postgres:5432/estimate_app_db`
- `DJANGO_SETTINGS_MODULE=core.settings_production`
- `DEBUG=False`

### GitHub Actions:
Workflow файл: `/.github/workflows/deploy-dev.yml`
- Триггер: push в ветку `dev`
- SSH ключ: `PRODUCTION_SSH_KEY`
- Время деплоя: 3-5 минут

---

**Создано**: 22.08.2025  
**Статус**: Полностью функциональный автоматический деплой  
**Последнее обновление**: Исправлено подключение к БД через estimate_network