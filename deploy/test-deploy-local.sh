#!/bin/bash

# =============================================================================
# Скрипт локального тестирования деплоя dev окружения
# Используется для отладки когда нет прямого SSH доступа
# =============================================================================

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Переменные
DEV_URL="https://dev.app.iqbs.pro"
API_URL="$DEV_URL/api/v1"
HEALTH_URL="$API_URL/health/"

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
}

# =============================================================================
# ФУНКЦИИ ПРОВЕРКИ
# =============================================================================

check_git_status() {
    log "Проверка локального Git статуса..."
    
    echo "Текущая ветка:"
    git branch --show-current
    
    echo -e "\nПоследние коммиты:"
    git log --oneline -5
    
    echo -e "\nСтатус изменений:"
    git status --short
    
    success "Git статус проверен"
}

check_dev_site_status() {
    log "Проверка доступности dev сайта..."
    
    # Проверка основного сайта
    echo -n "Frontend (dev.app.iqbs.pro): "
    if curl -s -I "$DEV_URL" | head -1 | grep -q "200\|301\|302"; then
        success "✅ Доступен"
    else
        error "❌ Недоступен"
        curl -s -I "$DEV_URL" | head -3
    fi
    
    # Проверка API
    echo -n "API Health Check: "
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" || echo "CONNECTION_ERROR")
    
    if echo "$HEALTH_RESPONSE" | grep -q "healthy\|status"; then
        success "✅ API работает"
        echo "Response: $HEALTH_RESPONSE"
    else
        error "❌ API не отвечает"
        echo "Response: $HEALTH_RESPONSE"
    fi
}

check_deployment_files() {
    log "Проверка файлов деплоя..."
    
    FILES_TO_CHECK=(
        ".github/workflows/deploy-dev.yml"
        "deploy/quick-deploy-dev.sh"
        "deploy/github-actions-secrets.md"
        "deploy/DEV_DEPLOYMENT_GUIDE.md"
    )
    
    for FILE in "${FILES_TO_CHECK[@]}"; do
        if [ -f "$FILE" ]; then
            success "✅ $FILE существует"
        else
            error "❌ $FILE не найден"
        fi
    done
}

simulate_docker_commands() {
    log "Симуляция Docker команд (локально)..."
    
    echo "Команды, которые должны выполняться на сервере:"
    
    cat << 'COMMANDS'
# Остановка контейнеров
docker stop estimate-backend-dev estimate-frontend-dev

# Удаление контейнеров  
docker rm estimate-backend-dev estimate-frontend-dev

# Сборка backend образа
docker build -t estimate-app-backend:dev-new ./backend/

# Сборка frontend образа
docker build -t estimate-app-frontend:dev-new ./frontend/ \
  --build-arg VITE_API_BASE_URL=https://dev.app.iqbs.pro/api/v1

# Запуск backend контейнера
docker run -d --name estimate-backend-dev \
  --restart unless-stopped \
  -p 8001:8000 \
  -e DATABASE_URL=postgresql://estimate_user:secure_password_123@host.docker.internal:5432/estimate_app_db \
  -e ALLOWED_HOSTS=dev.app.iqbs.pro,localhost,127.0.0.1 \
  --add-host=host.docker.internal:host-gateway \
  estimate-app-backend:dev-new

# Запуск frontend контейнера
docker run -d --name estimate-frontend-dev \
  --restart unless-stopped \
  -p 3001:80 \
  estimate-app-frontend:dev-new

# Перезагрузка Nginx
sudo nginx -s reload
COMMANDS

    success "Docker команды отображены"
}

wait_and_recheck() {
    log "Ожидание 2 минуты перед повторной проверкой..."
    sleep 120
    
    log "Повторная проверка статуса сайта..."
    check_dev_site_status
}

check_github_actions_requirements() {
    log "Проверка требований для GitHub Actions..."
    
    echo "Требуемые GitHub Secrets:"
    echo "  - DEV_SSH_PRIVATE_KEY: SSH ключ для доступа к серверу"
    echo ""
    echo "Workflow файл: .github/workflows/deploy-dev.yml"
    echo "Триггер: push в ветку 'dev'"
    echo ""
    
    if git log --oneline -1 | grep -q "fix\|feat\|deploy"; then
        success "✅ Последний коммит выглядит как изменение для деплоя"
    else
        warning "⚠️ Последний коммит может не содержать изменений для деплоя"
    fi
}

generate_debug_report() {
    log "Генерация отчета для отладки..."
    
    REPORT_FILE="deploy/debug-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Отчет об отладке деплоя Dev окружения

**Время создания:** $(date '+%Y-%m-%d %H:%M:%S')  
**Ветка:** $(git branch --show-current)  
**Последний коммит:** $(git log --oneline -1)

## Статус сайта

**Dev URL:** $DEV_URL  
**API URL:** $API_URL  
**Health URL:** $HEALTH_URL

### Результаты проверки

**Frontend:** $(curl -s -I "$DEV_URL" | head -1 || echo "ERROR")  
**API Health:** $(curl -s "$HEALTH_URL" || echo "CONNECTION_ERROR")

## Возможные проблемы

1. **SSH ключи не настроены в GitHub Secrets**
   - Проверьте наличие \`DEV_SSH_PRIVATE_KEY\` в Settings → Secrets and variables → Actions

2. **GitHub Actions workflow завершился с ошибкой**
   - Проверьте логи в GitHub → Actions → последний workflow run

3. **Docker контейнеры не запустились**
   - Возможны проблемы с образами или переменными окружения

4. **База данных недоступна**
   - PostgreSQL может быть недоступен на \`host.docker.internal:5432\`

## Рекомендации

1. Проверьте GitHub Actions логи в веб-интерфейсе
2. Убедитесь что SSH ключи настроены
3. Проверьте статус Docker контейнеров на сервере
4. Убедитесь что база данных работает

## Файлы деплоя

- [ ] .github/workflows/deploy-dev.yml
- [ ] deploy/quick-deploy-dev.sh  
- [ ] deploy/github-actions-secrets.md
- [ ] deploy/DEV_DEPLOYMENT_GUIDE.md

EOF

    success "Отчет создан: $REPORT_FILE"
}

# =============================================================================
# ОСНОВНОЙ ПРОЦЕСС
# =============================================================================

main() {
    log "🔍 Локальное тестирование и отладка деплоя"
    
    check_git_status
    echo ""
    
    check_deployment_files  
    echo ""
    
    check_dev_site_status
    echo ""
    
    check_github_actions_requirements
    echo ""
    
    simulate_docker_commands
    echo ""
    
    generate_debug_report
    echo ""
    
    success "🎯 Тестирование завершено!"
    echo ""
    echo "📋 Следующие шаги:"
    echo "1. Проверьте GitHub Actions в веб-интерфейсе"
    echo "2. Убедитесь что DEV_SSH_PRIVATE_KEY настроен в Secrets"  
    echo "3. При необходимости запустите повторную проверку: ./deploy/test-deploy-local.sh --wait"
}

# Проверка аргументов
if [ "$1" = "--wait" ]; then
    main
    wait_and_recheck
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Использование: $0 [опции]"
    echo "Локальное тестирование и отладка деплоя dev окружения"
    echo ""
    echo "Опции:"
    echo "  --wait     Ожидать 2 минуты и повторить проверку"  
    echo "  --help, -h Показать эту справку"
    exit 0
else
    main
fi