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

  // ИСПРАВЛЕНО: Правильное извлечение и парсинг цен из всех возможных источников
  const quantity = parseFloat(work.quantity) || 1;
  
  // Извлекаем cost_price с проверкой всех возможных источников
  let costPricePerUnit = 0;
  if (work.cost_price_per_unit !== undefined) {
    costPricePerUnit = parseFloat(work.cost_price_per_unit) || 0;
  } else if (work.cost_price !== undefined) {
    costPricePerUnit = parseFloat(work.cost_price) || 0;
  } else if (work.price !== undefined) {
    costPricePerUnit = parseFloat(work.price) || 0;
  } else if (work.prices?.cost_price !== undefined) {
    costPricePerUnit = parseFloat(work.prices.cost_price) || 0;
  }
  
  // Извлекаем client_price с проверкой всех возможных источников
  let clientPricePerUnit = 0;
  if (work.client_price_per_unit !== undefined) {
    clientPricePerUnit = parseFloat(work.client_price_per_unit) || 0;
  } else if (work.client_price !== undefined) {
    clientPricePerUnit = parseFloat(work.client_price) || 0;
  } else if (work.prices?.client_price !== undefined) {
    clientPricePerUnit = parseFloat(work.prices.client_price) || 0;
  } else {
    // Если клиентская цена не указана, используем себестоимость
    clientPricePerUnit = costPricePerUnit;
  }

  // Диагностический лог для отладки нормализации работ
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 normalizeWork:', {
      workName: work.name || work.work_name,
      workId: work.id || work.work_type_id,
      rawPrices: work.prices,
      costPricePerUnit,
      clientPricePerUnit,
      quantity
    });
  }

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
    quantity: quantity,
    
    // Цены за единицу
    cost_price_per_unit: costPricePerUnit,
    client_price_per_unit: clientPricePerUnit,
    
    // Дублируем поля для совместимости с разными форматами
    cost_price: costPricePerUnit,
    client_price: clientPricePerUnit,
    name: work.name || work.work_name,
    unit: work.unit || work.unit_of_measurement,
    
    // Общие суммы (пересчитываются автоматически)
    total_cost: costPricePerUnit * quantity,
    total_client: clientPricePerUnit * quantity,
    
    // Категория
    categoryId: work.category?.category_id || work.categoryId,
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
 * Объединение массивов работ с заменой количества при повторном добавлении
 * @param {Array} existingWorks - существующие работы 
 * @param {Array} newWorks - новые работы для добавления
 * @returns {Array} объединенный массив с обновленным количеством для повторных работ
 */
export const mergeWorksArrays = (existingWorks = [], newWorks = []) => {
  // КРИТИЧНАЯ ДИАГНОСТИКА: Подробное логирование входных параметров
  console.log('🔧 dataUtils: mergeWorksArrays НАЧАЛО обработки:', {
    existingWorks_type: typeof existingWorks,
    existingWorks_isArray: Array.isArray(existingWorks),
    existingCount: existingWorks?.length || 0,
    newWorks_type: typeof newWorks,  
    newWorks_isArray: Array.isArray(newWorks),
    newCount: newWorks?.length || 0,
    stackTrace: new Error().stack
  });
  
  // SecurityExpert: Проверка входных данных для предотвращения ошибок
  if (!Array.isArray(existingWorks)) {
    console.warn('🔧 dataUtils: existingWorks не является массивом, принудительное приведение');
    existingWorks = [];
  }
  if (!Array.isArray(newWorks)) {
    console.warn('🔧 dataUtils: newWorks не является массивом, принудительное приведение');
    newWorks = [];
  }
  
  // КРИТИЧНО: Если новых работ нет, возвращаем существующие без изменений
  if (newWorks.length === 0) {
    console.log('⚠️ dataUtils: Новые работы отсутствуют, возвращаем существующие:', existingWorks.length);
    return existingWorks;
  }
  
  console.log('🔧 dataUtils: Входные данные после валидации:', {
    existingCount: existingWorks.length,
    newCount: newWorks.length,
    existingWorks: existingWorks.map(w => ({ 
      id: w.id || w.work_type_id, 
      name: w.name || w.work_name, 
      quantity: w.quantity,
      source: 'existing'
    })),
    newWorks: newWorks.map(w => ({ 
      id: w.id || w.work_type_id, 
      name: w.name || w.work_name, 
      quantity: w.quantity,
      source: 'new' 
    }))
  });
  
  const existing = normalizeWorksData(existingWorks);
  const normalized = normalizeWorksData(newWorks);
  
  console.log('🔧 dataUtils: после нормализации:', {
    existingNormalized: existing.length,
    newNormalized: normalized.length,
    existingNormalizedWorks: existing.map(w => ({ id: w.work_type_id, name: w.work_name, quantity: w.quantity })),
    newNormalizedWorks: normalized.map(w => ({ id: w.work_type_id, name: w.work_name, quantity: w.quantity }))
  });
  
  // Создаем копию существующих работ для модификации
  const result = [...existing];
  
  // Обрабатываем каждую новую работу
  normalized.forEach(newWork => {
    const existingIndex = result.findIndex(existingWork => 
      existingWork.work_type_id === newWork.work_type_id
    );
    
    if (existingIndex >= 0) {
      // ИСПРАВЛЕНО: Работа уже есть - ЗАМЕНЯЕМ количество (не складываем)
      const oldQuantity = parseFloat(result[existingIndex].quantity) || 1;
      const newQuantity = parseFloat(newWork.quantity) || 1;
      
      console.log(`🔧 dataUtils: работа ${newWork.work_type_id} (${newWork.work_name}) УЖЕ ЕСТЬ - ЗАМЕНЯЕМ:`, {
        былоКоличество: oldQuantity,
        новоеКоличество: newQuantity
      });
      
      // КРИТИЧНО: ЗАМЕНЯЕМ количество полностью (не складываем)
      result[existingIndex] = {
        ...result[existingIndex],
        quantity: newQuantity, // ИСПРАВЛЕНО: просто заменяем на новое количество
        total_cost: (parseFloat(result[existingIndex].cost_price_per_unit) || 0) * newQuantity,
        total_client: (parseFloat(result[existingIndex].client_price_per_unit) || 0) * newQuantity
      };
    } else {
      // Новая работа - просто добавляем
      console.log(`🔧 dataUtils: работа ${newWork.work_type_id} (${newWork.work_name}) НОВАЯ - добавляем`);
      result.push(newWork);
    }
  });
  
  console.log('🔄 dataUtils: РЕЗУЛЬТАТ объединения работ с заменой количества:', {
    существующих: existing.length,
    новых: normalized.length,
    итого: result.length,
    merged: result.map(w => ({ id: w.work_type_id, name: w.work_name, quantity: w.quantity }))
  });
  
  return result;
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
    
    // ИСПРАВЛЕНО: Правильное извлечение цен с учетом всех возможных полей
    let price = 0;
    if (priceType === 'client') {
      price = parseFloat(work.client_price_per_unit) || 
              parseFloat(work.client_price) || 
              parseFloat(work.cost_price_per_unit) || 
              parseFloat(work.cost_price) || 0;
    } else {
      price = parseFloat(work.cost_price_per_unit) || 
              parseFloat(work.cost_price) || 0;
    }
    
    // КРИТИЧНО: Защита от некорректных данных
    if (quantity <= 0 || price < 0) {
      console.warn('🔧 dataUtils: Некорректные данные для расчета:', {
        work: work.work_name || 'неизвестная работа',
        quantity,
        price,
        priceType
      });
      return total;
    }
    
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