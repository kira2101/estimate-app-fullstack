
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import AuthToken, User

class CustomTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        try:
            auth_token = AuthToken.objects.select_related('user', 'user__role').get(token=token)
        except (AuthToken.DoesNotExist, ValueError):
            # ValueError can be raised if token is not a valid UUID format
            raise AuthenticationFailed('Invalid token')

        # В Django User модель для DRF должна быть django.contrib.auth.models.User
        # Мы симулируем это, но для реального проекта нужна интеграция
        # Для целей этого прототипа, мы просто возвращаем нашего кастомного юзера
        # Убедимся, что у юзера есть необходимые атрибуты для DRF
        user = auth_token.user
        return (user, None)
