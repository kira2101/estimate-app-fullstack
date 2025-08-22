#!/bin/bash

# =============================================================================
# Диагностика Docker контейнеров dev окружения
# Проверка состояния backend и причин недоступности API
# =============================================================================

echo "🔍 Диагностика dev окружения на сервере 195.14.122.135"
echo "Время: $(date)"
echo ""

# Проверка доступности dev сайта
echo "🌐 Проверка доступности dev.app.iqbs.pro..."
if curl -s -I https://dev.app.iqbs.pro/ | head -1; then
    echo "✅ Frontend доступен"
else
    echo "❌ Frontend недоступен"
fi

# Проверка API health
echo ""
echo "🔌 Проверка API health check..."
API_RESPONSE=$(curl -s -m 10 https://dev.app.iqbs.pro/api/v1/health/ -w "HTTP_%{http_code}" 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "healthy"; then
    echo "✅ API health check работает: $API_RESPONSE"
else
    echo "❌ API health check не отвечает: $API_RESPONSE"
fi

echo ""
echo "📋 Команды для проверки на сервере:"
echo ""
echo "# Проверка статуса контейнеров:"
echo "ssh root@195.14.122.135 'docker ps -a | grep estimate'"
echo ""
echo "# Логи backend контейнера:"
echo "ssh root@195.14.122.135 'docker logs estimate-backend-dev --tail 30'"
echo ""
echo "# Логи frontend контейнера:"  
echo "ssh root@195.14.122.135 'docker logs estimate-frontend-dev --tail 20'"
echo ""
echo "# Проверка портов внутри backend:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev netstat -tlnp | grep 8000'"
echo ""
echo "# Проверка процессов внутри backend:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev ps aux'"
echo ""
echo "# Проверка подключения к базе:"
echo "ssh root@195.14.122.135 'docker exec estimate-backend-dev python manage.py showmigrations'"
echo ""
echo "# Перезапуск контейнеров:"
echo "ssh root@195.14.122.135 'docker restart estimate-backend-dev estimate-frontend-dev'"
echo ""

echo "🚨 Наиболее вероятные проблемы:"
echo "1. Backend контейнер crashed - проверьте docker logs"
echo "2. Django не может подключиться к базе PostgreSQL"  
echo "3. Gunicorn не запустился на порту 8000 внутри контейнера"
echo "4. SECRET_KEY или другие env переменные неправильные"
echo ""
echo "💡 Для исправления запустите:"
echo "./deploy/quick-deploy-dev.sh"