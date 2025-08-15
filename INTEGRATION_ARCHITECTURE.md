# Архитектура системы с интеграциями

## Обновленная архитектура с PostgreSQL

### Компоненты системы:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │ Telegram Bot    │    │   CRM System    │
│   (React)       │    │   (aiogram)     │    │  (REST API)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ├──────────────────────┼──────────────────────┤
          │                      │                      │
┌─────────▼──────────────────────▼──────────────────────▼───────┐
│                Django REST API                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Auth      │ │  Business   │ │     Integration         │ │
│  │  Service    │ │   Logic     │ │      Services           │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────┬───────────────────────────────────────────────────┘
          │
┌─────────▼───────┐    ┌─────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │    Redis    │    │     Celery      │
│   Database      │    │   Cache     │    │  Task Queue     │
└─────────────────┘    └─────────────┘    └─────────────────┘
```

## Новые модели данных для интеграций

### CRM Integration Models:
```python
class CRMClient(models.Model):
    """Синхронизация с CRM клиентами"""
    crm_id = models.CharField(max_length=100, unique=True)
    crm_system = models.CharField(max_length=50)  # 'bitrix24', 'amoCRM', etc
    local_client = models.ForeignKey(Client, on_delete=models.CASCADE)
    last_sync = models.DateTimeField(auto_now=True)
    sync_data = models.JSONField(default=dict)  # Требует PostgreSQL
    
class CRMDeal(models.Model):
    """Сделки из CRM"""
    crm_id = models.CharField(max_length=100, unique=True)
    crm_system = models.CharField(max_length=50)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    deal_amount = models.DecimalField(max_digits=15, decimal_places=2)
    stage = models.CharField(max_length=100)
    sync_data = models.JSONField(default=dict)

class TelegramUser(models.Model):
    """Пользователи Telegram бота"""
    telegram_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=100, null=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, null=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    chat_state = models.JSONField(default=dict)  # Состояние диалога
    is_active = models.BooleanField(default=True)

class TelegramNotification(models.Model):
    """История уведомлений в Telegram"""
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE)
    message_type = models.CharField(max_length=50)
    content = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    delivered = models.BooleanField(default=False)
    telegram_message_id = models.BigIntegerField(null=True)

class IntegrationLog(models.Model):
    """Логи всех интеграций"""
    system = models.CharField(max_length=50)  # 'telegram', 'crm', 'webhook'
    operation = models.CharField(max_length=100)
    status = models.CharField(max_length=20)  # 'success', 'error', 'pending'
    request_data = models.JSONField(null=True)
    response_data = models.JSONField(null=True)
    error_message = models.TextField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    duration_ms = models.IntegerField(null=True)
```

## Telegram Bot Integration

### Bot Commands Structure:
```python
# bot/handlers/estimates.py
async def cmd_estimates(message: types.Message, state: FSMContext):
    """Показать список смет пользователя"""
    telegram_user = await get_telegram_user(message.from_user.id)
    
    # Асинхронный запрос к API
    estimates = await api_client.get_user_estimates(telegram_user.user.id)
    
    keyboard = create_estimates_keyboard(estimates)
    await message.answer("Ваши сметы:", reply_markup=keyboard)

async def cmd_create_estimate(message: types.Message, state: FSMContext):
    """Создание новой сметы через бота"""
    await EstimateForm.project.set()
    projects = await api_client.get_user_projects(user_id)
    keyboard = create_projects_keyboard(projects)
    await message.answer("Выберите проект:", reply_markup=keyboard)

# bot/handlers/notifications.py
async def notify_estimate_approved(estimate_id: int):
    """Уведомление об утверждении сметы"""
    estimate = await api_client.get_estimate(estimate_id)
    telegram_user = await TelegramUser.objects.aget(user=estimate.foreman)
    
    text = f"✅ Смета '{estimate.estimate_number}' утверждена!"
    await bot.send_message(telegram_user.telegram_id, text)
```

## CRM Integration

### CRM Sync Services:
```python
# integrations/crm/base.py
class CRMIntegrator:
    """Базовый класс для интеграции с CRM"""
    
    async def sync_clients(self):
        """Синхронизация клиентов"""
        crm_clients = await self.fetch_clients()
        
        for crm_client in crm_clients:
            client, created = await Client.objects.aupdate_or_create(
                email=crm_client['email'],
                defaults={
                    'client_name': crm_client['name'],
                    'client_phone': crm_client['phone']
                }
            )
            
            await CRMClient.objects.aupdate_or_create(
                crm_id=crm_client['id'],
                crm_system=self.system_name,
                defaults={
                    'local_client': client,
                    'sync_data': crm_client
                }
            )

# integrations/crm/bitrix24.py
class Bitrix24Integrator(CRMIntegrator):
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
        self.system_name = 'bitrix24'
    
    async def fetch_clients(self):
        """Получение клиентов из Bitrix24"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.webhook_url}/crm.contact.list.json",
                json={"SELECT": ["ID", "NAME", "EMAIL", "PHONE"]}
            ) as resp:
                data = await resp.json()
                return data.get('result', [])

    async def create_deal_from_estimate(self, estimate):
        """Создание сделки в CRM из сметы"""
        deal_data = {
            "TITLE": f"Смета {estimate.estimate_number}",
            "CONTACT_ID": estimate.client.crm_id,
            "OPPORTUNITY": str(estimate.total_amount),
            "CURRENCY_ID": "RUB",
            "STAGE_ID": "NEW"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.webhook_url}/crm.deal.add.json",
                json={"fields": deal_data}
            ) as resp:
                result = await resp.json()
                return result
```

## Асинхронные задачи (Celery)

### Background Tasks:
```python
# tasks.py
from celery import Celery
from integrations.crm import get_crm_integrator

app = Celery('estimate_app')

@app.task(bind=True, max_retries=3)
def sync_crm_data(self, crm_system: str):
    """Периодическая синхронизация с CRM"""
    try:
        integrator = get_crm_integrator(crm_system)
        
        # Синхронизация клиентов
        integrator.sync_clients()
        
        # Синхронизация сделок
        integrator.sync_deals()
        
        # Логирование успеха
        IntegrationLog.objects.create(
            system=crm_system,
            operation='sync_all',
            status='success'
        )
        
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@app.task
def send_telegram_notification(user_id: int, message: str, message_type: str):
    """Отправка уведомления в Telegram"""
    try:
        telegram_user = TelegramUser.objects.get(user_id=user_id)
        
        # Отправка через Telegram Bot API
        bot.send_message(telegram_user.telegram_id, message)
        
        # Сохранение в историю
        TelegramNotification.objects.create(
            user=telegram_user,
            message_type=message_type,
            content=message,
            delivered=True
        )
        
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")

@app.task
def export_estimate_to_crm(estimate_id: int):
    """Экспорт сметы в CRM как сделка"""
    estimate = Estimate.objects.get(id=estimate_id)
    
    # Определяем CRM систему клиента
    crm_client = CRMClient.objects.get(local_client=estimate.client)
    integrator = get_crm_integrator(crm_client.crm_system)
    
    # Создаем сделку
    deal_result = integrator.create_deal_from_estimate(estimate)
    
    # Сохраняем связь
    CRMDeal.objects.create(
        crm_id=deal_result['id'],
        crm_system=crm_client.crm_system,
        project=estimate.project,
        deal_amount=estimate.total_amount
    )

# Periodic tasks
from celery.schedules import crontab

app.conf.beat_schedule = {
    'sync-crm-every-hour': {
        'task': 'tasks.sync_crm_data',
        'schedule': crontab(minute=0),  # Каждый час
        'args': ('bitrix24',)
    },
    'cleanup-old-logs': {
        'task': 'tasks.cleanup_integration_logs',
        'schedule': crontab(hour=2, minute=0),  # Каждый день в 2:00
    },
}
```

## Real-time Features

### WebSocket для real-time обновлений:
```python
# consumers.py (Django Channels)
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class EstimateConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.room_group_name = f"user_{self.user.id}"
        
        # Присоединяемся к группе пользователя
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def estimate_updated(self, event):
        """Отправка обновления сметы"""
        await self.send(text_data=json.dumps({
            'type': 'estimate_updated',
            'estimate_id': event['estimate_id'],
            'message': event['message']
        }))

# signals.py
from django.db.models.signals import post_save
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=Estimate)
def notify_estimate_change(sender, instance, created, **kwargs):
    """Уведомление об изменении сметы"""
    channel_layer = get_channel_layer()
    
    # WebSocket уведомление
    async_to_sync(channel_layer.group_send)(
        f"user_{instance.foreman.id}",
        {
            'type': 'estimate_updated',
            'estimate_id': instance.id,
            'message': 'Смета обновлена' if not created else 'Новая смета создана'
        }
    )
    
    # Telegram уведомление
    send_telegram_notification.delay(
        instance.foreman.id,
        f"Смета '{instance.estimate_number}' {'создана' if created else 'обновлена'}",
        'estimate_change'
    )
```

## Обновленные требования к инфраструктуре

### Docker Compose с новыми сервисами:
```yaml
services:
  # ... существующие сервисы ...
  
  celery:
    build: 
      context: ./backend
    command: celery -A core worker -l info
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://estimate_user:${DB_PASSWORD}@db:5432/estimate_app_db
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      - db
      - redis

  celery-beat:
    build: 
      context: ./backend
    command: celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://estimate_user:${DB_PASSWORD}@db:5432/estimate_app_db
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      - db
      - redis

  telegram-bot:
    build:
      context: ./telegram_bot
    restart: unless-stopped
    environment:
      - BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - API_BASE_URL=http://backend:8000/api/v1
    depends_on:
      - backend
```

## Преимущества PostgreSQL в новой архитектуре

### 1. **JSON поля для гибкости**:
```python
# Хранение динамических данных из разных CRM
sync_data = models.JSONField(default=dict)
chat_state = models.JSONField(default=dict)

# Запросы по JSON полям
CRMClient.objects.filter(sync_data__status='active')
TelegramUser.objects.filter(chat_state__step='waiting_project')
```

### 2. **Full-text search**:
```python
# Поиск по всем системам одновременно
from django.contrib.postgres.search import SearchVector

# Поиск клиентов по данным из CRM и локальным данным
clients = Client.objects.annotate(
    search=SearchVector('client_name', 'crmclient__sync_data')
).filter(search='Иванов')
```

### 3. **Concurrent operations**:
```python
# Одновременная обработка:
# - Webhook от Telegram
# - Sync от CRM  
# - API запросы от фронтенда
# - Background tasks от Celery
```

### 4. **Advanced indexing**:
```sql
-- Индексы для JSON полей
CREATE INDEX idx_crm_sync_data_gin ON api_crmclient USING GIN (sync_data);
CREATE INDEX idx_telegram_state_gin ON api_telegramuser USING GIN (chat_state);

-- Partial indices для активных интеграций
CREATE INDEX idx_active_telegram_users ON api_telegramuser (telegram_id) 
WHERE is_active = true;
```

## Временные затраты на миграцию

**С интеграциями PostgreSQL становится критически важен:**
- Миграция SQLite → PostgreSQL: 4-6 часов
- Разработка Telegram бота: 2-3 недели  
- Интеграция с CRM: 1-2 недели
- Тестирование всей системы: 1 неделя

**Итого: 4-6 недель полной разработки**

## Вывод

С планами интеграций **PostgreSQL обязателен**. SQLite физически не сможет обеспечить нужную производительность и функциональность для такой сложной системы.

Рекомендую начать с миграции на PostgreSQL прямо сейчас, чтобы не переделывать архитектуру в будущем.