
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from api.models import Role, User, WorkCategory, Status

class Command(BaseCommand):
    help = 'Seeds the database with initial data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # Создание ролей
        role_manager, _ = Role.objects.get_or_create(role_name='менеджер')
        role_foreman, _ = Role.objects.get_or_create(role_name='прораб')

        # Создание пользователей
        # ВАЖНО: Используем встроенную систему паролей Django
        if not User.objects.filter(email='manager@example.com').exists():
            User.objects.create(
                email='manager@example.com',
                full_name='Елена Смирнова',
                role=role_manager,
                password_hash=make_password('password123') # Пароль для всех: password123
            )
        
        if not User.objects.filter(email='foreman@example.com').exists():
            User.objects.create(
                email='foreman@example.com',
                full_name='Иван Петров',
                role=role_foreman,
                password_hash=make_password('password123')
            )

        # Создание категорий работ
        WorkCategory.objects.get_or_create(category_name='Земляные работы')
        WorkCategory.objects.get_or_create(category_name='Фундаментные работы')
        WorkCategory.objects.get_or_create(category_name='Каменные работы')

        # Создание статусов
        Status.objects.get_or_create(status_name='Черновик')
        Status.objects.get_or_create(status_name='На согласовании')
        Status.objects.get_or_create(status_name='В работе')
        Status.objects.get_or_create(status_name='Завершена')
        Status.objects.get_or_create(status_name='Отклонена')

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
