# Функция одобрения цен в приложении для строительных смет

## Описание
Функция одобрения цен позволяет прорабу запрашивать изменение стандартной цены из прайс-листа для работ в смете, а менеджеру — рассматривать, одобрять, отклонять или предлагать альтернативную цену. Функция интегрируется в существующее Django-приложение для создания и контроля смет, минимизируя изменения в текущем функционале.

## Цели
- Добавить возможность прорабу запрашивать изменение цены с комментарием.
- Обеспечить менеджеру интерфейс для обработки запросов (одобрение, отклонение, предложение своей цены).
- Отображать статусы запросов в таблицах смет и работ с визуальной подсветкой.
- Уведомлять пользователей об изменениях.

## Модели данных
### Расширение существующих моделей
1. **Estimate (Смета)**:
   - Добавить поле: `has_price_requests` (BooleanField, default=False) — флаг наличия запросов на изменение цен.
2. **EstimateItem (Работа в смете)**:
   - Добавить поля:
     - `proposed_price` (DecimalField, null=True) — предлагаемая цена.
     - `request_status` (CharField, choices=['no_request', 'pending', 'approved', 'rejected', 'modified']) — статус запроса.
     - `foreman_comment` (TextField, blank=True) — комментарий прораба.
     - `manager_comment` (TextField, blank=True) — комментарий менеджера.
     - `request_date` (DateTimeField, null=True) — дата запроса.

### Новая модель
- **PriceChangeRequest (Запрос на изменение цены)**:
  - Поля:
    - `id` (AutoField, primary_key=True)
    - `estimate_item` (ForeignKey к EstimateItem, on_delete=CASCADE)
    - `proposed_price` (DecimalField) — цена от прораба
    - `foreman_comment` (TextField) — комментарий прораба
    - `status` (CharField, choices=['new', 'approved', 'rejected', 'modified'])
    - `manager_proposed_price` (DecimalField, null=True) — цена от менеджера
    - `manager_comment` (TextField, blank=True) — комментарий менеджера
    - `created_at` (DateTimeField, auto_now_add=True)
    - `processed_at` (DateTimeField, null=True)
    - `manager` (ForeignKey к User, null=True)
  - Назначение: Хранение истории запросов для менеджера и аудита.

### Signals
- При создании `PriceChangeRequest`: обновить `has_price_requests` в `Estimate` и `request_status` в `EstimateItem`.
- При обработке запроса: обновить `proposed_price` и `request_status` в `EstimateItem`, синхронизировать с `PriceChangeRequest`.

## Логика и интерфейс
### Для прораба
1. **Таблица смет (ListView для Estimate)**:
   - Добавить колонку "Статус запросов" (иконка/текст с подсветкой: жёлтый — в обработке, зелёный — одобрено, красный — отклонено).
   - Логика: Аннотация через related queries к `PriceChangeRequest` или метод в модели `Estimate`.

2. **Детали/редактирование сметы (DetailView/UpdateView)**:
   - В таблице работ (`EstimateItem`):
     - Добавить колонку "Статус запроса" с подсветкой поля цены (CSS: `bg-success`, `bg-danger`, `bg-warning`).
     - Добавить кнопку "Запрос на изменение" (отображается, если `request_status` = 'no_request' или 'rejected').
   - Модальное окно для запроса:
     - Поля: новая цена (numeric input), комментарий (textarea).
     - Отправка: Создаёт `PriceChangeRequest`, меняет `request_status` на 'pending', отправляет уведомление менеджеру (email/in-app via signals).
   - Обновление UI: Подсветка цены и tooltip с комментарием менеджера (через conditional CSS).

3. **Обновление после обработки**:
   - AJAX polling или page refresh для отображения изменений.
   - Подсветка поля цены и отображение статуса/комментария менеджера.

### Для менеджера
1. **Страница запросов (ListView для PriceChangeRequest)**:
   - Таблица: ID, смета/работа, прораб, цена, комментарий, дата, статус.
   - Подсветка новых запросов (CSS: `bg-warning`).
   - Фильтры: по статусу, прорабу, дате.
   - Кнопки: "Одобрить", "Отклонить", "Предложить вариант" (ссылки на UpdateView).

2. **Обработка запроса (UpdateView)**:
   - Форма (модал/страница):
     - Одобрение: `status` = 'approved', копировать `proposed_price` в `EstimateItem`.
     - Отклонение: `status` = 'rejected', добавить комментарий.
     - Предложение: `status` = 'modified', записать `manager_proposed_price` в `EstimateItem`.
   - После обработки: Отметить запрос как выполненный, обновить `EstimateItem`, отправить уведомление прорабу.

## Уведомления
- **Прораб**:
  - Подсветка в таблице работ (CSS conditional classes).
  - Всплывающие уведомления (Django messages framework).
  - Email (via celery) при обработке запроса.
- **Менеджер**:
  - Подсветка новых запросов в таблице.
  - Email/in-app уведомления о новых запросах (via signals).
- Реализация: Signals для синхронизации, celery для асинхронных email.

## Шаблоны
- **Существующие шаблоны (прораб)**:
  - Расширить таблицу смет: добавить колонку статуса.
  - В таблице работ: добавить колонку статуса, кнопку запроса, модал (Bootstrap).
  - Conditional CSS для подсветки: `{% if item.request_status == 'approved' %}bg-success{% endif %}`.
- **Новые шаблоны (менеджер)**:
  - ListView: таблица запросов (Bootstrap table, пагинация).
  - UpdateView: форма обработки (модал или страница).
- Использовать Bootstrap для responsivity и модалов.

## Безопасность
- **Permissions**:
  - Прораб: создавать запросы (`add_pricechangerequest`).
  - Менеджер: редактировать запросы (`change_pricechangerequest`).
- Логирование: Использовать django-auditlog или custom logging для изменений.

## Тестирование
- **Unit-тесты**: Модели, signals (синхронизация `Estimate`/`EstimateItem`/`PriceChangeRequest`).
- **Functional-тесты**: Workflow запросов (создание, обработка, уведомления).
- **UI-тесты**: Подсветка, модалы, обновление таблиц.

## Масштабируемость
- Добавить индексы на `PriceChangeRequest` (поля `status`, `created_at`).
- Пагинация в ListView запросов.
- Опционально: WebSockets (django-channels) для real-time обновлений (начать с AJAX polling).

## Интеграция
- Минимизировать изменения в существующих view/шаблонах.
- Использовать signals для автоматизации обновлений.
- Поддерживать совместимость с текущими моделями смет.