 создай # Руководство по разработке API для Сервиса Строительных Смет

## 1. Общие принципы

API должно быть разработано в соответствии с принципами REST. Все запросы и ответы должны использовать формат JSON. Авторизация будет осуществляться через JWT-токены, которые должны передаваться в заголовке `Authorization: Bearer <token>`.

## 2. Модели данных (JSON)

Основные сущности, которые будут использоваться в API.

**User:**
```json
{
  "user_id": 1,
  "full_name": "Иван Петров",
  "role": "прораб"
}
```

**Project:**
```json
{
  "project_id": 1,
  "project_name": "Жилой комплекс \"Солнечный\"",
  "address": "ул. Центральная, 10"
}
```

**WorkCategory:**
```json
{
  "category_id": 1,
  "category_name": "Земляные работы"
}
```

**WorkTypeWithPrice:** (Из справочника)
```json
{
  "work_type_id": 11,
  "category_id": 1,
  "work_name": "Разработка грунта экскаватором",
  "unit_of_measurement": "м³",
  "cost_price": "450.00",
  "client_price": "550.00"
}
```

**Estimate (в списке):**
```json
{
  "estimate_id": 1,
  "estimate_number": "EST-2024-001",
  "status": "draft",
  "project_name": "Жилой комплекс \"Солнечный\"",
  "creator_name": "Иван Петров",
  "total_cost_price": "125000.00",
  "total_client_price": "155000.00",
  "created_at": "2024-08-10T10:00:00Z"
}
```

**EstimateItem (внутри полной сметы):**
```json
{
  "item_id": 101,
  "work_name": "Разработка грунта экскаватором",
  "unit_of_measurement": "м³",
  "quantity": "50.00",
  "cost_price_per_unit": "450.00",
  "client_price_per_unit": "550.00",
  "total_cost": "22500.00",
  "total_client": "27500.00",
  "price_change_request": null // or object PriceChangeRequest
}
```

**PriceChangeRequest:**
```json
{
    "request_id": 1,
    "requested_price": "480.00",
    "comment": "Сложный каменистый грунт",
    "status": "pending"
}
```

## 3. Эндпоинты API

### 3.1. Аутентификация

*   **`POST /api/v1/auth/login`**
    *   **Описание:** Аутентификация пользователя.
    *   **Тело запроса:** `{ "email": "user@example.com", "password": "password123" }`
    *   **Ответ (200 OK):** `{ "token": "jwt.token.here", "user": { ...User } }`

### 3.2. Справочники (для всех авторизованных)

*   **`GET /api/v1/work-categories`**
    *   **Описание:** Получить список всех категорий работ.
    *   **Ответ (200 OK):** `[ { ...WorkCategory } ]`

*   **`GET /api/v1/work-types`**
    *   **Описание:** Получить список всех видов работ с ценами. Можно фильтровать по категории.
    *   **Query-параметры:** `?categoryId=1` (опционально)
    *   **Ответ (200 OK):** `[ { ...WorkTypeWithPrice } ]`

### 3.3. Проекты (Объекты)

*   **`GET /api/v1/projects`**
    *   **Описание:** Получить список проектов. Для менеджера — все проекты. Для прораба — только назначенные ему.
    *   **Ответ (200 OK):** `[ { ...Project } ]`

### 3.4. Сметы (Estimates)

*   **`GET /api/v1/estimates`**
    *   **Описание:** Получить список смет. Менеджер видит все, прораб — только свои.
    *   **Query-параметры:** `?projectId=1` (для фильтрации)
    *   **Ответ (200 OK):** `[ { ...Estimate (в списке) } ]`

*   **`GET /api/v1/estimates/:id`**
    *   **Описание:** Получить полную информацию по одной смете.
    *   **Ответ (200 OK):** `{ "estimate_id": 1, ..., "items": [ { ...EstimateItem } ] }`

*   **`POST /api/v1/estimates`**
    *   **Описание:** Создать новую пустую смету.
    *   **Тело запроса:** `{ "project_id": 1, "estimate_name": "Новая смета" }`
    *   **Ответ (201 Created):** `{ ...Estimate (полная) }`

*   **`PUT /api/v1/estimates/:id`**
    *   **Описание:** Обновить данные сметы (статус, название).
    *   **Тело запроса:** `{ "status": "awaiting_approval", "estimate_name": "Смета на фундамент" }`
    *   **Ответ (200 OK):** `{ ...Estimate (полная) }`

### 3.5. Работы в смете (Estimate Items)

*   **`POST /api/v1/estimates/:estimateId/items`**
    *   **Описание:** Добавить работу в смету. Бэкенд должен сам подставить `cost_price` и `client_price` из справочника `WorkPrices`.
    *   **Тело запроса:** `{ "work_type_id": 11, "quantity": 10 }`
    *   **Ответ (201 Created):** `{ ...EstimateItem }`

*   **`PUT /api/v1/items/:itemId`**
    *   **Описание:** Изменить работу в смете. Прораб может менять только `quantity`. Менеджер может менять `quantity` и `client_price_per_unit`.
    *   **Тело запроса:** `{ "quantity": 15.5, "client_price_per_unit": "600.00" }`
    *   **Ответ (200 OK):** `{ ...EstimateItem }`

*   **`DELETE /api/v1/items/:itemId`**
    *   **Описание:** Удалить работу из сметы.
    *   **Ответ (204 No Content):** 


### 3.6. Запросы на изменение цены

*   **`POST /api/v1/items/:itemId/price-change-requests`**
    *   **Описание:** Прораб создает запрос на изменение себестоимости.
    *   **Тело запроса:** `{ "requested_price": "480.00", "comment": "Причина..." }`
    *   **Ответ (201 Created):** `{ ...PriceChangeRequest }`

*   **`GET /api/v1/price-change-requests`**
    *   **Описание:** Менеджер получает список запросов на изменение цены.
    *   **Query-параметры:** `?status=pending`
    *   **Ответ (200 OK):** `[ { ...PriceChangeRequest (с информацией о смете и работе) } ]`

*   **`PUT /api/v1/price-change-requests/:requestId`**
    *   **Описание:** Менеджер одобряет или отклоняет запрос. При одобрении бэкенд должен обновить `cost_price_per_unit` в соответствующем `EstimateItems`.
    *   **Тело запроса:** `{ "status": "approved" }`
    *   **Ответ (200 OK):** `{ ...PriceChangeRequest }`


