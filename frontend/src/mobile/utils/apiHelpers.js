/**
 * Утилиты для работы с API в мобильном интерфейсе
 * Обеспечивают совместимость с пагинированными и непагинированными ответами
 */

/**
 * Нормализует ответ API к единому формату массива
 * Поддерживает как пагинированные, так и обычные ответы
 * 
 * @param {any} response - ответ от API
 * @returns {Array} - нормализованный массив данных
 */
export const normalizeApiResponse = (response) => {
  // Если ответ имеет results (пагинация DRF), извлекаем массив
  if (response && typeof response === 'object' && Array.isArray(response.results)) {
    return response.results;
  }
  
  // Если это уже массив, возвращаем как есть
  if (Array.isArray(response)) {
    return response;
  }
  
  // Если это null, undefined или что-то еще, возвращаем пустой массив
  return [];
};

/**
 * Извлекает метаинформацию из пагинированного ответа
 * 
 * @param {any} response - ответ от API
 * @returns {Object} - объект с метаинформацией
 */
export const extractPaginationMeta = (response) => {
  if (response && typeof response === 'object' && response.results) {
    return {
      count: response.count || 0,
      next: response.next || null,
      previous: response.previous || null,
      hasNext: !!response.next,
      hasPrevious: !!response.previous
    };
  }
  
  return {
    count: Array.isArray(response) ? response.length : 0,
    next: null,
    previous: null,
    hasNext: false,
    hasPrevious: false
  };
};

/**
 * Проверяет является ли ответ ошибкой API
 * 
 * @param {any} response - ответ от API
 * @returns {boolean} - true если это ошибка
 */
export const isApiError = (response) => {
  return response && typeof response === 'object' && (
    response.error === true ||
    response.detail ||
    response.message ||
    response.errors
  );
};

/**
 * Форматирует сообщение об ошибке из ответа API
 * 
 * @param {any} response - ответ от API с ошибкой
 * @returns {string} - отформатированное сообщение об ошибке
 */
export const formatApiError = (response) => {
  if (!isApiError(response)) {
    return 'Неизвестная ошибка';
  }
  
  return response.message || 
         response.detail || 
         (response.errors && JSON.stringify(response.errors)) ||
         'Ошибка API';
};

/**
 * Проверяет успешность ответа API
 * 
 * @param {any} response - ответ от API
 * @returns {boolean} - true если ответ успешный
 */
export const isSuccessResponse = (response) => {
  return !isApiError(response) && (
    Array.isArray(response) ||
    (response && typeof response === 'object' && Array.isArray(response.results))
  );
};