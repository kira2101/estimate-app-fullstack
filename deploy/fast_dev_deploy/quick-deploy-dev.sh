
#!/bin/bash

# =============================================================================
# Скрипт быстрого деплоя Dev окружения с Docker контейнерами
# Выполняется локально на сервере для обновления dev.app.iqbs.pro
# =============================================================================

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Переменные
DEV_PROJECT_PATH="/var/www/estimate-app-dev"
BACKEND_PORT="8001"
FRONTEND_PORT="3001"
BACKEND_CONTAINER="estimate-backend-dev"
FRONTEND_CONTAINER="estimate-frontend-dev"
COMMIT_SHA=${1:-"latest"}

# Логирование
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

# =============================================================================
# ФУНКЦИИ ДЛЯ DOCKER ДЕПЛОЯ
# =============================================================================

check_prerequisites() {
    log "Проверка предварительных условий..."
    
    # Проверка прав доступа
    if [ "$EUID" -ne 0 ] && [ "$(whoami)" != "ubuntu" ]; then
        error "Скрипт должен запускаться от пользователя root или ubuntu"
    fi
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
    fi
    
    # Проверка существования проекта
    if [ ! -d "$DEV_PROJECT_PATH" ]; then
        error "Директория проекта не найдена: $DEV_PROJECT_PATH"
    fi
    
    # Проверка Git репозитория
    if [ ! -d "$DEV_PROJECT_PATH/.git" ]; then
        error "Git репозиторий не найден в $DEV_PROJECT_PATH"
    fi
    
    success "Все предварительные условия выполнены"
}

update_code() {
    log "Обновление кода из ветки dev..."
    
    cd "$DEV_PROJECT_PATH"
    
    # Показать текущий статус
    log "Текущий статус проекта:"
    git status --short || true
    git log --oneline -3 || true
    
    # Принудительное обновление
    git fetch origin dev || error "Ошибка получения обновлений"
    git reset --hard origin/dev || error "Ошибка применения обновлений"
    
    CURRENT_COMMIT=$(git rev-parse HEAD)
    log "Код обновлен до коммита: $CURRENT_COMMIT"
    success "Код успешно обновлен"
}

stop_containers() {
    log "Остановка и удаление старых Docker контейнеров..."
    
    # Остановка контейнеров
    docker stop "$BACKEND_CONTAINER" "$FRONTEND_CONTAINER" 2>/dev/null || warning "Некоторые контейнеры уже остановлены"
    
    # Удаление контейнеров
    docker rm "$BACKEND_CONTAINER" "$FRONTEND_CONTAINER" 2>/dev/null || warning "Некоторые контейнеры уже удалены"
    
    success "Старые контейнеры остановлены и удалены"
}

build_images() {
    log "Сборка новых Docker образов..."
    
    cd "$DEV_PROJECT_PATH"
    
    # Создание директории логов если не существует
    mkdir -p "$DEV_PROJECT_PATH/logs"
    
    # Сборка backend образа
    log "Сборка backend образа..."
    docker build -t estimate-app-backend:dev-new ./backend/ || error "Ошибка сборки backend образа"
    success "Backend образ собран"
    
    # Сборка frontend образа
    log "Сборка frontend образа..."
    docker build -t estimate-app-frontend:dev-new ./frontend/ \
        --build-arg VITE_API_BASE_URL=https://dev.app.iqbs.pro/api/v1 || error "Ошибка сборки frontend образа"
    success "Frontend образ собран"
}

start_backend_container() {
    log "Запуск нового backend контейнера..."
    
    # Запуск backend контейнера с сохранением переменных окружения
    docker run -d --name "$BACKEND_CONTAINER" \
        --restart unless-stopped \
        --network estimate_network \
        -p "$BACKEND_PORT:8000" \
        -v "$DEV_PROJECT_PATH/logs:/app/logs" \
        -e SECRET_KEY=dev-secret-key-for-testing \
        -e DATABASE_URL=postgresql://estimate_user:secure_password_123@postgres:5432/estimate_app_db \
        -e ALLOWED_HOSTS=dev.app.iqbs.pro,localhost,127.0.0.1 \
        -e CORS_ALLOWED_ORIGINS=https://dev.app.iqbs.pro,http://dev.app.iqbs.pro \
        -e CSRF_TRUSTED_ORIGINS=https://dev.app.iqbs.pro,http://dev.app.iqbs.pro \
        -e SSL_ENABLED=True \
        -e VITE_API_BASE_URL=https://dev.app.iqbs.pro/api/v1 \
        -e DJANGO_SETTINGS_MODULE=core.settings_production \
        -e DEBUG=False \
        --add-host=host.docker.internal:host-gateway \
        estimate-app-backend:dev-new || error "Ошибка запуска backend контейнера"
    
    success "Backend контейнер запущен"
}

start_frontend_container() {
    log "Запуск нового frontend контейнера..."
    
    # Запуск frontend контейнера
    docker run -d --name "$FRONTEND_CONTAINER" \
        --restart unless-stopped \
        --network bridge \
        -p "$FRONTEND_PORT:80" \
        estimate-app-frontend:dev-new || error "Ошибка запуска frontend контейнера"
    
    success "Frontend контейнер запущен"
}

update_image_tags() {
    log "Обновление тегов образов..."
    
    # Обновляем теги для совместимости
    docker tag estimate-app-backend:dev-new estimate-app-backend:dev || true
    docker tag estimate-app-frontend:dev-new estimate-app-frontend:dev-fix || true
    
    success "Теги образов обновлены"
}

reload_nginx() {
    log "Перезагрузка Nginx..."
    
    # Проверка конфигурации Nginx
    nginx -t || error "Ошибка в конфигурации Nginx"
    
    # Перезагрузка
    nginx -s reload || error "Ошибка перезагрузки Nginx"
    
    success "Nginx перезагружен"
}

wait_for_containers() {
    log "Ожидание запуска Docker контейнеров..."
    
    # Ожидание 45 секунд для полного запуска
    sleep 45
    
    # Проверка статуса контейнеров
    log "Проверка статуса контейнеров..."
    
    if docker ps -a | grep -q "$BACKEND_CONTAINER"; then
        BACKEND_STATUS=$(docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep "$BACKEND_CONTAINER" | awk '{print $2}')
        if [[ "$BACKEND_STATUS" =~ ^Up ]]; then
            success "Backend контейнер запущен и работает"
        else
            warning "Backend контейнер в состоянии: $BACKEND_STATUS"
            log "Ожидаем еще 30 сек для полного запуска..."
            sleep 30
            BACKEND_STATUS_NEW=$(docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep "$BACKEND_CONTAINER" | awk '{print $2}')
            if [[ "$BACKEND_STATUS_NEW" =~ ^Up ]]; then
                success "Backend контейнер запущен после ожидания"
            else
                error "Backend контейнер не запустился: $BACKEND_STATUS_NEW"
                docker logs "$BACKEND_CONTAINER" --tail 20 2>/dev/null || true
            fi
        fi
    else
        error "Backend контейнер не найден"
    fi
    
    if docker ps -a | grep -q "$FRONTEND_CONTAINER"; then
        FRONTEND_STATUS=$(docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep "$FRONTEND_CONTAINER" | awk '{print $2}')
        if [[ "$FRONTEND_STATUS" =~ ^Up ]]; then
            success "Frontend контейнер запущен и работает"
        else
            warning "Frontend контейнер в состоянии: $FRONTEND_STATUS (может запускаться)"
        fi
    else
        warning "Frontend контейнер не найден"
    fi
}

health_check() {
    log "Проверка работоспособности сервисов..."
    
    # Проверка backend health check внутри контейнера
    log "Проверка backend health check..."
    for i in {1..10}; do
        if docker exec "$BACKEND_CONTAINER" curl -f -s http://localhost:8000/api/v1/health/ > /dev/null 2>&1; then
            success "Backend health check прошел"
            break
        fi
        
        if [ $i -eq 10 ]; then
            error "Backend health check не прошел после 10 попыток"
            docker logs "$BACKEND_CONTAINER" --tail 30 2>/dev/null || true
        fi
        sleep 3
    done
    
    # Проверка через внешние порты
    if curl -f -s http://localhost:$BACKEND_PORT/api/v1/health/ > /dev/null; then
        success "Backend API отвечает на localhost:$BACKEND_PORT"
    else
        error "Backend API не отвечает на localhost:$BACKEND_PORT"
    fi
    
    # Проверка frontend через внешний порт
    if curl -f -s http://localhost:$FRONTEND_PORT/ > /dev/null; then
        success "Frontend отвечает на localhost:$FRONTEND_PORT"
    else
        warning "Frontend может не отвечать на localhost:$FRONTEND_PORT"
    fi
    
    # Проверка через домен
    if curl -f -s https://dev.app.iqbs.pro/api/v1/health/ > /dev/null; then
        success "Dev API доступен через домен https://dev.app.iqbs.pro"
    else
        warning "Dev API может быть недоступен через домен (проверьте DNS/SSL)"
    fi
    
    # Показать статус контейнеров
    log "Статус контейнеров:"
    docker ps | grep -E "($BACKEND_CONTAINER|$FRONTEND_CONTAINER)" || warning "Контейнеры не найдены в списке"
    
    # Показать использование ресурсов
    log "Использование ресурсов контейнерами:"
    docker stats --no-stream "$BACKEND_CONTAINER" "$FRONTEND_CONTAINER" 2>/dev/null || true
}

cleanup() {
    log "Очистка старых Docker образов..."
    
    # Удаление неиспользуемых образов
    docker image prune -f || true
    
    # Очистка старых логов (оставляем только последние 7 дней)
    find "$DEV_PROJECT_PATH/logs" -name "*.log*" -mtime +7 -delete 2>/dev/null || true
    
    success "Очистка завершена"
}

show_status() {
    log "Финальный статус деплоя:"
    echo ""
    echo "📍 Dev окружение доступно:"
    echo "   🌐 Web: https://dev.app.iqbs.pro"
    echo "   🔌 API: https://dev.app.iqbs.pro/api/v1/"
    echo "   🏥 Health: https://dev.app.iqbs.pro/api/v1/health/"
    echo ""
    echo "🐳 Docker контейнеры:"
    echo "   📦 Backend: $BACKEND_CONTAINER (порт $BACKEND_PORT)"
    echo "   🎨 Frontend: $FRONTEND_CONTAINER (порт $FRONTEND_PORT)"
    echo ""
    echo "📋 Управление контейнерами:"
    echo "   docker logs $BACKEND_CONTAINER --tail 50"
    echo "   docker logs $FRONTEND_CONTAINER --tail 50"
    echo "   docker restart $BACKEND_CONTAINER $FRONTEND_CONTAINER"
}

# =============================================================================
# ОСНОВНОЙ ПРОЦЕСС ДЕПЛОЯ
# =============================================================================

main() {
    log "🚀 Быстрый деплой Docker контейнеров (коммит: $COMMIT_SHA)"
    
    check_prerequisites
    update_code
    stop_containers
    build_images
    start_backend_container
    start_frontend_container
    update_image_tags
    reload_nginx
    wait_for_containers
    health_check
    cleanup
    
    success "🎉 Docker деплой dev окружения завершен успешно!"
    show_status
}

# Проверка аргументов
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Использование: $0 [commit_sha]"
    echo "Быстрый деплой dev окружения с Docker контейнерами на dev.app.iqbs.pro"
    echo ""
    echo "Параметры:"
    echo "  commit_sha    Опционально: SHA коммита для деплоя (по умолчанию: latest)"
    echo "  --help, -h    Показать эту справку"
    echo ""
    echo "Docker контейнеры:"
    echo "  $BACKEND_CONTAINER  - Backend Django приложение (порт $BACKEND_PORT)"
    echo "  $FRONTEND_CONTAINER - Frontend React приложение (порт $FRONTEND_PORT)"
    exit 0
fi

# Запуск основного процесса
main "$@"