# Event Bus - Руководство по использованию

## Обзор

Система Event Bus предоставляет универсальный механизм для синхронизации данных между мобильным и desktop интерфейсами. Она автоматически управляет кэшами React Query и обеспечивает реактивное обновление UI при изменении данных.

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop UI    │    │   Event Bus     │    │   Mobile UI     │
│                 │    │                 │    │                 │
│ - React State   │◄──►│ - Подписки      │◄──►│ - React Query   │
│ - Direct API    │    │ - События       │    │ - Mutations     │
│                 │    │ - Auto-cache    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Основные компоненты

### 1. EventBus (Singleton)
Центральная система управления событиями:
- Подписки/отписки на события
- Автоматическая инвалидация React Query кэшей
- Отладочная информация

### 2. EventTypes
Определения всех типов событий в системе:
- `ESTIMATE_EVENTS` - события смет
- `PROJECT_EVENTS` - события проектов
- `USER_EVENTS` - события пользователей
- И другие категории

### 3. apiWithEvents
Обертка над базовым API клиентом, автоматически отправляющая события.

### 4. Hooks для React
- `useEventBusListener` - подписка на события
- `useEventBusEmitter` - отправка событий
- `useEventBusRefresh` - автообновление при событиях

## Примеры использования

### Desktop UI (App.jsx)

```javascript
import { useEventBusRefresh } from './hooks/useEventBus';
import { ESTIMATE_EVENTS } from './utils/EventTypes';
import apiWithEvents from './api/apiWithEvents';

// Автоматическое обновление при событиях смет
useEventBusRefresh(
  [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED, ESTIMATE_EVENTS.DELETED],
  fetchData,  // функция обновления данных
  [currentUser],
  { enabled: !!currentUser, debounce: true }
);

// Использование API с событиями
const handleSaveEstimate = async (estimateData) => {
  await apiWithEvents.createEstimate(estimateData); // Автоматически отправит событие
};
```

### Mobile UI

```javascript
import { useCreateEstimateWithEvents } from '../utils/mobileApiWithEvents';

const CreateEstimateScreen = () => {
  const createEstimate = useCreateEstimateWithEvents();

  const handleSubmit = async (data) => {
    try {
      await createEstimate.mutateAsync(data); 
      // Событие отправится автоматически, кэши обновятся
    } catch (error) {
      console.error('Ошибка создания сметы:', error);
    }
  };
};
```

### Пользовательская подписка на события

```javascript
import { useEventBusListener } from '../hooks/useEventBus';
import { ESTIMATE_EVENTS } from '../utils/EventTypes';

const MyComponent = () => {
  // Подписка на события смет
  useEventBusListener(
    [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED],
    (eventData) => {
      console.log('Смета изменена:', eventData);
      // Пользовательская логика
    },
    [], // зависимости
    { enabled: true }
  );
};
```

### Отправка пользовательских событий

```javascript
import { useEventBusEmitter } from '../hooks/useEventBus';
import { ESTIMATE_EVENTS, createEvent } from '../utils/EventTypes';

const MyComponent = () => {
  const emit = useEventBusEmitter();

  const handleCustomAction = () => {
    const event = createEvent(
      ESTIMATE_EVENTS.STATUS_CHANGED,
      { estimateId: 123, newStatus: 'В работе' },
      { source: 'mobile', userId: currentUser.id }
    );
    
    emit(ESTIMATE_EVENTS.STATUS_CHANGED, event);
  };
};
```

## Типы событий

### События смет
- `ESTIMATE_EVENTS.CREATED` - смета создана
- `ESTIMATE_EVENTS.UPDATED` - смета обновлена
- `ESTIMATE_EVENTS.DELETED` - смета удалена
- `ESTIMATE_EVENTS.ITEM_ADDED` - добавлен элемент сметы

### События проектов
- `PROJECT_EVENTS.CREATED` - проект создан
- `PROJECT_EVENTS.UPDATED` - проект обновлен
- `PROJECT_EVENTS.DELETED` - проект удален

### Системные события
- `SYSTEM_EVENTS.CONNECTION_LOST` - потеря соединения
- `SYSTEM_EVENTS.CONNECTION_RESTORED` - восстановление соединения

## Автоматическая инвалидация кэшей

Event Bus автоматически инвалидирует соответствующие кэши React Query:

```javascript
// При событии 'estimate.created' автоматически инвалидируются:
queryClient.invalidateQueries(['estimates']);
queryClient.invalidateQueries(['projects']);

// При событии 'project.updated' автоматически инвалидируются:
queryClient.invalidateQueries(['projects']);
```

## Отладка и мониторинг

### Event Bus Monitor (только для разработки)
Доступен через кнопку "EventBus" в шапке приложения в режиме разработки.

Показывает:
- Статистику активных подписок
- Лог событий в реальном времени
- Информацию о категориях событий

### Консольные логи
В режиме разработки Event Bus выводит подробную информацию:
```
🚌 EventBus инициализирован
🚌 Подписка добавлена: estimate.created -> listener_123
🚌 Отправка события: estimate.created
🚌 Инвалидирован кэш: estimates для события estimate.created
```

## Best Practices

### 1. Используйте типизированные события
```javascript
// ✅ Хорошо
import { ESTIMATE_EVENTS } from '../utils/EventTypes';
emit(ESTIMATE_EVENTS.CREATED, data);

// ❌ Плохо
emit('estimate_created', data);
```

### 2. Включайте debounce для частых событий
```javascript
useEventBusRefresh(
  [ESTIMATE_EVENTS.ITEM_UPDATED],
  updateFunction,
  [dependencies],
  { debounce: true, delay: 300 }
);
```

### 3. Отписывайтесь от событий
```javascript
// Hooks автоматически отписываются при размонтировании
// Для ручной отписки:
useEffect(() => {
  const listenerId = eventBus.subscribe(eventType, id, callback);
  return () => eventBus.unsubscribe(eventType, listenerId);
}, []);
```

### 4. Обрабатывайте ошибки
```javascript
const createEstimate = useCreateEstimateWithEvents();

try {
  await createEstimate.mutateAsync(data);
} catch (error) {
  // Обработка ошибки
  console.error('Ошибка создания сметы:', error);
}
```

## Расширение системы

### Добавление новых событий

1. Добавить в `EventTypes.js`:
```javascript
export const NEW_FEATURE_EVENTS = {
  CREATED: 'newFeature.created',
  UPDATED: 'newFeature.updated'
};
```

2. Обновить маппинг в `EventBus.js`:
```javascript
const queryKeyMap = {
  'newFeature.created': ['newFeatures'],
  'newFeature.updated': ['newFeatures']
};
```

3. Добавить в API wrapper:
```javascript
createNewFeature: createEventWrapper(
  api.createNewFeature,
  NEW_FEATURE_EVENTS.CREATED,
  (result) => ({ feature: result })
)
```

### Добавление пользовательских слушателей

```javascript
// В компоненте
useEventBusListener(
  'newFeature.created',
  (eventData) => {
    // Пользовательская логика
  },
  [dependencies]
);
```

## Производительность

- События обрабатываются синхронно
- Debounce предотвращает избыточные обновления
- Автоматическая очистка подписок предотвращает утечки памяти
- Кэши инвалидируются точечно по типу события

## Troubleshooting

### События не срабатывают
1. Проверьте правильность типа события
2. Убедитесь что EventBus подключен к QueryClient
3. Проверьте включен ли слушатель (enabled: true)

### Избыточные обновления
1. Используйте debounce для частых событий
2. Проверьте зависимости в useEventBusRefresh
3. Рассмотрите более специфичные события

### Утечки памяти
1. Убедитесь что используете hooks (автоматическая отписка)
2. Для ручных подписок обязательно вызывайте unsubscribe
3. Проверьте что зависимости в useCallback корректны