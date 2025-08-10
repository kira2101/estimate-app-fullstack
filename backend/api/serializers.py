from rest_framework import serializers
from django.contrib.auth.hashers import make_password
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
    
    # Дополнительные поля для отображения
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    status = serializers.CharField(source='status.status_name', read_only=True)
    foreman_name = serializers.SerializerMethodField()
    
    # Используем поле, рассчитанное в ViewSet через аннотацию
    # totalAmount уже есть в queryset, поэтому просто объявляем его
    totalAmount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    currency = serializers.SerializerMethodField()
    createdDate = serializers.DateTimeField(source='created_at', read_only=True, format='%d.%m.%Y')

    class Meta:
        model = Estimate
        fields = [
            'estimate_id', 'estimate_number', 'name', 'objectId', 
            'status', 'project_name', 'creator_name', 'foreman_name', 
            'totalAmount', 'currency', 'created_at', 'createdDate'
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

    class Meta:
        model = EstimateItem
        fields = [
            'item_id', 'work_type', 'work_name', 'unit_of_measurement',
            'quantity', 'cost_price_per_unit', 'client_price_per_unit'
        ]
        # work_type будет использоваться для записи (ожидает ID),
        # а вложенные поля work_name и unit_of_measurement - для чтения.
        read_only_fields = ['item_id', 'work_name', 'unit_of_measurement']


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

    def validate(self, data):
        # Проверяем, что название сметы указано
        if not self.instance: # Только при создании
            estimate_number = data.get('estimate_number')
            if not estimate_number or not estimate_number.strip():
                raise serializers.ValidationError('Название сметы обязательно для заполнения')
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        estimate = Estimate.objects.create(**validated_data)
        for item_data in items_data:
            # Убираем work_type из item_data, так как он уже есть в виде work_type_id
            # и может вызывать конфликт при создании
            # work_type_instance = item_data.pop('work_type')
            EstimateItem.objects.create(estimate=estimate, **item_data)
        return estimate

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Обновляем поля самой сметы
        instance.estimate_number = validated_data.get('estimate_number', instance.estimate_number)
        instance.status = validated_data.get('status', instance.status)
        instance.project = validated_data.get('project', instance.project)
        instance.foreman = validated_data.get('foreman', instance.foreman)
        instance.save()

        # Обновляем вложенные работы (простой способ: удалить старые и создать новые)
        # Это гарантирует, что состав сметы будет точно соответствовать переданному
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                EstimateItem.objects.create(estimate=instance, **item_data)

        return instance