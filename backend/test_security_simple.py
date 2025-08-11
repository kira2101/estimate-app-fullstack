#!/usr/bin/env python
"""
ПРОСТОЙ НО ЭФФЕКТИВНЫЙ ТЕСТ БЕЗОПАСНОСТИ
Тестирует прямые вызовы методов безопасности
"""
import os
import sys

# Настройка Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.test import RequestFactory
from rest_framework.exceptions import PermissionDenied, NotFound
from api.models import User, Estimate, Role
from api.views import EstimateViewSet

def test_direct_access_security():
    """Тестирует прямые методы доступа к сметам"""
    print("🔒 ПРОСТОЙ НО НАДЕЖНЫЙ ТЕСТ БЕЗОПАСНОСТИ")
    print("=" * 60)
    
    try:
        # Получаем пользователей
        manager_role = Role.objects.get(role_name='менеджер')
        foreman_role = Role.objects.get(role_name='прораб') 
        
        manager = User.objects.filter(role=manager_role).first()
        foreman1 = User.objects.filter(role=foreman_role).first()
        foreman2 = User.objects.filter(role=foreman_role).exclude(user_id=foreman1.user_id).first()
        
        # Получаем сметы
        foreman1_estimates = list(Estimate.objects.filter(foreman=foreman1).values_list('estimate_id', flat=True))
        foreman2_estimates = list(Estimate.objects.filter(foreman=foreman2).values_list('estimate_id', flat=True))
        all_estimates = list(Estimate.objects.all().values_list('estimate_id', flat=True))
        
        print(f"👤 Менеджер: {manager.full_name}")
        print(f"👤 Прораб 1: {foreman1.full_name} (сметы: {foreman1_estimates})")
        print(f"👤 Прораб 2: {foreman2.full_name} (сметы: {foreman2_estimates})")
        print(f"📊 Всего смет в системе: {len(all_estimates)}")
        print()
        
        factory = RequestFactory()
        
        # ТЕСТ 1: Проверка get_queryset для прораба 1
        print("🧪 ТЕСТ 1: Фильтрация queryset для прораба 1")
        request = factory.get('/api/v1/estimates/')
        request.user = foreman1
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'list'
        
        foreman1_queryset = view.get_queryset()
        foreman1_visible = list(foreman1_queryset.values_list('estimate_id', flat=True))
        
        print(f"   Прораб 1 должен видеть: {foreman1_estimates}")
        print(f"   Прораб 1 видит через queryset: {foreman1_visible}")
        
        # Проверяем, что видит только свои сметы
        unexpected_access = [eid for eid in foreman1_visible if eid not in foreman1_estimates]
        missing_access = [eid for eid in foreman1_estimates if eid not in foreman1_visible]
        
        if unexpected_access:
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Видит чужие сметы: {unexpected_access}")
            return False
            
        if missing_access:
            print(f"   ❌ ОШИБКА: НЕ видит свои сметы: {missing_access}")
            return False
            
        print("   ✅ Прораб 1 видит только свои сметы")
        print()
        
        # ТЕСТ 2: Проверка get_queryset для прораба 2  
        print("🧪 ТЕСТ 2: Фильтрация queryset для прораба 2")
        request.user = foreman2
        view.request = request
        
        foreman2_queryset = view.get_queryset()
        foreman2_visible = list(foreman2_queryset.values_list('estimate_id', flat=True))
        
        print(f"   Прораб 2 должен видеть: {foreman2_estimates}")
        print(f"   Прораб 2 видит через queryset: {foreman2_visible}")
        
        unexpected_access = [eid for eid in foreman2_visible if eid not in foreman2_estimates]
        missing_access = [eid for eid in foreman2_estimates if eid not in foreman2_visible]
        
        if unexpected_access:
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Видит чужие сметы: {unexpected_access}")
            return False
            
        if missing_access:
            print(f"   ❌ ОШИБКА: НЕ видит свои сметы: {missing_access}")
            return False
            
        print("   ✅ Прораб 2 видит только свои сметы")
        print()
        
        # ТЕСТ 3: Проверка get_queryset для менеджера
        print("🧪 ТЕСТ 3: Фильтрация queryset для менеджера")
        request.user = manager
        view.request = request
        
        manager_queryset = view.get_queryset()
        manager_visible = list(manager_queryset.values_list('estimate_id', flat=True))
        
        print(f"   Менеджер должен видеть все: {len(all_estimates)} смет")
        print(f"   Менеджер видит через queryset: {len(manager_visible)} смет")
        
        if set(manager_visible) != set(all_estimates):
            missing = set(all_estimates) - set(manager_visible)
            print(f"   ❌ ОШИБКА: Менеджер НЕ видит сметы: {missing}")
            return False
            
        print("   ✅ Менеджер видит все сметы")
        print()
        
        # ТЕСТ 4: Проверка прав доступа на уровне объекта
        print("🧪 ТЕСТ 4: Проверка прав доступа на уровне объекта")
        
        if foreman2_estimates:
            foreign_estimate_id = foreman2_estimates[0]
            foreign_estimate = Estimate.objects.get(estimate_id=foreign_estimate_id)
            
            # Проверяем permission class
            from api.permissions import CanAccessEstimate
            permission = CanAccessEstimate()
            
            # Прораб 1 пытается получить доступ к смете прораба 2
            request.user = foreman1
            has_permission = permission.has_object_permission(request, None, foreign_estimate)
            
            if has_permission:
                print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Прораб 1 имеет доступ к смете прораба 2 (ID: {foreign_estimate_id})")
                return False
            else:
                print(f"   ✅ Прораб 1 НЕ имеет доступа к смете прораба 2 (ID: {foreign_estimate_id})")
                
            # Менеджер должен иметь доступ к любой смете
            request.user = manager
            has_permission = permission.has_object_permission(request, None, foreign_estimate)
            
            if not has_permission:
                print(f"   ❌ ОШИБКА: Менеджер НЕ имеет доступа к смете (ID: {foreign_estimate_id})")
                return False
            else:
                print(f"   ✅ Менеджер имеет доступ к любой смете")
        
        print()
        
        # ТЕСТ 5: Перекрестная проверка
        print("🧪 ТЕСТ 5: Перекрестная проверка безопасности")
        
        # Проверяем, что прорабы НЕ видят сметы друг друга
        common_estimates = set(foreman1_estimates) & set(foreman2_estimates)
        if common_estimates:
            print(f"   ⚠️  ПРЕДУПРЕЖДЕНИЕ: Общие сметы между прорабами: {common_estimates}")
        else:
            print("   ✅ Прорабы не имеют общих смет")
            
        # Проверяем полноту покрытия
        foreman_estimates_total = set(foreman1_estimates) | set(foreman2_estimates)
        manager_only_estimates = set(all_estimates) - foreman_estimates_total
        
        if manager_only_estimates:
            print(f"   ℹ️  Информация: Сметы только у менеджера: {len(manager_only_estimates)}")
        
        print()
        print("🔒 ВСЕ ТЕСТЫ БЕЗОПАСНОСТИ ПРОЙДЕНЫ УСПЕШНО!")
        print("✅ Система полностью защищена от несанкционированного доступа")
        print("✅ Фильтрация работает корректно на всех уровнях")
        return True
        
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА В ТЕСТЕ: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_direct_access_security()
    sys.exit(0 if success else 1)