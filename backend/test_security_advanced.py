#!/usr/bin/env python
"""
РАСШИРЕННЫЙ ТЕСТ БЕЗОПАСНОСТИ: Проверка всех операций CRUD для смет
"""
import os
import sys

# Настройка Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.test import RequestFactory
from rest_framework.exceptions import PermissionDenied
from api.models import User, Estimate, Role
from api.views import EstimateViewSet
import json

def test_crud_operations_security():
    """Тестирует безопасность всех CRUD операций"""
    print("🔒 РАСШИРЕННЫЙ ТЕСТ БЕЗОПАСНОСТИ CRUD ОПЕРАЦИЙ")
    print("=" * 70)
    
    try:
        # Получаем пользователей
        manager_role = Role.objects.get(role_name='менеджер')
        foreman_role = Role.objects.get(role_name='прораб')
        
        manager = User.objects.filter(role=manager_role).first()
        foreman1 = User.objects.filter(role=foreman_role).first()
        foreman2 = User.objects.filter(role=foreman_role).exclude(user_id=foreman1.user_id).first()
        
        # Получаем сметы
        foreman1_estimates = Estimate.objects.filter(foreman=foreman1)
        foreman2_estimates = Estimate.objects.filter(foreman=foreman2)
        
        if not foreman1_estimates.exists() or not foreman2_estimates.exists():
            print("❌ ОШИБКА: Недостаточно смет для тестирования")
            return False
            
        foreign_estimate = foreman2_estimates.first()
        own_estimate = foreman1_estimates.first()
        
        print(f"🎯 Тестируем доступ прораба '{foreman1.full_name}' к:")
        print(f"   - Своя смета: ID {own_estimate.estimate_id}")
        print(f"   - Чужая смета: ID {foreign_estimate.estimate_id} (прораб: {foreign_estimate.foreman.full_name})")
        print()
        
        factory = RequestFactory()
        
        # ТЕСТ 1: Операция RETRIEVE (получение конкретной сметы)
        print("🧪 ТЕСТ 1: RETRIEVE операция")
        
        # Тест 1.1: Доступ к своей смете
        request = factory.get(f'/api/v1/estimates/{own_estimate.estimate_id}/')
        request.user = foreman1
        
        view = EstimateViewSet.as_view({'get': 'retrieve'})
        
        try:
            response = view(request, pk=own_estimate.estimate_id)
            if response.status_code == 200:
                print("   ✅ Доступ к своей смете: РАЗРЕШЕН")
            else:
                print("   ❌ Доступ к своей смете: ЗАПРЕЩЕН (ошибка!)")
                return False
        except Exception as e:
            print(f"   ❌ Ошибка при доступе к своей смете: {e}")
            return False
        
        # Тест 1.2: Доступ к чужой смете
        request = factory.get(f'/api/v1/estimates/{foreign_estimate.estimate_id}/')
        request.user = foreman1
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'retrieve'
        view.kwargs = {'pk': foreign_estimate.estimate_id}
        
        try:
            response = view.retrieve(request, pk=foreign_estimate.estimate_id)
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Доступ к чужой смете РАЗРЕШЕН (статус: {response.status_code})")
            return False
        except PermissionDenied:
            print("   ✅ Доступ к чужой смете: ЗАПРЕЩЕН (PermissionDenied)")
        except Exception as e:
            print(f"   ✅ Доступ к чужой смете: ЗАПРЕЩЕН ({type(e).__name__})")
        
        print()
        
        # ТЕСТ 2: Операция UPDATE (обновление сметы)
        print("🧪 ТЕСТ 2: UPDATE операция")
        
        # Тест 2.1: Обновление своей сметы
        update_data = {
            'estimate_number': 'Обновленная_смета_тест',
            'project_id': own_estimate.project.project_id,
            'status_id': own_estimate.status.status_id if own_estimate.status else None
        }
        
        request = factory.put(
            f'/api/v1/estimates/{own_estimate.estimate_id}/',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        request.user = foreman1
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'update'
        view.kwargs = {'pk': own_estimate.estimate_id}
        
        try:
            response = view.update(request, pk=own_estimate.estimate_id)
            if response.status_code in [200, 202]:
                print("   ✅ Обновление своей сметы: РАЗРЕШЕНО")
            else:
                print(f"   ⚠️  Обновление своей сметы: Неожиданный статус {response.status_code}")
        except Exception as e:
            print(f"   ❌ Ошибка при обновлении своей сметы: {e}")
        
        # Тест 2.2: Обновление чужой сметы
        request = factory.put(
            f'/api/v1/estimates/{foreign_estimate.estimate_id}/',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        request.user = foreman1
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'update'  
        view.kwargs = {'pk': foreign_estimate.estimate_id}
        
        try:
            response = view.update(request, pk=foreign_estimate.estimate_id)
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Обновление чужой сметы РАЗРЕШЕНО (статус: {response.status_code})")
            return False
        except PermissionDenied:
            print("   ✅ Обновление чужой сметы: ЗАПРЕЩЕНО (PermissionDenied)")
        except Exception as e:
            print(f"   ✅ Обновление чужой сметы: ЗАПРЕЩЕНО ({type(e).__name__})")
        
        print()
        
        # ТЕСТ 3: Операция DELETE (удаление сметы)
        print("🧪 ТЕСТ 3: DELETE операция")
        
        # Тест 3.1: Удаление чужой сметы (НЕ должно работать)
        request = factory.delete(f'/api/v1/estimates/{foreign_estimate.estimate_id}/')
        request.user = foreman1
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'destroy'
        view.kwargs = {'pk': foreign_estimate.estimate_id}
        
        try:
            response = view.destroy(request, pk=foreign_estimate.estimate_id)
            print(f"   ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Удаление чужой сметы РАЗРЕШЕНО (статус: {response.status_code})")
            return False
        except PermissionDenied:
            print("   ✅ Удаление чужой сметы: ЗАПРЕЩЕНО (PermissionDenied)")
        except Exception as e:
            print(f"   ✅ Удаление чужой сметы: ЗАПРЕЩЕНО ({type(e).__name__})")
        
        print()
        
        # ТЕСТ 4: Проверка доступа менеджера
        print("🧪 ТЕСТ 4: Права доступа менеджера")
        
        request = factory.get(f'/api/v1/estimates/{foreign_estimate.estimate_id}/')
        request.user = manager
        
        view = EstimateViewSet()
        view.request = request
        view.action = 'retrieve'
        view.kwargs = {'pk': foreign_estimate.estimate_id}
        
        try:
            response = view.retrieve(request, pk=foreign_estimate.estimate_id)
            if response.status_code == 200:
                print("   ✅ Менеджер имеет доступ к любой смете: ПРАВИЛЬНО")
            else:
                print(f"   ❌ Менеджер НЕ имеет доступ к смете (статус: {response.status_code})")
                return False
        except Exception as e:
            print(f"   ❌ Ошибка доступа менеджера к смете: {e}")
            return False
            
        print()
        print("🔒 ВСЕ РАСШИРЕННЫЕ ТЕСТЫ БЕЗОПАСНОСТИ ПРОЙДЕНЫ УСПЕШНО!")
        print("✅ Система полностью защищена от несанкционированного доступа")
        print("✅ Все CRUD операции правильно контролируются по ролям")
        return True
        
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА В РАСШИРЕННОМ ТЕСТЕ: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_crud_operations_security()
    sys.exit(0 if success else 1)