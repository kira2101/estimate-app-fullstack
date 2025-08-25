#!/usr/bin/env python3
import os
import sys
import django

# Настройка Django окружения
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Estimate, EstimateItem, User
from django.db.models import Sum, F, DecimalField, Value
from django.db.models.functions import Coalesce
from api.serializers import EstimateListSerializer
from decimal import Decimal

def simulate_api_call():
    """Симуляция API вызова, как это происходит в приложении"""
    
    print("=== СИМУЛЯЦИЯ API ВЫЗОВОВ ===\n")
    
    # Получим пользователей для тестирования
    manager = User.objects.filter(role__role_name='менеджер').first()
    foreman = User.objects.filter(role__role_name='прораб').first()
    
    print(f"Менеджер: {manager.full_name if manager else 'НЕ НАЙДЕН'}")
    print(f"Прораб: {foreman.full_name if foreman else 'НЕ НАЙДЕН'}")
    print()
    
    # Проверим запросы как делает EstimateViewSet для разных ролей
    
    print("=== 1. ЗАПРОС МЕНЕДЖЕРА (как EstimateViewSet) ===")
    
    # Базовый queryset с оптимизацией для связанных полей (как в EstimateViewSet)
    manager_queryset = Estimate.objects.select_related(
        'project', 'creator', 'status', 'foreman'
    ).all()
    
    # Менеджер видит все сметы (без фильтрации)
    # Добавляем аннотацию с общей суммой (как в EstimateViewSet для list)
    manager_queryset = manager_queryset.annotate(
        totalAmount=Coalesce(
            Sum(
                F('items__quantity') * F('items__cost_price_per_unit'),
                output_field=DecimalField()
            ),
            Value(0.0), # Если нет работ, вернуть 0.0
            output_field=DecimalField()
        )
    )
    
    print(f"Менеджер видит смет: {manager_queryset.count()}")
    for estimate in manager_queryset[:3]:
        print(f"  - ID {estimate.estimate_id}: {estimate.estimate_number} -> {estimate.totalAmount}")
    
    print()
    print("=== 2. ЗАПРОС ПРОРАБА (как EstimateViewSet) ===")
    
    if foreman:
        # Базовый queryset с оптимизацией для связанных полей (как в EstimateViewSet)
        foreman_queryset = Estimate.objects.select_related(
            'project', 'creator', 'status', 'foreman'
        ).all()
        
        # КРИТИЧЕСКИ ВАЖНО: Фильтруем по роли пользователя для ВСЕХ операций
        # Прораб видит ТОЛЬКО те сметы, где он назначен прорабом
        foreman_queryset = foreman_queryset.filter(foreman=foreman)
        
        # Добавляем аннотацию с общей суммой
        foreman_queryset = foreman_queryset.annotate(
            totalAmount=Coalesce(
                Sum(
                    F('items__quantity') * F('items__cost_price_per_unit'),
                    output_field=DecimalField()
                ),
                Value(0.0), # Если нет работ, вернуть 0.0
                output_field=DecimalField()
            )
        )
        
        print(f"Прораб {foreman.full_name} видит смет: {foreman_queryset.count()}")
        for estimate in foreman_queryset:
            print(f"  - ID {estimate.estimate_id}: {estimate.estimate_number} -> {estimate.totalAmount}")
    
    print()
    print("=== 3. ПРОВЕРКА РОЛИ ФИЛЬТРАЦИИ НА ESTIMATE ITEMS ===")
    
    # Выберем одну смету для детального анализа
    test_estimate = Estimate.objects.first()
    if test_estimate:
        print(f"Тестируем смету: ID {test_estimate.estimate_id} - {test_estimate.estimate_number}")
        print(f"Прораб сметы: {test_estimate.foreman.full_name if test_estimate.foreman else 'Не назначен'}")
        
        # 1. Все элементы сметы (как видит менеджер)
        all_items = EstimateItem.objects.filter(estimate=test_estimate)
        print(f"Всего элементов в смете (менеджер): {all_items.count()}")
        
        # 2. Элементы как видит прораб этой сметы
        if test_estimate.foreman:
            foreman_items = EstimateItem.objects.filter(
                estimate=test_estimate,
                estimate__foreman=test_estimate.foreman
            )
            print(f"Элементов доступно прорабу сметы: {foreman_items.count()}")
            
            # Есть ли разница?
            if all_items.count() != foreman_items.count():
                print("  ВНИМАНИЕ: Количество элементов отличается!")
                
                print("  Элементы, которые видит прораб:")
                for item in foreman_items:
                    print(f"    - {item.work_type.work_name}, добавил: {item.added_by.full_name if item.added_by else 'Неизвестно'}")
                
                print("  Элементы, которые НЕ видит прораб:")
                hidden_items = all_items.exclude(id__in=foreman_items.values_list('id', flat=True))
                for item in hidden_items:
                    print(f"    - {item.work_type.work_name}, добавил: {item.added_by.full_name if item.added_by else 'Неизвестно'}")
            else:
                print("  Прораб видит все элементы своей сметы - фильтрация работает корректно")
        
        # 3. Элементы как видит другой прораб (должен быть пустой список)
        if foreman and foreman != test_estimate.foreman:
            other_foreman_items = EstimateItem.objects.filter(
                estimate=test_estimate,
                estimate__foreman=foreman  # НЕ тот прораб
            )
            print(f"Элементов доступно другому прорабу: {other_foreman_items.count()} (должно быть 0)")
    
    print()
    print("=== 4. ПРОВЕРКА ПОТЕНЦИАЛЬНОЙ ПРОБЛЕМЫ С ПОЛЕ added_by ===")
    
    # Найдем элементы без added_by
    items_without_added_by = EstimateItem.objects.filter(added_by__isnull=True)
    print(f"Элементов без поля added_by: {items_without_added_by.count()}")
    
    if items_without_added_by.count() > 0:
        print("  Сметы с элементами без added_by:")
        for item in items_without_added_by:
            print(f"    - Смета ID {item.estimate.estimate_id}: {item.work_type.work_name}")
            print(f"      Прораб сметы: {item.estimate.foreman.full_name if item.estimate.foreman else 'Не назначен'}")
    
    print()
    print("=== 5. ПРОВЕРКА SERIALIZER LOGIC ===")
    
    # Симулируем как работает EstimateListSerializer
    print("Тестируем EstimateListSerializer:")
    
    # Возьмем queryset как в EstimateViewSet
    serializer_queryset = Estimate.objects.select_related(
        'project', 'creator', 'status', 'foreman'
    ).annotate(
        totalAmount=Coalesce(
            Sum(
                F('items__quantity') * F('items__cost_price_per_unit'),
                output_field=DecimalField()
            ),
            Value(0.0),
            output_field=DecimalField()
        )
    )[:3]  # первые 3
    
    serializer = EstimateListSerializer(serializer_queryset, many=True)
    serialized_data = serializer.data
    
    print("Сериализованные данные:")
    for estimate_data in serialized_data:
        print(f"  - ID {estimate_data['estimate_id']}: totalAmount = {estimate_data['totalAmount']}")

if __name__ == "__main__":
    simulate_api_call()