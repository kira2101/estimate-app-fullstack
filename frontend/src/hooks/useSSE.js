/**
 * React Hook для работы с Server-Sent Events (SSE)
 * Интегрируется с существующей Event Bus системой
 */

import { useEffect, useRef, useCallback } from 'react';
import eventBus from '../utils/EventBus';
import { isValidEventType, createEvent } from '../utils/EventTypes';

/**
 * Hook для подключения к SSE и интеграции с Event Bus
 * @param {Object} options - Опции подключения
 * @param {boolean} options.enabled - Включить/выключить SSE (по умолчанию true)
 * @param {number} options.reconnectDelay - Задержка переподключения в мс (по умолчанию 3000)
 * @param {number} options.maxReconnectAttempts - Максимальное количество попыток переподключения (по умолчанию 5)
 */
export const useSSE = (options = {}) => {
  const {
    enabled = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5
  } = options;

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectedRef = useRef(false);

  // Получаем базовый URL API
  const getApiUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    
    const hostname = window.location.hostname;
    
    // Детекция различных сред
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    } else if (hostname.includes('ngrok') || hostname.includes('ngrok-free.app')) {
      return `https://${hostname}/api/v1`;
    } else if (hostname === 'dev.app.iqbs.pro') {
      return 'https://dev.app.iqbs.pro/api/v1';
    } else {
      // Fallback для production
      return '/api/v1';
    }
  }, []);

  // Функция подключения к SSE
  const connectSSE = useCallback(() => {
    if (!enabled || eventSourceRef.current) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('🔌 [SSE] Нет токена аутентификации. SSE отключен.');
      return;
    }

    const apiUrl = getApiUrl();
    // Добавляем токен в URL для аутентификации EventSource
    const sseUrl = `${apiUrl}/sse/events/?token=${encodeURIComponent(token)}`;

    console.log('🔌 [SSE] Подключение к:', sseUrl);

    try {
      // Создаем EventSource с токеном в URL
      const eventSource = new EventSource(sseUrl);
      
      eventSourceRef.current = eventSource;

      eventSource.onopen = (event) => {
        console.log('✅ [SSE] Подключение установлено');
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        
        // Отправляем событие о подключении в Event Bus
        eventBus.emit('system.connectionRestored', {
          type: 'sse',
          timestamp: new Date().toISOString()
        });
      };

      eventSource.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          console.log('📨 [SSE] Получено событие:', eventData);

          // Обрабатываем различные типы событий
          if (eventData.event === 'keepalive') {
            // Keep-alive сообщения не передаем в Event Bus
            return;
          }

          if (eventData.event === 'connected') {
            console.log('🔗 [SSE] Подключение подтверждено сервером');
            return;
          }

          // Валидируем тип события
          if (isValidEventType(eventData.event)) {
            // Создаем событие в формате Event Bus
            const busEvent = createEvent(
              eventData.event,
              eventData.data || {},
              {
                source: 'sse',
                timestamp: eventData.timestamp,
                ...eventData.metadata
              }
            );

            // Отправляем событие в Event Bus (пропускаем валидацию для SSE событий)
            console.log('🚌 [SSE→EventBus] Перенаправляем событие:', eventData.event);
            eventBus.emit(eventData.event, busEvent);
          } else {
            // Для SSE событий отправляем все события, даже если они не в списке EventTypes
            console.log('🚌 [SSE→EventBus] Отправляем SSE событие:', eventData.event);
            const busEvent = createEvent(eventData.event, eventData.data || {}, {
              source: 'sse',
              timestamp: new Date().toISOString(),
              originalEvent: eventData
            });
            eventBus.emit(eventData.event, busEvent);
          }

        } catch (error) {
          console.error('❌ [SSE] Ошибка парсинга события:', error);
        }
      };

      eventSource.onerror = (event) => {
        console.error('❌ [SSE] Ошибка подключения:', event);
        isConnectedRef.current = false;
        
        // Закрываем текущее подключение
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Отправляем событие о потере соединения
        eventBus.emit('system.connectionLost', {
          type: 'sse',
          timestamp: new Date().toISOString(),
          error: event
        });

        // Планируем переподключение
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`🔄 [SSE] Переподключение через ${reconnectDelay}мс (попытка ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, reconnectDelay);
        } else {
          console.error('💥 [SSE] Превышено максимальное количество попыток переподключения');
        }
      };

    } catch (error) {
      console.error('❌ [SSE] Ошибка создания EventSource:', error);
    }
  }, [enabled, getApiUrl, reconnectDelay, maxReconnectAttempts]);

  // Функция отключения от SSE
  const disconnectSSE = useCallback(() => {
    // Очищаем таймер переподключения
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Закрываем EventSource
    if (eventSourceRef.current) {
      console.log('🔌 [SSE] Отключение...');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      isConnectedRef.current = false;
    }

    // Сбрасываем счетчик попыток
    reconnectAttemptsRef.current = 0;
  }, []);

  // Эффект для управления подключением
  useEffect(() => {
    if (enabled) {
      connectSSE();
    } else {
      disconnectSSE();
    }

    // Cleanup при размонтировании компонента
    return () => {
      disconnectSSE();
    };
  }, [enabled, connectSSE, disconnectSSE]);

  // Эффект для переподключения при изменении токена
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'authToken') {
        if (event.newValue) {
          // Новый токен - переподключаемся
          console.log('🔑 [SSE] Обнаружен новый токен, переподключение...');
          disconnectSSE();
          setTimeout(connectSSE, 1000);
        } else {
          // Токен удален - отключаемся
          console.log('🚪 [SSE] Токен удален, отключение...');
          disconnectSSE();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [connectSSE, disconnectSSE]);

  // Возвращаем информацию о состоянии подключения
  return {
    isConnected: isConnectedRef.current,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts,
    connect: connectSSE,
    disconnect: disconnectSSE
  };
};

export default useSSE;