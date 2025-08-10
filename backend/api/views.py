from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.hashers import check_password
from django.db.models import Sum, F, DecimalField, Value
from django.db.models.functions import Coalesce

from .models import WorkCategory, User, AuthToken, Project, Estimate, WorkType, Status, WorkPrice, Role, ProjectAssignment
from .serializers import (
    WorkCategorySerializer, LoginSerializer, UserSerializer, ProjectSerializer, 
    EstimateListSerializer, WorkTypeSerializer, StatusSerializer, EstimateDetailSerializer, RoleSerializer,
    ProjectAssignmentSerializer
)
from .permissions import IsManager, IsAuthenticatedCustom

class LoginView(APIView):
    permission_classes = []
    authentication_classes = []
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            try:
                user = User.objects.select_related('role').get(email=email)
            except User.DoesNotExist:
                return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

            if check_password(password, user.password_hash):
                token, _ = AuthToken.objects.update_or_create(user=user)
                return Response({
                    'token': str(token.token),
                    'user': UserSerializer(user).data
                })
            else:
                return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- ViewSets для управления ---

class WorkCategoryViewSet(viewsets.ModelViewSet):
    queryset = WorkCategory.objects.all()
    serializer_class = WorkCategorySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.permission_classes = [IsAuthenticatedCustom]
        else:
            self.permission_classes = [IsAuthenticatedCustom, IsManager]
        return super().get_permissions()

class WorkTypeViewSet(viewsets.ModelViewSet):
    queryset = WorkType.objects.select_related('category', 'workprice').order_by('-usage_count')
    serializer_class = WorkTypeSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.permission_classes = [IsAuthenticatedCustom]
        else:
            self.permission_classes = [IsAuthenticatedCustom, IsManager]
        return super().get_permissions()

    def perform_create(self, serializer):
        # Извлекаем данные о ценах из запроса
        cost_price = serializer.validated_data.pop('cost_price')
        client_price = serializer.validated_data.pop('client_price')
        
        # Создаем WorkType
        work_type = serializer.save()
        
        # Создаем соответствующую запись в WorkPrice с указанными ценами
        WorkPrice.objects.create(
            work_type=work_type, 
            cost_price=cost_price, 
            client_price=client_price
        )
    
    def perform_update(self, serializer):
        # Проверяем, есть ли данные о ценах в запросе
        cost_price = serializer.validated_data.pop('cost_price', None)
        client_price = serializer.validated_data.pop('client_price', None)
        
        # Обновляем WorkType
        work_type = serializer.save()
        
        # Обновляем цены, если они переданы
        if cost_price is not None or client_price is not None:
            work_price, created = WorkPrice.objects.get_or_create(work_type=work_type)
            if cost_price is not None:
                work_price.cost_price = cost_price
            if client_price is not None:
                work_price.client_price = client_price
            work_price.save()

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role.role_name == 'менеджер':
            return Project.objects.all()
        else:
            return Project.objects.filter(projectassignment__user=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticatedCustom, IsManager]
        else:
            self.permission_classes = [IsAuthenticatedCustom]
        return super().get_permissions()

class StatusListView(generics.ListAPIView):
    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    permission_classes = [IsAuthenticatedCustom]

class EstimateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedCustom]

    def get_serializer_class(self):
        if self.action == 'list':
            return EstimateListSerializer
        return EstimateDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        try:
            draft_status = Status.objects.get(status_name='Черновик')
        except Status.DoesNotExist:
            draft_status = None

        serializer.save(
            creator=user,
            foreman=user, 
            status=draft_status
        )

    def get_queryset(self):
        user = self.request.user
        
        # Базовый queryset с оптимизацией для связанных полей
        queryset = Estimate.objects.select_related(
            'project', 'creator', 'status', 'foreman'
        ).all()

        # Фильтруем по роли пользователя
        if user.role.role_name != 'менеджер':
            # Прораб видит только те сметы, где он назначен прорабом
            queryset = queryset.filter(foreman=user)

        # Если это запрос на список, добавляем аннотацию с общей суммой
        if self.action == 'list':
            queryset = queryset.annotate(
                totalAmount=Coalesce(
                    Sum(
                        F('items__quantity') * F('items__cost_price_per_unit'),
                        output_field=DecimalField()
                    ),
                    Value(0.0), # Если нет работ, вернуть 0.0
                    output_field=DecimalField()
                )
            )
        else:
            # Для детального просмотра предзагружаем работы
            queryset = queryset.prefetch_related('items', 'items__work_type')
        
        return queryset

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('role').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedCustom, IsManager]

class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticatedCustom, IsManager]

class ProjectAssignmentViewSet(viewsets.ModelViewSet):
    queryset = ProjectAssignment.objects.select_related('project', 'user').all()
    serializer_class = ProjectAssignmentSerializer
    permission_classes = [IsAuthenticatedCustom, IsManager]
