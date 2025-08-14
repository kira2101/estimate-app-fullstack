# Система контроля статусов смет в мини-ERP на Django

## Описание фичи

В данном сценарии прораб создает смету, а менеджер проверяет и утверждает, отклоняет или отправляет на корректировку. Система отслеживает изменения статусов и сохраняет историю для аудита. Реализация минималистична, но поддерживает масштабируемость.

### Роли
- **Прораб**: Создает смету в статусе "Черновик", отправляет на проверку ("Отправлено на проверку") и вносит корректировки, если требуется.
- **Менеджер**: Утверждает смету ("Утверждено"), отклоняет ("Отклонено") или отправляет на корректировку ("Требуются корректировки").

### Статусы сметы
- **Черновик**: Смета создана, но еще не отправлена.
- **Отправлено на проверку**: Смета отправлена менеджеру.
- **Требуются корректировки**: Менеджер вернул смету прорабу для исправлений.
- **Утверждено**: Менеджер подтвердил смету.
- **Отклонено**: Менеджер отклонил смету.

## Реализация

### Модель сметы (models.py)

Модель `Estimate` для хранения сметы с полем статуса и методами для управления.

```python
from django.db import models
from django.contrib.auth.models import User

class Estimate(models.Model):
    STATUS_DRAFT = 'DRAFT'
    STATUS_SUBMITTED = 'SUBMITTED'
    STATUS_NEEDS_REVISION = 'NEEDS_REVISION'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_SUBMITTED, 'Отправлено на проверку'),
        (STATUS_NEEDS_REVISION, 'Требуются корректировки'),
        (STATUS_APPROVED, 'Утверждено'),
        (STATUS_REJECTED, 'Отклонено'),
    ]
    
    title = models.CharField(max_length=255, verbose_name='Название сметы')
    foreman = models.ForeignKey(User, on_delete=models.CASCADE, related_name='estimates', verbose_name='Прораб')
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name='approved_estimates', verbose_name='Менеджер')
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Сумма')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, verbose_name='Статус')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')

    def submit(self, user):
        """Отправка сметы на проверку."""
        if self.status in (self.STATUS_DRAFT, self.STATUS_NEEDS_REVISION) and user == self.foreman:
            self.status = self.STATUS_SUBMITTED
            self.save()
            EstimateStatusHistory.objects.create(
                estimate=self,
                status=self.status,
                changed_by=user,
                comment='Смета отправлена на проверку'
            )
            return True
        return False

    def approve(self, user):
        """Утверждение сметы менеджером."""
        if self.status == self.STATUS_SUBMITTED and user == self.manager:
            self.status = self.STATUS_APPROVED
            self.save()
            EstimateStatusHistory.objects.create(
                estimate=self,
                status=self.status,
                changed_by=user,
                comment='Смета утверждена'
            )
            return True
        return False

    def reject(self, user, comment=''):
        """Отклонение сметы менеджером."""
        if self.status == self.STATUS_SUBMITTED and user == self.manager:
            self.status = self.STATUS_REJECTED
            self.save()
            EstimateStatusHistory.objects.create(
                estimate=self,
                status=self.status,
                changed_by=user,
                comment=comment or 'Смета отклонена'
            )
            return True
        return False

    def request_revision(self, user, comment=''):
        """Запрос корректировок менеджером."""
        if self.status == self.STATUS_SUBMITTED and user == self.manager:
            self.status = self.STATUS_NEEDS_REVISION
            self.save()
            EstimateStatusHistory.objects.create(
                estimate=self,
                status=self.status,
                changed_by=user,
                comment=comment or 'Требуются корректировки'
            )
            return True
        return False

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

class EstimateStatusHistory(models.Model):
    """История изменений статуса сметы."""
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20, choices=Estimate.STATUS_CHOICES)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата изменения')

    class Meta:
        verbose_name = 'История статуса'
        verbose_name_plural = 'История статусов'
```

### Представления (views.py)

Обработчики для создания, отправки, утверждения, отклонения и запроса корректировок.

```python
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Estimate
from .forms import EstimateForm, RejectForm, RevisionForm

@login_required
def create_estimate(request):
    if request.method == 'POST':
        form = EstimateForm(request.POST)
        if form.is_valid():
            estimate = form.save(commit=False)
            estimate.foreman = request.user
            estimate.save()
            return redirect('estimate_list')
    else:
        form = EstimateForm()
    return render(request, 'estimates/create_estimate.html', {'form': form})

@login_required
def submit_estimate(request, estimate_id):
    estimate = get_object_or_404(Estimate, id=estimate_id)
    if estimate.submit(request.user):
        return redirect('estimate_list')
    return redirect('estimate_detail', estimate_id=estimate.id)

@login_required
def approve_estimate(request, estimate_id):
    estimate = get_object_or_404(Estimate, id=estimate_id)
    if estimate.approve(request.user):
        return redirect('estimate_list')
    return redirect('estimate_detail', estimate_id=estimate.id)

@login_required
def reject_estimate(request, estimate_id):
    estimate = get_object_or_404(Estimate, id=estimate_id)
    if request.method == 'POST':
        form = RejectForm(request.POST)
        if form.is_valid():
            comment = form.cleaned_data['comment']
            if estimate.reject(request.user, comment):
                return redirect('estimate_list')
    else:
        form = RejectForm()
    return render(request, 'estimates/reject_estimate.html', {'form': form, 'estimate': estimate})

@login_required
def request_revision(request, estimate_id):
    estimate = get_object_or_404(Estimate, id=estimate_id)
    if request.method == 'POST':
        form = RevisionForm(request.POST)
        if form.is_valid():
            comment = form.cleaned_data['comment']
            if estimate.request_revision(request.user, comment):
                return redirect('estimate_list')
    else:
        form = RevisionForm()
    return render(request, 'estimates/request_revision.html', {'form': form, 'estimate': estimate})

@login_required
def estimate_list(request):
    estimates = Estimate.objects.filter(foreman=request.user) | Estimate.objects.filter(manager=request.user)
    return render(request, 'estimates/estimate_list.html', {'estimates': estimates})
```

### Формы (forms.py)

Формы для создания сметы, отклонения и запроса корректировок.

```python
from django import forms
from .models import Estimate

class EstimateForm(forms.ModelForm):
    class Meta:
        model = Estimate
        fields = ['title', 'amount', 'manager']

class RejectForm(forms.Form):
    comment = forms.CharField(widget=forms.Textarea, required=False, label='Комментарий')

class RevisionForm(forms.Form):
    comment = forms.CharField(widget=forms.Textarea, required=True, label='Комментарий для корректировок')
```

### Шаблоны

#### Список смет (estimate_list.html)

```html
{% for estimate in estimates %}
  <div>
    <h3>{{ estimate.title }} ({{ estimate.get_status_display }})</h3>
    <p>Сумма: {{ estimate.amount }}</p>
    <p>Прораб: {{ estimate.foreman.username }}</p>
    <p>Менеджер: {{ estimate.manager.username }}</p>
    {% if estimate.status == 'DRAFT' or estimate.status == 'NEEDS_REVISION' %}
      {% if estimate.foreman == user %}
        <a href="{% url 'submit_estimate' estimate.id %}">Отправить на проверку</a>
      {% endif %}
    {% endif %}
    {% if estimate.status == 'SUBMITTED' and estimate.manager == user %}
      <a href="{% url 'approve_estimate' estimate.id %}">Утвердить</a>
      <a href="{% url 'reject_estimate' estimate.id %}">Отклонить</a>
      <a href="{% url 'request_revision' estimate.id %}">Запросить корректировки</a>
    {% endif %}
  </div>
{% endfor %}
```

#### Запрос корректировок (request_revision.html)

```html
<form method="post">
  {% csrf_token %}
  {{ form.as_p }}
  <button type="submit">Запросить корректировки</button>
</form>
```

#### Отклонение сметы (reject_estimate.html)

```html
<form method="post">
  {% csrf_token %}
  {{ form.as_p }}
  <button type="submit">Отклонить</button>
</form>
```

## Сценарий обмена статусами

1. **Прораб создает смету**: Статус — "Черновик". Например: `title="Смета на ремонт", amount=10000, manager=user2`.
2. **Прораб отправляет на проверку**: Вызывается метод `submit()`, статус меняется на "Отправлено на проверку". В `EstimateStatusHistory` добавляется запись: `status="SUBMITTED", changed_by=прораб, comment="Смета отправлена на проверку"`.
3. **Менеджер получает уведомление**: Можно настроить через Django signals.
4. **Менеджер выбирает действие**:
   - Утверждение: Статус → "Утверждено", история: `status="APPROVED", changed_by=менеджер, comment="Смета утверждена"`.
   - Отклонение: Статус → "Отклонено", история: `status="REJECTED", changed_by=менеджер, comment="Недостаточно данных"`.
   - Запрос корректировок: Статус → "Требуются корректировки", история: `status="NEEDS_REVISION", changed_by=менеджер, comment="Уточнить материалы"`.
5. **Прораб вносит корректировки**: Если статус "Требуются корректировки", прораб редактирует смету и снова отправляет на проверку (`submit()`).

## Алгоритм создания систем статусов для других частей проекта

Для обеспечения единообразия и масштабируемости в других модулях проекта (например, для задач, заказов или отчетов) следуйте следующему алгоритму:

1. **Определение статусов**:
   - Перечислите возможные статусы объекта (например, 'DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'REJECTED').
   - Создайте константы для каждого статуса (например, `STATUS_DRAFT = 'DRAFT'`).
   - Определите `STATUS_CHOICES` как список кортежей для поля модели.

2. **Модель объекта**:
   - Добавьте поле `status` типа `CharField` с `choices=STATUS_CHOICES` и `default=STATUS_DRAFT`.
   - Свяжите с пользователями (роли: создатель, утверждатель).

3. **Модель истории изменений**:
   - Создайте модель (например, `ObjectStatusHistory`) с полями: ссылка на объект, статус, изменитель, комментарий, дата.

4. **Методы модели для переходов**:
   - Создайте методы для каждого перехода (например, `submit(user)`, `approve(user)`, `reject(user, comment)`, `request_revision(user, comment)`).
   - В методах: проверьте текущий статус и права пользователя, обновите статус, сохраните объект, добавьте запись в историю.
   - Возвращайте True/False для успеха.

5. **Представления и формы**:
   - Создайте views для создания, отправки, утверждения, отклонения и запроса корректировок с проверкой через методы модели.
   - Используйте формы для ввода данных (например, комментария при отклонении или корректировке).

6. **Шаблоны и интерфейс**:
   - В списках и деталях показывайте статус и доступные действия на основе роли и статуса.
   - Используйте conditional tags в шаблонах для отображения кнопок.

7. **Дополнительная автоматизация**:
   - Подключите Django signals для уведомлений (email, push) при смене статуса.
   - Для сложных workflow: подготовьте к интеграции `django-fsm` (добавьте переходы через декораторы).

Этот алгоритм обеспечивает повторяемость: скопируйте структуру для новой модели, адаптируя статусы и роли.

## Масштабируемость

- **Добавление статусов**: Расширьте `STATUS_CHOICES` и методы модели.
- **Уведомления**: Настройте signals для email/push-уведомлений.
- **Workflow**: Интегрируйте `django-fsm` для сложных переходов.