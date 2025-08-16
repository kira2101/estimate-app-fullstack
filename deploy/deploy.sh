#!/bin/bash

# =============================================================================
# Deploy Script for Estimate Management Application
# Автоматический деплой на продакшн сервер
# =============================================================================

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Переменные
PROJECT_PATH="/var/www/estimate-app"
DOCKER_COMPOSE_FILE="$PROJECT_PATH/docker-compose.yml"
ENV_FILE="$PROJECT_PATH/.env"
BACKUP_DIR="$PROJECT_PATH/backups"
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
# ФУНКЦИИ
# =============================================================================

check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен"
    fi
    
    success "Все зависимости установлены"
}

create_directories() {
    log "Создание необходимых директорий..."
    
    mkdir -p "$PROJECT_PATH/logs"
    mkdir -p "$PROJECT_PATH/ssl"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$PROJECT_PATH/sql_init"
    
    success "Директории созданы"
}

check_postgres() {
    log "Проверка PostgreSQL..."
    
    # Проверяем, запущен ли PostgreSQL на хосте
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL запущен на хосте"
        POSTGRES_EXTERNAL=true
    elif docker ps | grep -q postgres; then
        success "PostgreSQL запущен в Docker"
        POSTGRES_EXTERNAL=false
    else
        warning "PostgreSQL не найден, будет запущен новый контейнер"
        POSTGRES_EXTERNAL=false
    fi
}

backup_database() {
    if [ "$POSTGRES_EXTERNAL" = true ]; then
        log "Создание резервной копии базы данных..."
        
        BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        if su - postgres -c "pg_dump estimate_app_db" > "$BACKUP_FILE" 2>/dev/null; then
            success "Резервная копия создана: $BACKUP_FILE"
        else
            warning "Не удалось создать резервную копию базы данных"
        fi
    fi
}

load_docker_images() {
    log "Загрузка Docker образов..."
    
    if [ -f "$PROJECT_PATH/backend-image.tar" ]; then
        docker load < "$PROJECT_PATH/backend-image.tar"
        success "Backend образ загружен"
    else
        warning "Backend образ не найден"
    fi
    
    if [ -f "$PROJECT_PATH/frontend-image.tar" ]; then
        docker load < "$PROJECT_PATH/frontend-image.tar"
        success "Frontend образ загружен"
    else
        warning "Frontend образ не найден"
    fi
}

stop_old_containers() {
    log "Остановка старых контейнеров..."
    
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans --volumes || true
        success "Старые контейнеры остановлены"
    else
        warning "Docker Compose файл не найден"
    fi
    
    # Очистка неиспользуемых сетей
    log "Очистка неиспользуемых Docker сетей..."
    docker network prune -f || true
    success "Неиспользуемые сети удалены"
}

start_new_containers() {
    log "Запуск новых контейнеров..."
    
    cd "$PROJECT_PATH"
    
    # Определяем профили для запуска
    PROFILES=""
    if [ "$POSTGRES_EXTERNAL" = false ]; then
        PROFILES="--profile new-db"
    fi
    
    # Запускаем контейнеры
    docker-compose -f "$DOCKER_COMPOSE_FILE" $PROFILES up -d
    
    success "Контейнеры запущены"
}

wait_for_services() {
    log "Ожидание запуска сервисов..."
    
    # Ждем запуска backend
    for i in {1..60}; do
        if docker exec estimate-backend curl -f http://localhost:8000/api/v1/statuses/ > /dev/null 2>&1; then
            success "Backend запущен"
            break
        fi
        
        if [ $i -eq 60 ]; then
            error "Backend не запустился в течение 60 секунд"
        fi
        
        sleep 1
    done
    
    # Ждем запуска frontend
    for i in {1..30}; do
        if docker exec estimate-frontend curl -f http://localhost:80 > /dev/null 2>&1; then
            success "Frontend запущен"
            break
        fi
        
        if [ $i -eq 30 ]; then
            error "Frontend не запустился в течение 30 секунд"
        fi
        
        sleep 1
    done
}

run_migrations() {
    log "Выполнение миграций базы данных..."
    
    if docker exec estimate-backend python manage.py migrate; then
        success "Миграции выполнены успешно"
    else
        error "Ошибка выполнения миграций"
    fi
}

collect_static() {
    log "Сбор статических файлов..."
    
    if docker exec estimate-backend python manage.py collectstatic --noinput; then
        success "Статические файлы собраны"
    else
        warning "Ошибка сбора статических файлов"
    fi
}

cleanup_old_images() {
    log "Очистка старых Docker образов..."
    
    docker image prune -f > /dev/null 2>&1 || true
    docker system prune -f > /dev/null 2>&1 || true
    
    success "Старые образы удалены"
}

health_check() {
    log "Проверка работоспособности приложения..."
    
    # Проверка API
    if curl -f http://localhost/api/v1/statuses/ > /dev/null 2>&1; then
        success "API работает"
    else
        error "API не отвечает"
    fi
    
    # Проверка frontend
    if curl -f http://localhost/ > /dev/null 2>&1; then
        success "Frontend работает"
    else
        error "Frontend не отвечает"
    fi
}

# =============================================================================
# ОСНОВНОЙ ПРОЦЕСС ДЕПЛОЯ
# =============================================================================

main() {
    log "🚀 Начало деплоя приложения (коммит: $COMMIT_SHA)"
    
    check_dependencies
    create_directories
    check_postgres
    backup_database
    load_docker_images
    stop_old_containers
    start_new_containers
    wait_for_services
    run_migrations
    collect_static
    cleanup_old_images
    health_check
    
    success "🎉 Деплой завершен успешно!"
    log "🌐 Приложение доступно по адресу: http://$(hostname -I | awk '{print $1}')"
}

# Проверка, что скрипт запущен с правильными правами
if [ "$EUID" -ne 0 ]; then 
    error "Пожалуйста, запустите скрипт от имени root"
fi

# Запуск основного процесса
main "$@"