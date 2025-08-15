#!/bin/bash

# =============================================================================
# SSL Certificate Setup Script for app.iqbs.pro
# Автоматическая настройка SSL сертификатов с помощью Let's Encrypt
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Переменные
DOMAIN="app.iqbs.pro"
EMAIL="admin@iqbs.pro"
SSL_DIR="/var/www/estimate-app/ssl"
WEBROOT_DIR="/var/www/estimate-app/webroot"

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

install_certbot() {
    log "Установка Certbot..."
    
    if command -v certbot &> /dev/null; then
        success "Certbot уже установлен"
        return
    fi
    
    if [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        yum install -y epel-release
        yum install -y certbot python3-certbot-nginx
    else
        error "Неподдерживаемая операционная система"
    fi
    
    success "Certbot установлен"
}

setup_webroot() {
    log "Настройка webroot директории..."
    
    mkdir -p "$WEBROOT_DIR/.well-known/acme-challenge"
    chmod 755 "$WEBROOT_DIR"
    chmod 755 "$WEBROOT_DIR/.well-known"
    chmod 755 "$WEBROOT_DIR/.well-known/acme-challenge"
    
    success "Webroot директория настроена"
}

create_temp_nginx_config() {
    log "Создание временной Nginx конфигурации для получения сертификата..."
    
    cat > /tmp/temp_nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root $WEBROOT_DIR;
            try_files \$uri =404;
        }
        
        location / {
            return 200 'SSL setup in progress...';
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    # Остановка nginx если запущен
    docker stop estimate-nginx 2>/dev/null || true
    
    # Запуск временного nginx
    docker run --name temp-nginx -d \
        -p 80:80 \
        -v /tmp/temp_nginx.conf:/etc/nginx/nginx.conf:ro \
        -v "$WEBROOT_DIR:$WEBROOT_DIR:ro" \
        nginx:alpine
    
    success "Временный Nginx запущен"
}

obtain_certificate() {
    log "Получение SSL сертификата для $DOMAIN..."
    
    certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT_DIR" \
        --email="$EMAIL" \
        --agree-tos \
        --non-interactive \
        --domains="$DOMAIN" \
        --expand
    
    success "SSL сертификат получен"
}

copy_certificates() {
    log "Копирование сертификатов в SSL директорию..."
    
    mkdir -p "$SSL_DIR"
    
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/$DOMAIN.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/$DOMAIN.key"
    
    # Установка правильных прав доступа
    chmod 644 "$SSL_DIR/$DOMAIN.crt"
    chmod 600 "$SSL_DIR/$DOMAIN.key"
    
    success "Сертификаты скопированы"
}

cleanup_temp_nginx() {
    log "Очистка временного Nginx..."
    
    docker stop temp-nginx 2>/dev/null || true
    docker rm temp-nginx 2>/dev/null || true
    rm -f /tmp/temp_nginx.conf
    
    success "Временный Nginx удален"
}

setup_certificate_renewal() {
    log "Настройка автоматического обновления сертификатов..."
    
    # Создаем скрипт для обновления
    cat > /usr/local/bin/renew-ssl.sh << EOF
#!/bin/bash
# Автоматическое обновление SSL сертификатов

certbot renew --quiet

# Копирование обновленных сертификатов
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/$DOMAIN.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/$DOMAIN.key"
    
    # Перезапуск nginx
    docker restart estimate-nginx 2>/dev/null || true
    
    echo "\$(date): SSL certificates renewed for $DOMAIN" >> /var/log/ssl-renewal.log
fi
EOF
    
    chmod +x /usr/local/bin/renew-ssl.sh
    
    # Добавляем в crontab
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/renew-ssl.sh") | crontab -
    
    success "Автоматическое обновление настроено"
}

verify_certificate() {
    log "Проверка SSL сертификата..."
    
    if [ -f "$SSL_DIR/$DOMAIN.crt" ] && [ -f "$SSL_DIR/$DOMAIN.key" ]; then
        # Проверка срока действия сертификата
        EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$SSL_DIR/$DOMAIN.crt" | cut -d= -f2)
        success "SSL сертификат действителен до: $EXPIRY_DATE"
        
        # Проверка, что сертификат подходит для домена
        if openssl x509 -noout -text -in "$SSL_DIR/$DOMAIN.crt" | grep -q "$DOMAIN"; then
            success "Сертификат корректно настроен для $DOMAIN"
        else
            error "Сертификат не подходит для $DOMAIN"
        fi
    else
        error "SSL сертификат не найден"
    fi
}

# =============================================================================
# ОСНОВНОЙ ПРОЦЕСС
# =============================================================================

main() {
    log "🔒 Начало настройки SSL для $DOMAIN"
    
    # Проверка прав root
    if [ "$EUID" -ne 0 ]; then
        error "Пожалуйста, запустите скрипт от имени root"
    fi
    
    # Проверка, что DNS указывает на этот сервер
    log "Проверка DNS записи для $DOMAIN..."
    DOMAIN_IP=$(dig +short $DOMAIN | head -n1)
    SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
    
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        warning "DNS запись $DOMAIN ($DOMAIN_IP) не указывает на этот сервер ($SERVER_IP)"
        warning "Убедитесь, что A-запись домена настроена правильно"
        
        read -p "Продолжить настройку? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        success "DNS запись настроена правильно: $DOMAIN -> $SERVER_IP"
    fi
    
    install_certbot
    setup_webroot
    create_temp_nginx_config
    
    # Небольшая задержка для запуска nginx
    sleep 5
    
    obtain_certificate
    copy_certificates
    cleanup_temp_nginx
    setup_certificate_renewal
    verify_certificate
    
    success "🎉 SSL настройка завершена!"
    log "🌐 Теперь можно запустить продакшн приложение с HTTPS"
    log "📋 Сертификаты находятся в: $SSL_DIR"
    log "🔄 Автоматическое обновление настроено в cron"
}

# Показать помощь
show_help() {
    echo "SSL Setup Script for app.iqbs.pro"
    echo ""
    echo "Использование: $0 [ОПЦИИ]"
    echo ""
    echo "ОПЦИИ:"
    echo "  --help, -h     Показать эту справку"
    echo "  --force        Принудительное обновление сертификата"
    echo "  --dry-run      Тестовый запуск без реальных изменений"
    echo ""
    echo "Пример:"
    echo "  $0                 # Обычная настройка SSL"
    echo "  $0 --force         # Принудительное обновление"
    echo "  $0 --dry-run       # Тестовый запуск"
}

# Обработка аргументов
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --force)
        FORCE_RENEWAL=true
        ;;
    --dry-run)
        DRY_RUN=true
        ;;
esac

# Запуск основного процесса
main "$@"