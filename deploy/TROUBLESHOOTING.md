# 🔧 Решение проблем автоматического деплоя Dev окружения

## 🚨 Диагностированная проблема

**Статус:** Dev сайт недоступен (502 Bad Gateway)  
**Причина:** Отсутствует SSH ключ `DEV_SSH_PRIVATE_KEY` в GitHub Secrets  
**Время:** 22.08.2025 20:55

## 📋 Анализ ситуации

### ✅ Что работает корректно:
- Все файлы деплоя созданы и настроены
- GitHub Actions workflow обновлен для Docker контейнеров
- Коммиты успешно отправляются в ветку dev
- Workflow корректно настроен на срабатывание при push

### ❌ Что не работает:
- Dev сайт возвращает 502 Bad Gateway
- API недоступен
- Docker контейнеры не пересобираются/не запускаются

### 🔍 Корневая причина:
GitHub Actions не может подключиться к серверу 195.14.122.135 через SSH, так как отсутствует приватный SSH ключ `DEV_SSH_PRIVATE_KEY` в настройках репозитория.

## 🛠️ Пошаговое решение

### Шаг 1: Настройка SSH ключей

1. **Генерация SSH ключа** (если еще не создан):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-dev-deploy"
   ```

2. **Добавление публичного ключа на сервер**:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@195.14.122.135
   ```

3. **Получение приватного ключа**:
   ```bash
   cat ~/.ssh/id_ed25519
   ```

### Шаг 2: Настройка GitHub Secrets

1. Откройте репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **"New repository secret"**
4. Добавьте secret с именем `DEV_SSH_PRIVATE_KEY`
5. Вставьте содержимое приватного ключа (весь текст от -----BEGIN до -----END)

### Шаг 3: Проверка настроек сервера

Убедитесь что на сервере 195.14.122.135:

1. **Пользователь ubuntu существует**:
   ```bash
   sudo adduser ubuntu
   sudo usermod -aG sudo ubuntu
   ```

2. **SSH директория настроена**:
   ```bash
   sudo su - ubuntu
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

3. **Sudo без пароля** (для nginx команд):
   ```bash
   sudo visudo
   # Добавить: ubuntu ALL=(ALL) NOPASSWD: /usr/bin/nginx, /usr/bin/systemctl
   ```

### Шаг 4: Тестирование SSH подключения

```bash
# Локальное тестирование
ssh -i ~/.ssh/id_ed25519 ubuntu@195.14.122.135

# На сервере проверьте доступ к проекту
cd /var/www/estimate-app-dev
sudo -n nginx -t
```

### Шаг 5: Повторный запуск деплоя

После настройки SSH ключа:

1. Создайте тестовый коммит:
   ```bash
   git commit --allow-empty -m "test: проверка SSH доступа для автоматического деплоя"
   git push origin dev
   ```

2. Проверьте выполнение workflow в GitHub → Actions

3. Ожидайте 3-5 минут для завершения деплоя

4. Проверьте доступность сайта:
   ```bash
   curl -s https://dev.app.iqbs.pro/api/v1/health/
   ```

## 🎯 Ожидаемый результат

После правильной настройки SSH ключа:

- ✅ GitHub Actions успешно подключается к серверу
- ✅ Docker контейнеры пересобираются и запускаются
- ✅ Dev сайт доступен по адресу https://dev.app.iqbs.pro
- ✅ API отвечает корректно на /api/v1/health/

## 📊 Мониторинг результатов

### Проверка статуса деплоя:
```bash
# Запуск локального тестового скрипта
./deploy/test-deploy-local.sh

# С ожиданием и повторной проверкой
./deploy/test-deploy-local.sh --wait
```

### Ручная проверка сайта:
```bash
curl -s https://dev.app.iqbs.pro/api/v1/health/
```

### Проверка GitHub Actions логов:
Перейдите в GitHub → Actions → выберите последний workflow run

## 🔄 Альтернативное решение

Если настройка SSH ключей не подходит, можно использовать локальный деплой:

```bash
# Сделать скрипт исполняемым (на сервере)
chmod +x /var/www/estimate-app-dev/deploy/quick-deploy-dev.sh

# Запуск локального деплоя (на сервере)
cd /var/www/estimate-app-dev
./deploy/quick-deploy-dev.sh
```

## 📝 Логи отладки

Отчет создан: `deploy/debug-report-20250822-205509.md`

Содержит полную диагностику текущего состояния проекта и рекомендации по решению проблем.

---

**Обновлено:** 22.08.2025 20:55  
**Статус:** В ожидании настройки SSH ключей  
**Приоритет:** Высокий