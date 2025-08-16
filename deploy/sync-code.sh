#!/bin/bash

# =============================================================================
# Code Sync Script - синхронизация только кода без перезапуска контейнеров
# =============================================================================

PROJECT_PATH="/var/www/estimate-app"
LOCAL_PATH="."

# Синхронизация backend кода
echo "🔄 Синхронизация backend кода..."
rsync -avz --exclude='*.pyc' --exclude='__pycache__' \
    ./backend/ root@195.14.122.135:$PROJECT_PATH/backend-live/

# Перезагрузка Django без перезапуска контейнера
ssh root@195.14.122.135 "docker exec estimate-backend kill -HUP 1"

echo "✅ Backend код обновлен"

# Для frontend потребуется пересборка
echo "ℹ️ Для frontend изменений используйте полный деплой"