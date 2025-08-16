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
        
        # Обновляем DATABASE_URL для подключения к хосту из контейнера
        log "Обновление DATABASE_URL для внешней PostgreSQL..."
        sed -i 's|DATABASE_URL=postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db|DATABASE_URL=postgresql://estimate_user:secure_password_123@host.docker.internal:5432/estimate_app_db|g' "$ENV_FILE"
        
    elif docker ps | grep -q postgres; then
        success "PostgreSQL запущен в Docker"
        POSTGRES_EXTERNAL=false
        
        # Обновляем DATABASE_URL для подключения к контейнеру postgres
        log "Обновление DATABASE_URL для Docker PostgreSQL..."
        sed -i 's|DATABASE_URL=postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db|DATABASE_URL=postgresql://estimate_user:secure_password_123@postgres:5432/estimate_app_db|g' "$ENV_FILE"
        
    else
        warning "PostgreSQL не найден, будет запущен новый контейнер"
        POSTGRES_EXTERNAL=false
        
        # Обновляем DATABASE_URL для подключения к новому контейнеру postgres
        log "Обновление DATABASE_URL для нового Docker PostgreSQL..."
        sed -i 's|DATABASE_URL=postgresql://estimate_user:secure_password_123@localhost:5432/estimate_app_db|DATABASE_URL=postgresql://estimate_user:secure_password_123@postgres:5432/estimate_app_db|g' "$ENV_FILE"
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
    
    # Останавливаем контейнеры estimate-app если они запущены
    docker stop estimate-backend estimate-frontend estimate-postgres estimate-redis estimate-nginx || true
    docker rm estimate-backend estimate-frontend estimate-postgres estimate-redis estimate-nginx || true
    
    # Удаляем старую сеть estimate_network если она существует
    docker network rm estimate-app_estimate_network || true
    docker network rm estimate_network || true
    
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans --volumes || true
        success "Старые контейнеры остановлены"
    else
        warning "Docker Compose файл не найден"
    fi
    
    # Очистка всех неиспользуемых сетей
    log "Очистка неиспользуемых Docker сетей..."
    docker network prune -f || true
    
    # Дополнительная очистка системы
    docker system prune -f || true
    success "Старые контейнеры и сети удалены"
}

start_new_containers() {
    log "Запуск новых контейнеров..."
    
    cd "$PROJECT_PATH"
    
    # Создаем сеть заново
    log "Создание сети estimate_network..."
    docker network create --driver bridge --subnet=172.21.0.0/16 --gateway=172.21.0.1 estimate_network || true
    
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
    
    # Проверяем, что контейнеры создались
    log "Проверка созданных контейнеров..."
    docker ps -a | grep estimate || true
    
    # Ждем создания контейнера backend
    for i in {1..30}; do
        if docker inspect estimate-backend >/dev/null 2>&1; then
            log "Контейнер estimate-backend создан"
            break
        fi
        
        if [ $i -eq 30 ]; then
            error "Контейнер estimate-backend не создался"
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs || true
            exit 1
        fi
        
        sleep 1
    done
    
    # Показываем логи backend для диагностики
    log "Проверка логов backend..."
    docker logs estimate-backend || echo "Не удалось получить логи backend"
    
    # Ждем запуска backend
    for i in {1..60}; do
        # Проверяем, что контейнер запущен
        if ! docker ps | grep -q estimate-backend; then
            warning "Контейнер estimate-backend остановлен. Перезапуск..."
            docker start estimate-backend || true
            sleep 5
        fi
        
        if docker exec estimate-backend curl -f http://localhost:8000/api/v1/health/ > /dev/null 2>&1; then
            success "Backend запущен"
            break
        fi
        
        # Каждые 10 секунд показываем статус
        if [ $((i % 10)) -eq 0 ]; then
            log "Попытка $i/60: Проверка статуса backend..."
            docker ps -a | grep estimate-backend || echo "Контейнер не найден"
            echo "=== Последние логи backend ==="
            docker logs estimate-backend --tail 10 2>&1 || echo "Логи недоступны"
            echo "=== Конец логов ==="
        fi
        
        if [ $i -eq 60 ]; then
            log "Backend не запустился в течение 60 секунд."
            echo "=== Полные логи backend ==="
            docker logs estimate-backend 2>&1 || echo "Логи недоступны"
            echo "=== Статус контейнера ==="
            docker inspect estimate-backend --format='{{.State.Status}}: {{.State.Error}}' || echo "Не удалось получить статус"
            echo "=== Docker compose логи ==="
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs backend || echo "Compose логи недоступны"
            error "Backend failed to start"
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

setup_nginx() {
    log "Настройка Nginx для app.iqbs.pro..."
    
    # Активируем сайт
    if [ -f "/etc/nginx/sites-available/app.iqbs.pro.conf" ]; then
        ln -sf /etc/nginx/sites-available/app.iqbs.pro.conf /etc/nginx/sites-enabled/ || true
        
        # Проверяем конфигурацию nginx
        if nginx -t; then
            systemctl reload nginx
            success "Nginx настроен для app.iqbs.pro"
        else
            error "Ошибка в конфигурации Nginx"
        fi
    else
        warning "Конфиг app.iqbs.pro.conf не найден"
    fi
}

setup_ssl() {
    log "Проверка SSL сертификатов..."
    
    if [ ! -f "/etc/letsencrypt/live/app.iqbs.pro/fullchain.pem" ]; then
        warning "SSL сертификат не найден"
        log "Установка SSL сертификата через certbot..."
        
        # Устанавливаем certbot если не установлен
        if ! command -v certbot &> /dev/null; then
            apt update && apt install -y certbot python3-certbot-nginx
        fi
        
        # Создаем директорию для challenge
        mkdir -p /var/www/html
        
        # Получаем SSL сертификат
        if certbot certonly --webroot -w /var/www/html -d app.iqbs.pro --non-interactive --agree-tos --email admin@iqbs.pro; then
            success "SSL сертификат получен"
            
            # Включаем SSL в Django
            log "Активация SSL в Django..."
            sed -i 's/SSL_ENABLED=False/SSL_ENABLED=True/g' "$ENV_FILE" || echo "SSL_ENABLED=True" >> "$ENV_FILE"
            
            # Перезапускаем backend с SSL настройками
            docker restart estimate-backend
            sleep 10
            
            # Переключаемся на HTTPS конфигурацию
            log "Активация HTTPS конфигурации..."
            if [ -f "/etc/nginx/sites-available/app.iqbs.pro-ssl.conf" ]; then
                ln -sf /etc/nginx/sites-available/app.iqbs.pro-ssl.conf /etc/nginx/sites-enabled/app.iqbs.pro.conf
                
                if nginx -t; then
                    systemctl reload nginx
                    success "HTTPS конфигурация активирована"
                else
                    error "Ошибка в HTTPS конфигурации"
                fi
            fi
        else
            warning "Не удалось получить SSL сертификат, оставляем HTTP"
        fi
    else
        success "SSL сертификат найден"
        
        # Проверяем, активирована ли HTTPS конфигурация
        if [ -f "/etc/nginx/sites-available/app.iqbs.pro-ssl.conf" ]; then
            ln -sf /etc/nginx/sites-available/app.iqbs.pro-ssl.conf /etc/nginx/sites-enabled/app.iqbs.pro.conf
            if nginx -t; then
                systemctl reload nginx
                success "HTTPS конфигурация обновлена"
            fi
        fi
    fi
}

health_check() {
    log "Проверка работоспособности приложения..."
    
    # Проверка API
    if curl -f http://localhost:8000/api/v1/health/ > /dev/null 2>&1; then
        success "Backend API работает"
    else
        error "Backend API не отвечает"
    fi
    
    # Проверка frontend
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        success "Frontend работает"
    else
        error "Frontend не отвечает"
    fi
    
    # Проверка через nginx
    if curl -f https://app.iqbs.pro/api/v1/health/ > /dev/null 2>&1; then
        success "HTTPS API работает"
    else
        warning "HTTPS API не отвечает (возможно нужно настроить SSL)"
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
    setup_nginx
    setup_ssl
    cleanup_old_images
    health_check
    
    success "🎉 Деплой завершен успешно!"
    log "🌐 Приложение доступно по адресу: https://app.iqbs.pro"
}

# Проверка, что скрипт запущен с правильными правами
if [ "$EUID" -ne 0 ]; then 
    error "Пожалуйста, запустите скрипт от имени root"
fi

# Запуск основного процесса
main "$@"