#!/bin/bash

echo "🔍 Проверка контейнеров на удаленном сервере 195.14.122.135"
echo "==========================================================="
echo ""

echo "📋 ВСЕ Docker контейнеры на сервере:"
ssh root@195.14.122.135 'docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"'
echo ""

echo "🔍 Поиск контейнеров со словом 'estimate':"
ssh root@195.14.122.135 'docker ps -a | grep estimate'
echo ""

echo "🌐 Проверка портов 8000, 8001, 3000, 3001:"
ssh root@195.14.122.135 'netstat -tlnp | grep -E ":(8000|8001|3000|3001)"'
echo ""

echo "📊 Django/Gunicorn процессы:"
ssh root@195.14.122.135 'ps aux | grep -E "(gunicorn|django|manage\.py)" | grep -v grep'
echo ""

echo "🗄️ Подключения к PostgreSQL:"
ssh root@195.14.122.135 'netstat -an | grep :5432'
echo ""

echo "🔧 Nginx конфигурация для dev.app.iqbs.pro:"
ssh root@195.14.122.135 'grep -A 10 -B 2 "dev.app.iqbs.pro" /etc/nginx/sites-enabled/* 2>/dev/null | grep -E "(upstream|proxy_pass)"'
echo ""