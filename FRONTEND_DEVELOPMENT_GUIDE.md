# Руководство по разработке фронтенда
## Сервис строительных смет

### Обзор текущего состояния

Фронтенд приложения представляет собой React-приложение с Material-UI компонентами в темной теме. Приложение состоит из двух основных страниц: список смет и редактор смет.

---

## Структура проекта

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── TransferList.jsx          # Компонент выбора категорий
│   ├── pages/
│   │   ├── EstimatesList.jsx         # Страница списка смет
│   │   └── EstimateEditor.jsx        # Страница редактирования сметы
│   ├── App.jsx                       # Главный компонент приложения
│   └── main.jsx                      # Точка входа
├── package.json
├── vite.config.js
└── README.md
```

---

## Технологический стек

- **React 18** - основной фреймворк
- **Material-UI 5** - компонентная библиотека
- **Bootstrap 5** - дополнительные стили
- **Vite** - сборщик и dev-сервер
- **React Router DOM** - навигация (не используется, навигация через состояние)

---

## Состояние данных

### Моковые данные

#### Строительные объекты
```javascript
const mockObjects = [
  { id: 1, name: 'Жилой комплекс "Солнечный"' },
  { id: 2, name: 'Офисное здание "Бизнес-центр"' },
  { id: 3, name: 'Торговый центр "Арена"' },
  { id: 4, name: 'Складской комплекс "Логистика+"' }
]
```

#### Сметы
```javascript
const mockEstimates = [
  {
    id: 1,
    objectId: 1,
    name: 'Фундаментные работы',
    status: 'В работе',          // 'Черновик', 'В работе', 'На согласование'
    createdDate: '2024-01-15',
    totalAmount: 1250000,
    currency: 'грн.'
  }
]
```

#### Категории работ
```javascript
const mockCategories = [
  { id: 1, name: 'Земляные работы' },
  { id: 2, name: 'Фундаментные работы' },
  { id: 3, name: 'Каменные работы' },
  { id: 7, name: 'Отделочные работы' }
  // ... и другие
]
```

#### Работы по категориям
```javascript
const mockWorks = {
  1: [
    { 
      id: 11, 
      name: 'Разработка грунта экскаватором', 
      unit: 'м³', 
      price: 450, 
      popular: true    // флаг популярности для быстрого доступа
    }
  ]
}
```

---

## Компоненты и их функциональность

### App.jsx
**Главный компонент приложения**

- Управляет навигацией между страницами через локальное состояние
- Содержит темную тему Material-UI
- Передает колбэки для навигации

**Состояние:**
```javascript
const [currentPage, setCurrentPage] = useState('list')
const [selectedEstimate, setSelectedEstimate] = useState(null)
```

**Колбэки:**
- `handleCreateEstimate()` - переход к созданию сметы
- `handleEditEstimate(estimate)` - переход к редактированию сметы
- `handleBackToList()` - возврат к списку

### EstimatesList.jsx
**Страница списка смет**

**Основная функциональность:**
- Выпадающий список объектов для фильтрации
- Таблица смет с информацией: название, статус, дата, сумма
- Кнопки создания новой сметы
- Адаптивный дизайн

**Состояние:**
```javascript
const [selectedObjectId, setSelectedObjectId] = useState('')
```

**Ключевые функции:**
- `getStatusColor(status)` - определение цвета статуса
- `formatAmount(amount, currency)` - форматирование суммы

**Props:**
- `onCreateEstimate` - колбэк создания сметы
- `onEditEstimate` - колбэк редактирования сметы

### EstimateEditor.jsx
**Страница создания/редактирования сметы**

**Основная функциональность:**
- Форма с названием сметы и выбором статуса
- Система выбора категорий работ
- Аккордеон с категориями работ
- Поиск работ с автозаполнением
- Кнопки популярных работ
- Таблица выбранных работ с расчетом
- Итоговая сводка всех работ
- Экспорт в текстовый файл

**Состояние:**
```javascript
const [estimateName, setEstimateName] = useState('')
const [estimateStatus, setEstimateStatus] = useState('Черновик')
const [selectedCategories, setSelectedCategories] = useState([])
const [estimateItems, setEstimateItems] = useState([])
const [autocompleteKeys, setAutocompleteKeys] = useState({})]
```

**Ключевые функции:**
- `handleAddWork(categoryId, work)` - добавление работы в смету
- `handleQuantityChange(itemId, quantity)` - изменение количества
- `handleRemoveWork(itemId)` - удаление работы
- `handleExport()` - экспорт сметы в файл
- `getCategoryTotal(categoryId)` - расчет суммы по категории
- `getTotalEstimate()` - расчет общей суммы
- `getStatusColor(status)` - цвет статуса

**Props:**
- `estimate` - данные редактируемой сметы (null для новой)
- `onBack` - колбэк возврата к списку

### TransferList.jsx
**Компонент выбора категорий**

Используется в диалоге выбора категорий. Позволяет перемещать элементы между списками доступных и выбранных категорий.

---

## Темная тема

Приложение использует темную тему Material-UI:

```javascript
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
})
```

---

## API интеграция (TODO)

### Текущее состояние
Все данные захардкожены в компонентах. Для интеграции с бэкендом необходимо:

1. **Создать API клиент**
```javascript
// api/client.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1'

export const api = {
  // Объекты
  getObjects: () => fetch(`${API_BASE_URL}/objects`),
  
  // Сметы
  getEstimates: (objectId) => fetch(`${API_BASE_URL}/estimates/object/${objectId}`),
  createEstimate: (data) => fetch(`${API_BASE_URL}/estimates`, { method: 'POST', body: JSON.stringify(data) }),
  updateEstimate: (id, data) => fetch(`${API_BASE_URL}/estimates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  // Работы
  getWorksByCategory: (categoryId) => fetch(`${API_BASE_URL}/works/category/${categoryId}`),
  getPopularWorks: (categoryId) => fetch(`${API_BASE_URL}/works/popular/${categoryId}`),
  
  // Категории
  getCategories: () => fetch(`${API_BASE_URL}/categories`),
}
```

2. **Добавить состояние загрузки**
```javascript
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

3. **Заменить моковые данные на API вызовы**
```javascript
useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await api.getObjects()
      const data = await response.json()
      setObjects(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

---

## Управление состоянием

### Текущий подход
Использует локальное состояние компонентов через `useState` и `useEffect`.

### Рекомендации для масштабирования
1. **React Context** для глобального состояния
2. **React Query/SWR** для кеширования данных API
3. **Zustand/Redux** для сложной логики состояния

---

## Валидация форм

### Текущее состояние
Базовая валидация на уровне HTML5 и условная отрисовка кнопок.

### Рекомендации
1. Добавить **Formik** или **React Hook Form**
2. Схемы валидации с **Yup** или **Zod**
3. Отображение ошибок валидации

```javascript
// Пример с React Hook Form
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const schema = yup.object({
  estimateName: yup.string().required('Название обязательно').min(3, 'Минимум 3 символа'),
  estimateStatus: yup.string().required('Статус обязателен')
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(schema)
})
```

---

## Оптимизация производительности

### Текущие проблемы
1. Ререндеринг всего списка при изменениях
2. Отсутствие мемоизации вычислений
3. Пересоздание объектов в render

### Рекомендации
```javascript
// Мемоизация вычислений
const totalAmount = useMemo(() => {
  return estimateItems.reduce((sum, item) => sum + item.total, 0)
}, [estimateItems])

// Мемоизация компонентов
const WorkItem = React.memo(({ work, onAdd }) => {
  return <Button onClick={() => onAdd(work)}>{work.name}</Button>
})

// Стабильные колбэки
const handleAddWork = useCallback((categoryId, work) => {
  setEstimateItems(prev => [...prev, { ...work, categoryId }])
}, [])
```

---

## Тестирование (TODO)

### Рекомендуемая структура
```
src/
├── __tests__/
│   ├── components/
│   │   └── TransferList.test.jsx
│   ├── pages/
│   │   ├── EstimatesList.test.jsx
│   │   └── EstimateEditor.test.jsx
│   └── App.test.jsx
├── __mocks__/
│   ├── api.js
│   └── mockData.js
└── test-utils.js
```

### Инструменты
- **Jest** - тест раннер
- **React Testing Library** - тестирование компонентов
- **MSW** - мокинг API
- **Cypress** - E2E тестирование

---

## Развертывание

### Development
```bash
npm run dev        # Запуск на http://localhost:3003
```

### Production
```bash
npm run build      # Сборка в папку dist/
npm run preview    # Предпросмотр продакшен сборки
```

### Environment variables
```bash
# .env
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME="Сервис строительных смет"
```

---

## Планы развития

### Краткосрочные задачи
1. ✅ Добавить смену статуса сметы
2. ✅ Убрать счетчик работ в категориях
3. 🔄 Интеграция с backend API
4. 🔄 Добавить загрузочные состояния
5. 🔄 Обработка ошибок

### Долгосрочные задачи
1. Добавить аутентификацию
2. Система ролей и прав доступа
3. Более сложные форматы экспорта (PDF, Excel)
4. Система уведомлений
5. Офлайн режим с синхронизацией
6. Мобильное приложение

---

## Часто встречающиеся проблемы

### Проблема: Поле поиска не очищается
**Решение:** Использован ключ компонента для принудительного ререндера
```javascript
<Autocomplete key={autocompleteKeys[category.id] || 0} />
```

### Проблема: Медленная отрисовка больших списков
**Решение:** Виртуализация с react-window
```javascript
import { FixedSizeList as List } from 'react-window'
```

### Проблема: Состояние теряется при переключении страниц
**Решение:** Поднять состояние в App.jsx или использовать глобальное состояние

---

## Полезные команды

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Проверка линтера
npm run lint

# Форматирование кода
npm run format

# Анализ bundle размера
npm run analyze

# Обновление зависимостей
npm update

# Проверка безопасности
npm audit
```

---

## Контакты и ресурсы

- **Material-UI документация:** https://mui.com/
- **React документация:** https://react.dev/
- **Vite документация:** https://vitejs.dev/

Этот документ должен помочь любому разработчику быстро разобраться в текущем состоянии фронтенда и продолжить разработку.