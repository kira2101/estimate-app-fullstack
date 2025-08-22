# 🔐 Настройка GitHub Actions Secrets для автоматического деплоя

## Требуемые Secrets для Dev деплоя

Для работы автоматического деплоя в dev окружение необходимо настроить следующие secrets в GitHub репозитории:

### 🔑 SSH Доступ

#### `DEV_SSH_PRIVATE_KEY`
```
Приватный SSH ключ для доступа к серверу 195.14.122.135
Формат: RSA или Ed25519 private key
```

**Как получить:**
1. Сгенерируйте SSH ключ (если еще не создан):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-dev-deploy"
   ```

2. Добавьте публичный ключ на сервер:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@195.14.122.135
   ```

3. Скопируйте приватный ключ:
   ```bash
   cat ~/.ssh/id_ed25519
   ```

### 🌐 Серверные настройки

#### `SERVER_HOST` (опционально, уже в env)
```
195.14.122.135
```

#### `SERVER_USER` (опционально, уже в workflow)
```
ubuntu
```

### 🗄️ База данных (опционально, если потребуется)

#### `DEV_DATABASE_URL`
```
postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db
```

#### `DEV_SECRET_KEY`
```
django-insecure-dev-key-only-for-development-do-not-use-in-production
```

## 📋 Инструкции по настройке GitHub Secrets

### Шаг 1: Переход в настройки репозитория
1. Откройте ваш GitHub репозиторий
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**

### Шаг 2: Добавление secrets
1. Нажмите **"New repository secret"**
2. Добавьте каждый secret из списка выше
3. Убедитесь, что названия точно соответствуют указанным

### Шаг 3: Проверка доступа
Убедитесь, что GitHub Actions имеет доступ к secrets:
1. В настройках репозитория → **Actions** → **General**
2. Проверьте, что **"Allow GitHub Actions to create and approve pull requests"** включено (если нужно)

## 🔧 Настройка SSH ключа на сервере

### На сервере 195.14.122.135:

1. **Создайте пользователя ubuntu** (если не существует):
   ```bash
   sudo adduser ubuntu
   sudo usermod -aG sudo ubuntu
   ```

2. **Настройте SSH доступ для пользователя ubuntu**:
   ```bash
   sudo su - ubuntu
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   ```

3. **Добавьте публичный ключ**:
   ```bash
   echo "ваш_публичный_ключ" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

4. **Настройте sudo без пароля** (для деплоя):
   ```bash
   sudo visudo
   # Добавьте строку:
   ubuntu ALL=(ALL) NOPASSWD: /usr/bin/nginx, /usr/bin/pkill, /usr/bin/systemctl
   ```

## 🧪 Тестирование SSH подключения

Перед запуском GitHub Actions протестируйте подключение:

```bash
# С локальной машины
ssh -i ~/.ssh/id_ed25519 ubuntu@195.14.122.135

# На сервере проверьте доступ к проекту
cd /var/www/estimate-app-dev
sudo -n nginx -t  # Проверка без пароля
```

## 🚀 Запуск деплоя

### Автоматический запуск
Деплой запускается автоматически при push в ветку `dev`:
```bash
git push origin dev
```

### Ручной запуск
1. Перейдите в GitHub → **Actions**
2. Выберите workflow **"🚀 Быстрый деплой Dev окружения"**
3. Нажмите **"Run workflow"**
4. Выберите ветку `dev`
5. При необходимости отметьте **"Принудительный деплой"**

## 📊 Мониторинг деплоя

### Просмотр логов GitHub Actions
1. GitHub → **Actions** → выберите последний запуск
2. Раскройте каждый шаг для просмотра подробных логов

### Проверка на сервере
```bash
# Проверка процессов
ssh ubuntu@195.14.122.135 "ps aux | grep gunicorn"

# Проверка логов
ssh ubuntu@195.14.122.135 "tail -f /var/www/estimate-app-dev/logs/gunicorn.log"

# Проверка статуса
curl -s https://dev.app.iqbs.pro/api/v1/health/
```

## 🔍 Troubleshooting

### Проблема: SSH connection failed
**Решение:**
1. Проверьте правильность приватного ключа в secrets
2. Убедитесь, что публичный ключ добавлен на сервер
3. Проверьте права доступа к файлам SSH (600 для ключей, 700 для ~/.ssh)

### Проблема: Permission denied для sudo команд
**Решение:**
1. Добавьте пользователя ubuntu в группу sudo
2. Настройте NOPASSWD для нужных команд в sudoers

### Проблема: Backend не запускается
**Решение:**
1. Проверьте логи: `/var/www/estimate-app-dev/logs/gunicorn-error.log`
2. Убедитесь, что PostgreSQL доступен
3. Проверьте права доступа к директории проекта

### Проблема: Nginx не перезагружается
**Решение:**
1. Проверьте конфигурацию: `sudo nginx -t`
2. Убедитесь, что пользователь ubuntu может выполнять nginx команды

## 📝 Дополнительные настройки

### Уведомления о деплое
Можно добавить уведомления в Slack/Discord/Telegram, добавив соответствующие secrets:
- `SLACK_WEBHOOK_URL`
- `DISCORD_WEBHOOK_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

### Rollback функционал
Для отката к предыдущей версии можно создать отдельный workflow с параметром коммита:
```yaml
workflow_dispatch:
  inputs:
    commit_sha:
      description: 'SHA коммита для отката'
      required: true
```

## ✅ Checklist перед первым деплоем

- [ ] SSH ключи настроены и протестированы
- [ ] Все secrets добавлены в GitHub
- [ ] Пользователь ubuntu имеет нужные права sudo
- [ ] PostgreSQL работает и доступен
- [ ] Nginx конфигурация для dev.app.iqbs.pro настроена
- [ ] Директория `/var/www/estimate-app-dev` существует
- [ ] DNS для dev.app.iqbs.pro настроен правильно
- [ ] SSL сертификат для dev.app.iqbs.pro активен

После выполнения всех пунктов можно запускать автоматический деплой!