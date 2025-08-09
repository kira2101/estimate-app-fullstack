# Проектирование БД для системы управления строительными сметами (v4.0)

## 1. Введение

Этот документ описывает функционал и структуру базы данных для приложения, предназначенного для создания и управления строительными сметами. Ключевой особенностью системы является **строгое разделение прав и цен**:
1.  **Два уровня цен**: "Себестоимость" для внутреннего учета и "Цена для клиента" для продаж.
2.  **Контролируемое изменение себестоимости**: Прораб не может менять себестоимость напрямую, но может отправить аргументированный запрос менеджеру.

Система предназначена для двух ролей: **Прораб** (контроль затрат) и **Менеджер** (управление прибылью и контроль).

## 2. Основной функционал

### Функционал для Прораба (Foreman)
* **Авторизация**: Безопасный вход в систему.
* **Создание сметы по себестоимости**: Прораб составляет смету, используя **только себестоимость** работ и материалов из справочника. Эти цены по умолчанию нередактируемы.
* **Запрос на изменение цены**: Если фактические условия работы требуют пересмотра себестоимости, прораб может отправить менеджеру **запрос на изменение цены** по конкретной позиции, указав желаемую стоимость и причину.
* **Автоматический расчет материалов**: Система автоматически рассчитывает необходимые материалы на основе их себестоимости.
* **Отправка сметы на проверку**: Передача готовой сметы менеджеру на дальнейшую обработку.

### Функционал для Менеджера (Manager)
* **Полный контроль**: Менеджер управляет всеми аспектами системы: сметами, пользователями, клиентами и справочниками.
* **Управление запросами на изменение цены**: Менеджер видит все запросы от прорабов, может их **одобрить** (цена в смете изменится) или **отклонить**. 
* **Двухуровневое ценообразование**: При просмотре сметы менеджер видит две колонки: **Себестоимость** (изменяется только через одобрение запроса) и **Цена для клиента** (свободно редактируется).
* **Анализ рентабельности**: Система в реальном времени рассчитывает маржинальную прибыль (`Цена для клиента - Себестоимость`).
* **Управление справочниками**: Менеджер задает базовую себестоимость и рекомендованную клиентскую цену для всех работ и материалов.
* **Привязка клиента и экспорт**: Финализация сметы, назначение клиента и выгрузка итогового документа (только с клиентскими ценами).

## 3. Логический поток пользователя

1.  **Настройка (Менеджер)**: В справочнике `WorkTypes` менеджер задает `default_cost_price` (например, 200 грн) и `default_client_price` (350 грн).
2.  **Создание сметы (Прораб)**: Прораб добавляет работу "Штукатурка стен". Себестоимость автоматически устанавливается в **200 грн**.
3.  **Нестандартная ситуация**: Прораб понимает, что стены очень кривые, и работа будет стоить 240 грн. Он не может изменить поле "200". Вместо этого он нажимает "Запросить изменение", вводит **240** и пишет комментарий: "Сложные стены, требуется больше времени и усилий".
4.  **Обработка запроса (Менеджер)**:
    * Менеджер видит у себя запрос: "Смета #105, Штукатурка стен, Прораб Иванов просит изменить цену с 200 на 240. Причина: ...".
    * Менеджер **одобряет** запрос.
    * Система обновляет себестоимость **только для этой одной строки** в смете #105 на 240 грн. Статус запроса меняется на `approved`.
5.  **Дальнейшая работа (Менеджер)**: Менеджер видит обновленную себестоимость (240 грн), редактирует клиентскую цену (например, до 400 грн), видит актуальную прибыль (`400 - 240 = 160`), утверждает и экспортирует смету.

## 4. Схема Базы Данных

### 4.1. Визуальная диаграмма



┌──────────────────┐      ┌──────────────────┐
│  EstimateItems   ├─────>│PriceChangeRequests│
│ (Работа в смете) │      │ (Запросы на цену)│
└────────┬─────────┘      └────────┬─────────┘
│                         │
│ 1                       └────> Users (Requester, Reviewer)
┌────────▼────────┐
│    Estimates    │
│     (Сметы)     │
└─────────────────┘


### 4.2. Полный SQL DDL для создания таблиц
### 3.2. Полный SQL DDL (Финальная версия с категориями)

```sql
-- Создание пользовательских типов для статусов
CREATE TYPE estimate_status AS ENUM ('draft', 'awaiting_approval', 'approved', 'rejected');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- 1. Пользователи, роли, клиенты, проекты
CREATE TABLE Roles ( role_id SERIAL PRIMARY KEY, role_name VARCHAR(50) UNIQUE NOT NULL );
CREATE TABLE Users ( user_id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, full_name VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL, role_id INT NOT NULL REFERENCES Roles(role_id) ON DELETE RESTRICT );
CREATE TABLE Clients ( client_id SERIAL PRIMARY KEY, client_name VARCHAR(255) NOT NULL, client_phone VARCHAR(50) );
CREATE TABLE Projects ( project_id SERIAL PRIMARY KEY, project_name VARCHAR(255) NOT NULL, address TEXT, client_id INT REFERENCES Clients(client_id) ON DELETE RESTRICT );
CREATE TABLE ProjectAssignments ( user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE, project_id INT NOT NULL REFERENCES Projects(project_id) ON DELETE CASCADE, PRIMARY KEY (user_id, project_id) );

-- 2. НОВЫЕ ТАБЛИЦЫ: КАТЕГОРИИ
CREATE TABLE WorkCategories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE MaterialCategories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) UNIQUE NOT NULL
);

-- 3. СПРАВОЧНИКИ (теперь с привязкой к категориям)
CREATE TABLE WorkTypes (
    work_type_id SERIAL PRIMARY KEY,
    -- Привязка к категории
    category_id INT NOT NULL REFERENCES WorkCategories(category_id) ON DELETE RESTRICT,
    work_name VARCHAR(255) UNIQUE NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL
);

CREATE TABLE MaterialTypes (
    material_type_id SERIAL PRIMARY KEY,
    -- Привязка к категории
    category_id INT NOT NULL REFERENCES MaterialCategories(category_id) ON DELETE RESTRICT,
    material_name VARCHAR(255) UNIQUE NOT NULL,
    unit_of_measurement VARCHAR(20) NOT NULL
);

-- 4. ПРАЙС-ЛИСТЫ
CREATE TABLE WorkPrices (
    price_id SERIAL PRIMARY KEY,
    work_type_id INT NOT NULL UNIQUE REFERENCES WorkTypes(work_type_id) ON DELETE CASCADE,
    cost_price NUMERIC(10, 2) NOT NULL,
    client_price NUMERIC(10, 2) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MaterialPrices (
    price_id SERIAL PRIMARY KEY,
    material_type_id INT NOT NULL UNIQUE REFERENCES MaterialTypes(material_type_id) ON DELETE CASCADE,
    price_per_unit NUMERIC(10, 2) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Нормы расхода материалов
CREATE TABLE WorkMaterialRequirements (
    work_type_id INT NOT NULL REFERENCES WorkTypes(work_type_id) ON DELETE CASCADE,
    material_type_id INT NOT NULL REFERENCES MaterialTypes(material_type_id) ON DELETE RESTRICT,
    consumption_rate NUMERIC(10, 3) NOT NULL,
    PRIMARY KEY (work_type_id, material_type_id)
);

-- 6. Сметы и их содержимое
CREATE TABLE Estimates ( estimate_id SERIAL PRIMARY KEY, estimate_number VARCHAR(50), status estimate_status NOT NULL DEFAULT 'draft', project_id INT NOT NULL REFERENCES Projects(project_id) ON DELETE RESTRICT, creator_id INT NOT NULL REFERENCES Users(user_id) ON DELETE RESTRICT, approver_id INT REFERENCES Users(user_id) ON DELETE SET NULL, client_id INT REFERENCES Clients(client_id) ON DELETE SET NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE EstimateItems ( item_id SERIAL PRIMARY KEY, estimate_id INT NOT NULL REFERENCES Estimates(estimate_id) ON DELETE CASCADE, work_type_id INT NOT NULL REFERENCES WorkTypes(work_type_id) ON DELETE RESTRICT, quantity NUMERIC(10, 2) NOT NULL, cost_price_per_unit NUMERIC(10, 2) NOT NULL, client_price_per_unit NUMERIC(10, 2) NOT NULL );
CREATE TABLE EstimateMaterialItems ( item_material_id SERIAL PRIMARY KEY, estimate_item_id INT NOT NULL REFERENCES EstimateItems(item_id) ON DELETE CASCADE, material_type_id INT NOT NULL REFERENCES MaterialTypes(material_type_id) ON DELETE RESTRICT, quantity NUMERIC(10, 2) NOT NULL, price_per_unit NUMERIC(10, 2) NOT NULL );

-- 7. Запросы на изменение цены
CREATE TABLE PriceChangeRequests ( request_id SERIAL PRIMARY KEY, estimate_item_id INT NOT NULL REFERENCES EstimateItems(item_id) ON DELETE CASCADE, requester_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE, requested_price NUMERIC(10, 2) NOT NULL, comment TEXT, status request_status NOT NULL DEFAULT 'pending', reviewer_id INT REFERENCES Users(user_id) ON DELETE SET NULL, reviewed_at TIMESTAMP WITH TIME ZONE );