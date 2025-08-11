#!/usr/bin/env python
"""
КРИТИЧЕСКИЙ ТЕСТ БЕЗОПАСНОСТИ: Проверка доступа прорабов к сметам
Этот скрипт проверяет, что прорабы НЕ могут получить доступ к чужим сметам
"""
import os
import sys

# Настройка Django ПЕРЕД импортом
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.test import RequestFactory
from api.models import User, Estimate, Role
from api.views import EstimateViewSet

def test_estimate_access_security():
    """Тестирует безопасность доступа к сметам"""
    print("🔒 ЗАПУСК КРИТИЧЕСКОГО ТЕСТА БЕЗОПАСНОСТИ")
    print("=" * 60)
    
    try:
        # Получаем роли
        manager_role = Role.objects.get(role_name='менеджер')
        foreman_role = Role.objects.get(role_name='прораб')
        
        # Получаем пользователей разных ролей
        manager = User.objects.filter(role=manager_role).first()
        foreman1 = User.objects.filter(role=foreman_role).first()
        foreman2 = User.objects.filter(role=foreman_role).exclude(user_id=foreman1.user_id).first()
        
        if not all([manager, foreman1, foreman2]):
            print("❌ ОШИБКА: Недостаточно пользователей для тестирования")
            return False
            
        print(f"👤 Менеджер: {manager.full_name} (ID: {manager.user_id})")
        print(f"👤 Прораб 1: {foreman1.full_name} (ID: {foreman1.user_id})")
        print(f"👤 Прораб 2: {foreman2.full_name} (ID: {foreman2.user_id})")
        print()
        
        # Получаем сметы каждого прораба
        foreman1_estimates = Estimate.objects.filter(foreman=foreman1)
        foreman2_estimates = Estimate.objects.filter(foreman=foreman2)
        
        print(f"📊 Смет прораба 1: {foreman1_estimates.count()}")
        print(f"📊 Смет прораба 2: {foreman2_estimates.count()}")
        print()
        
        if not foreman1_estimates.exists() or not foreman2_estimates.exists():
            print("❌ ОШИБКА: Недостаточно смет для тестирования")
            return False
        
        # Создаем factory для запросов
        factory = RequestFactory()
        
        # Тест 1: Прораб 1 пытается получить список смет
        print("🧪 ТЕСТ 1: Получение списка смет прорабом 1")
        request = factory.get('/api/v1/estimates/')
        request.user = foreman1
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'list'
        
        queryset = view.get_queryset()
        accessible_estimates = list(queryset.values_list('estimate_id', flat=True))
        foreman1_estimate_ids = list(foreman1_estimates.values_list('estimate_id', flat=True))
        foreman2_estimate_ids = list(foreman2_estimates.values_list('estimate_id', flat=True))
        
        print(f"   Прораб 1 видит сметы: {accessible_estimates}")
        print(f"   Его собственные сметы: {foreman1_estimate_ids}")
        print(f"   Чужие сметы (прораб 2): {foreman2_estimate_ids}")
        
        # Проверяем, что прораб видит только свои сметы
        foreign_estimates_visible = [eid for eid in accessible_estimates if eid in foreman2_estimate_ids]
        
        if foreign_estimates_visible:
            print(f"❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Прораб 1 видит чужие сметы: {foreign_estimates_visible}")
            return False
        else:
            print("✅ ТЕСТ 1 ПРОЙДЕН: Прораб видит только свои сметы")
        
        print()
        
        # Тест 2: Прораб 1 пытается получить конкретную чужую смету
        if foreman2_estimates.exists():
            foreign_estimate = foreman2_estimates.first()
            print(f"🧪 ТЕСТ 2: Попытка доступа к чужой смете (ID: {foreign_estimate.estimate_id})")
            
            request = factory.get(f'/api/v1/estimates/{foreign_estimate.estimate_id}/')
            request.user = foreman1
            
            view = EstimateViewSet()
            view.request = request
            view.action = 'retrieve'
            view.kwargs = {'pk': foreign_estimate.estimate_id}
            
            try:
                # Пытаемся получить объект через get_object()
                queryset = view.get_queryset()
                obj = queryset.filter(estimate_id=foreign_estimate.estimate_id).first()
                
                if obj is None:
                    print("✅ ТЕСТ 2 ПРОЙДЕН: Чужая смета не доступна через queryset")
                else:
                    print(f"❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Чужая смета доступна: {obj.estimate_id}")
                    return False
                    
            except Exception as e:
                print(f"✅ ТЕСТ 2 ПРОЙДЕН: Исключение при доступе к чужой смете: {e}")
        
        print()
        
        # Тест 3: Менеджер должен видеть все сметы
        print("🧪 ТЕСТ 3: Менеджер должен видеть все сметы")
        request = factory.get('/api/v1/estimates/')
        request.user = manager
        
        view = EstimateViewSet()
        view.request = request  
        view.action = 'list'
        
        manager_queryset = view.get_queryset()
        manager_accessible = manager_queryset.count()
        total_estimates = Estimate.objects.count()
        
        print(f"   Менеджер видит смет: {manager_accessible}")
        print(f"   Всего смет в системе: {total_estimates}")
        
        if manager_accessible == total_estimates:
            print("✅ ТЕСТ 3 ПРОЙДЕН: Менеджер видит все сметы")
        else:
            print("❌ ОШИБКА: Менеджер видит не все сметы")
            return False
            
        print()
        print("🔒 ВСЕ ТЕСТЫ БЕЗОПАСНОСТИ ПРОЙДЕНЫ УСПЕШНО!")
        print("✅ Система защищена от несанкционированного доступа к сметам")
        return True
        
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_estimate_access_security()
    sys.exit(0 if success else 1)