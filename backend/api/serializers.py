
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
    project_name = serializers.CharField(source='project.project_name', read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    status_name = serializers.CharField(source='status.status_name', read_only=True)
    foreman_name = serializers.SerializerMethodField()

    class Meta:
        model = Estimate
        fields = ['estimate_id', 'estimate_number', 'status', 'status_name', 'project_name', 'creator_name', 'foreman_name', 'created_at']

    def get_foreman_name(self, obj):
        return obj.foreman.full_name if obj.foreman else 'Не назначен'

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
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), source='project', write_only=True
    )
    creator = UserSerializer(read_only=True)
    status = StatusSerializer(read_only=True)
    status_id = serializers.PrimaryKeyRelatedField(
        queryset=Status.objects.all(), source='status', write_only=True
    )
    foreman = UserSerializer(read_only=True)
    foreman_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='foreman', write_only=True, allow_null=True
    )

    class Meta:
        model = Estimate
        fields = ['estimate_id', 'estimate_number', 'status', 'status_id', 'project', 'project_id', 'creator', 'foreman', 'foreman_id', 'client', 'created_at']
