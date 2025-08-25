/**
 * Примеры использования SSE с Event Bus системой
 * Для демонстрации и тестирования функциональности
 */

import eventBus from './EventBus';
import { ESTIMATE_EVENTS, PROJECT_EVENTS, createEvent } from './EventTypes';

/**
 * Демонстрационный компонент для тестирования SSE
 */
export class SSEDemo {
  constructor() {
    this.isListening = false;
    this.listeners = [];
  }

  /**
   * Начать прослушивание событий из SSE
   */
  startListening() {
    if (this.isListening) return;

    console.log('🎯 [SSE_DEMO] Начинаем прослушивание SSE событий...');

    // Подписываемся на события смет
    const estimateCreatedListener = (eventData) => {
      console.log('📋 [SSE_DEMO] Получено событие создания сметы:', eventData);
      this.showNotification('Создана новая смета', eventData);
    };

    const estimateUpdatedListener = (eventData) => {
      console.log('📝 [SSE_DEMO] Получено событие обновления сметы:', eventData);
      this.showNotification('Смета обновлена', eventData);
    };

    const estimateDeletedListener = (eventData) => {
      console.log('🗑️ [SSE_DEMO] Получено событие удаления сметы:', eventData);
      this.showNotification('Смета удалена', eventData);
    };

    // Подписываемся на события проектов
    const projectCreatedListener = (eventData) => {
      console.log('🏗️ [SSE_DEMO] Получено событие создания проекта:', eventData);
      this.showNotification('Создан новый проект', eventData);
    };

    // Подписываемся на системные события
    const connectionLostListener = (eventData) => {
      console.warn('🔴 [SSE_DEMO] Потеряно соединение:', eventData);
      this.showNotification('Соединение потеряно', eventData, 'warning');
    };

    const connectionRestoredListener = (eventData) => {
      console.log('🟢 [SSE_DEMO] Соединение восстановлено:', eventData);
      this.showNotification('Соединение восстановлено', eventData, 'success');
    };

    // Регистрируем обработчики
    eventBus.subscribe(ESTIMATE_EVENTS.CREATED, 'sse-demo', estimateCreatedListener);
    eventBus.subscribe(ESTIMATE_EVENTS.UPDATED, 'sse-demo', estimateUpdatedListener);
    eventBus.subscribe(ESTIMATE_EVENTS.DELETED, 'sse-demo', estimateDeletedListener);
    eventBus.subscribe(PROJECT_EVENTS.CREATED, 'sse-demo', projectCreatedListener);
    eventBus.subscribe('system.connectionLost', 'sse-demo', connectionLostListener);
    eventBus.subscribe('system.connectionRestored', 'sse-demo', connectionRestoredListener);

    this.isListening = true;
    console.log('✅ [SSE_DEMO] Прослушивание активировано');
  }

  /**
   * Остановить прослушивание событий
   */
  stopListening() {
    if (!this.isListening) return;

    eventBus.unsubscribeAll('sse-demo');
    this.isListening = false;
    console.log('⏹️ [SSE_DEMO] Прослушивание остановлено');
  }

  /**
   * Показать уведомление о событии
   */
  showNotification(title, eventData, type = 'info') {
    // В браузере показываем toast уведомление
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Запрашиваем разрешение на уведомления
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: this.formatEventMessage(eventData),
          icon: '/favicon.ico',
          tag: 'sse-demo'
        });

        // Автоматически закрываем через 5 секунд
        setTimeout(() => notification.close(), 5000);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            this.showNotification(title, eventData, type);
          }
        });
      }
    }

    // Также выводим в консоль
    const emoji = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [SSE_DEMO] ${title}:`, eventData);
  }

  /**
   * Форматировать сообщение события для уведомления
   */
  formatEventMessage(eventData) {
    if (eventData.data) {
      const data = eventData.data;
      if (data.estimate_number) {
        return `Смета: ${data.estimate_number} (Проект: ${data.project_name || 'Не указан'})`;
      }
      if (data.project_name) {
        return `Проект: ${data.project_name}`;
      }
    }
    return 'Получено уведомление из системы';
  }

  /**
   * Получить статус демо
   */
  getStatus() {
    return {
      isListening: this.isListening,
      eventBusStats: eventBus.getStats()
    };
  }
}

/**
 * Утилиты для тестирования SSE в консоли браузера
 */
export const SSETestUtils = {
  /**
   * Создать тестовое событие сметы
   */
  createTestEstimateEvent(type = ESTIMATE_EVENTS.CREATED) {
    const testEvent = createEvent(type, {
      estimate_id: Math.floor(Math.random() * 1000),
      estimate_number: `Тест_${new Date().getTime()}`,
      project_id: 1,
      project_name: 'Тестовый проект',
      foreman_id: 1,
      foreman_name: 'Тестовый прораб',
      status: 'Черновик'
    }, {
      source: 'test',
      userId: 999,
      userRole: 'менеджер'
    });

    console.log('🧪 [SSE_TEST] Отправляем тестовое событие:', testEvent);
    eventBus.emit(type, testEvent);
    return testEvent;
  },

  /**
   * Создать тестовое событие проекта
   */
  createTestProjectEvent(type = PROJECT_EVENTS.CREATED) {
    const testEvent = createEvent(type, {
      project_id: Math.floor(Math.random() * 1000),
      project_name: `Тестовый_проект_${new Date().getTime()}`,
      address: 'Тестовый адрес',
      description: 'Описание тестового проекта'
    }, {
      source: 'test',
      userId: 999,
      userRole: 'менеджер'
    });

    console.log('🧪 [SSE_TEST] Отправляем тестовое событие проекта:', testEvent);
    eventBus.emit(type, testEvent);
    return testEvent;
  },

  /**
   * Запустить серию тестовых событий
   */
  runTestSequence(intervalMs = 3000) {
    console.log('🧪 [SSE_TEST] Запускаем серию тестовых событий...');
    
    const events = [
      () => this.createTestEstimateEvent(ESTIMATE_EVENTS.CREATED),
      () => this.createTestProjectEvent(PROJECT_EVENTS.CREATED),
      () => this.createTestEstimateEvent(ESTIMATE_EVENTS.UPDATED),
      () => this.createTestEstimateEvent(ESTIMATE_EVENTS.DELETED),
    ];

    events.forEach((eventFn, index) => {
      setTimeout(() => {
        console.log(`🧪 [SSE_TEST] Выполняем тест ${index + 1}/${events.length}`);
        eventFn();
      }, index * intervalMs);
    });

    console.log(`🧪 [SSE_TEST] Серия из ${events.length} событий запланирована с интервалом ${intervalMs}мс`);
  }
};

// Глобальные объекты для тестирования в консоли браузера
if (typeof window !== 'undefined') {
  window.SSEDemo = SSEDemo;
  window.SSETestUtils = SSETestUtils;
  console.log('🧪 [SSE_EXAMPLES] Доступны глобальные объекты: SSEDemo, SSETestUtils');
}