from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    CurrentUserView,
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
    EstimateInternalExportView,
    EstimateItemViewSet
)
from .sse_views import SSEView, sse_stats

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'work-categories', WorkCategoryViewSet, basename='work-category')
router.register(r'work-types', WorkTypeViewSet, basename='work-type')
router.register(r'estimates', EstimateViewSet, basename='estimate') # Регистрируем сметы
router.register(r'estimate-items', EstimateItemViewSet, basename='estimate-item') # Регистрируем элементы смет
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'project-assignments', ProjectAssignmentViewSet, basename='project-assignment')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('work-types/import/', WorkTypeImportView.as_view(), name='work-type-import'),
    path('auth/login/', LoginView.as_view(), name='custom_login'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('statuses/', StatusListView.as_view(), name='status-list'),
    path('estimates/<int:estimate_id>/export/client/', EstimateClientExportView.as_view(), name='estimate-client-export'),
    path('estimates/<int:estimate_id>/export/internal/', EstimateInternalExportView.as_view(), name='estimate-internal-export'),
    # SSE endpoints
    path('sse/events/', SSEView.as_view(), name='sse-events'),
    path('sse/stats/', sse_stats, name='sse-stats'),
    path('', include(router.urls)),
]