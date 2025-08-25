/**
 * Универсальный Event Bus для синхронизации данных между мобильным и desktop UI
 * Поддерживает как React Query, так и прямые API вызовы
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.queryClient = null;
    
    // Флаг для включения отладочной информации
    this.debug = process.env.NODE_ENV === 'development';
    
    if (this.debug) {
      console.log('🚌 EventBus инициализирован');
    }
  }

  /**
   * Устанавливает ссылку на QueryClient для интеграции с React Query
   */
  setQueryClient(queryClient) {
    this.queryClient = queryClient;
    if (this.debug) {
      console.log('🚌 QueryClient подключен к EventBus');
    }
  }

  /**
   * Подписка на события
   * @param {string} eventType - тип события
   * @param {string} listenerId - уникальный ID слушателя 
   * @param {Function} callback - функция-обработчик
   */
  subscribe(eventType, listenerId, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map());
    }
    
    this.listeners.get(eventType).set(listenerId, callback);
    
    if (this.debug) {
      console.log(`🚌 Подписка добавлена: ${eventType} -> ${listenerId}`);
    }
  }

  /**
   * Отписка от событий
   */
  unsubscribe(eventType, listenerId) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(listenerId);
      
      if (this.debug) {
        console.log(`🚌 Подписка удалена: ${eventType} -> ${listenerId}`);
      }
    }
  }

  /**
   * Отписка слушателя от всех событий
   */
  unsubscribeAll(listenerId) {
    for (const [eventType, listeners] of this.listeners.entries()) {
      if (listeners.has(listenerId)) {
        listeners.delete(listenerId);
        
        if (this.debug) {
          console.log(`🚌 Слушатель ${listenerId} отписан от ${eventType}`);
        }
      }
    }
  }

  /**
   * Отправка события всем подписчикам
   * @param {string} eventType - тип события
   * @param {Object} eventData - данные события
   */
  emit(eventType, eventData = {}) {
    if (this.debug) {
      console.log(`🚌 Отправка события: ${eventType}`, eventData);
    }

    // Отправляем событие пользовательским слушателям
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      
      callbacks.forEach((callback, listenerId) => {
        try {
          callback(eventData);
          
          if (this.debug) {
            console.log(`🚌 Событие обработано: ${eventType} -> ${listenerId}`);
          }
        } catch (error) {
          console.error(`🚌 Ошибка в обработчике ${listenerId} для события ${eventType}:`, error);
        }
      });
    }

    // Автоматическая инвалидация React Query кэшей
    this._handleQueryInvalidation(eventType, eventData);
  }

  /**
   * Автоматическая инвалидация кэшей React Query
   * @private
   */
  _handleQueryInvalidation(eventType, eventData) {
    if (!this.queryClient) {
      return;
    }

    // Маппинг событий на ключи React Query
    const queryKeyMap = {
      'estimate.created': ['estimates', 'projects'],
      'estimate.updated': ['estimates', 'projects'],
      'estimate.deleted': ['estimates', 'projects'],
      'project.created': ['projects'],
      'project.updated': ['projects'],
      'project.deleted': ['projects'],
      'workCategory.created': ['workCategories'],
      'workCategory.updated': ['workCategories'],
      'workType.created': ['workTypes'],
      'workType.updated': ['workTypes'],
      'user.created': ['users'],
      'user.updated': ['users'],
      'status.updated': ['statuses']
    };

    const keysToInvalidate = queryKeyMap[eventType] || [];
    
    keysToInvalidate.forEach(queryKey => {
      this.queryClient.invalidateQueries({ queryKey: [queryKey] });
      
      if (this.debug) {
        console.log(`🚌 Инвалидирован кэш: ${queryKey} для события ${eventType}`);
      }
    });
  }

  /**
   * Получение количества активных подписчиков
   */
  getSubscriptionCount(eventType = null) {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.size;
    }
    return total;
  }

  /**
   * Получение статистики EventBus
   */
  getStats() {
    const stats = {
      totalEventTypes: this.listeners.size,
      totalSubscriptions: this.getSubscriptionCount(),
      eventTypes: {}
    };

    for (const [eventType, listeners] of this.listeners.entries()) {
      stats.eventTypes[eventType] = listeners.size;
    }

    return stats;
  }

  /**
   * Очистка всех подписок (для cleanup)
   */
  clear() {
    this.listeners.clear();
    
    if (this.debug) {
      console.log('🚌 EventBus очищен');
    }
  }
}

// Создаем глобальный экземпляр EventBus
const eventBus = new EventBus();

// Экспортируем как singleton
export default eventBus;

// Также экспортируем класс для тестирования
export { EventBus };