from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    ProjectViewSet,
    WorkCategoryViewSet,
    WorkTypeViewSet,
    StatusListView,
    EstimateViewSet, # Импортируем новый ViewSet
    UserViewSet,
    RoleViewSet,
    ProjectAssignmentViewSet
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
    path('auth/login/', LoginView.as_view(), name='custom_login'),
    path('statuses/', StatusListView.as_view(), name='status-list'),
    path('', include(router.urls)),
]