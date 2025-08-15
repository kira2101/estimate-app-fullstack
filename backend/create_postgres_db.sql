-- Создание базы данных и пользователя для Estimate App
-- Выполните этот скрипт от имени суперпользователя postgres

-- Создать базу данных
CREATE DATABASE estimate_app_db;

-- Создать пользователя
CREATE USER estimate_user WITH PASSWORD 'secure_password_123';

-- Настроить пользователя
ALTER ROLE estimate_user SET client_encoding TO 'utf8';
ALTER ROLE estimate_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE estimate_user SET timezone TO 'UTC';

-- Дать права на базу данных
GRANT ALL PRIVILEGES ON DATABASE estimate_app_db TO estimate_user;

-- Для PostgreSQL 15+ также нужны права на схему
\c estimate_app_db
GRANT ALL ON SCHEMA public TO estimate_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO estimate_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO estimate_user;

-- Проверить созданные объекты
\l
\du