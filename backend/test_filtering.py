#!/usr/bin/env python
import os
import sys
import django

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.append('/home/kira/PycharmProjects/Estiamate_app_Gemeni/backend')
django.setup()

from api.models import User, Estimate, EstimateItem
from django.db.models import Q, Sum, F, DecimalField, Value
from django.db.models.functions import Coalesce

def test_foreman_filtering():
    """Тест фильтрации данных для прорабов"""
    print("=== ТЕСТ ФИЛЬТРАЦИИ ДЛЯ ПРОРАБОВ ===\n")
    
    # Найдем пользователей
    try:
        manager = User.objects.filter(role__role_name='менеджер').first()
        foreman = User.objects.filter(role__role_name='прораб').first()
        
        if not manager:
            print("❌ МЕНЕДЖЕР НЕ НАЙДЕН")
            return
        if not foreman:
            print("❌ ПРОРАБ НЕ НАЙДЕН") 
            return
            
        print(f"👨‍💼 Менеджер: {manager.email}")
        print(f"👷‍♂️ Прораб: {foreman.email}\n")
        
        # Проверим сметы
        print("=== СМЕТЫ ===")
        all_estimates = Estimate.objects.all()
        print(f"📊 Всего смет в системе: {all_estimates.count()}")
        
        manager_estimates = Estimate.objects.all()  # Менеджер видит все
        foreman_estimates = Estimate.objects.filter(foreman=foreman)  # Прораб только свои
        
        print(f"👨‍💼 Менеджер видит смет: {manager_estimates.count()}")  
        print(f"👷‍♂️ Прораб видит смет: {foreman_estimates.count()}")
        
        # Проверим элементы смет
        print("\n=== ЭЛЕМЕНТЫ СМЕТ ===")
        all_items = EstimateItem.objects.all()
        print(f"📋 Всего элементов в системе: {all_items.count()}")
        
        # Для менеджера - все элементы
        manager_items = EstimateItem.objects.all()
        print(f"👨‍💼 Менеджер видит элементов: {manager_items.count()}")
        
        # Для прораба - только свои элементы в своих сметах
        foreman_items = EstimateItem.objects.filter(
            estimate__foreman=foreman
        ).filter(
            Q(added_by=foreman) | Q(added_by__isnull=True)
        )
        print(f"👷‍♂️ Прораб видит элементов: {foreman_items.count()}")
        
        # Проверим расчет сумм
        print("\n=== РАСЧЕТ СУММ ===")
        
        # Для менеджера - полная сумма
        manager_total = Estimate.objects.annotate(
            totalAmount=Coalesce(
                Sum(
                    F('items__quantity') * F('items__cost_price_per_unit'),
                    output_field=DecimalField()
                ),
                Value(0.0),
                output_field=DecimalField()
            )
        )
        
        if manager_total.exists():
            manager_sum = sum(e.totalAmount for e in manager_total if e.totalAmount)
            print(f"👨‍💼 Менеджер видит общую сумму: {manager_sum} грн")
        
        # Для прораба - только сумма своих работ
        foreman_total = Estimate.objects.filter(foreman=foreman).annotate(
            totalAmount=Coalesce(
                Sum(
                    F('items__quantity') * F('items__cost_price_per_unit'),
                    output_field=DecimalField(),
                    filter=Q(items__added_by=foreman) | Q(items__added_by__isnull=True)
                ),
                Value(0.0),
                output_field=DecimalField()
            )
        )
        
        if foreman_total.exists():
            foreman_sum = sum(e.totalAmount for e in foreman_total if e.totalAmount)
            print(f"👷‍♂️ Прораб видит свою сумму: {foreman_sum} грн")
            
        print("\n✅ ТЕСТ ЗАВЕРШЕН")
        
        # Детализация по сметам
        print("\n=== ДЕТАЛИЗАЦИЯ ПО СМЕТАМ ===")
        for estimate in foreman_estimates:
            items = EstimateItem.objects.filter(
                estimate=estimate
            ).filter(
                Q(added_by=foreman) | Q(added_by__isnull=True)
            )
            
            total = sum(
                float(item.quantity) * float(item.cost_price_per_unit)
                for item in items
            )
            
            print(f"📋 Смета '{estimate.estimate_number}': {items.count()} работ, {total} грн")
            for item in items:
                author = item.added_by.email if item.added_by else "Старая работа"
                print(f"  - {item.work_type.work_name}: {author}")
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_foreman_filtering()