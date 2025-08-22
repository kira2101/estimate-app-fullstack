# 📋 Быстрые команды для dev деплоя

## 🚀 Деплой

### Автоматический (рекомендуется):
```bash
git add .
git commit -m "feat: описание изменений"
git push origin dev
```

### Ручной на сервере:
```bash
ssh root@195.14.122.135 'cd /var/www/estimate-app-dev && ./deploy/fast_dev_deploy/quick-deploy-dev.sh'
```

## 🔍 Диагностика

### Проверка здоровья:
```bash
curl -s https://dev.app.iqbs.pro/api/v1/health/
```

### Статус контейнеров:
```bash
ssh root@195.14.122.135 'docker ps | grep estimate.*dev'
```

### Логи backend:
```bash
ssh root@195.14.122.135 'docker logs estimate-backend-dev --tail 30'
```

### Логи frontend:
```bash
ssh root@195.14.122.135 'docker logs estimate-frontend-dev --tail 20'
```

### Полная диагностика:
```bash
./diagnose-dev-containers.sh
```

## 👤 Создание пользователей

### Создать тестового пользователя:
```bash
./create-dev-user.sh
```

### Авторизация в dev:
```bash
curl -s https://dev.app.iqbs.pro/api/v1/auth/login/ -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"password123"}'
```

## 🔄 Управление контейнерами

### Перезапуск:
```bash
ssh root@195.14.122.135 'docker restart estimate-backend-dev estimate-frontend-dev'
```

### Остановка:
```bash
ssh root@195.14.122.135 'docker stop estimate-backend-dev estimate-frontend-dev'
```

### Удаление:
```bash
ssh root@195.14.122.135 'docker rm -f estimate-backend-dev estimate-frontend-dev'
```

## 📊 Мониторинг

### Использование ресурсов:
```bash
ssh root@195.14.122.135 'docker stats estimate-backend-dev estimate-frontend-dev --no-stream'
```

### Nginx статус для dev:
```bash
ssh root@195.14.122.135 'curl -I http://localhost:3001 && curl -I http://localhost:8001/api/v1/health/'
```

### GitHub Actions логи:
Перейти на GitHub → Actions → выбрать последний workflow run

## 🆘 Экстренные команды

### Принудительная пересборка:
```bash
ssh root@195.14.122.135 'cd /var/www/estimate-app-dev && git reset --hard origin/dev && ./deploy/fast_dev_deploy/quick-deploy-dev.sh'
```

### Очистка Docker:
```bash
ssh root@195.14.122.135 'docker system prune -f && docker image prune -f'
```

### Перезагрузка Nginx:
```bash
ssh root@195.14.122.135 'nginx -t && nginx -s reload'
```