# 📋 Универсальная система Event Bus - Полная документация

## 🎯 Обзор системы

Универсальная система Event Bus обеспечивает синхронизацию данных между мобильным и desktop интерфейсами в приложении управления сметами. Система построена на принципах реактивного программирования и обеспечивает автоматическое обновление UI при изменении данных.

### Основные задачи:
- ✅ Синхронизация данных между мобильным (React Query) и desktop UI
- ✅ Автоматическое обновление интерфейсов при создании/редактировании смет
- ✅ Поддержка всех ролей пользователей (прораб + менеджер)
- ✅ Расширяемость для новых типов событий
- ✅ Мониторинг и отладка системы событий

---

## 🏗️ Архитектура системы

### Структура файлов:
```
/frontend/src/
├── utils/
│   ├── EventBus.js              # Ядро системы событий (Singleton)
│   ├── EventTypes.js            # Типизированные определения событий
│   └── EventBusDocumentation.md # Данная документация
├── api/
│   └── apiWithEvents.js         # API клиент с автоматическими событиями
├── hooks/
│   └── useEventBus.js          # React hooks для работы с Event Bus
├── mobile/utils/
│   └── mobileApiWithEvents.js  # Специализированные мобильные утилиты
└── components/
    └── EventBusMonitor.jsx     # Компонент мониторинга (dev режим)
```

### Принципы работы:
1. **Centralized Event Hub** - единый центр обработки всех событий
2. **Type-safe Events** - строгая типизация всех событий
3. **Automatic Cache Invalidation** - автоматическая инвалидация кэшей
4. **Cross-UI Synchronization** - синхронизация между разными UI
5. **Development Monitoring** - инструменты отладки и мониторинга

---

## 📚 Компоненты системы

### 1. EventBus.js - Ядро системы

**Назначение:** Центральный hub для управления событиями, подписками и автоматической инвалидацией кэшей.

**Ключевые методы:**
```javascript
// Подписка на события
eventBus.subscribe(eventType, listenerId, callback)

// Отправка события
eventBus.emit(eventType, eventData)

// Отписка от событий
eventBus.unsubscribe(eventType, listenerId)

// Установка QueryClient для мобильного UI
eventBus.setQueryClient(queryClient)

// Получение статистики
eventBus.getStats()
```

**Особенности:**
- Singleton паттерн для глобального доступа
- Автоматическая инвалидация React Query кэшей
- Debug логи в development режиме
- Защита от ошибок в callback'ах слушателей

### 2. EventTypes.js - Типизация событий

**Назначение:** Централизованное определение всех типов событий в системе.

**Категории событий:**
```javascript
// Сметы
ESTIMATE_EVENTS = {
  CREATED: 'estimate.created',
  UPDATED: 'estimate.updated',
  DELETED: 'estimate.deleted',
  STATUS_CHANGED: 'estimate.statusChanged'
}

// Проекты  
PROJECT_EVENTS = {
  CREATED: 'project.created',
  UPDATED: 'project.updated',
  DELETED: 'project.deleted'
}

// Пользователи
USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted'
}
```

**Утилиты:**
```javascript
// Создание события с метаданными
createEvent(eventType, data, metadata)

// Валидация типа события
isValidEventType(eventType)

// Получение категории события
getEventCategory(eventType)
```

### 3. useEventBus.js - React Hooks

**Назначение:** Удобные React hooks для интеграции компонентов с Event Bus.

#### useEventBusListener
Подписка на события с автоматической отпиской при размонтировании компонента:

```javascript
import { useEventBusListener } from '../hooks/useEventBus';
import { ESTIMATE_EVENTS } from '../utils/EventTypes';

// Подписка на одно событие
useEventBusListener(ESTIMATE_EVENTS.CREATED, (eventData) => {
  console.log('Смета создана:', eventData);
});

// Подписка на несколько событий
useEventBusListener(
  [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED],
  handleEstimateChange,
  [dependency1, dependency2], // deps как в useCallback
  { enabled: true } // опции
);
```

#### useEventBusEmitter
Отправка событий из компонентов:

```javascript
import { useEventBusEmitter } from '../hooks/useEventBus';

const emit = useEventBusEmitter();

const handleCreate = async () => {
  const result = await api.createEstimate(data);
  emit(ESTIMATE_EVENTS.CREATED, { estimate: result });
};
```

#### useEventBusRefresh
Автоматическое обновление данных при событиях:

```javascript
import { useEventBusRefresh } from '../hooks/useEventBus';

// Простое обновление
useEventBusRefresh(ESTIMATE_EVENTS.CREATED, fetchEstimates);

// С дополнительными опциями
useEventBusRefresh(
  [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED],
  fetchEstimates,
  [projects], // зависимости
  { 
    delay: 300, // задержка перед обновлением
    debounce: true // группировка событий
  }
);
```

#### useEventBusStats
Получение статистики для мониторинга:

```javascript
const stats = useEventBusStats(true); // включить обновление

console.log(stats);
// {
//   totalEventTypes: 5,
//   totalSubscriptions: 12,
//   eventTypes: {
//     'estimate.created': 3,
//     'project.updated': 2
//   }
// }
```

### 4. apiWithEvents.js - API с событиями

**Назначение:** Обертка над базовым API клиентом для автоматической отправки событий.

**Принцип работы:**
```javascript
// Вместо обычного API
await api.createEstimate(data);

// Используем API с событиями
await apiWithEvents.createEstimate(data);
// ↑ автоматически отправит ESTIMATE_EVENTS.CREATED
```

**Поддерживаемые методы:**
```javascript
// Сметы
apiWithEvents.createEstimate()   → ESTIMATE_EVENTS.CREATED
apiWithEvents.updateEstimate()   → ESTIMATE_EVENTS.UPDATED
apiWithEvents.deleteEstimate()   → ESTIMATE_EVENTS.DELETED

// Проекты
apiWithEvents.createProject()    → PROJECT_EVENTS.CREATED
apiWithEvents.updateProject()    → PROJECT_EVENTS.UPDATED
apiWithEvents.deleteProject()    → PROJECT_EVENTS.DELETED

// Пользователи
apiWithEvents.createUser()       → USER_EVENTS.CREATED
apiWithEvents.updateUser()       → USER_EVENTS.UPDATED
apiWithEvents.deleteUser()       → USER_EVENTS.DELETED
```

### 5. EventBusMonitor.jsx - Мониторинг

**Назначение:** Компонент для отладки и мониторинга системы событий (только в development).

**Возможности:**
- 📊 Статистика активных подписок
- 📝 Лог событий в реальном времени
- 🎯 Категоризация событий с цветовой кодировкой
- 🔄 Обновление статистики
- 🧹 Очистка логов

**Использование:**
```javascript
import EventBusMonitor from '../components/EventBusMonitor';

const App = () => {
  const [monitorOpen, setMonitorOpen] = useState(false);
  
  return (
    <>
      {/* Кнопка мониторинга (только в dev) */}
      {process.env.NODE_ENV === 'development' && (
        <Button onClick={() => setMonitorOpen(true)}>
          EventBus Monitor
        </Button>
      )}
      
      <EventBusMonitor 
        open={monitorOpen} 
        onClose={() => setMonitorOpen(false)} 
      />
    </>
  );
};
```

---

## 🚀 Практическое использование

### Настройка в Desktop UI (App.jsx)

```javascript
import React, { useEffect } from 'react';
import eventBus from './utils/EventBus';
import { useEventBusRefresh } from './hooks/useEventBus';
import { ESTIMATE_EVENTS } from './utils/EventTypes';

const App = () => {
  // Автоматическое обновление списка смет
  useEventBusRefresh(
    [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED, ESTIMATE_EVENTS.DELETED],
    fetchEstimates
  );

  return (
    <div>
      {/* Компоненты приложения */}
    </div>
  );
};
```

### Настройка в Mobile UI (MobileApp.jsx)

```javascript
import React, { useEffect } from 'react';
import { QueryClient } from '@tanstack/react-query';
import eventBus from '../utils/EventBus';

const MobileApp = () => {
  const queryClient = new QueryClient();

  useEffect(() => {
    // Подключаем QueryClient к Event Bus для автоматической инвалидации
    eventBus.setQueryClient(queryClient);
    
    return () => {
      eventBus.setQueryClient(null);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Мобильные компоненты */}
    </QueryClientProvider>
  );
};
```

### Использование в компонентах

#### EstimatesList.jsx (Desktop)
```javascript
import React, { useState, useEffect } from 'react';
import { useEventBusRefresh } from '../hooks/useEventBus';
import { apiWithEvents } from '../api/apiWithEvents';
import { ESTIMATE_EVENTS } from '../utils/EventTypes';

const EstimatesList = () => {
  const [estimates, setEstimates] = useState([]);

  const fetchEstimates = useCallback(async () => {
    const data = await api.getEstimates();
    setEstimates(data);
  }, []);

  // Автоматическое обновление при событиях
  useEventBusRefresh(
    [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED], 
    fetchEstimates
  );

  const handleCreate = async (estimateData) => {
    // Используем API с событиями
    await apiWithEvents.createEstimate(estimateData);
    // Событие отправится автоматически, UI обновится
  };

  return (
    <div>
      {estimates.map(estimate => (
        <EstimateCard key={estimate.id} estimate={estimate} />
      ))}
    </div>
  );
};
```

#### EstimateSummary.jsx (Mobile)
```javascript
import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiWithEvents } from '../../api/apiWithEvents';

const EstimateSummary = () => {
  const queryClient = useQueryClient();

  // Обычный React Query
  const { data: estimates } = useQuery({
    queryKey: ['estimates'],
    queryFn: api.getEstimates
  });

  // Мутация с автоматическими событиями
  const createMutation = useMutation({
    mutationFn: apiWithEvents.createEstimate, // ← используем версию с событиями
    onSuccess: () => {
      // Event Bus автоматически инвалидирует нужные кэши
      // Ручная инвалидация не нужна!
    }
  });

  return (
    <div>
      {/* UI компонента */}
    </div>
  );
};
```

---

## 🔄 Workflow синхронизации

### Создание сметы

```
1. Пользователь создает смету в любом UI
   ↓
2. apiWithEvents.createEstimate(data)
   ↓
3. HTTP запрос → сервер → успешный ответ
   ↓
4. EventBus.emit(ESTIMATE_EVENTS.CREATED, eventData)
   ↓
5. Desktop UI: useEventBusRefresh → fetchEstimates()
   Mobile UI:   queryClient.invalidateQueries(['estimates'])
   ↓
6. Оба интерфейса обновляются автоматически
```

### Редактирование сметы

```
1. Изменение сметы в мобильном UI
   ↓
2. React Query mutation с apiWithEvents.updateEstimate()
   ↓
3. EventBus.emit(ESTIMATE_EVENTS.UPDATED)
   ↓
4. Desktop UI получает событие → обновляет список
   Mobile UI:  кэши инвалидируются → UI обновляется
   ↓
5. Синхронизация завершена
```

### Межролевая синхронизация

```
Менеджер создает смету → Event Bus → Прораб видит новую смету
Прораб редактирует смету → Event Bus → Менеджер видит изменения
```

---

## ⚙️ Конфигурация и настройка

### Маппинг событий на кэши React Query

Настройка в `EventBus.js`:
```javascript
const queryKeyMap = {
  'estimate.created': ['estimates', 'projects'], // инвалидировать оба кэша
  'estimate.updated': ['estimates', 'projects'],
  'estimate.deleted': ['estimates', 'projects'],
  'project.created': ['projects'],
  'project.updated': ['projects'],
  'user.created': ['users'],
  // ... другие маппинги
};
```

### Добавление нового типа событий

1. **Определить в EventTypes.js:**
```javascript
export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
  READ: 'notification.read',
  CLEARED: 'notification.cleared'
};
```

2. **Добавить в маппинг кэшей:**
```javascript
// В EventBus.js
const queryKeyMap = {
  // ... существующие
  'notification.created': ['notifications'],
  'notification.read': ['notifications'],
};
```

3. **Создать API обертку:**
```javascript
// В apiWithEvents.js
createNotification: createEventWrapper(
  api.createNotification,
  NOTIFICATION_EVENTS.CREATED,
  (result) => ({ notification: result })
),
```

4. **Использовать в компонентах:**
```javascript
useEventBusListener(NOTIFICATION_EVENTS.CREATED, handleNewNotification);
```

---

## 🐛 Отладка и мониторинг

### Console логи (Development)

Система автоматически выводит подробные логи в development режиме:

```javascript
🚌 EventBus инициализирован
🚌 QueryClient подключен к EventBus
🚌 Подписка добавлена: estimate.created -> listener_123
🚌 Отправка события: estimate.created
🚌 Событие обработано: estimate.created -> listener_123
🚌 Инвалидирован кэш: estimates для события estimate.created
```

### EventBusMonitor компонент

Для запуска мониторинга в development:

```javascript
// Добавить в любой компонент
{process.env.NODE_ENV === 'development' && (
  <Button onClick={() => setMonitorOpen(true)}>
    EventBus Monitor
  </Button>
)}

<EventBusMonitor open={monitorOpen} onClose={() => setMonitorOpen(false)} />
```

**Мониторинг показывает:**
- 📊 Количество типов событий и активных подписок
- 📝 Лог событий в реальном времени с категориями
- 🎯 Источник событий (mobile/desktop)
- 📱 Данные каждого события (truncated)

### Проблемы и решения

**Проблема:** События не доходят до слушателей
```javascript
// Проверить валидацию типов событий
console.log(isValidEventType('my.event')); // должно быть true

// Проверить активные подписки
console.log(eventBus.getStats());
```

**Проблема:** Кэши не инвалидируются в мобильном UI
```javascript
// Убедиться что QueryClient подключен
useEffect(() => {
  eventBus.setQueryClient(queryClient);
}, [queryClient]);
```

**Проблема:** Duplicate events
```javascript
// Используйте уникальные listenerId для предотвращения дубликатов
useEventBusListener(
  ESTIMATE_EVENTS.CREATED, 
  callback,
  [],
  { listenerId: 'unique-listener-id' }
);
```

---

## 📊 Метрики и производительность

### Мониторинг производительности

Система предоставляет метрики через `eventBus.getStats()`:

```javascript
{
  totalEventTypes: 12,        // всего типов событий
  totalSubscriptions: 25,     // активных подписок
  eventTypes: {
    'estimate.created': 5,    // подписок на конкретные события
    'project.updated': 3,
    // ...
  }
}
```

### Рекомендации по производительности

1. **Ограничивайте количество слушателей** - используйте уникальные listenerId
2. **Используйте debounce** в useEventBusRefresh для частых событий
3. **Очищайте логи** в EventBusMonitor периодически
4. **Мемоизируйте callback'и** - используйте deps в useEventBusListener

---

## 🔮 Будущие расширения

### Планируемые функции

1. **WebSocket интеграция** - real-time события между пользователями
2. **Event persistence** - сохранение событий в localStorage
3. **Event replay** - воспроизведение последовательности событий
4. **Cross-tab synchronization** - синхронизация между вкладками
5. **Event batching** - группировка событий для оптимизации

### Архитектурные улучшения

1. **TypeScript поддержка** - полная типизация событий
2. **Event middleware** - обработка событий до отправки
3. **Conditional events** - события с условиями
4. **Event priority** - приоритизация обработки событий

---

## 📖 Примеры использования

### Пример 1: Уведомления о новых сметах

```javascript
// NotificationSystem.jsx
import { useEventBusListener } from '../hooks/useEventBus';
import { ESTIMATE_EVENTS } from '../utils/EventTypes';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  useEventBusListener(ESTIMATE_EVENTS.CREATED, (eventData) => {
    const newNotification = {
      id: Date.now(),
      message: `Создана новая смета: ${eventData.data.estimate.estimate_number}`,
      timestamp: new Date(),
      type: 'success'
    };
    
    setNotifications(prev => [...prev, newNotification]);
  });

  return (
    <div className="notifications">
      {notifications.map(notification => (
        <div key={notification.id} className="notification">
          {notification.message}
        </div>
      ))}
    </div>
  );
};
```

### Пример 2: Статистика в реальном времени

```javascript
// DashboardStats.jsx
import { useEventBusListener } from '../hooks/useEventBus';
import { ESTIMATE_EVENTS, PROJECT_EVENTS } from '../utils/EventTypes';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalEstimates: 0,
    totalProjects: 0,
    recentActivity: []
  });

  useEventBusListener(
    [ESTIMATE_EVENTS.CREATED, PROJECT_EVENTS.CREATED],
    (eventData) => {
      setStats(prev => ({
        ...prev,
        totalEstimates: eventData.type.includes('estimate') 
          ? prev.totalEstimates + 1 
          : prev.totalEstimates,
        totalProjects: eventData.type.includes('project')
          ? prev.totalProjects + 1 
          : prev.totalProjects,
        recentActivity: [
          { type: eventData.type, timestamp: new Date() },
          ...prev.recentActivity.slice(0, 9)
        ]
      }));
    }
  );

  return (
    <div className="dashboard-stats">
      <div>Всего смет: {stats.totalEstimates}</div>
      <div>Всего проектов: {stats.totalProjects}</div>
      {/* Recent activity */}
    </div>
  );
};
```

### Пример 3: Кросс-компонентная синхронизация

```javascript
// SearchComponent.jsx - отправляет события поиска
const SearchComponent = () => {
  const emit = useEventBusEmitter();

  const handleSearch = (query) => {
    emit('search.performed', { query, timestamp: Date.now() });
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
};

// ResultsComponent.jsx - слушает события поиска  
const ResultsComponent = () => {
  const [results, setResults] = useState([]);

  useEventBusListener('search.performed', (eventData) => {
    // Обновляем результаты на основе нового поиска
    fetchResults(eventData.data.query).then(setResults);
  });

  return (
    <div>
      {results.map(result => <div key={result.id}>{result.name}</div>)}
    </div>
  );
};
```

---

## ✅ Заключение

Система Event Bus обеспечивает:

- **🔄 Автоматическую синхронизацию** между мобильным и desktop UI
- **⚡ Мгновенное обновление** данных при изменениях
- **🛡️ Type-safe события** с валидацией
- **📊 Мониторинг и отладку** в development режиме
- **🚀 Легкую расширяемость** для новых типов событий

Система полностью интегрирована и готова к использованию. Любые изменения в сметах, проектах или пользователях автоматически отражаются во всех интерфейсах без необходимости ручного обновления.

---

## 📞 Техническая поддержка

При возникновении проблем:

1. **Проверьте console логи** в development режиме
2. **Используйте EventBusMonitor** для отладки событий
3. **Валидируйте типы событий** через `isValidEventType()`
4. **Проверьте stats** через `eventBus.getStats()`

**Дата создания:** 24 августа 2025  
**Версия:** 1.0.0  
**Статус:** Готово к использованию ✅