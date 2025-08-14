# План миграции на PostgreSQL

## 1. Подготовка к миграции

### Установка зависимостей
```bash
pip install psycopg2-binary
pip install dj-database-url  # Для гибкого управления настройками БД
```

### Создание резервной копии текущей БД
```bash
# Создание дампа текущей SQLite базы
python manage.py dumpdata --natural-foreign --natural-primary > data_backup.json
```

## 2. Настройка PostgreSQL

### Создание базы данных PostgreSQL
```sql
-- Подключиться к PostgreSQL как суперпользователь
CREATE DATABASE estimate_app_db;
CREATE USER estimate_user WITH PASSWORD 'secure_password_here';
ALTER ROLE estimate_user SET client_encoding TO 'utf8';
ALTER ROLE estimate_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE estimate_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE estimate_app_db TO estimate_user;
```

### Переменные окружения для продакшина
```bash
# .env файл для продакшина
DATABASE_URL=postgresql://estimate_user:secure_password_here@localhost:5432/estimate_app_db
SECRET_KEY=your_very_secure_secret_key_here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 3. Обновление настроек Django

### Обновление DATABASES в settings.py
```python
import dj_database_url
import os

# Настройки базы данных
if os.environ.get('DATABASE_URL'):
    # Продакшин - PostgreSQL
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }
else:
    # Разработка - SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
```

### Обновление requirements.txt
```
django==5.2.5
djangorestframework==3.15.2
django-cors-headers==4.6.0
django-auditlog==3.0.0
openpyxl==3.1.5
psycopg2-binary==2.9.9
dj-database-url==2.2.0
gunicorn==22.0.0  # Для продакшина
whitenoise==6.8.2  # Для статических файлов
python-dotenv==1.0.1  # Для .env файлов
```

## 4. Процесс миграции

### Шаг 1: Создание миграций для PostgreSQL
```bash
# Активировать виртуальное окружение
source .venv/bin/activate

# Установить новые зависимости
pip install -r requirements.txt

# Настроить переменную DATABASE_URL
export DATABASE_URL=postgresql://estimate_user:password@localhost:5432/estimate_app_db

# Применить миграции к PostgreSQL
python manage.py migrate
```

### Шаг 2: Перенос данных
```bash
# Загрузить данные из резервной копии
python manage.py loaddata data_backup.json
```

### Шаг 3: Проверка целостности данных
```bash
# Проверить количество записей
python manage.py shell -c "
from api.models import WorkCategory, WorkType, User, Estimate
print(f'Categories: {WorkCategory.objects.count()}')
print(f'Work Types: {WorkType.objects.count()}')
print(f'Users: {User.objects.count()}')
print(f'Estimates: {Estimate.objects.count()}')
"

# Запустить тесты
python manage.py test
```

## 5. Оптимизация для PostgreSQL

### Индексы для производительности
```sql
-- Создать дополнительные индексы для часто используемых запросов
CREATE INDEX idx_estimate_foreman ON api_estimate (foreman_id);
CREATE INDEX idx_estimate_project ON api_estimate (project_id);
CREATE INDEX idx_estimate_created_at ON api_estimate (created_at);
CREATE INDEX idx_worktype_category ON api_worktype (category_id);
CREATE INDEX idx_worktype_usage_count ON api_worktype (usage_count DESC);
```

### Настройки PostgreSQL для оптимальной производительности
```sql
-- В postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1  # Для SSD
```

## 6. Мониторинг и резервное копирование

### Автоматическое резервное копирование
```bash
#!/bin/bash
# backup_script.sh
DATE=$(date +"%Y%m%d_%H%M%S")
pg_dump -h localhost -U estimate_user -d estimate_app_db > /backups/estimate_app_$DATE.sql
# Удалить резервные копии старше 30 дней
find /backups -name "estimate_app_*.sql" -mtime +30 -delete
```

### Мониторинг производительности
```sql
-- Запросы для мониторинга
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE schemaname = 'public';

-- Самые медленные запросы
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## 7. План отката (Rollback)

### В случае проблем с миграцией
1. Остановить приложение
2. Вернуться к SQLite базе
3. Восстановить данные из резервной копии
4. Откатить изменения в настройках

```bash
# Откат к SQLite
unset DATABASE_URL
python manage.py runserver  # Автоматически использует SQLite
```

## 8. Тестирование после миграции

### Чек-лист для проверки
- [ ] Аутентификация работает
- [ ] Все API endpoints отвечают
- [ ] Поиск работ функционирует
- [ ] Экспорт в Excel работает
- [ ] Пагинация корректна
- [ ] Логирование безопасности активно
- [ ] Производительность удовлетворительна

### Нагрузочное тестирование
```bash
# Установить инструменты для нагрузочного тестирования
pip install locust

# Запустить тесты производительности
locust -f load_test.py --host=http://localhost:8000
```

## 9. Особенности PostgreSQL vs SQLite

### Различия в типах данных
- SQLite: Динамическая типизация
- PostgreSQL: Строгая типизация
- UUID поля работают нативно в PostgreSQL
- Поддержка JSON полей для будущих расширений

### Преимущества миграции
1. **Производительность**: Лучше для больших объемов данных
2. **Параллелизм**: Поддержка concurrent connections
3. **Безопасность**: Расширенные возможности управления доступом
4. **Масштабируемость**: Готовность к росту приложения
5. **Backup/Recovery**: Профессиональные инструменты

## 10. Временные затраты

- Подготовка и настройка: 2-4 часа
- Миграция данных: 30 минут - 2 часа (в зависимости от объема)
- Тестирование: 2-4 часа
- Оптимизация: 1-2 часа

**Общее время**: 6-12 часов с учетом тестирования и отладки.