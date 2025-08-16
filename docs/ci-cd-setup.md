# 🔧 Настройка CI/CD

Подробное руководство по настройке непрерывной интеграции и развертывания.

## 🏗️ Архитектура CI/CD

```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Tests]
    C --> D[Build Docker]
    D --> E[Deploy to Server]
    E --> F[Health Check]
    
    G[dev branch] --> H[Quick Deploy]
    I[main branch] --> J[Full Deploy]
```

## 📋 Workflows

### 1. Полный деплой (main ветка)

**Файл**: `.github/workflows/deploy-production.yml`

**Триггеры:**
- Push в `main` ветку
- Ручной запуск через GitHub UI

**Этапы:**
1. **🧪 Test** - запуск тестов с PostgreSQL
2. **🏗️ Build** - сборка Docker образов
3. **🚀 Deploy** - развертывание на сервер

**Время выполнения**: ~10-15 минут

### 2. Быстрый деплой (dev ветка)

**Файл**: `.github/workflows/quick-deploy.yml`

**Триггеры:**
- Push в `dev` ветку
- Ручной запуск

**Этапы:**
1. **📋 Analyze** - анализ изменений
2. **⚡ Deploy** - обновление только кода

**Время выполнения**: ~2-3 минуты

## 🔑 GitHub Secrets

### Обязательные секреты

| Секрет | Описание | Пример |
|--------|----------|--------|
| `PRODUCTION_SSH_KEY` | Приватный SSH ключ | `-----BEGIN RSA PRIVATE KEY-----...` |

### Получение SSH ключа

```bash
# Генерация ключей
ssh-keygen -t rsa -b 4096 -C "deploy@yourdomain.com" -f ~/.ssh/deploy_key

# Публичный ключ (добавить на сервер)
cat ~/.ssh/deploy_key.pub

# Приватный ключ (добавить в GitHub Secrets)
cat ~/.ssh/deploy_key
```

### Добавление ключа на сервер

```bash
# На сервере
mkdir -p ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2E..." >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## ⚙️ Конфигурация окружений

### Production Environment

**Файл**: `deploy/production.env`

```env
# =============================================================================
# ОСНОВНЫЕ НАСТРОЙКИ
# =============================================================================
DATABASE_URL=postgresql://estimate_user:secure_password_123@host.docker.internal:5432/estimate_app_db
SECRET_KEY=ОБЯЗАТЕЛЬНО_ИЗМЕНИТЕ_НА_УНИКАЛЬНЫЙ_КЛЮЧ_50_СИМВОЛОВ
DEBUG=False

# =============================================================================
# ДОМЕН И СЕТЬ
# =============================================================================
ALLOWED_HOSTS=ВАШИ_IP_И_ДОМЕНЫ_ЧЕРЕЗ_ЗАПЯТУЮ
CORS_ALLOWED_ORIGINS=https://yourdomain.com,http://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,http://yourdomain.com
VITE_API_BASE_URL=https://yourdomain.com/api/v1

# =============================================================================
# SSL И БЕЗОПАСНОСТЬ
# =============================================================================
SSL_ENABLED=False  # Автоматически включается после получения сертификатов

# =============================================================================
# EMAIL
# =============================================================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# =============================================================================
# БАЗА ДАННЫХ
# =============================================================================
POSTGRES_DB=estimate_app_db
POSTGRES_USER=estimate_user
POSTGRES_PASSWORD=secure_password_123
POSTGRES_PORT=5432
```

### Workflow Configuration

**Файл**: `.github/workflows/deploy-production.yml`

```yaml
env:
  SERVER_HOST: 195.14.122.135     # IP вашего сервера
  SERVER_USER: root               # Пользователь для SSH
  PROJECT_PATH: /var/www/estimate-app
  DOCKER_IMAGE_PREFIX: estimate-app
```

## 🔄 Стратегии развертывания

### 1. Полный деплой (рекомендуется для production)

**Когда использовать:**
- Первое развертывание
- Изменения в зависимостях
- Изменения в Docker конфигурации
- Изменения frontend кода
- Важные обновления

**Как запустить:**
```bash
git checkout main
git add .
git commit -m "feat: важное обновление"
git push origin main
```

### 2. Быстрый деплой (для разработки)

**Когда использовать:**
- Исправления багов в backend
- Изменения в Python коде
- Новые миграции Django
- Мелкие правки API

**Как запустить:**
```bash
git checkout dev
git add .
git commit -m "fix: исправление бага"
git push origin dev
```

### 3. Ручная синхронизация (для экстренных случаев)

```bash
# Только для backend изменений
./deploy/sync-code.sh

# Или на сервере
ssh root@SERVER_IP "cd /var/www/estimate-app && bash quick-deploy.sh"
```

## 📊 Мониторинг деплоев

### GitHub Actions Dashboard

1. Перейдите в репозиторий на GitHub
2. Выберите вкладку "Actions"
3. Отслеживайте прогресс workflows

### Статусы деплоя

| Статус | Описание | Действие |
|--------|----------|----------|
| ✅ **Success** | Деплой завершен успешно | Проверить приложение |
| ❌ **Failed** | Ошибка в процессе | Проверить логи, исправить |
| 🟡 **Running** | Деплой в процессе | Ждать завершения |
| ⏸️ **Cancelled** | Деплой отменен | Перезапустить |

### Быстрая диагностика

```bash
# Проверка работы приложения
curl https://yourdomain.com/api/v1/health/

# Статус контейнеров
ssh root@SERVER_IP "docker ps"

# Логи деплоя
ssh root@SERVER_IP "docker logs estimate-backend --tail 50"
```

## 🚨 Решение проблем CI/CD

### Частые ошибки

#### ❌ "Permission denied (publickey)"

**Причина:** Неправильный SSH ключ

**Решение:**
```bash
# Проверить ключ
ssh -T git@github.com

# Проверить подключение к серверу
ssh root@SERVER_IP

# Пересоздать ключ
ssh-keygen -t rsa -b 4096 -C "deploy@yourdomain.com"
```

#### ❌ "Tests failed"

**Причина:** Ошибки в тестах

**Решение:**
```bash
# Запустить тесты локально
cd backend
python manage.py test

# Исправить ошибки и зафиксировать
git add .
git commit -m "fix: исправлены тесты"
git push
```

#### ❌ "Docker build failed"

**Причина:** Ошибки в Dockerfile или зависимостях

**Решение:**
```bash
# Проверить сборку локально
docker build -t test-backend ./backend
docker build -t test-frontend ./frontend

# Проверить зависимости
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

#### ❌ "Deployment failed"

**Причина:** Проблемы на сервере

**Решение:**
```bash
# Проверить место на диске
ssh root@SERVER_IP "df -h"

# Проверить Docker
ssh root@SERVER_IP "docker system df"

# Очистить старые образы
ssh root@SERVER_IP "docker system prune -f"
```

## 🔧 Настройка уведомлений

### Slack уведомления

```yaml
# Добавить в workflow
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Email уведомления

Настраиваются в GitHub → Settings → Notifications

### Telegram уведомления

```yaml
- name: Telegram Notification
  if: failure()
  uses: appleboy/telegram-action@master
  with:
    to: ${{ secrets.TELEGRAM_TO }}
    token: ${{ secrets.TELEGRAM_TOKEN }}
    message: "❌ Deployment failed!"
```

## 📈 Оптимизация CI/CD

### Кеширование

```yaml
- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
```

### Параллельное выполнение

```yaml
strategy:
  matrix:
    service: [backend, frontend]
```

### Условное выполнение

```yaml
if: contains(github.event.head_commit.message, '[deploy]')
```

## 🎯 Лучшие практики

### 1. Версионирование

```bash
# Теги для релизов
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 2. Ветвление

- `main` - production
- `dev` - разработка
- `feature/*` - новые функции
- `hotfix/*` - срочные исправления

### 3. Коммиты

```bash
# Хорошие коммиты
git commit -m "feat: добавлена авторизация"
git commit -m "fix: исправлена ошибка в API"
git commit -m "docs: обновлена документация"
```

### 4. Тестирование

- Все тесты должны проходить локально
- Покрытие кода минимум 80%
- Обязательные тесты для критических функций

### 5. Безопасность

- Никогда не коммитить секреты
- Использовать GitHub Secrets
- Регулярно обновлять зависимости
- Проверять уязвимости

---

**Следующий раздел**: [📦 Развертывание](./deployment.md)