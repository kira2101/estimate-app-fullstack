from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """Импортируем signals когда приложение готово"""
        try:
            from . import sse_views  # Импортируем SSE signals
        except ImportError:
            pass
