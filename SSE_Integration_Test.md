# SSE Integration Test Guide

## Инструкции по тестированию Server-Sent Events

### 1. Подготовка к тестированию

Убедитесь что оба сервера запущены:

#### Backend (Django)
```bash
cd backend
python manage.py runserver
# Server: http://127.0.0.1:8000/
```

#### Frontend (React)
```bash
cd frontend
npm run dev -- --port 5173
# Server: http://localhost:5173/
```

### 2. Получение токена аутентификации

1. Откройте http://localhost:5173/
2. Войдите в систему:
   - **Менеджер**: `manager@example.com` / `password123`
   - **Прораб**: `foreman@example.com` / `password123`
3. Откройте Developer Tools (F12)
4. Выполните в консоли:
```javascript
// Получить токен
const token = localStorage.getItem('authToken');
console.log('Token:', token);
```

### 3. Тестирование SSE подключения

#### Метод 1: Прямое подключение к SSE endpoint

Выполните в консоли браузера:
```javascript
// Замените YOUR_TOKEN на реальный токен
const token = localStorage.getItem('authToken');
const sseUrl = `http://localhost:8000/api/v1/sse/events/?token=${token}`;

const eventSource = new EventSource(sseUrl);

eventSource.onopen = function(event) {
    console.log('🟢 SSE Connection opened:', event);
};

eventSource.onmessage = function(event) {
    console.log('📨 SSE Message received:', JSON.parse(event.data));
};

eventSource.onerror = function(event) {
    console.log('🔴 SSE Error:', event);
};

// Закрыть соединение через 30 секунд
setTimeout(() => {
    eventSource.close();
    console.log('🔌 SSE Connection closed');
}, 30000);
```

#### Метод 2: Использование встроенного SSE Hook

SSE автоматически подключается через `useSSE` hook в приложении. Проверьте:

```javascript
// В консоли браузера должны появляться сообщения:
// 🔌 [SSE] Подключение к: http://localhost:8000/api/v1/sse/events/?token=...
// ✅ [SSE] Подключение установлено
```

### 4. Тестирование событий

#### Создание сметы (должно вызвать SSE событие)

1. **Войдите как прораб** в одном браузере/вкладке
2. **Войдите как менеджер** в другом браузере/вкладке 
3. В браузере **прораба** создайте новую смету
4. В браузере **менеджера** должно появиться уведомление о новой смете

#### Ручное тестирование события

Выполните в консоли браузера:
```javascript
// Создать демо объект для прослушивания
const demo = new SSEDemo();
demo.startListening();

// Создать тестовое событие (симуляция)
SSETestUtils.createTestEstimateEvent();

// Запустить серию тестовых событий
SSETestUtils.runTestSequence(2000); // каждые 2 секунды

// Остановить прослушивание
demo.stopListening();
```

### 5. Проверка статистики SSE

#### В браузере
```bash
# GET запрос к статистике (нужен Bearer токен)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/sse/stats/
```

#### Результат должен быть примерно такой:
```json
{
  "total_users": 2,
  "total_connections": 3,
  "users": {
    "1": 2,
    "2": 1
  }
}
```

### 6. Логи и отладка

#### Backend логи
```bash
# Смотреть SSE логи
tail -f backend/audit.log | grep SSE

# Общие Django логи
tail -f backend/server.log
```

#### Frontend консоль
Все SSE события логируются с префиксами:
- `🔌 [SSE]` - события подключения
- `📨 [SSE]` - получение сообщений
- `🚌 [EventBus]` - обработка событий

### 7. Ожидаемые результаты

#### При успешном подключении:
1. ✅ SSE соединение установлено
2. ✅ Keep-alive сообщения каждые 30 секунд
3. ✅ События автоматически отправляются при создании/обновлении смет
4. ✅ React Query кэши автоматически инвалидируются
5. ✅ UI обновляется в реальном времени

#### Возможные проблемы:

**401 Unauthorized**
- Проверьте валидность токена
- Убедитесь что пользователь залогинен

**CORS ошибки**
- Проверьте настройки CORS в Django
- Убедитесь что frontend запущен на порту 5173

**SSE не подключается**
- Проверьте что Django сервер запущен
- Проверьте URL endpoints в консоли браузера

### 8. Продвинутое тестирование

#### Тестирование множественных подключений

1. Откройте несколько вкладок браузера
2. Войдите в каждую под разными пользователями
3. В одной вкладке создайте смету
4. Проверьте что другие вкладки получили события

#### Тестирование переподключения

```javascript
// В консоли браузера
const connection = window.sseConnection; // если доступно
// или остановите/запустите Django сервер
// SSE должно автоматически переподключиться
```

### 9. Очистка после тестирования

```javascript
// Закрыть все SSE соединения
if (window.eventSource) {
    window.eventSource.close();
}

// Очистить Event Bus
if (window.eventBus) {
    window.eventBus.clear();
}
```

---

## Контрольный список тестирования

- [ ] Django и React серверы запущены
- [ ] Пользователи могут логиниться  
- [ ] SSE подключение устанавливается успешно
- [ ] Keep-alive сообщения приходят каждые 30 секунд
- [ ] События отправляются при создании смет
- [ ] События получаются в других браузерах/вкладках
- [ ] React Query кэши инвалидируются
- [ ] UI обновляется автоматически
- [ ] Переподключение работает при потере соединения
- [ ] Статистика SSE показывает активные подключения

## Готовность к продакшену

После успешного тестирования SSE система готова для:
1. ✅ Синхронизация смет между менеджерами и прорабами
2. ✅ Real-time уведомления о новых/изменённых сметах  
3. ✅ Автоматическое обновление UI без перезагрузки страницы
4. ✅ Интеграция с существующей Event Bus системой