/**
 * Утилиты для работы с данными в мобильном UI
 * Обеспечивают совместимость с desktop форматом данных
 */

/**
 * Нормализация работы для совместимости с desktop EstimateEditor
 * @param {Object} work - работа из API или мобильного селектора
 * @returns {Object} нормализованная работа в формате desktop
 */
export const normalizeWork = (work) => {
  if (!work) return null;

  // Определяем цены
  const costPrice = work.cost_price || work.price || work.prices?.cost_price || 0;
  const clientPrice = work.client_price || work.prices?.client_price || costPrice;
  
  return {
    // Уникальный ID для React ключей
    item_id: work.item_id || `new_${work.id || work.work_type_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    // ID типа работы (основной идентификатор)
    work_type: work.id || work.work_type_id,
    work_type_id: work.id || work.work_type_id,
    
    // Информация о работе
    work_name: work.name || work.work_name,
    unit_of_measurement: work.unit || work.unit_of_measurement,
    
    // Количество
    quantity: parseFloat(work.quantity) || 1,
    
    // Цены
    cost_price_per_unit: parseFloat(costPrice),
    client_price_per_unit: parseFloat(clientPrice),
    
    // Общие суммы (для совместимости)
    total_cost: parseFloat(costPrice) * (parseFloat(work.quantity) || 1),
    total_client: parseFloat(clientPrice) * (parseFloat(work.quantity) || 1),
    
    // Категория
    categoryId: work.category?.category_id || work.categoryId,
    
    // Дополнительные поля для мобильного UI
    category_name: work.category?.category_name || work.category_name
  };
};

/**
 * Нормализация массива работ
 * @param {Array} works - массив работ
 * @returns {Array} массив нормализованных работ
 */
export const normalizeWorksData = (works) => {
  if (!Array.isArray(works)) return [];
  
  return works
    .filter(work => work && (work.id || work.work_type_id))
    .map(normalizeWork)
    .filter(Boolean);
};

/**
 * Объединение массивов работ без дубликатов
 * @param {Array} existingWorks - существующие работы 
 * @param {Array} newWorks - новые работы для добавления
 * @returns {Array} объединенный массив без дубликатов
 */
export const mergeWorksArrays = (existingWorks = [], newWorks = []) => {
  console.log('🔧 dataUtils: mergeWorksArrays вызвана:', {
    existingCount: existingWorks?.length || 0,
    newCount: newWorks?.length || 0
  });
  
  const existing = normalizeWorksData(existingWorks);
  const normalized = normalizeWorksData(newWorks);
  
  console.log('🔧 dataUtils: после нормализации:', {
    existingNormalized: existing.length,
    newNormalized: normalized.length
  });
  
  // Создаем Set существующих work_type_id для быстрой проверки
  const existingIds = new Set(existing.map(work => work.work_type_id));
  
  // Фильтруем новые работы, исключая дубликаты
  const uniqueNewWorks = normalized.filter(work => !existingIds.has(work.work_type_id));
  
  const merged = [...existing, ...uniqueNewWorks];
  
  console.log('🔄 dataUtils: Объединение работ:', {
    существующих: existing.length,
    новых: normalized.length,
    уникальныхНовых: uniqueNewWorks.length,
    итого: merged.length,
    merged: merged.map(w => ({ id: w.id || w.work_type_id, name: w.name || w.work_name, quantity: w.quantity }))
  });
  
  return merged;
};

/**
 * Создание стабильного ключа для React компонентов
 * @param {Object} work - работа
 * @param {number} index - индекс в массиве (fallback)
 * @returns {string} стабильный ключ
 */
export const createStableKey = (work, index = 0) => {
  if (!work) return `fallback_${index}`;
  
  return work.item_id || 
         work.work_type_id || 
         work.id || 
         `work_${index}_${work.work_name?.slice(0, 10) || 'unknown'}`;
};

/**
 * Конвертация работ из сметы для редактирования
 * @param {Array} estimateItems - позиции сметы из API
 * @returns {Array} работы в формате для мобильного редактора
 */
export const convertEstimateItemsToWorks = (estimateItems = []) => {
  if (!Array.isArray(estimateItems)) return [];
  
  return estimateItems.map(item => ({
    // Сохраняем item_id для обновлений
    item_id: item.item_id,
    
    // Основные данные
    id: item.work_type,
    work_type_id: item.work_type,
    work_name: item.work_name,
    unit_of_measurement: item.unit_of_measurement,
    
    // Количество и цены
    quantity: parseFloat(item.quantity) || 1,
    cost_price: parseFloat(item.cost_price_per_unit) || 0,
    client_price: parseFloat(item.client_price_per_unit) || 0,
    
    // Категория (если есть)
    categoryId: item.categoryId,
    category_name: item.category_name,
    
    // Флаг что это существующая работа
    isExisting: true
  }));
};

/**
 * Подсчет общей стоимости работ
 * @param {Array} works - массив работ
 * @param {string} priceType - тип цены ('cost' или 'client')
 * @returns {number} общая стоимость
 */
export const calculateTotalAmount = (works = [], priceType = 'cost') => {
  return works.reduce((total, work) => {
    const quantity = parseFloat(work.quantity) || 1;
    const price = priceType === 'client' 
      ? (parseFloat(work.client_price) || parseFloat(work.cost_price) || 0)
      : (parseFloat(work.cost_price) || 0);
    
    return total + (quantity * price);
  }, 0);
};

/**
 * Форматирование суммы в гривнах
 * @param {number} amount - сумма
 * @returns {string} отформатированная строка
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

/**
 * Проверка валидности работы для добавления в смету
 * @param {Object} work - работа для проверки
 * @returns {boolean} true если работа валидна
 */
export const isValidWork = (work) => {
  return !!(
    work &&
    (work.id || work.work_type_id) &&
    work.work_name &&
    work.unit_of_measurement &&
    (work.cost_price || work.price || work.prices?.cost_price)
  );
};