# ⚡ Быстрая справка по Dev деплою

## 🚀 Созданные файлы

| Файл | Назначение | Статус |
|------|------------|---------|
| `/.github/workflows/deploy-dev.yml` | GitHub Actions workflow для автоматического деплоя | ✅ Готов |
| `/deploy/quick-deploy-dev.sh` | Скрипт локального деплоя на сервере | ✅ Готов |
| `/deploy/.env.dev` | Шаблон конфигурации для dev окружения | ✅ Готов |
| `/deploy/github-actions-secrets.md` | Инструкции по настройке SSH и secrets | ✅ Готов |
| `/deploy/DEV_DEPLOYMENT_GUIDE.md` | Полное руководство по деплою | ✅ Готов |

## 🔗 Основные URL и пути

### Dev окружение
- **URL:** https://dev.app.iqbs.pro
- **API:** https://dev.app.iqbs.pro/api/v1/
- **Health:** https://dev.app.iqbs.pro/api/v1/health/

### Сервер
- **IP:** 195.14.122.135
- **Пользователь:** ubuntu
- **Проект:** /var/www/estimate-app-dev/
- **Backend порт:** 8001
- **Frontend порт:** 3001

### Логи
- **Backend:** /var/www/estimate-app-dev/logs/gunicorn.log
- **Ошибки:** /var/www/estimate-app-dev/logs/gunicorn-error.log
- **Nginx:** /var/log/nginx/dev.app.iqbs.pro.access.log

## 🔑 Необходимые GitHub Secrets

| Secret | Описание |
|--------|----------|
| `DEV_SSH_PRIVATE_KEY` | Приватный SSH ключ для доступа к серверу |

## ⚡ Быстрые команды

### Запуск деплоя
```bash
# Автоматический (push в dev)
git push origin dev

# Ручной на сервере
ssh ubuntu@195.14.122.135
cd /var/www/estimate-app-dev
./deploy/quick-deploy-dev.sh
```

### Проверка статуса
```bash
# Процессы
ps aux | grep "gunicorn.*:8001"

# API
curl -s https://dev.app.iqbs.pro/api/v1/health/

# Логи
tail -f /var/www/estimate-app-dev/logs/gunicorn.log
```

### Troubleshooting
```bash
# Перезапуск backend
sudo pkill -f "gunicorn.*:8001"
cd /var/www/estimate-app-dev/backend
source venv/bin/activate
gunicorn --bind 0.0.0.0:8001 core.wsgi:application

# Перезагрузка Nginx
sudo nginx -t && sudo nginx -s reload

# Проверка базы данных
pg_isready -h localhost -p 5432 -U estimate_user
```

## 📋 Checklist перед первым деплоем

- [ ] SSH ключи созданы и добавлены в GitHub Secrets
- [ ] Пользователь ubuntu настроен на сервере
- [ ] PostgreSQL работает на localhost:5432
- [ ] Nginx конфигурация для dev.app.iqbs.pro активна
- [ ] SSL сертификат для dev.app.iqbs.pro установлен
- [ ] Директория /var/www/estimate-app-dev/ создана

## 🎯 После деплоя

✅ **Dev окружение готово:** https://dev.app.iqbs.pro  
🔄 **Автоматический деплой:** При push в ветку `dev`  
📊 **Мониторинг:** GitHub Actions + логи сервера  
🚀 **Время деплоя:** 2-3 минуты для изменений кода