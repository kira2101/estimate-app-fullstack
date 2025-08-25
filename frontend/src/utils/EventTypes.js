/**
 * Определения типов событий для системы Event Bus
 * Централизованное место для всех типов событий в приложении
 */

// События смет
export const ESTIMATE_EVENTS = {
  CREATED: 'estimate.created',
  UPDATED: 'estimate.updated', 
  DELETED: 'estimate.deleted',
  STATUS_CHANGED: 'estimate.statusChanged',
  ITEM_ADDED: 'estimate.itemAdded',
  ITEM_UPDATED: 'estimate.itemUpdated',
  ITEM_DELETED: 'estimate.itemDeleted'
};

// События проектов
export const PROJECT_EVENTS = {
  CREATED: 'project.created',
  UPDATED: 'project.updated',
  DELETED: 'project.deleted',
  ASSIGNMENT_CHANGED: 'project.assignmentChanged'
};

// События пользователей
export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  ROLE_CHANGED: 'user.roleChanged'
};

// События категорий работ
export const WORK_CATEGORY_EVENTS = {
  CREATED: 'workCategory.created',
  UPDATED: 'workCategory.updated',
  DELETED: 'workCategory.deleted'
};

// События типов работ
export const WORK_TYPE_EVENTS = {
  CREATED: 'workType.created',
  UPDATED: 'workType.updated',
  DELETED: 'workType.deleted',
  IMPORTED: 'workType.imported'
};

// События статусов
export const STATUS_EVENTS = {
  CREATED: 'status.created',
  UPDATED: 'status.updated',
  DELETED: 'status.deleted'
};

// События уведомлений
export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
  READ: 'notification.read',
  CLEARED: 'notification.cleared'
};

// События аутентификации
export const AUTH_EVENTS = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  TOKEN_EXPIRED: 'auth.tokenExpired'
};

// Системные события
export const SYSTEM_EVENTS = {
  CONNECTION_LOST: 'system.connectionLost',
  CONNECTION_RESTORED: 'system.connectionRestored',
  ERROR: 'system.error'
};

// SSE события
export const SSE_EVENTS = {
  CONNECTED: 'sse.connected',
  DISCONNECTED: 'sse.disconnected',
  RECONNECTING: 'sse.reconnecting',
  ERROR: 'sse.error'
};

// Объединение всех событий для удобства
export const ALL_EVENTS = {
  ...ESTIMATE_EVENTS,
  ...PROJECT_EVENTS,
  ...USER_EVENTS,
  ...WORK_CATEGORY_EVENTS,
  ...WORK_TYPE_EVENTS,
  ...STATUS_EVENTS,
  ...NOTIFICATION_EVENTS,
  ...AUTH_EVENTS,
  ...SYSTEM_EVENTS,
  ...SSE_EVENTS
};

/**
 * Создает структуру данных события
 * @param {string} eventType - тип события
 * @param {Object} data - данные события
 * @param {Object} metadata - метаданные (пользователь, время и т.д.)
 */
export const createEvent = (eventType, data = {}, metadata = {}) => {
  return {
    type: eventType,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      source: metadata.source || 'unknown',
      userId: metadata.userId || null,
      userRole: metadata.userRole || null,
      ...metadata
    }
  };
};

/**
 * Валидация типа события
 * @param {string} eventType - тип события для проверки
 */
export const isValidEventType = (eventType) => {
  return Object.values(ALL_EVENTS).includes(eventType);
};

/**
 * Получение категории события по типу
 * @param {string} eventType - тип события
 */
export const getEventCategory = (eventType) => {
  if (Object.values(ESTIMATE_EVENTS).includes(eventType)) return 'estimate';
  if (Object.values(PROJECT_EVENTS).includes(eventType)) return 'project';
  if (Object.values(USER_EVENTS).includes(eventType)) return 'user';
  if (Object.values(WORK_CATEGORY_EVENTS).includes(eventType)) return 'workCategory';
  if (Object.values(WORK_TYPE_EVENTS).includes(eventType)) return 'workType';
  if (Object.values(STATUS_EVENTS).includes(eventType)) return 'status';
  if (Object.values(NOTIFICATION_EVENTS).includes(eventType)) return 'notification';
  if (Object.values(AUTH_EVENTS).includes(eventType)) return 'auth';
  if (Object.values(SYSTEM_EVENTS).includes(eventType)) return 'system';
  return 'unknown';
};