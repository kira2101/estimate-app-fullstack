from django.core.management.base import BaseCommand
from api.models import EstimateItem, Estimate

class Command(BaseCommand):
    help = 'Исправляет поле added_by для существующих работ в сметах'

    def handle(self, *args, **options):
        # Найдем все работы без указанного автора
        items_without_author = EstimateItem.objects.filter(added_by__isnull=True)
        
        self.stdout.write(
            self.style.WARNING(f'Найдено работ без автора: {items_without_author.count()}')
        )
        
        updated_count = 0
        for item in items_without_author:
            # Устанавливаем автором прораба сметы
            if item.estimate.foreman:
                item.added_by = item.estimate.foreman
                item.save()
                updated_count += 1
                self.stdout.write(f'Обновлена работа {item.work_type.work_name} в смете {item.estimate.estimate_number}: автор = {item.estimate.foreman.email}')
        
        self.stdout.write(
            self.style.SUCCESS(f'Успешно обновлено работ: {updated_count}')
        )