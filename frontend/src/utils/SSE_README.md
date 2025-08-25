# Server-Sent Events (SSE) Integration

## Обзор

Система Server-Sent Events (SSE) интегрирована с существующей Event Bus системой для обеспечения синхронизации данных между разными браузерами и пользователями в реальном времени.

## Архитектура

```
┌─────────────────┐    SSE     ┌──────────────────┐    Signals    ┌─────────────┐
│   React Client  │  ◄─────────┤  Django SSE View │  ◄───────────┤  Django ORM │
│                 │            │                  │              │             │
│  EventBus       │            │  SSEManager      │              │  Models     │
│  └─ useSSE()    │            │  └─ broadcast()  │              │             │
└─────────────────┘            └──────────────────┘              └─────────────┘
```

## Компоненты системы

### Backend (Django)

#### 1. SSEManager
- **Файл**: `backend/api/sse_views.py`
- **Функции**:
  - Управление активными SSE подключениями
  - Отправка событий пользователям по ролям
  - Thread-safe операции с очередями сообщений

#### 2. SSEView 
- **Endpoint**: `/api/v1/sse/events/`
- **Аутентификация**: Токен через URL параметр
- **Формат**: Text/Event-Stream
- **Функции**:
  - Стриминг событий в реальном времени
  - Keep-alive сообщения
  - Автоматическое переподключение

#### 3. Django Signals
- **Модели**: Estimate, Project
- **События**: post_save, post_delete
- **Автоматическая отправка**: События в SSEManager

### Frontend (React)

#### 1. useSSE Hook
- **Файл**: `frontend/src/hooks/useSSE.js`
- **Функции**:
  - Подключение к SSE endpoint
  - Автоматическое переподключение
  - Интеграция с Event Bus

#### 2. SSEConnection Component
- **Файл**: `frontend/src/components/SSEConnection.jsx`
- **Функции**:
  - Обертка для автоматического подключения
  - Индикатор статуса подключения (dev режим)
  - Управление жизненным циклом

## Поток событий

### Создание сметы прорабом

1. **Прораб** создает смету через мобильный/desktop интерфейс
2. **Django ORM** сохраняет смету в базу данных
3. **Django Signal** (`post_save`) срабатывает автоматически
4. **SSEManager** отправляет событие `estimate.created` всем **менеджерам**
5. **React SSE Hook** получает событие и передает в **Event Bus**
6. **Event Bus** инвалидирует кэши React Query
7. **UI менеджеров** автоматически обновляется

### Обновление сметы менеджером

1. **Менеджер** обновляет смету через desktop интерфейс
2. **Django Signal** срабатывает и отправляет событие назначенному **прорабу**
3. **Прораб** видит обновление в реальном времени

## Настройка и использование

### Backend настройка

1. **SSE уже интегрирован** в Django проект
2. **URLs добавлены** в `api/urls.py`:
   ```python
   path('sse/events/', SSEView.as_view(), name='sse-events'),
   path('sse/stats/', sse_stats, name='sse-stats'),
   ```

3. **Логирование настроено** в settings.py

### Frontend интеграция

1. **SSE подключен** в App.jsx через `<SSEConnection>`
2. **Автоматически активируется** при входе пользователя
3. **Работает с существующим Event Bus**

## API Endpoints

### GET /api/v1/sse/events/
**Описание**: Server-Sent Events stream для real-time уведомлений

**Параметры**:
- `token` (query param) - Токен аутентификации

**Ответ**: 
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"event": "connected", "message": "SSE connection established"}

data: {"event": "estimate.created", "data": {...}, "timestamp": 1234567890}

data: {"event": "keepalive", "timestamp": 1234567890}
```

### GET /api/v1/sse/stats/
**Описание**: Статистика активных SSE подключений

**Требует аутентификации**: Bearer Token

**Ответ**:
```json
{
  "total_users": 3,
  "total_connections": 5,
  "users": {
    "1": 2,
    "2": 1,
    "3": 2
  }
}
```

## События

### Типы событий

- `estimate.created` - Создана новая смета
- `estimate.updated` - Смета обновлена
- `estimate.deleted` - Смета удалена
- `project.created` - Создан новый проект
- `project.updated` - Проект обновлен
- `system.connectionLost` - Потеряно SSE соединение
- `system.connectionRestored` - SSE соединение восстановлено

### Структура данных события

```json
{
  "event": "estimate.created",
  "data": {
    "estimate_id": 123,
    "estimate_number": "Смета_2025-01-01_Объект",
    "project_id": 456,
    "project_name": "Название проекта",
    "foreman_id": 789,
    "foreman_name": "Имя прораба",
    "creator_id": 101,
    "creator_name": "Имя создателя",
    "status": "Черновик",
    "created_at": "2025-01-01T12:00:00Z"
  },
  "timestamp": 1704110400
}
```

## Роли и доступ

### Менеджер
- **Получает события**: Все события смет от прорабов
- **Может отправлять**: События прорабам при изменениях

### Прораб  
- **Получает события**: События по своим сметам от менеджеров
- **Отправляет события**: Менеджерам при создании/изменении смет

## Тестирование

### В консоли браузера

```javascript
// Создать демо объект для прослушивания
const demo = new SSEDemo();
demo.startListening();

// Посмотреть статус
demo.getStatus();

// Создать тестовые события
SSETestUtils.createTestEstimateEvent();
SSETestUtils.runTestSequence();

// Остановить прослушивание
demo.stopListening();
```

### Проверка подключений

```bash
# Получить статистику SSE подключений
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/sse/stats/
```

## Производительность

### Настройки
- **Максимум сообщений в очереди**: 100
- **Keep-alive интервал**: 30 секунд
- **Максимум попыток переподключения**: 5
- **Задержка переподключения**: 3 секунды

### Мониторинг
- Логи в `backend/audit.log`
- Статистика подключений через `/api/v1/sse/stats/`
- Индикатор состояния в development режиме

## Безопасность

### Аутентификация
- Токен передается через URL параметр
- Проверка валидности токена в базе данных
- Автоматическое отключение при недействительном токене

### Авторизация
- Пользователи получают только релевантные события
- Менеджеры видят все события
- Прорабы видят только свои события

## Отладка

### Backend логи
```bash
tail -f backend/audit.log | grep SSE
```

### Frontend консоль
- Все SSE события логируются с префиксом `[SSE]`
- Event Bus события логируются с префиксом `[EventBus]`
- Статус индикатор в development режиме

### Проблемы подключения

1. **Проверить токен**: Убедиться что токен валидный
2. **Проверить CORS**: Разрешены ли SSE запросы
3. **Проверить сеть**: Нет ли блокировки EventSource
4. **Проверить логи**: Django логи в audit.log

## Совместимость

### Браузеры
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ❌ Internet Explorer (не поддерживается)

### Мобильные браузеры
- ✅ Chrome Mobile
- ✅ Safari Mobile
- ✅ Samsung Internet

## Развитие

### Планируемые улучшения

1. **WebSockets поддержка** - Для двустороннего общения
2. **Push уведомления** - Браузерные уведомления
3. **Офлайн режим** - Очередь событий при отсутствии соединения
4. **Кластеризация** - Поддержка нескольких серверов
5. **Метрики** - Подробная аналитика использования

### Альтернативы
- **WebSockets** (django-channels)
- **Long Polling**
- **Socket.IO** (требует Node.js)