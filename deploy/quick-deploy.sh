#!/bin/bash

# =============================================================================
# Quick Deploy Script - только изменения кода без пересборки Docker
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Переменные
PROJECT_PATH="/var/www/estimate-app"
COMMIT_SHA=${1:-"latest"}

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

main() {
    log "🚀 Быстрый деплой изменений (коммит: $COMMIT_SHA)"
    
    cd "$PROJECT_PATH"
    
    # Обновляем код
    log "Обновление кода..."
    git pull origin main || error "Не удалось обновить код"
    
    # Перезапускаем только backend если изменились Python файлы
    if git diff --name-only HEAD~1 HEAD | grep -E '\.(py|txt)$'; then
        log "Обнаружены изменения Python - перезапуск backend..."
        docker restart estimate-backend
        sleep 5
    fi
    
    # Перезапускаем frontend если изменились JS/JSX файлы
    if git diff --name-only HEAD~1 HEAD | grep -E '\.(js|jsx|ts|tsx|json|css)$'; then
        log "Обнаружены изменения frontend - требуется пересборка"
        warning "Для frontend изменений нужен полный деплой"
    fi
    
    # Применяем миграции если есть
    if git diff --name-only HEAD~1 HEAD | grep migrations; then
        log "Применение миграций..."
        docker exec estimate-backend python manage.py migrate
    fi
    
    # Собираем статику если изменились статические файлы
    if git diff --name-only HEAD~1 HEAD | grep -E 'static/|staticfiles/'; then
        log "Сбор статических файлов..."
        docker exec estimate-backend python manage.py collectstatic --noinput
    fi
    
    # Проверка работоспособности
    log "Проверка работоспособности..."
    if curl -f http://localhost:8000/api/v1/statuses/ > /dev/null 2>&1; then
        success "Backend работает"
    else
        error "Backend не отвечает"
    fi
    
    success "🎉 Быстрый деплой завершен!"
    log "🌐 Приложение доступно по адресу: http://app.iqbs.pro"
}

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    error "Запустите скрипт от имени root"
fi

main "$@"