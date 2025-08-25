#!/usr/bin/env python3
import os
import sys
import django

# Настройка Django окружения
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import Estimate, EstimateItem
from django.db.models import Sum, F, DecimalField, Value
from django.db.models.functions import Coalesce
from decimal import Decimal

def analyze_estimates():
    """Анализ расчета сумм смет"""
    
    print("=== АНАЛИЗ РАСЧЕТА СУММ СМЕТ ===\n")
    
    # Получим все сметы
    estimates = Estimate.objects.all()
    print(f"Всего смет: {estimates.count()}")
    
    # Для каждой сметы проверим расчеты
    for estimate in estimates[:5]:  # первые 5 для анализа
        print(f"\n=== Смета ID: {estimate.estimate_id} ===")
        print(f"Название: {estimate.estimate_number}")
        print(f"Прораб: {estimate.foreman.full_name if estimate.foreman else 'Не назначен'}")
        
        # Получим все элементы этой сметы
        items = EstimateItem.objects.filter(estimate=estimate)
        print(f"Элементов в смете: {items.count()}")
        
        if items.count() == 0:
            print("  ПУСТАЯ СМЕТА")
            continue
        
        # Рассчитаем сумму вручную (cost price)
        manual_cost_total = Decimal('0.00')
        manual_client_total = Decimal('0.00')
        
        for item in items:
            cost_total = item.quantity * item.cost_price_per_unit
            client_total = item.quantity * item.client_price_per_unit
            manual_cost_total += cost_total
            manual_client_total += client_total
            
            print(f"  - {item.work_type.work_name}:")
            print(f"    Кол-во: {item.quantity}")
            print(f"    Себестоимость: {item.cost_price_per_unit} -> {cost_total}")
            print(f"    Клиентская цена: {item.client_price_per_unit} -> {client_total}")
            if item.added_by:
                print(f"    Добавил: {item.added_by.full_name}")
        
        print(f"\nРУЧНОЙ РАСЧЕТ:")
        print(f"  Себестоимость ИТОГО: {manual_cost_total}")
        print(f"  Клиентская ИТОГО: {manual_client_total}")
        
        # Рассчитаем сумму через аннотацию (как в ViewSet)
        annotated_query = Estimate.objects.filter(estimate_id=estimate.estimate_id).annotate(
            totalAmount=Coalesce(
                Sum(
                    F('items__quantity') * F('items__cost_price_per_unit'),
                    output_field=DecimalField()
                ),
                Value(0.0),
                output_field=DecimalField()
            )
        ).first()
        
        print(f"\nВIEWSET АННОТАЦИЯ:")
        print(f"  totalAmount (себестоимость): {annotated_query.totalAmount}")
        
        # Проверим, совпадают ли расчеты
        matches = abs(float(manual_cost_total) - float(annotated_query.totalAmount or 0)) < 0.01
        print(f"  Расчеты совпадают: {'ДА' if matches else 'НЕТ'}")
        
        # Проверим роли прорабов и доступность элементов смет
        if estimate.foreman:
            print(f"\nРОЛЕВАЯ ФИЛЬТРАЦИЯ:")
            print(f"  Прораб роль: {estimate.foreman.role.role_name}")
            
            # Проверим, какие элементы видел бы прораб через EstimateItemViewSet
            foreman_visible_items = EstimateItem.objects.filter(
                estimate=estimate,
                estimate__foreman=estimate.foreman
            )
            print(f"  Элементов доступно прорабу: {foreman_visible_items.count()}")
            
            # Все элементы (для менеджера)
            all_items = EstimateItem.objects.filter(estimate=estimate)
            print(f"  Всего элементов (менеджер): {all_items.count()}")
        
        print("-" * 50)

if __name__ == "__main__":
    analyze_estimates()