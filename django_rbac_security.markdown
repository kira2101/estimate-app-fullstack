# Организация безопасности данных по ролям в Django

Безопасность данных в Django на основе ролей (Role-Based Access Control, RBAC) реализуется с помощью встроенной системы аутентификации и авторизации. Это позволяет назначать пользователям роли (группы), определять разрешения (permissions) и проверять доступ к данным в представлениях, моделях и шаблонах. Ниже приведено пошаговое руководство по реализации, основанное на лучших практиках.

## Шаг 1: Настройка проекта Django
- Убедитесь, что модуль `django.contrib.auth` включён в `INSTALLED_APPS` в `settings.py` (добавляется по умолчанию).
- Создайте супер-пользователя для администрирования:
  ```bash
  python manage.py createsuperuser
  ```
- Выполните миграции:
  ```bash
  python manage.py migrate
  ```
  Это создаст таблицы для пользователей, групп и разрешений в базе данных.

## Шаг 2: Определение ролей с помощью групп
- Роли представлены моделью `Group`. Каждая группа — это роль (например, "Администратор", "Менеджер", "Пользователь").
- Создайте группы в админ-панели Django (`http://127.0.0.1:8000/admin/`) или программно в shell:
  ```python
  from django.contrib.auth.models import Group
  admin_group = Group.objects.create(name='Администратор')
  manager_group = Group.objects.create(name='Менеджер')
  ```
- Назначьте пользователей группам через админ-панель или код:
  ```python
  user.groups.add(admin_group)
  ```
  Использование групп упрощает управление ролями и масштабируемость.

## Шаг 3: Определение и назначение разрешений
- Django автоматически создаёт разрешения для каждой модели: `add_модель`, `change_модель`, `delete_модель`, `view_модель` (например, `app.change_post`).
- Для кастомных разрешений добавьте в модель `Meta`:
  ```python
  class Meta:
      permissions = [
          ('can_publish', 'Может публиковать записи'),
      ]
  ```
- Назначьте разрешения группам в админ-панели или кодом:
  ```python
  from django.contrib.auth.models import Permission, Group
  from django.contrib.contenttypes.models import ContentType
  from your_app.models import YourModel  # Замените на вашу модель

  content_type = ContentType.objects.get_for_model(YourModel)
  permission = Permission.objects.get(codename='change_yourmodel', content_type=content_type)
  admin_group.permissions.add(permission)
  ```
- Для полного доступа (например, для администратора) назначьте все разрешения модели:
  ```python
  permissions = Permission.objects.filter(content_type=content_type)
  admin_group.permissions.set(permissions)
  ```
  Рекомендация: назначайте разрешения группам, а не отдельным пользователям, для упрощения управления.

## Шаг 4: Расширение модели пользователя (если нужно)
- Для дополнительных полей (например, поле `role`) создайте кастомную модель пользователя, наследуя от `AbstractUser`:
  ```python
  from django.contrib.auth.models import AbstractUser

  class CustomUser(AbstractUser):
      ROLE_CHOICES = [
          ('admin', 'Администратор'),
          ('manager', 'Менеджер'),
          ('employee', 'Сотрудник'),
      ]
      role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
  ```
- В `settings.py` укажите:
  ```python
  AUTH_USER_MODEL = 'your_app.CustomUser'
  ```
- Зарегистрируйте модель в админ-панели для редактирования ролей.
  Это полезно для простых ролей, но для сложных систем предпочтительнее использовать группы.

## Шаг 5: Защита представлений (views)
- Используйте декораторы для проверки доступа:
  - `@login_required` — для аутентифицированных пользователей.
  - `@permission_required('app.change_model')` — для конкретного разрешения.
  - Кастомный декоратор для ролей:
    ```python
    from django.http import HttpResponseForbidden

    def role_required(role):
        def decorator(view_func):
            def _wrapped_view(request, *args, **kwargs):
                if request.user.role == role:  # Или request.user.groups.filter(name=role).exists()
                    return view_func(request, *args, **kwargs)
                return HttpResponseForbidden('Нет доступа')
            return _wrapped_view
        return decorator
    ```
  - Пример использования:
    ```python
    @role_required('admin')
    def admin_view(request):
        return render(request, 'admin.html')
    ```
- Для классовых представлений используйте `PermissionRequiredMixin`.
- Проверяйте разрешения в коде:
  ```python
  if request.user.has_perm('app.view_model'):
      # Логика
  ```

## Шаг 6: Защита данных на уровне объектов и шаблонов
- Для ограничения доступа к объектам фильтруйте запросы:
  ```python
  Model.objects.filter(owner=request.user)
  ```
- Используйте библиотеку `django-guardian` для разрешений на уровне объектов.
- В шаблонах условно показывайте контент:
  ```html
  {% if user.has_perm 'app.change_model' %}
      <a href="{% url 'edit' %}">Редактировать</a>
  {% endif %}
  {% if user.role == 'admin' %}
      Админ-контент
  {% endif %}
  ```
  Это предотвращает утечки данных на фронтенде.

## Шаг 7: Лучшие практики по безопасности
- **Масштабируемость**: Используйте группы для ролей, чтобы избежать дублирования разрешений.
- **Аудит**: Логируйте доступ с помощью middleware или signals.
- **Тестирование**: Пишите unit-тесты для проверок разрешений (используйте `TestCase` с `force_login`).
- **Дополнительные инструменты**: Для сложных сценариев (иерархия ролей) используйте библиотеки, такие как `django-role-permissions`, или внешние сервисы, такие как Permify.
- **Безопасность данных**: Фильтруйте запросы по пользователю, чтобы избежать несанкционированного доступа. Избегайте хранения чувствительных данных в сессиях.
- Обновляйте Django до последней версии (на 2025 год — 5.1 или выше) для патчей безопасности.
- Для API (например, Django REST Framework) используйте `rest_framework.permissions` (классы вроде `IsAdminUser`).

Эта структура обеспечит надёжную безопасность данных по ролям в Django.