from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    EstimateListView,
    ProjectViewSet,
    WorkCategoryViewSet,
    WorkTypeViewSet
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'work-categories', WorkCategoryViewSet, basename='work-category')
router.register(r'work-types', WorkTypeViewSet, basename='work-type') # Регистрируем работы

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='custom_login'),
    path('estimates/', EstimateListView.as_view(), name='estimate-list'),
    path('', include(router.urls)),
]