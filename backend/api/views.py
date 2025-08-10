from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.hashers import check_password
from .models import WorkCategory, User, AuthToken, Project, Estimate, WorkType, Status
from .serializers import (
    WorkCategorySerializer, LoginSerializer, UserSerializer, ProjectSerializer, 
    EstimateListSerializer, WorkTypeSerializer, StatusSerializer, EstimateSerializer
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
    permission_classes = [IsAuthenticatedCustom, IsManager]

class WorkTypeViewSet(viewsets.ModelViewSet):
    queryset = WorkType.objects.select_related('category', 'workprice').all()
    serializer_class = WorkTypeSerializer
    permission_classes = [IsAuthenticatedCustom, IsManager]

    def perform_create(self, serializer):
        work_type = serializer.save()
        WorkPrice.objects.create(work_type=work_type, cost_price=0, client_price=0)

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
    queryset = Estimate.objects.select_related('project', 'creator', 'status').all()
    serializer_class = EstimateSerializer
    permission_classes = [IsAuthenticatedCustom]

    def perform_create(self, serializer):
        # Автоматически устанавливаем создателя сметы
        serializer.save(creator=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.role.role_name == 'менеджер':
            return Estimate.objects.select_related('project', 'creator', 'status').all()
        else:
            # Прораб видит только свои сметы или сметы по своим проектам
            assigned_projects = Project.objects.filter(projectassignment__user=user)
            return Estimate.objects.filter(project__in=assigned_projects).select_related('project', 'creator', 'status')

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.select_related('role').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedCustom, IsManager]


# --- View для списков (старые, которые теперь заменены ViewSet-ами) ---

# class EstimateListView(generics.ListAPIView):
#     serializer_class = EstimateListSerializer
#     permission_classes = [IsAuthenticatedCustom]

#     def get_queryset(self):
#         user = self.request.user
#         if user.role.role_name == 'менеджер':
#             return Estimate.objects.select_related('project', 'creator', 'status').all()
#         else:
#             assigned_projects = Project.objects.filter(projectassignment__user=user)
#             return Estimate.objects.filter(project__in=assigned_projects).select_related('project', 'creator', 'status')