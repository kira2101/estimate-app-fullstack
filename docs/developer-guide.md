# 🛠️ Руководство разработчика

Полное руководство по разработке, тестированию и развертыванию изменений.

## 🏗️ Архитектура приложения

### Общая структура

```
estimate-app/
├── backend/                    # Django REST API
│   ├── api/                   # Основное приложение
│   │   ├── models.py         # Модели данных
│   │   ├── views.py          # API endpoints
│   │   ├── serializers.py    # Сериализаторы DRF
│   │   ├── permissions.py    # Права доступа
│   │   ├── authentication.py # Аутентификация
│   │   └── urls.py          # URL маршруты
│   ├── core/                 # Настройки Django
│   │   ├── settings.py      # Основные настройки
│   │   ├── settings_production.py # Продакшн настройки
│   │   └── wsgi.py          # WSGI интерфейс
│   ├── requirements.txt      # Зависимости для разработки
│   ├── requirements_production.txt # Продакшн зависимости
│   └── manage.py            # Django management
├── frontend/                 # React приложение
│   ├── src/
│   │   ├── api/client.js    # HTTP клиент для API
│   │   ├── components/      # React компоненты
│   │   ├── pages/          # Страницы приложения
│   │   └── App.jsx         # Главный компонент
│   ├── package.json        # npm зависимости
│   └── vite.config.js      # Конфигурация Vite
├── deploy/                  # Скрипты развертывания
├── docs/                   # Документация
└── .github/workflows/      # CI/CD пайплайны
```

### Стек технологий

**Backend:**
- **Django 5.2.5** - веб-фреймворк
- **Django REST Framework** - API
- **PostgreSQL** - основная БД
- **Redis** - кеширование (опционально)
- **Gunicorn** - WSGI сервер
- **Custom UUID Auth** - аутентификация

**Frontend:**
- **React 19.1.1** - UI библиотека
- **Vite 7.1.0** - сборщик
- **Material-UI 7.3.1** - компоненты
- **Bootstrap 5.3.7** - стили

**DevOps:**
- **Docker** - контейнеризация
- **Nginx** - веб-сервер
- **GitHub Actions** - CI/CD
- **Let's Encrypt** - SSL сертификаты

## 🚀 Быстрый старт для разработчиков

### 1. Настройка окружения

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/estimate-app-fullstack.git
cd estimate-app-fullstack

# Backend окружение
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend окружение
cd ../frontend
npm install

# База данных (PostgreSQL)
# Установите PostgreSQL и создайте БД:
createdb estimate_app_db
```

### 2. Конфигурация для разработки

**Backend** - создайте `backend/.env`:
```env
SECRET_KEY=your-secret-key-for-development
DEBUG=True
DATABASE_URL=postgresql://username:password@localhost:5432/estimate_app_db
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**Frontend** - создайте `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 3. Запуск в режиме разработки

```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
python manage.py migrate
python manage.py seed_db
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Доступ:**
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000/api/v1/
- Django Admin: http://127.0.0.1:8000/admin/

## 🔧 Процесс разработки

### Git Workflow

```bash
# 1. Создание feature ветки
git checkout -b feature/new-functionality

# 2. Разработка и коммиты
git add .
git commit -m "feat: добавлена новая функциональность"

# 3. Пуш и создание PR
git push origin feature/new-functionality
# Создать Pull Request в GitHub

# 4. После review - merge в dev
git checkout dev
git merge feature/new-functionality

# 5. Тестирование в dev
git push origin dev  # Запустится quick-deploy

# 6. Merge в main для production
git checkout main
git merge dev
git push origin main  # Запустится full deployment
```

### Соглашения о коммитах

```bash
# Типы коммитов:
feat: новая функциональность
fix: исправление бага
docs: обновление документации
style: форматирование кода
refactor: рефакторинг без изменения функциональности
test: добавление тестов
chore: обновление сборки, зависимостей

# Примеры:
git commit -m "feat: добавлена авторизация через JWT"
git commit -m "fix: исправлена ошибка в расчете сметы"
git commit -m "docs: обновлена документация API"
```

## 🧪 Тестирование

### Backend тесты

```bash
# Запуск всех тестов
cd backend
python manage.py test

# Конкретное приложение
python manage.py test api

# Конкретный тест
python manage.py test api.tests.test_authentication

# С покрытием
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # HTML отчет в htmlcov/
```

### Написание тестов

**Пример теста API:**
```python
# backend/api/tests/test_estimates.py
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from api.models import User, Project, Estimate

class EstimateAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            role_id=1
        )
        self.project = Project.objects.create(
            name='Test Project',
            client='Test Client'
        )

    def test_create_estimate(self):
        """Тест создания сметы"""
        self.client.force_authenticate(user=self.user)
        data = {
            'name': 'Test Estimate',
            'project_id': self.project.id,
            'description': 'Test description'
        }
        response = self.client.post('/api/v1/estimates/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Estimate.objects.count(), 1)
```

### Frontend тестирование

```bash
# Установка зависимостей для тестов
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Запуск тестов
npm test

# Тесты с покрытием
npm run test:coverage
```

## 📊 API разработка

### Структура API

```
/api/v1/
├── auth/
│   └── login/              # POST - авторизация
├── health/                 # GET - проверка здоровья
├── statuses/              # GET - список статусов
├── projects/              # CRUD - проекты
├── estimates/             # CRUD - сметы
│   └── {id}/export/       # GET - экспорт
├── work-categories/       # CRUD - категории работ
├── work-types/            # CRUD - типы работ
│   ├── import/           # POST - импорт из Excel
│   └── ?all=true         # GET - все записи без пагинации
├── users/                 # CRUD - пользователи (только менеджеры)
├── roles/                 # GET - роли
└── project-assignments/   # CRUD - назначения проектов
```

### Добавление нового API endpoint

**1. Модель** (если нужна):
```python
# backend/api/models.py
class NewModel(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'new_model'
        verbose_name = 'New Model'
```

**2. Сериализатор:**
```python
# backend/api/serializers.py
class NewModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewModel
        fields = ['id', 'name', 'description', 'created_at']
```

**3. ViewSet:**
```python
# backend/api/views.py
class NewModelViewSet(viewsets.ModelViewSet):
    queryset = NewModel.objects.all()
    serializer_class = NewModelSerializer
    permission_classes = [IsAuthenticatedCustom]
    
    def get_queryset(self):
        # Фильтрация по роли пользователя
        if self.request.user.role.name == 'менеджер':
            return NewModel.objects.all()
        else:
            return NewModel.objects.filter(user=self.request.user)
```

**4. URL:**
```python
# backend/api/urls.py
router.register(r'new-models', NewModelViewSet, basename='new-model')
```

**5. Миграция:**
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Frontend интеграция

**API клиент:**
```javascript
// frontend/src/api/client.js
export const newModelAPI = {
  list: () => api.get('/new-models/'),
  create: (data) => api.post('/new-models/', data),
  update: (id, data) => api.put(`/new-models/${id}/`, data),
  delete: (id) => api.delete(`/new-models/${id}/`)
};
```

**React компонент:**
```jsx
// frontend/src/components/NewModelList.jsx
import React, { useState, useEffect } from 'react';
import { newModelAPI } from '../api/client';

const NewModelList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await newModelAPI.list();
      setItems(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>New Models</h2>
      {items.map(item => (
        <div key={item.id}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
};

export default NewModelList;
```

## 🔐 Безопасность

### Аутентификация

Приложение использует **кастомную UUID аутентификацию**:

```python
# backend/api/authentication.py
class UUIDTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header[7:]  # Remove 'Bearer '
        
        try:
            uuid.UUID(token)  # Validate UUID format
            auth_token = AuthToken.objects.select_related('user').get(token=token)
            return (auth_token.user, auth_token)
        except (ValueError, AuthToken.DoesNotExist):
            raise AuthenticationFailed('Invalid token')
```

### Права доступа

```python
# backend/api/permissions.py
class IsManager(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role and 
                request.user.role.name == 'менеджер')

class CanAccessEstimate(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role.name == 'менеджер':
            return True
        # Прораб может видеть только свои сметы
        return obj.foreman == request.user
```

### Валидация данных

```python
# backend/api/serializers.py
class EstimateSerializer(serializers.ModelSerializer):
    def validate_total_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Amount cannot be negative")
        return value
    
    def validate(self, data):
        if data.get('start_date') > data.get('end_date'):
            raise serializers.ValidationError("Start date must be before end date")
        return data
```

## 🚀 Развертывание изменений

### Типы развертывания

| Изменения | Тип деплоя | Время | Ветка |
|-----------|------------|-------|-------|
| Backend код, миграции | ⚡ Быстрый | 2-3 мин | `dev` |
| Frontend код, зависимости | 🔄 Полный | 10-15 мин | `main` |
| Docker, nginx, инфраструктура | 🔄 Полный | 10-15 мин | `main` |

### Чек-лист перед деплоем

**Backend изменения:**
- [ ] Тесты проходят локально: `python manage.py test`
- [ ] Миграции созданы: `python manage.py makemigrations --check`
- [ ] Новые зависимости добавлены в requirements.txt
- [ ] Документация API обновлена
- [ ] Проверены права доступа

**Frontend изменения:**
- [ ] Приложение собирается: `npm run build`
- [ ] Lint проходит: `npm run lint`  
- [ ] Новые зависимости добавлены в package.json
- [ ] API клиент обновлен при изменениях бэкенда

**Инфраструктура:**
- [ ] Docker образы собираются локально
- [ ] Конфигурация nginx проверена
- [ ] Переменные окружения обновлены
- [ ] SSL сертификаты валидны

### Процесс развертывания

```bash
# 1. Разработка в feature ветке
git checkout -b feature/new-feature
# ... разработка ...
git commit -m "feat: новая функция"

# 2. Тестирование через dev
git checkout dev
git merge feature/new-feature
git push origin dev
# → Запускается quick-deploy.yml

# 3. Проверка на dev окружении
curl https://app.iqbs.pro/api/v1/health/

# 4. Деплой в production
git checkout main  
git merge dev
git push origin main
# → Запускается deploy-production.yml

# 5. Мониторинг деплоя
# GitHub Actions: https://github.com/username/repo/actions
```

## 🔍 Отладка

### Backend отладка

```python
# Включение DEBUG режима
# backend/.env
DEBUG=True

# Логирование в Django
import logging
logger = logging.getLogger(__name__)

def my_view(request):
    logger.info(f"Processing request from {request.user}")
    logger.error(f"Error occurred: {error}")
```

**Django Debug Toolbar:**
```bash
pip install django-debug-toolbar

# backend/core/settings.py
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1']
```

### Frontend отладка

**React DevTools:**
```bash
# Установка расширения браузера
# Chrome: React Developer Tools
# Firefox: React Developer Tools
```

**Vite Dev Tools:**
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
});
```

### Продакшн отладка

```bash
# Логи приложения
docker logs -f estimate-backend
docker logs -f estimate-frontend

# Вход в контейнер
docker exec -it estimate-backend bash
docker exec -it estimate-frontend sh

# Django shell в продакшн
docker exec -it estimate-backend python manage.py shell

# Проверка конфигурации
docker exec estimate-backend python manage.py check
nginx -t
```

## 📈 Производительность

### Backend оптимизация

```python
# Оптимизация запросов к БД
class EstimateViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Estimate.objects.select_related(
            'project', 'foreman', 'status'
        ).prefetch_related(
            'estimate_items__work_type'
        )

# Кеширование
from django.core.cache import cache

def expensive_function():
    result = cache.get('cache_key')
    if result is None:
        result = heavy_computation()
        cache.set('cache_key', result, 3600)  # 1 час
    return result
```

### Frontend оптимизация

```jsx
// React.memo для предотвращения лишних рендеров
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Сложная логика */}</div>;
});

// useMemo для дорогих вычислений
const MyComponent = ({ items }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
  }, [items]);

  return <div>{expensiveValue}</div>;
};

// Lazy loading для маршрутов
const LazyPage = lazy(() => import('./LazyPage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/lazy" element={<LazyPage />} />
      </Routes>
    </Suspense>
  );
}
```

## 🎯 Лучшие практики

### Код стандарты

**Python (Backend):**
```python
# PEP 8 style guide
# Использование black для форматирования
pip install black
black backend/

# Типы аннотации
from typing import List, Optional

def get_estimates(user_id: int) -> List[Estimate]:
    return Estimate.objects.filter(foreman_id=user_id)

# Docstrings
def calculate_total(items: List[EstimateItem]) -> Decimal:
    """
    Рассчитывает общую стоимость сметы.
    
    Args:
        items: Список элементов сметы
        
    Returns:
        Общая стоимость
    """
    return sum(item.total_price for item in items)
```

**JavaScript (Frontend):**
```javascript
// ESLint конфигурация в package.json
{
  "scripts": {
    "lint": "eslint src/ --ext .js,.jsx",
    "lint:fix": "eslint src/ --ext .js,.jsx --fix"
  }
}

// Именование компонентов (PascalCase)
const UserProfile = () => {
  // Именование переменных (camelCase)
  const [userData, setUserData] = useState(null);
  
  // Константы (UPPER_SNAKE_CASE)
  const API_ENDPOINTS = {
    USERS: '/api/v1/users/',
    PROJECTS: '/api/v1/projects/'
  };
  
  return <div>...</div>;
};
```

### Архитектурные принципы

**SOLID принципы:**
- **S** - Single Responsibility: один класс = одна ответственность
- **O** - Open/Closed: открыт для расширения, закрыт для изменений
- **L** - Liskov Substitution: наследники должны заменять базовые классы
- **I** - Interface Segregation: много специфичных интерфейсов лучше одного общего
- **D** - Dependency Inversion: зависимость от абстракций, не от конкретики

**DRY (Don't Repeat Yourself):**
```python
# Плохо
if user.role.name == 'менеджер':
    # логика для менеджера
if user.role.name == 'менеджер':
    # та же логика в другом месте

# Хорошо
def is_manager(user):
    return user.role.name == 'менеджер'

if is_manager(user):
    # логика для менеджера
```

---

**Следующий раздел**: [🔐 Безопасность](./security.md)