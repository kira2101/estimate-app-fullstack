#!/usr/bin/env python3
"""
Тестовый SSE клиент для проверки подключения
"""
import os
import sys
import django
import requests
import json

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, AuthToken

def test_sse_connection():
    """Тестируем SSE подключение напрямую"""
    
    # Получаем токен пользователя
    try:
        # Пробуем подключиться как менеджер
        manager = User.objects.get(email='manager@example.com')
        manager_token = AuthToken.objects.filter(user=manager).first()
        
        if not manager_token:
            print("❌ У менеджера нет токена!")
            return
            
        print(f"✅ Тестируем SSE для: {manager.email}")
        token_str = str(manager_token.token)
        print(f"   Токен: {token_str[:20]}...")
        
        # Формируем URL с токеном
        sse_url = f'http://localhost:8000/api/v1/sse/events/?token={token_str}'
        
        print(f"\n🔗 Подключаемся к SSE: {sse_url}")
        
        # Пробуем подключиться
        headers = {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        }
        
        response = requests.get(sse_url, headers=headers, stream=True, timeout=5)
        
        print(f"📡 Статус ответа: {response.status_code}")
        print(f"📡 Заголовки ответа: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("\n✅ SSE подключение успешно установлено!")
            print("📨 Ожидаем события (первые 3 сообщения)...")
            
            # Читаем первые несколько событий
            line_count = 0
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    print(f"   > {decoded_line}")
                    
                    # Парсим data: сообщения
                    if decoded_line.startswith('data: '):
                        try:
                            data = json.loads(decoded_line[6:])
                            print(f"     Событие: {data.get('event', 'unknown')}")
                        except json.JSONDecodeError:
                            pass
                    
                    line_count += 1
                    if line_count > 10:  # Читаем только первые 10 строк
                        break
                        
        else:
            print(f"❌ Ошибка подключения к SSE: {response.status_code}")
            print(f"   Ответ: {response.text[:500]}")
            
    except requests.exceptions.Timeout:
        print("⏱️ Таймаут при подключении к SSE")
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Ошибка соединения: {e}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sse_connection()