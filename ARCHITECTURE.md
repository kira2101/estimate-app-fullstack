# СИСТЕМА УПРАВЛЕНИЯ СТРОИТЕЛЬНЫМИ СМЕТАМИ - АРХИТЕКТУРНАЯ ДОКУМЕНТАЦИЯ

## ОБЗОР СИСТЕМЫ

Полнофункциональная система управления строительными сметами с ролевым разделением доступа, состоящая из:
- **Backend**: Django REST Framework с PostgreSQL/SQLite
- **Frontend**: React 19 с Material-UI 7 (десктоп)
- **Mobile UI**: React с touch-оптимизированным интерфейсом (только для прорабов)
- **Аутентификация**: Custom token-based с UUID токенами
- **Роли**: Менеджер (полный доступ) и Прораб (ограниченный доступ)

---

## 1. АРХИТЕКТУРА БАЗЫ ДАННЫХ

### 1.1 ОСНОВНЫЕ СУЩНОСТИ

#### Пользователи и роли
```sql
AuthToken:
- token (UUID, PK)
- user (OneToOne -> User)
- created_at (DateTime)

Role:
- role_id (AutoField, PK)
- role_name (CharField, unique) -- "менеджер", "прораб"

User:
- user_id (AutoField, PK)
- email (EmailField, unique)
- full_name (CharField)
- password_hash (CharField)
- role (ForeignKey -> Role)
```

#### Проекты и назначения
```sql
Client:
- client_id (AutoField, PK)
- client_name (CharField)
- client_phone (CharField, optional)

Project:
- project_id (AutoField, PK)
- project_name (CharField)
- address (TextField, optional)
- client (ForeignKey -> Client, optional)

ProjectAssignment:
- user (ForeignKey -> User)
- project (ForeignKey -> Project)
- Unique constraint: (user, project)
```

#### Работы и категории
```sql
WorkCategory:
- category_id (AutoField, PK)
- category_name (CharField, unique)

WorkType:
- work_type_id (AutoField, PK)
- category (ForeignKey -> WorkCategory)
- work_name (CharField, unique)
- unit_of_measurement (CharField)
- usage_count (IntegerField, default=0)

WorkPrice:
- price_id (AutoField, PK)
- work_type (OneToOne -> WorkType)
- cost_price (DecimalField)
- client_price (DecimalField)
- updated_at (DateTime)
```

#### Сметы
```sql
Status:
- status_id (AutoField, PK)
- status_name (CharField, unique) -- "Черновик", "В работе", "Утверждена"

Estimate:
- estimate_id (AutoField, PK)
- estimate_number (CharField, optional)
- status (ForeignKey -> Status)
- project (ForeignKey -> Project)
- creator (ForeignKey -> User, related_name='created_estimates')
- approver (ForeignKey -> User, related_name='approved_estimates', optional)
- foreman (ForeignKey -> User, related_name='managed_estimates', optional)
- client (ForeignKey -> Client, optional)
- created_at (DateTime)

EstimateItem:
- item_id (AutoField, PK)
- estimate (ForeignKey -> Estimate, related_name='items')
- work_type (ForeignKey -> WorkType)
- quantity (DecimalField)
- cost_price_per_unit (DecimalField)
- client_price_per_unit (DecimalField)
```

#### Запросы на изменение цен
```sql
PriceChangeRequest:
- request_id (AutoField, PK)
- estimate_item (ForeignKey -> EstimateItem)
- requester (ForeignKey -> User, related_name='price_requests')
- requested_price (DecimalField)
- comment (TextField, optional)
- status (ForeignKey -> Status)
- reviewer (ForeignKey -> User, related_name='reviewed_requests', optional)
- reviewed_at (DateTime, optional)
```

### 1.2 МАТЕРИАЛЫ (БУДУЩАЯ ФУНКЦИОНАЛЬНОСТЬ)
```sql
MaterialCategory, MaterialType, MaterialPrice, WorkMaterialRequirement, EstimateMaterialItem
-- Полная структура в models.py
```

### 1.3 АУДИТ И БЕЗОПАСНОСТЬ
- **django-auditlog**: автоматическое логирование изменений
- **Модели с аудитом**: User, Estimate, EstimateItem, PriceChangeRequest, Project, ProjectAssignment
- **Исключения**: password_hash не логируется

---

## 2. API АРХИТЕКТУРА

### 2.1 БАЗОВЫЕ ENDPOINT'Ы

#### Аутентификация
```
POST /api/v1/auth/login/
- Body: {email, password}
- Response: {token: UUID, user: UserData}

GET /api/v1/auth/me/
- Headers: Authorization: Bearer <token>
- Response: UserData
```

#### Главные ресурсы
```
GET /api/v1/projects/          # Проекты (фильтруется по роли)
GET /api/v1/estimates/         # Сметы (фильтруется по роли) 
GET /api/v1/work-categories/   # Категории работ
GET /api/v1/work-types/        # Типы работ с пагинацией
GET /api/v1/statuses/          # Статусы смет
GET /api/v1/users/             # Пользователи (только менеджеры)
GET /api/v1/roles/             # Роли (только менеджеры)
```

#### Управление сметами
```
POST /api/v1/estimates/                    # Создание сметы
PUT /api/v1/estimates/{id}/                # Обновление сметы
GET /api/v1/estimates/{id}/                # Детали сметы
DELETE /api/v1/estimates/{id}/             # Удаление (только менеджеры)

GET /api/v1/estimate-items/?estimate={id}  # Позиции сметы
POST /api/v1/estimate-items/               # Добавление позиции
PUT /api/v1/estimate-items/{id}/           # Обновление позиции
DELETE /api/v1/estimate-items/{id}/        # Удаление позиции
```

#### Экспорт смет
```
GET /api/v1/estimates/{id}/export/client/    # Экспорт для клиента (без себестоимости)
GET /api/v1/estimates/{id}/export/internal/  # Внутренний экспорт (полные данные)
```

#### Импорт данных
```
POST /api/v1/work-types/import/  # Импорт работ из Excel (только менеджеры)
```

### 2.2 РОЛЕВАЯ БЕЗОПАСНОСТЬ

#### Менеджеры (role_name = "менеджер"):
- **Полный доступ** ко всем проектам и сметам
- **CRUD операции** со всеми ресурсами
- **Импорт/экспорт** данных
- **Управление пользователями** и назначениями

#### Прорабы (role_name = "прораб"):
- **Ограниченный доступ** только к назначенным проектам
- **Просмотр и создание** смет только по своим проектам
- **Редактирование** только тех смет, где они назначены прорабом
- **Нет доступа** к управлению пользователями

### 2.3 ФИЛЬТРАЦИЯ ДАННЫХ В VIEWSETS

```python
def get_queryset(self):
    user = self.request.user
    if user.role.role_name != 'менеджер':
        # Прораб видит только свои проекты/сметы
        return self.queryset.filter(foreman=user)  # для смет
        return self.queryset.filter(projectassignment__user=user)  # для проектов
    return self.queryset.all()  # менеджер видит все
```

---

## 3. МОБИЛЬНЫЙ UI - АРХИТЕКТУРА И АЛГОРИТМЫ

### 3.1 АКТИВАЦИЯ И ОПРЕДЕЛЕНИЕ УСТРОЙСТВА

```javascript
// MobileDetector.jsx
const isMobile = () => {
  // 1. User agent проверка
  const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 2. Размер экрана
  const screenSize = window.innerWidth <= 768;
  
  // 3. Поддержка touch
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return userAgent || (screenSize && touchSupport);
};

// УСЛОВИЯ АКТИВАЦИИ:
// if (isMobile() && currentUser.role === "прораб") {
//   return <MobileApp />; // мобильный интерфейс
// } else {
//   return children; // обычный desktop интерфейс
// }
```

### 3.2 СТРУКТУРА МОБИЛЬНЫХ КОМПОНЕНТОВ

```
/src/mobile/
├── MobileDetector.jsx        # Детектор мобильных устройств
├── MobileApp.jsx             # Главное приложение с React Query
├── MobileLayout.jsx          # Лейаут с хедером и навигацией
├── MobileRouter.jsx          # Маршрутизация между экранами
├── MobileLayout.css          # Единые стили (2100+ строк)
│
├── components/
│   ├── navigation/
│   │   ├── BottomNav.jsx     # Нижняя навигация (5 разделов)
│   │   └── MobileHeader.jsx  # Верхний хедер с названием экрана
│   └── ui/
│       ├── EstimateCard.jsx  # Универсальная карточка сметы
│       ├── ProjectCard.jsx   # Карточка проекта
│       ├── CategoryCard.jsx  # Карточка категории работ
│       ├── WorkCard.jsx      # Карточка работы с чекбоксом
│       ├── LoadingSpinner.jsx # Индикатор загрузки
│       └── ErrorMessage.jsx  # Сообщения об ошибках
│
├── pages/
│   ├── ProjectsList.jsx      # Список проектов
│   ├── ProjectInfo.jsx       # Информация о проекте + сметы
│   ├── AllEstimates.jsx      # Все сметы с фильтрацией
│   ├── WorkCategories.jsx    # Категории работ
│   ├── WorkSelection.jsx     # Выбор работ с количеством
│   ├── EstimateSummary.jsx   # Редактор сметы с таблицей работ
│   ├── FinanceOverview.jsx   # Финансовый обзор
│   └── ProfileInfo.jsx       # Профиль пользователя
│
├── context/
│   └── MobileNavigationContext.jsx  # Навигационное состояние
├── hooks/
│   └── useMobileNavigation.js       # Хук для навигации
└── utils/
    └── dataUtils.js          # Утилиты для работы с данными
```

### 3.3 АЛГОРИТМ НАВИГАЦИИ

#### 3.3.1 Состояние навигации
```javascript
// MobileNavigationContext.jsx
const [navState, setNavState] = useState({
  currentScreen: 'projects',  // активный экран
  
  // Контекстные данные для передачи между экранами
  selectedProject: null,      // выбранный проект
  selectedCategory: null,     // выбранная категория работ
  selectedWorks: [],          // выбранные работы
  editingEstimate: null,      // редактируемая смета
  
  // История для возврата назад
  navigationHistory: ['projects']
});
```

#### 3.3.2 Workflow создания сметы
```
1. ProjectsList → выбор проекта → сохранение в selectedProject
2. ProjectInfo → кнопка "Создать смету" → переход на WorkCategories
3. WorkCategories → выбор категории → сохранение в selectedCategory → переход на WorkSelection
4. WorkSelection → выбор работ и количества → сохранение в selectedWorks → переход на EstimateSummary
5. EstimateSummary → ввод названия и сохранение → создание сметы через API → возврат на ProjectInfo
```

#### 3.3.3 Workflow редактирования сметы
```
1. ProjectInfo или AllEstimates → нажатие на смету → загрузка данных через API
2. EstimateSummary → отображение существующих работ в таблице
3. Редактирование:
   - Изменение количества (тап на ячейку)
   - Удаление работы (свайп влево)
   - Добавление работ (кнопка "Добавить работы" → WorkCategories)
4. Сохранение → отправка изменений через API
```

### 3.4 АЛГОРИТМЫ РАБОТЫ С ДАННЫМИ

#### 3.4.1 Нормализация данных (dataUtils.js)
```javascript
// Проблема: разные форматы данных от API и мобильного UI
// Решение: универсальная функция normalizeWork()

export const normalizeWork = (work) => {
  return {
    // Уникальный ID для React ключей
    item_id: work.item_id || `new_${work.id}_${Date.now()}_${Math.random()}`,
    
    // Основные поля
    work_type_id: work.id || work.work_type_id,
    work_name: work.name || work.work_name,
    unit_of_measurement: work.unit || work.unit_of_measurement,
    
    // Цены (поддержка разных форматов)
    cost_price_per_unit: parseFloat(work.cost_price || work.prices?.cost_price || 0),
    client_price_per_unit: parseFloat(work.client_price || work.prices?.client_price || 0),
    
    // Количество
    quantity: parseFloat(work.quantity) || 1,
    
    // Расчетные поля
    total_cost: (parseFloat(work.cost_price || 0)) * (parseFloat(work.quantity) || 1),
    total_client: (parseFloat(work.client_price || 0)) * (parseFloat(work.quantity) || 1)
  };
};
```

#### 3.4.2 Объединение массивов работ
```javascript
// Проблема: при добавлении уже существующей работы нужно увеличить количество
// Решение: функция mergeWorksArrays()

export const mergeWorksArrays = (existingWorks = [], newWorks = []) => {
  const result = [...normalizeWorksData(existingWorks)];
  
  normalizeWorksData(newWorks).forEach(newWork => {
    const existingIndex = result.findIndex(existing => 
      existing.work_type_id === newWork.work_type_id
    );
    
    if (existingIndex >= 0) {
      // Работа уже есть - увеличиваем количество
      const oldQuantity = parseFloat(result[existingIndex].quantity) || 1;
      const newQuantity = parseFloat(newWork.quantity) || 1;
      const totalQuantity = oldQuantity + newQuantity;
      
      result[existingIndex] = {
        ...result[existingIndex],
        quantity: totalQuantity,
        total_cost: result[existingIndex].cost_price_per_unit * totalQuantity,
        total_client: result[existingIndex].client_price_per_unit * totalQuantity
      };
    } else {
      // Новая работа - добавляем
      result.push(newWork);
    }
  });
  
  return result;
};
```

### 3.5 REACT QUERY ИНТЕГРАЦИЯ

#### 3.5.1 Ключи запросов
```javascript
// Консистентные ключи для кэширования
const QUERY_KEYS = {
  projects: ['projects'],
  project: (id) => ['project', id],
  projectEstimates: (projectId) => ['estimates', { project: projectId }],
  estimate: (id) => ['estimate', id],
  workCategories: ['work-categories'],
  workTypes: (params) => ['work-types', params],
  allEstimates: (filters) => ['estimates', 'all', filters]
};
```

#### 3.5.2 Мутации для создания/обновления
```javascript
// Создание сметы
const createEstimateMutation = useMutation({
  mutationFn: async (estimateData) => {
    return await api.post('/estimates/', estimateData);
  },
  onSuccess: () => {
    // Инвалидация кэша для обновления списков
    queryClient.invalidateQueries(['projects']);
    queryClient.invalidateQueries(['estimates']);
    navigateTo('project-info'); // возврат к проекту
  }
});

// Обновление сметы
const updateEstimateMutation = useMutation({
  mutationFn: async ({ estimateId, data }) => {
    return await api.put(`/estimates/${estimateId}/`, data);
  },
  onSuccess: (data, { estimateId }) => {
    // Обновление кэша конкретной сметы
    queryClient.setQueryData(['estimate', estimateId], data);
    queryClient.invalidateQueries(['estimates']);
  }
});
```

### 3.6 UI/UX ПАТТЕРНЫ

#### 3.6.1 Touch-оптимизированные элементы
```css
/* Минимальная область касания 48px */
.mobile-btn, .mobile-card, .checkbox {
  min-height: 48px;
  min-width: 48px;
}

/* Активные состояния для feedback */
.mobile-card:active {
  transform: scale(0.98);
  background: rgba(187, 134, 252, 0.05);
}

/* Большие области ввода для мобильных устройств */
.quantity-input-touch {
  height: 48px;
  font-size: 18px;
  text-align: center;
}
```

#### 3.6.2 Материальный дизайн 3
```css
/* Цветовая схема Material Design 3 Dark Theme */
:root {
  --surface: #121212;           /* основной фон */
  --surface-variant: #1E1E1E;   /* карточки */
  --surface-container: #2A2A2A;  /* контейнеры */
  --primary: #BB86FC;           /* акцентный цвет */
  --secondary: #03DAC6;         /* вторичный цвет */
  --on-surface: #FFFFFF;        /* текст на фоне */
  --on-surface-variant: #B0B0B0; /* вторичный текст */
}

/* Градиенты для важных элементов */
.mobile-btn, .project-header, .create-estimate-btn {
  background: linear-gradient(135deg, #BB86FC 0%, #03DAC6 100%);
  color: #000;
}
```

#### 3.6.3 Адаптивная сетка
```css
/* Финансовые карточки - всегда 3 колонки на мобильных */
.finance-cards-grid {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 12px;
}

/* На очень маленьких экранах (≤375px) */
@media (max-width: 375px) {
  .finance-card-item {
    min-height: 65px !important;
    padding: 10px 6px !important;
  }
  
  .finance-card-value {
    font-size: 13px !important;
  }
}
```

### 3.7 ОБРАБОТКА ОШИБОК И СОСТОЯНИЙ ЗАГРУЗКИ

#### 3.7.1 Универсальные компоненты
```javascript
// LoadingSpinner.jsx
const LoadingSpinner = ({ message = "Загрузка..." }) => (
  <div className="mobile-loading">
    <div className="mobile-spinner"></div>
    <span className="loading-message">{message}</span>
  </div>
);

// ErrorMessage.jsx  
const ErrorMessage = ({ error, retry }) => (
  <div className="mobile-error">
    <div className="error-icon">⚠️</div>
    <div className="error-text">
      {error?.message || 'Произошла ошибка'}
    </div>
    {retry && (
      <button className="mobile-btn mobile-btn-sm" onClick={retry}>
        Попробовать еще раз
      </button>
    )}
  </div>
);
```

#### 3.7.2 Паттерны использования в страницах
```javascript
// Стандартный паттерн для страниц с данными
const SomePage = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['some-data'],
    queryFn: () => api.get('/some-endpoint/')
  });

  if (isLoading) return <LoadingSpinner message="Загружаем данные..." />;
  if (error) return <ErrorMessage error={error} retry={refetch} />;
  if (!data?.length) return (
    <div className="mobile-empty">
      <div className="mobile-empty-icon">📭</div>
      <div className="mobile-empty-text">Данные не найдены</div>
    </div>
  );

  return (
    <div className="mobile-screen">
      {/* Основной контент */}
    </div>
  );
};
```

---

## 4. ИНТЕГРАЦИЯ МОБИЛЬНОГО И ДЕСКТОПНОГО UI

### 4.1 ОБЩИЙ API КЛИЕНТ
```javascript
// /frontend/src/api/client.js - единый для всех платформ
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://app.iqbs.pro/api/v1'
  : 'http://127.0.0.1:8000/api/v1';

export const apiClient = {
  get: (url, params) => fetch(`${API_BASE_URL}${url}`, { ...options }),
  post: (url, data) => fetch(`${API_BASE_URL}${url}`, { ...options, body: JSON.stringify(data) }),
  // ... остальные методы
};
```

### 4.2 СОВМЕСТИМОСТЬ ДАННЫХ
```javascript
// Мобильный UI использует те же форматы данных, что и desktop
// Нормализация происходит в dataUtils.js для совместимости

// EstimateSummary.jsx - может принимать данные от:
// 1. Мобильного workflow (selectedWorks из context)
// 2. Desktop EstimateEditor (items из API)
// 3. Редактирования существующей сметы

const initializeEstimateData = () => {
  if (editingEstimate) {
    // Режим редактирования - загружаем из API
    return convertEstimateItemsToWorks(editingEstimate.items);
  } else if (selectedWorks?.length) {
    // Режим создания - используем выбранные работы
    return normalizeWorksData(selectedWorks);
  }
  return [];
};
```

---

## 5. БЕЗОПАСНОСТЬ И АУДИТ

### 5.1 АУТЕНТИФИКАЦИЯ
```python
# CustomTokenAuthentication в api/authentication.py
class CustomTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        try:
            token_uuid = UUID(auth_header.split(' ')[1])
            token = AuthToken.objects.select_related('user__role').get(token=token_uuid)
            return (token.user, token)
        except (ValueError, AuthToken.DoesNotExist):
            raise AuthenticationFailed('Invalid token')
```

### 5.2 РОЛЕВЫЕ РАЗРЕШЕНИЯ
```python
# api/permissions.py
class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role.role_name == 'менеджер'

class CanAccessEstimate(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role.role_name == 'менеджер':
            return True
        return obj.foreman == request.user
```

### 5.3 ЛОГИРОВАНИЕ И МОНИТОРИНГ
```python
# Конфигурация логирования
LOGGING = {
    'loggers': {
        'security': {
            'handlers': ['security_file'],
            'level': 'INFO'
        },
        'audit': {
            'handlers': ['audit_file'], 
            'level': 'INFO'
        }
    }
}

# Примеры логирования в коде
security_logger.warning(f"БЛОКИРОВАН ДОСТУП: Пользователь {user.email} пытался получить доступ к смете {estimate_id}")
audit_logger.info(f"СОЗДАНИЕ СМЕТЫ: Пользователь {user.email} создал смету {estimate.estimate_id}")
```

---

## 6. ПРОИЗВОДИТЕЛЬНОСТЬ И ОПТИМИЗАЦИЯ

### 6.1 БАЗА ДАННЫХ
```python
# Оптимизированные запросы с select_related и prefetch_related
queryset = Estimate.objects.select_related(
    'project', 'creator', 'status', 'foreman'
).prefetch_related('items', 'items__work_type')

# Аннотации для подсчета сумм на уровне БД
.annotate(
    totalAmount=Coalesce(
        Sum(F('items__quantity') * F('items__cost_price_per_unit')),
        Value(0.0)
    )
)
```

### 6.2 ФРОНТЕНД КЭШИРОВАНИЕ
```javascript
// React Query кэширование с инвалидацией
queryClient.setQueryData(['estimate', estimateId], newData);
queryClient.invalidateQueries(['estimates', 'all']);

// Оптимистичные обновления
const mutation = useMutation({
  mutationFn: updateEstimate,
  onMutate: async (newData) => {
    // Отменяем текущие запросы
    await queryClient.cancelQueries(['estimate', id]);
    
    // Сохраняем предыдущие данные для rollback
    const previousData = queryClient.getQueryData(['estimate', id]);
    
    // Оптимистично обновляем
    queryClient.setQueryData(['estimate', id], newData);
    
    return { previousData };
  },
  onError: (err, newData, context) => {
    // Откатываемся при ошибке
    queryClient.setQueryData(['estimate', id], context.previousData);
  }
});
```

### 6.3 МОБИЛЬНАЯ ОПТИМИЗАЦИЯ
```css
/* Аппаратное ускорение анимаций */
.mobile-card, .mobile-btn {
  will-change: transform;
  transform: translateZ(0);
}

/* Отключение анимаций при предпочтении reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Оптимизация прокрутки */
.mobile-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

## 7. РАЗВЕРТЫВАНИЕ И КОНФИГУРАЦИЯ

### 7.1 DOCKER КОНФИГУРАЦИЯ
```yaml
# docker-compose.yml (упрощенно)
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/estimates
      - DEBUG=False
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend  
    environment:
      - REACT_APP_API_URL=http://backend:8000/api/v1
    volumes:
      - ./frontend:/app

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=estimates
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
```

### 7.2 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/estimates
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=app.iqbs.pro,localhost

# Frontend (.env)
REACT_APP_API_URL=https://app.iqbs.pro/api/v1
REACT_APP_ENVIRONMENT=production
```

---

## 8. ТЕСТИРОВАНИЕ

### 8.1 BACKEND ТЕСТЫ
```python
# tests/test_api.py
class EstimateAPITest(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(role='менеджер')
        self.foreman = User.objects.create_user(role='прораб')
        
    def test_foreman_can_only_access_own_estimates(self):
        # Тест ролевого доступа
        pass
        
    def test_estimate_creation_workflow(self):
        # Тест создания сметы
        pass
```

### 8.2 ФРОНТЕНД ТЕСТЫ
```javascript
// tests/mobile/EstimateSummary.test.js
describe('EstimateSummary', () => {
  test('should merge duplicate works correctly', () => {
    const existing = [{ work_type_id: 1, quantity: 2 }];
    const newWorks = [{ id: 1, quantity: 3 }];
    
    const result = mergeWorksArrays(existing, newWorks);
    
    expect(result[0].quantity).toBe(5);
  });
});
```

---

## ЗАКЛЮЧЕНИЕ

Система представляет собой современное full-stack приложение с четким разделением ролей и адаптивным интерфейсом. Мобильный UI полностью интегрирован и активируется автоматически для прорабов на мобильных устройствах, предоставляя touch-оптимизированный workflow для создания и редактирования смет.

Ключевые особенности:
- **Безопасность**: жесткое ролевое разделение с аудитом действий
- **Производительность**: оптимизированные запросы и кэширование 
- **UX**: интуитивные мобильные интерфейсы следующие Material Design 3
- **Масштабируемость**: модульная архитектура с четким API
- **Совместимость**: единый API для desktop и mobile интерфейсов