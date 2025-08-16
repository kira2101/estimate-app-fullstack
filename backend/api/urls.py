from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    ProjectViewSet,
    WorkCategoryViewSet,
    WorkTypeViewSet,
    StatusListView,
    HealthCheckView,
    EstimateViewSet, # Импортируем новый ViewSet
    UserViewSet,
    RoleViewSet,
    ProjectAssignmentViewSet,
    WorkTypeImportView,
    EstimateClientExportView,
    EstimateInternalExportView
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'work-categories', WorkCategoryViewSet, basename='work-category')
router.register(r'work-types', WorkTypeViewSet, basename='work-type')
router.register(r'estimates', EstimateViewSet, basename='estimate') # Регистрируем сметы
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'project-assignments', ProjectAssignmentViewSet, basename='project-assignment')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('work-types/import/', WorkTypeImportView.as_view(), name='work-type-import'),
    path('auth/login/', LoginView.as_view(), name='custom_login'),
    path('statuses/', StatusListView.as_view(), name='status-list'),
    path('estimates/<int:estimate_id>/export/client/', EstimateClientExportView.as_view(), name='estimate-client-export'),
    path('estimates/<int:estimate_id>/export/internal/', EstimateInternalExportView.as_view(), name='estimate-internal-export'),
    path('', include(router.urls)),
]