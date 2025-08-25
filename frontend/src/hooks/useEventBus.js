/**
 * React Hook для удобной работы с Event Bus
 * Автоматическая подписка/отписка при монтировании/размонтировании компонентов
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import eventBus from '../utils/EventBus';
import { isValidEventType } from '../utils/EventTypes';

/**
 * Hook для подписки на события Event Bus
 * @param {string|Array<string>} eventTypes - тип события или массив типов
 * @param {Function} callback - функция-обработчик события
 * @param {Array} deps - зависимости для callback (аналогично useCallback)
 * @param {Object} options - дополнительные опции
 */
export const useEventBusListener = (eventTypes, callback, deps = [], options = {}) => {
  const { 
    enabled = true,
    listenerId = null 
  } = options;
  
  const listenerIdRef = useRef(listenerId || `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  // Memoize callback to prevent unnecessary re-subscriptions
  const memoizedCallback = useCallback(callback, deps);
  
  useEffect(() => {
    if (!enabled) return;
    
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const id = listenerIdRef.current;
    
    // Валидация типов событий (временно отключена для отладки)
    // const invalidTypes = types.filter(type => !isValidEventType(type));
    // if (invalidTypes.length > 0) {
    //   console.warn('useEventBusListener: неизвестные типы событий:', invalidTypes);
    // }
    
    // Подписка на события
    types.forEach(eventType => {
      eventBus.subscribe(eventType, id, memoizedCallback);
    });
    
    console.log(`🔗 Подписка на события: ${types.join(', ')} [${id}]`);
    
    // Cleanup при размонтировании или изменении зависимостей
    return () => {
      types.forEach(eventType => {
        eventBus.unsubscribe(eventType, id);
      });
      console.log(`🔌 Отписка от событий: ${types.join(', ')} [${id}]`);
    };
  }, [eventTypes, memoizedCallback, enabled]);
  
  return listenerIdRef.current;
};

/**
 * Hook для отправки событий
 * @returns {Function} emit - функция для отправки событий
 */
export const useEventBusEmitter = () => {
  const emit = useCallback((eventType, eventData = {}) => {
    if (!isValidEventType(eventType)) {
      console.warn('useEventBusEmitter: неизвестный тип события:', eventType);
    }
    
    eventBus.emit(eventType, eventData);
  }, []);
  
  return emit;
};

/**
 * Hook для получения статистики Event Bus
 * @param {boolean} enabled - включить ли обновление статистики
 * @returns {Object} stats - статистика Event Bus
 */
export const useEventBusStats = (enabled = false) => {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    if (!enabled) return;
    
    const updateStats = () => {
      setStats(eventBus.getStats());
    };
    
    // Обновляем статистику каждые 5 секунд
    updateStats();
    const interval = setInterval(updateStats, 5000);
    
    return () => clearInterval(interval);
  }, [enabled]);
  
  return stats;
};

/**
 * Hook для автоматического обновления данных при событиях
 * Упрощает паттерн "слушать событие -> обновить данные"
 * @param {string|Array<string>} eventTypes - типы событий для прослушивания
 * @param {Function} refetchFunction - функция для обновления данных
 * @param {Array} deps - зависимости
 * @param {Object} options - опции
 */
export const useEventBusRefresh = (eventTypes, refetchFunction, deps = [], options = {}) => {
  const { 
    enabled = true,
    delay = 0, // задержка перед обновлением (мс)
    debounce = false // группировать события
  } = options;
  
  const timeoutRef = useRef(null);
  
  const handleRefresh = useCallback((eventData) => {
    if (timeoutRef.current && debounce) {
      clearTimeout(timeoutRef.current);
    }
    
    const executeRefresh = () => {
      try {
        if (typeof refetchFunction === 'function') {
          refetchFunction(eventData);
        }
      } catch (error) {
        console.error('Ошибка при обновлении данных по событию:', error);
      }
    };
    
    if (delay > 0 || debounce) {
      timeoutRef.current = setTimeout(executeRefresh, delay || 300);
    } else {
      executeRefresh();
    }
  }, [refetchFunction, delay, debounce]);
  
  useEventBusListener(eventTypes, handleRefresh, deps, { enabled });
  
  // Cleanup timeout при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

export default {
  useEventBusListener,
  useEventBusEmitter,
  useEventBusStats,
  useEventBusRefresh
};