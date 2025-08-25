/**
 * API клиент с интеграцией Event Bus
 * Обертка над базовым API клиентом для автоматической отправки событий
 */

import { api } from './client';
import eventBus from '../utils/EventBus';
import { ESTIMATE_EVENTS, PROJECT_EVENTS, USER_EVENTS, WORK_CATEGORY_EVENTS, WORK_TYPE_EVENTS, createEvent } from '../utils/EventTypes';

/**
 * Получает информацию о текущем пользователе для метаданных событий
 */
const getCurrentUserMetadata = () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return {};
    
    // В реальном приложении это может быть получено из контекста или хранилища
    // Пока используем простое решение
    return {
      source: window.location.pathname.includes('/mobile/') ? 'mobile' : 'desktop',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка получения метаданных пользователя:', error);
    return {};
  }
};

/**
 * Создает обертку для API метода с отправкой событий
 * @param {Function} apiMethod - оригинальный API метод
 * @param {string} eventType - тип события для отправки
 * @param {Function} dataExtractor - функция для извлечения данных из ответа
 */
const createEventWrapper = (apiMethod, eventType, dataExtractor = (data) => data) => {
  return async (...args) => {
    try {
      // Выполняем оригинальный API вызов
      const result = await apiMethod(...args);
      
      // Создаем и отправляем событие
      const eventData = dataExtractor(result, args);
      const metadata = getCurrentUserMetadata();
      
      const event = createEvent(eventType, eventData, metadata);
      console.log(`🚌 [API_WITH_EVENTS] Отправляем событие: ${eventType}`, event);
      eventBus.emit(eventType, event);
      
      return result;
    } catch (error) {
      // При ошибке также можем отправить событие
      console.error(`API Error for ${eventType}:`, error);
      throw error;
    }
  };
};

/**
 * API клиент с интегрированными событиями
 */
export const apiWithEvents = {
  // Базовые методы без изменений
  login: api.login,
  getCurrentUser: api.getCurrentUser,
  
  // Справочники (обычно не требуют события, но можем добавить если нужно)
  getWorkCategories: api.getWorkCategories,
  getWorkTypes: api.getWorkTypes,
  getAllWorkTypes: api.getAllWorkTypes,
  getStatuses: api.getStatuses,
  
  // Категории работ с событиями
  createWorkCategory: createEventWrapper(
    api.createWorkCategory,
    WORK_CATEGORY_EVENTS.CREATED,
    (result) => ({ workCategory: result })
  ),
  
  updateWorkCategory: createEventWrapper(
    api.updateWorkCategory,
    WORK_CATEGORY_EVENTS.UPDATED,
    (result, args) => ({ workCategory: result, id: args[0] })
  ),
  
  deleteWorkCategory: createEventWrapper(
    api.deleteWorkCategory,
    WORK_CATEGORY_EVENTS.DELETED,
    (result, args) => ({ id: args[0] })
  ),

  // Типы работ с событиями
  createWorkType: createEventWrapper(
    api.createWorkType,
    WORK_TYPE_EVENTS.CREATED,
    (result) => ({ workType: result })
  ),
  
  updateWorkType: createEventWrapper(
    api.updateWorkType,
    WORK_TYPE_EVENTS.UPDATED,
    (result, args) => ({ workType: result, id: args[0] })
  ),
  
  deleteWorkType: createEventWrapper(
    api.deleteWorkType,
    WORK_TYPE_EVENTS.DELETED,
    (result, args) => ({ id: args[0] })
  ),

  importWorkTypes: createEventWrapper(
    api.importWorkTypes,
    WORK_TYPE_EVENTS.IMPORTED,
    (result) => ({ importResult: result })
  ),

  // Проекты с событиями
  getProjects: api.getProjects,
  
  createProject: createEventWrapper(
    api.createProject,
    PROJECT_EVENTS.CREATED,
    (result) => ({ project: result })
  ),
  
  updateProject: createEventWrapper(
    api.updateProject,
    PROJECT_EVENTS.UPDATED,
    (result, args) => ({ project: result, id: args[0] })
  ),
  
  deleteProject: createEventWrapper(
    api.deleteProject,
    PROJECT_EVENTS.DELETED,
    (result, args) => ({ id: args[0] })
  ),

  // Сметы с событиями
  getEstimates: api.getEstimates,
  getEstimate: api.getEstimate,
  
  createEstimate: createEventWrapper(
    api.createEstimate,
    ESTIMATE_EVENTS.CREATED,
    (result, args) => ({ 
      estimate: result,
      originalData: args[0]
    })
  ),
  
  updateEstimate: createEventWrapper(
    api.updateEstimate,
    ESTIMATE_EVENTS.UPDATED,
    (result, args) => ({ 
      estimate: result,
      id: args[0],
      originalData: args[1]
    })
  ),
  
  deleteEstimate: createEventWrapper(
    api.deleteEstimate,
    ESTIMATE_EVENTS.DELETED,
    (result, args) => ({ id: args[0] })
  ),

  // Пользователи с событиями
  getUsers: api.getUsers,
  
  createUser: createEventWrapper(
    api.createUser,
    USER_EVENTS.CREATED,
    (result) => ({ user: result })
  ),
  
  updateUser: createEventWrapper(
    api.updateUser,
    USER_EVENTS.UPDATED,
    (result, args) => ({ user: result, id: args[0] })
  ),
  
  deleteUser: createEventWrapper(
    api.deleteUser,
    USER_EVENTS.DELETED,
    (result, args) => ({ id: args[0] })
  ),

  // Остальные методы без изменений
  getRoles: api.getRoles,
  getProjectAssignments: api.getProjectAssignments,
  createProjectAssignment: api.createProjectAssignment,
  deleteProjectAssignment: api.deleteProjectAssignment,
  exportEstimateForClient: api.exportEstimateForClient,
  exportEstimateInternal: api.exportEstimateInternal,
  getEstimateItems: api.getEstimateItems,
  createEstimateItem: api.createEstimateItem
};

export default apiWithEvents;