# 🚀 Быстрый старт

Развертывание приложения за 15 минут.

## ✅ Предварительные требования

### 🖥️ Сервер
- **ОС**: Ubuntu 20.04+ / Debian 11+
- **RAM**: минимум 2GB, рекомендуется 4GB
- **Диск**: минимум 20GB свободного места
- **CPU**: 2+ ядра
- **Сеть**: публичный IP и доступ к интернету

### 🌐 Домен
- Домен настроен и указывает на IP сервера
- Пример: `app.iqbs.pro → 195.14.122.135`
- **Опционально**: поддомен для dev окружения: `dev.app.iqbs.pro → 195.14.122.135`

### 🔑 GitHub
- Форк репозитория
- SSH ключ для доступа к серверу
- GitHub Actions включены

## 🎯 Пошаговая установка

### 1. Подготовка сервера

```bash
# Подключение к серверу
ssh root@YOUR_SERVER_IP

# Обновление системы
apt update && apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
apt install -y docker-compose

# Установка дополнительных пакетов
apt install -y git curl wget nginx certbot python3-certbot-nginx

# Проверка установки
docker --version
docker-compose --version
nginx -v
```

### 2. Настройка GitHub Secrets

В настройках репозитория `Settings → Secrets and variables → Actions` добавьте:

```
PRODUCTION_SSH_KEY = [Приватный SSH ключ для доступа к серверу]
```

**Как получить SSH ключ:**
```bash
# На локальной машине
ssh-keygen -t rsa -b 4096 -C "deploy@yourdomain.com"
cat ~/.ssh/id_rsa.pub  # Публичный ключ → добавить на сервер
cat ~/.ssh/id_rsa      # Приватный ключ → добавить в GitHub Secrets
```

**Добавление публичного ключа на сервер:**
```bash
# На сервере
mkdir -p ~/.ssh
echo "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Настройка конфигурации

Отредактируйте файлы в репозитории:

**`deploy/production.env`** - основные настройки:
```env
# Домен
ALLOWED_HOSTS=195.14.122.135,localhost,app.iqbs.pro,iqbs.pro
CORS_ALLOWED_ORIGINS=https://app.iqbs.pro,http://app.iqbs.pro
CSRF_TRUSTED_ORIGINS=https://app.iqbs.pro,http://app.iqbs.pro
VITE_API_BASE_URL=https://app.iqbs.pro/api/v1

# Безопасность (ОБЯЗАТЕЛЬНО ИЗМЕНИТЬ!)
SECRET_KEY=ИЗМЕНИТЕ_НА_УНИКАЛЬНЫЙ_КЛЮЧ_ДЛИНОЙ_50_СИМВОЛОВ

# Email настройки
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

**`.github/workflows/deploy-production.yml`** - настройки сервера:
```yaml
env:
  SERVER_HOST: 195.14.122.135  # ВАШ IP
  SERVER_USER: root
  PROJECT_PATH: /var/www/estimate-app
```

### 4. Запуск развертывания

```bash
# Локально в репозитории
git add .
git commit -m "feat: Configure for production deployment"
git push origin main
```

**GitHub Actions автоматически:**
1. Запустит тесты
2. Соберет Docker образы
3. Развернет на сервер
4. Настроит SSL сертификаты
5. Создаст базу данных и пользователей

### 5. Проверка развертывания

**Прогресс можно отслеживать:**
- GitHub: `https://github.com/ВАШЕ_ИМЯ/estimate-app-fullstack/actions`

**После завершения проверьте:**
```bash
# Проверка приложения
curl https://app.iqbs.pro/api/v1/health/

# Проверка контейнеров
ssh root@YOUR_SERVER_IP "docker ps"

# Проверка логов
ssh root@YOUR_SERVER_IP "docker logs estimate-backend"
```

## 🎉 Готово!

Приложение доступно по адресу: **https://app.iqbs.pro**

**Тестовые данные для входа:**
- **Менеджер**: `manager@example.com` / `password123`
- **Прораб**: `foreman@example.com` / `password123`

## ⚡ Быстрые команды

### Перезапуск приложения
```bash
ssh root@YOUR_SERVER_IP "cd /var/www/estimate-app && docker-compose restart"
```

### Обновление кода без пересборки
```bash
# Пуш в dev ветку запустит быстрый деплой
git checkout dev
git push origin dev
```

### Просмотр логов
```bash
ssh root@YOUR_SERVER_IP "docker logs -f estimate-backend"
```

### Создание резервной копии
```bash
ssh root@YOUR_SERVER_IP "docker exec estimate-postgres pg_dump -U estimate_user estimate_app_db > backup_$(date +%Y%m%d).sql"
```

## 🔧 Кастомизация

### Изменение домена
1. Обновите DNS записи
2. Измените домен в `deploy/production.env`
3. Сделайте commit и push в main
4. SSL сертификаты обновятся автоматически

### Добавление пользователей
```bash
ssh root@YOUR_SERVER_IP "docker exec -it estimate-backend python manage.py createsuperuser"
```

## 📞 Поддержка

При проблемах смотрите:
- [Диагностика проблем](./troubleshooting.md)
- [Мониторинг](./monitoring.md)
- GitHub Issues