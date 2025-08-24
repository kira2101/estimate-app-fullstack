from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.db.models import F
from .models import WorkCategory, User, Project, Estimate, WorkType, WorkPrice, Status, Role, ProjectAssignment

# --- Сериализатор для логина (кастомный) ---
class UserSerializer(serializers.ModelSerializer):
    # Поле для чтения, показывает имя роли
    role = serializers.CharField(source='role.role_name', read_only=True)
    
    # Поле для записи, принимает ID роли
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source='role', write_only=True
    )
    
    # Поле для пароля, только для записи
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['user_id', 'full_name', 'email', 'role', 'role_id', 'password']
        read_only_fields = ['user_id', 'role']

    def create(self, validated_data):
        # При создании пароль обязателен
        if 'password' not in validated_data:
            raise serializers.ValidationError({'password': 'Пароль является обязательным полем при создании пользователя.'})
        
        # Хешируем пароль перед созданием пользователя
        validated_data['password_hash'] = make_password(validated_data.pop('password'))
        user = User.objects.create(**validated_data)
        return user

    def update(self, instance, validated_data):
        # Если в запросе есть пароль, хешируем его
        if 'password' in validated_data:
            password = validated_data.pop('password')
            if password:
                instance.password_hash = make_password(password)
        
        # Обновляем остальные поля
        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.email = validated_data.get('email', instance.email)
        instance.role = validated_data.get('role', instance.role)
        instance.save()
        
        return instance

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class ProjectAssignmentSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = ProjectAssignment
        fields = ['id', 'project', 'user', 'project_name', 'user_full_name']


# --- Сериализаторы для данных ---

class WorkCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkCategory
        fields = ['category_id', 'category_name']

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['project_id', 'project_name', 'address']

class EstimateListSerializer(serializers.ModelSerializer):
    # Поля для совместимости с фронтендом
    name = serializers.CharField(source='estimate_number', read_only=True)
    objectId = serializers.IntegerField(source='project.project_id', read_only=True)
    
    # КРИТИЧЕСКИЕ ПОЛЯ для фильтрации в мобильном интерфейсе
    project = serializers.IntegerField(source='project.project_id', read_only=True)
    project_id = serializers.IntegerField(source='project.project_id', read_only=True)
    creator = serializers.IntegerField(source='creator.user_id', read_only=True)
    foreman = serializers.IntegerField(source='foreman.user_id', read_only=True)
    
    # Дополнительные поля для отображения
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    status = serializers.CharField(source='status.status_name', read_only=True)
    foreman_name = serializers.SerializerMethodField()
    
    # Используем поле, рассчитанное в ViewSet через аннотацию
    # totalAmount уже есть в queryset, поэтому просто объявляем его
    totalAmount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    # Поле для мобильного интерфейса - сумма только работ прораба
    mobile_total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    currency = serializers.SerializerMethodField()
    createdDate = serializers.DateTimeField(source='created_at', read_only=True, format='%d.%m.%Y')

    class Meta:
        model = Estimate
        fields = [
            'estimate_id', 'estimate_number', 'name', 'objectId', 
            'project', 'project_id', 'creator', 'foreman',  # ДОБАВЛЕНЫ КРИТИЧЕСКИЕ ПОЛЯ
            'status', 'project_name', 'creator_name', 'foreman_name', 
            'totalAmount', 'mobile_total_amount', 'currency', 'created_at', 'createdDate'
        ]

    def get_foreman_name(self, obj):
        return obj.foreman.full_name if obj.foreman else 'Не назначен'
    
    def get_currency(self, obj):
        # По умолчанию грн
        return 'грн'

# --- Сериализаторы для Управления работами ---

class WorkPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkPrice
        fields = ['cost_price', 'client_price']

class WorkTypeSerializer(serializers.ModelSerializer):
    category = WorkCategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True)
    prices = WorkPriceSerializer(source='workprice', read_only=True)
    
    # Поля для записи цен
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True, required=False)
    client_price = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True, required=False)

    class Meta:
        model = WorkType
        fields = ['work_type_id', 'work_name', 'unit_of_measurement', 'category', 'category_id', 'prices', 'cost_price', 'client_price']
    
    def validate(self, data):
        # При создании новой работы цены обязательны
        if not self.instance and ('cost_price' not in data or 'client_price' not in data):
            raise serializers.ValidationError('При создании новой работы необходимо указать базовую цену и цену клиента')
        return data

from .models import EstimateItem


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ['status_id', 'status_name']

# --- Сериализаторы для Смет ---

class EstimateItemSerializer(serializers.ModelSerializer):
    # Поля для чтения для удобства фронтенда
    work_name = serializers.CharField(source='work_type.work_name', read_only=True)
    unit_of_measurement = serializers.CharField(source='work_type.unit_of_measurement', read_only=True)
    added_by_name = serializers.CharField(source='added_by.full_name', read_only=True)
    added_by_email = serializers.CharField(source='added_by.email', read_only=True)

    class Meta:
        model = EstimateItem
        fields = [
            'item_id', 'work_type', 'work_name', 'unit_of_measurement',
            'quantity', 'cost_price_per_unit', 'client_price_per_unit',
            'added_by', 'added_by_name', 'added_by_email'
        ]
        # work_type будет использоваться для записи (ожидает ID),
        # а вложенные поля work_name и unit_of_measurement - для чтения.
        read_only_fields = ['item_id', 'work_name', 'unit_of_measurement', 'added_by_name', 'added_by_email']


class EstimateDetailSerializer(serializers.ModelSerializer):
    # Поля для чтения (вложенные объекты)
    project = ProjectSerializer(read_only=True)
    creator = UserSerializer(read_only=True)
    status = StatusSerializer(read_only=True)
    foreman = UserSerializer(read_only=True)
    
    # Используем вложенный сериализатор для работ
    items = EstimateItemSerializer(many=True, required=False)
    
    # Поля для записи (ID)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True
    )
    status_id = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.all(), source='status', write_only=True, required=False
    )
    foreman_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='foreman', write_only=True, required=False
    )
    
    # Поля для совместимости с фронтендом
    name = serializers.CharField(source='estimate_number', required=False)
    
    class Meta:
        model = Estimate
        fields = [
            'estimate_id', 'estimate_number', 'name', 'status', 'status_id', 
            'project', 'project_id', 'creator', 'foreman', 'foreman_id',
            'client', 'created_at', 'items'
        ]

    def to_representation(self, instance):
        """Переопределяем для использования отфильтрованных элементов работ"""
        data = super().to_representation(instance)
        
        import logging
        logger = logging.getLogger('django')
        
        # Если есть отфильтрованные элементы (установлены в retrieve методе ViewSet)
        if hasattr(instance, '_filtered_items'):
            logger.warning(f"🔍 DEBUG serializer: Используем отфильтрованные items: {len(instance._filtered_items)}")
            data['items'] = EstimateItemSerializer(instance._filtered_items, many=True).data
        else:
            logger.warning(f"🔍 DEBUG serializer: Нет _filtered_items, используем стандартные items: {len(data.get('items', []))}")
        
        return data

    def validate(self, data):
        # Проверяем, что название сметы указано
        if not self.instance: # Только при создании
            estimate_number = data.get('estimate_number')
            if not estimate_number or not estimate_number.strip():
                raise serializers.ValidationError('Название сметы обязательно для заполнения')
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # ИСПРАВЛЕНО: Безопасное создание сметы с транзакционностью
        from django.db import transaction
        
        try:
            with transaction.atomic():
                estimate = Estimate.objects.create(**validated_data)
                work_type_ids = []
                created_items = []
                
                # Валидация и создание items
                for item_data in items_data:
                    work_type = item_data.get('work_type')
                    quantity = item_data.get('quantity', 0)
                    cost_price = item_data.get('cost_price_per_unit', 0)
                    client_price = item_data.get('client_price_per_unit', 0)
                    
                    # КРИТИЧНО: Валидация данных для предотвращения некорректных записей
                    if not work_type:
                        raise serializers.ValidationError(f'Не указан тип работы в позиции сметы')
                    if quantity <= 0:
                        raise serializers.ValidationError(f'Количество должно быть больше 0 (получено: {quantity})')
                    if cost_price < 0:
                        raise serializers.ValidationError(f'Себестоимость не может быть отрицательной (получено: {cost_price})')
                    if client_price < 0:
                        raise serializers.ValidationError(f'Цена клиента не может быть отрицательной (получено: {client_price})')
                    
                    # Проверяем существование work_type
                    if not WorkType.objects.filter(pk=work_type.pk if hasattr(work_type, 'pk') else work_type).exists():
                        raise serializers.ValidationError(f'Тип работы с ID {work_type} не найден')
                    
                    try:
                        # КРИТИЧНО: Устанавливаем added_by для отслеживания авторства
                        print(f"🔍 DEBUG create: context = {self.context}")
                        print(f"🔍 DEBUG create: 'request' in context = {'request' in self.context}")
                        
                        current_user = self.context.get('request').user if 'request' in self.context else None
                        print(f"🔍 DEBUG create: current_user = {current_user}")
                        
                        if current_user and hasattr(current_user, 'email'):
                            item_data['added_by'] = current_user
                            print(f"🔍 DEBUG create: ✅ Устанавливаем added_by = {current_user.email}")
                        else:
                            item_data['added_by'] = estimate.creator
                            print(f"🔍 DEBUG create: ⚠️ Нет request.user, используем creator = {estimate.creator.email if estimate.creator else 'None'}")
                        created_item = EstimateItem.objects.create(estimate=estimate, **item_data)
                        created_items.append(created_item)
                        work_type_ids.append(work_type.pk if hasattr(work_type, 'pk') else work_type)
                    except Exception as e:
                        raise serializers.ValidationError(f'Ошибка создания позиции сметы: {str(e)}')
                
                # Обновляем счетчики использования только после успешного создания всех items
                if work_type_ids:
                    WorkType.objects.filter(pk__in=work_type_ids).update(usage_count=F('usage_count') + 1)
                    
        except Exception as e:
            # Логируем ошибку для отладки
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Ошибка создания сметы: {str(e)}')
            raise
            
        return estimate

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        
        instance.estimate_number = validated_data.get('estimate_number', instance.estimate_number)
        instance.status = validated_data.get('status', instance.status)
        instance.project = validated_data.get('project', instance.project)
        instance.foreman = validated_data.get('foreman', instance.foreman)
        instance.save()

        # ИСПРАВЛЕНО: Безопасное обновление items с транзакционностью
        if items_data is not None:
            from django.db import transaction
            
            try:
                with transaction.atomic():
                    # КРИТИЧНО: Сохраняем информацию о том, кто добавил старые работы
                    old_items_authors = {}
                    for old_item in instance.items.all():
                        # Ключ - тип работы, значение - кто добавил
                        old_items_authors[old_item.work_type_id] = old_item.added_by_id
                    
                    # Теперь удаляем старые items
                    instance.items.all().delete()
                    
                    work_type_ids = []
                    created_items = []
                    
                    # Валидация и подготовка данных перед созданием
                    for item_data in items_data:
                        work_type = item_data.get('work_type')
                        quantity = item_data.get('quantity', 0)
                        cost_price = item_data.get('cost_price_per_unit', 0)
                        client_price = item_data.get('client_price_per_unit', 0)
                        
                        # КРИТИЧНО: Валидация данных для предотвращения некорректных записей
                        if not work_type:
                            raise serializers.ValidationError(f'Не указан тип работы в позиции сметы')
                        if quantity <= 0:
                            raise serializers.ValidationError(f'Количество должно быть больше 0 (получено: {quantity})')
                        if cost_price < 0:
                            raise serializers.ValidationError(f'Себестоимость не может быть отрицательной (получено: {cost_price})')
                        if client_price < 0:
                            raise serializers.ValidationError(f'Цена клиента не может быть отрицательной (получено: {client_price})')
                        
                        # Проверяем существование work_type
                        if not WorkType.objects.filter(pk=work_type.pk if hasattr(work_type, 'pk') else work_type).exists():
                            raise serializers.ValidationError(f'Тип работы с ID {work_type} не найден')
                        
                        try:
                            # КРИТИЧНО: Сохраняем авторство существующих работ или устанавливаем для новых
                            work_type_id = work_type.pk if hasattr(work_type, 'pk') else work_type
                            
                            # Проверяем, была ли эта работа раньше
                            if work_type_id in old_items_authors and old_items_authors[work_type_id] is not None:
                                # Сохраняем старого автора
                                from api.models import User
                                item_data['added_by'] = User.objects.get(pk=old_items_authors[work_type_id])
                                print(f"🔍 DEBUG update: Сохраняем старого автора для {work_type_id}")
                            else:
                                # Это новая работа - устанавливаем текущего пользователя
                                print(f"🔍 DEBUG update: context = {self.context}")
                                print(f"🔍 DEBUG update: 'request' in context = {'request' in self.context}")
                                
                                current_user = self.context.get('request').user if 'request' in self.context else None
                                print(f"🔍 DEBUG update: current_user = {current_user}")
                                
                                if current_user and hasattr(current_user, 'email'):
                                    item_data['added_by'] = current_user
                                    print(f"🔍 DEBUG update: ✅ НОВАЯ работа, added_by = {current_user.email}")
                                else:
                                    item_data['added_by'] = instance.foreman
                                    print(f"🔍 DEBUG update: ⚠️ НОВАЯ работа, используем foreman = {instance.foreman.email if instance.foreman else 'None'}")
                            
                            created_item = EstimateItem.objects.create(estimate=instance, **item_data)
                            created_items.append(created_item)
                            work_type_ids.append(work_type.pk if hasattr(work_type, 'pk') else work_type)
                        except Exception as e:
                            raise serializers.ValidationError(f'Ошибка создания позиции сметы: {str(e)}')
                    
                    # Обновляем счетчики использования только после успешного создания всех items
                    if work_type_ids:
                        WorkType.objects.filter(pk__in=work_type_ids).update(usage_count=F('usage_count') + 1)
                        
            except Exception as e:
                # Логируем ошибку для отладки
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Ошибка обновления сметы {instance.estimate_id}: {str(e)}')
                raise

        return instance