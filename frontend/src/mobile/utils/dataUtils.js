/**
 * Mobile Data Utilities
 * Утилиты для работы с данными в мобильном интерфейсе
 */

/**
 * Получение ID работы из любой структуры данных
 * @param {Object} work - Объект работы
 * @returns {string|number} ID работы
 */
export const getWorkId = (work) => {
  return work.work_type_id || work.id || work.work_type || work.item_id;
};

/**
 * Нормализация данных работ к единому формату для мобильного UI
 * Совместимо с desktop EstimateEditor
 * @param {Array} works - Массив работ в любом формате
 * @returns {Array} Нормализованный массив работ
 */
export const normalizeWorksData = (works) => {
  if (!Array.isArray(works)) return [];
  
  return works.map((work, index) => {
    const workId = getWorkId(work);
    
    // Базовые данные работы
    const baseWork = {
      // Идентификаторы
      item_id: work.item_id || `new_${workId}_${Date.now()}_${index}`,
      work_type_id: workId,
      work_type: workId,
      id: workId,
      
      // Название и описание
      name: work.name || work.work_name,
      work_name: work.name || work.work_name,
      unit: work.unit || work.unit_of_measurement,
      unit_of_measurement: work.unit || work.unit_of_measurement,
      
      // Количественные данные
      quantity: parseFloat(work.quantity) || 1,
      
      // Стоимостные данные
      cost_price: parseFloat(work.cost_price || work.cost_price_per_unit) || 0,
      cost_price_per_unit: parseFloat(work.cost_price_per_unit || work.cost_price) || 0,
      client_price: parseFloat(work.client_price || work.client_price_per_unit || work.cost_price_per_unit || work.cost_price) || 0,
      client_price_per_unit: parseFloat(work.client_price_per_unit || work.client_price || work.cost_price_per_unit || work.cost_price) || 0,
      
      // Категория (если есть)
      category: work.category,
      category_id: work.category_id || work.category?.category_id
    };
    
    // Вычисляем итоговые суммы
    const quantity = baseWork.quantity;
    const costPrice = baseWork.cost_price_per_unit;
    const clientPrice = baseWork.client_price_per_unit;
    
    baseWork.total_cost = costPrice * quantity;
    baseWork.total_client = clientPrice * quantity;
    
    return baseWork;
  });
};

/**
 * Проверка совместимости структуры работы с desktop версией
 * @param {Object} work - Объект работы
 * @returns {boolean} Совместим ли объект
 */
export const isWorkCompatible = (work) => {
  const requiredFields = ['work_type_id', 'name', 'unit', 'quantity', 'cost_price_per_unit'];
  return requiredFields.every(field => work[field] !== undefined);
};

/**
 * Объединение массивов работ без дубликатов
 * @param {Array} existingWorks - Существующие работы
 * @param {Array} newWorks - Новые работы для добавления
 * @returns {Array} Объединенный массив без дубликатов
 */
export const mergeWorksArrays = (existingWorks = [], newWorks = []) => {
  const normalized = normalizeWorksData([...existingWorks]);
  const normalizedNew = normalizeWorksData(newWorks);
  
  const merged = [...normalized];
  
  normalizedNew.forEach(newWork => {
    const existingIndex = merged.findIndex(existing => 
      getWorkId(existing) === getWorkId(newWork)
    );
    
    if (existingIndex >= 0) {
      // Обновляем существующую работу (складываем количество)
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...newWork,
        quantity: (parseFloat(merged[existingIndex].quantity) || 0) + (parseFloat(newWork.quantity) || 0)
      };
    } else {
      // Добавляем новую работу
      merged.push(newWork);
    }
  });
  
  return merged;
};

/**
 * Конвертация работ из мобильного формата в desktop формат для API
 * @param {Array} mobileWorks - Работы из мобильного интерфейса
 * @returns {Array} Работы в формате для API
 */
export const convertToApiFormat = (mobileWorks) => {
  return mobileWorks.map(work => ({
    work_type: work.work_type || work.work_type_id || work.id,
    quantity: parseFloat(work.quantity) || 1,
    cost_price_per_unit: parseFloat(work.cost_price_per_unit || work.cost_price) || 0,
    client_price_per_unit: parseFloat(work.client_price_per_unit || work.client_price || work.cost_price_per_unit || work.cost_price) || 0
  }));
};

/**
 * Проверка изменений в работах для определения необходимости сохранения
 * @param {Array} originalWorks - Исходные работы
 * @param {Array} currentWorks - Текущие работы
 * @returns {boolean} Были ли изменения
 */
export const hasWorksChanged = (originalWorks = [], currentWorks = []) => {
  if (originalWorks.length !== currentWorks.length) {
    return true;
  }
  
  const sortedOriginal = [...originalWorks].sort((a, b) => getWorkId(a) - getWorkId(b));
  const sortedCurrent = [...currentWorks].sort((a, b) => getWorkId(a) - getWorkId(b));
  
  return sortedOriginal.some((originalWork, index) => {
    const currentWork = sortedCurrent[index];
    return (
      getWorkId(originalWork) !== getWorkId(currentWork) ||
      parseFloat(originalWork.quantity || 0) !== parseFloat(currentWork.quantity || 0) ||
      parseFloat(originalWork.cost_price_per_unit || 0) !== parseFloat(currentWork.cost_price_per_unit || 0) ||
      parseFloat(originalWork.client_price_per_unit || 0) !== parseFloat(currentWork.client_price_per_unit || 0)
    );
  });
};

/**
 * Создание стабильного ключа для React компонентов
 * @param {Object} work - Объект работы
 * @param {number} index - Индекс в массиве (fallback)
 * @returns {string} Уникальный ключ
 */
export const createStableKey = (work, index) => {
  const workId = getWorkId(work);
  const itemId = work.item_id;
  
  if (itemId) {
    return itemId;
  }
  
  if (workId) {
    return `work_${workId}_${index}`;
  }
  
  return `fallback_${index}_${Date.now()}`;
};

/**
 * Вычисление итоговых сумм для массива работ
 * @param {Array} works - Массив работ
 * @param {boolean} includeClientPrices - Включать ли клиентские цены
 * @returns {Object} Объект с итоговыми суммами
 */
export const calculateTotals = (works = [], includeClientPrices = true) => {
  const totalCost = works.reduce((sum, work) => {
    const cost = parseFloat(work.cost_price_per_unit || work.cost_price || 0);
    const quantity = parseFloat(work.quantity || 0);
    return sum + (cost * quantity);
  }, 0);
  
  const totalQuantity = works.reduce((sum, work) => {
    return sum + (parseFloat(work.quantity || 0));
  }, 0);
  
  const result = {
    totalCost,
    totalQuantity,
    totalItems: works.length
  };
  
  if (includeClientPrices) {
    result.totalClient = works.reduce((sum, work) => {
      const client = parseFloat(work.client_price_per_unit || work.client_price || work.cost_price_per_unit || work.cost_price || 0);
      const quantity = parseFloat(work.quantity || 0);
      return sum + (client * quantity);
    }, 0);
  }
  
  return result;
};

/**
 * Фильтрация работ по поисковому запросу
 * @param {Array} works - Массив работ
 * @param {string} searchTerm - Поисковый запрос
 * @returns {Array} Отфильтрованный массив работ
 */
export const filterWorksBySearch = (works = [], searchTerm = '') => {
  if (!searchTerm.trim()) {
    return works;
  }
  
  const searchLower = searchTerm.toLowerCase();
  
  return works.filter(work => {
    const workName = (work.name || work.work_name || '').toLowerCase();
    const workUnit = (work.unit || work.unit_of_measurement || '').toLowerCase();
    return workName.includes(searchLower) || workUnit.includes(searchLower);
  });
};

/**
 * Валидация данных работы перед сохранением
 * @param {Object} work - Объект работы
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[]}
 */
export const validateWork = (work) => {
  const errors = [];
  
  if (!getWorkId(work)) {
    errors.push('Отсутствует ID работы');
  }
  
  if (!work.name && !work.work_name) {
    errors.push('Отсутствует название работы');
  }
  
  if (!work.unit && !work.unit_of_measurement) {
    errors.push('Отсутствует единица измерения');
  }
  
  const quantity = parseFloat(work.quantity || 0);
  if (quantity <= 0) {
    errors.push('Количество должно быть больше 0');
  }
  
  const costPrice = parseFloat(work.cost_price_per_unit || work.cost_price || 0);
  if (costPrice < 0) {
    errors.push('Стоимость не может быть отрицательной');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Дедупликация массива работ по ID
 * @param {Array} works - Массив работ
 * @returns {Array} Массив без дубликатов
 */
export const deduplicateWorks = (works = []) => {
  const seenIds = new Set();
  return works.filter(work => {
    const workId = getWorkId(work);
    if (seenIds.has(workId)) {
      return false;
    }
    seenIds.add(workId);
    return true;
  });
};