#!/bin/bash

echo "🔍 Проверка реальных Docker контейнеров на сервере"
echo "=================================================="
echo ""

echo "📋 ВСЕ Docker контейнеры на сервере:"
echo "docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
echo ""

echo "🔍 Поиск контейнеров со словом 'estimate':"  
echo "docker ps -a | grep estimate"
echo ""

echo "🌐 Проверка портов 8000, 8001, 3000, 3001:"
echo "netstat -tlnp | grep -E ':(8000|8001|3000|3001)'"
echo ""

echo "🗄️ Проверка подключений к PostgreSQL:"
echo "netstat -an | grep :5432"
echo ""

echo "📊 Проверка процессов Django/Gunicorn:"
echo "ps aux | grep -E '(gunicorn|django|manage.py)'"
echo ""

# Проверим какие контейнеры используются в других скриптах
echo "🔍 Названия контейнеров в скриптах:"
echo ""
echo "В quick-deploy-dev.sh:"
echo "- BACKEND_CONTAINER: estimate-backend-dev"  
echo "- FRONTEND_CONTAINER: estimate-frontend-dev"
echo ""

echo "В server-architecture-analysis.md упоминались:"
grep -i "container\|estimate.*dev" /home/kira/PycharmProjects/Estiamate_app_Gemeni/deploy/server-architecture-analysis.md 2>/dev/null || echo "Файл не найден"

echo ""
echo "🚀 Для выполнения команд на сервере используйте:"
echo "ssh root@195.14.122.135 'КОМАНДА'"