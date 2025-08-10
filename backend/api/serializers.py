from rest_framework import serializers
from .models import WorkCategory, User, Project, Estimate, WorkType, WorkPrice, Status

# --- Сериализатор для логина (кастомный) ---
class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='role.role_name')
    class Meta:
        model = User
        fields = ['user_id', 'full_name', 'role']

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

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
    name = serializers.CharField(source='estimate_number', read_only=True)  # фронтенд ожидает 'name'
    objectId = serializers.IntegerField(source='project.project_id', read_only=True)  # фронтенд ожидает 'objectId'
    
    # Дополнительные поля для отображения
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    status = serializers.CharField(source='status.status_name', read_only=True)
    foreman_name = serializers.SerializerMethodField()
    
    # Поля для совместимости (пока заглушки)
    totalAmount = serializers.SerializerMethodField()
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
    
    def get_totalAmount(self, obj):
        # TODO: Реализовать подсчет общей суммы из EstimateItem
        return 0
    
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

    class Meta:
        model = WorkType
        fields = ['work_type_id', 'work_name', 'unit_of_measurement', 'category', 'category_id', 'prices']

class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ['status_id', 'status_name']

# --- Сериализаторы для Смет ---

class EstimateSerializer(serializers.ModelSerializer):
    # Для создания/обновления сметы
    class Meta:
        model = Estimate
        fields = '__all__'

class EstimateDetailSerializer(serializers.ModelSerializer):
    # Поля для чтения (вложенные объекты)
    project = ProjectSerializer(read_only=True)
    creator = UserSerializer(read_only=True)
    status = StatusSerializer(read_only=True)
    foreman = UserSerializer(read_only=True)
    
    # Поля для записи (ID)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True
    )
    status_id = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.all(), source='status', write_only=True, required=False
    )
    
    # Поля для совместимости с фронтендом
    name = serializers.CharField(source='estimate_number', required=False)
    items = serializers.SerializerMethodField()  # Пока пустой список
    
    def validate(self, data):
        # Проверяем, что название сметы указано
        estimate_number = data.get('estimate_number')
        if not estimate_number or not estimate_number.strip():
            raise serializers.ValidationError('Название сметы обязательно для заполнения')
        return data

    class Meta:
        model = Estimate
        fields = [
            'estimate_id', 'estimate_number', 'name', 'status', 'status_id', 
            'project', 'project_id', 'creator', 'foreman', 
            'client', 'created_at', 'items'
        ]
        
    def get_items(self, obj):
        # TODO: Реализовать получение EstimateItem
        return []