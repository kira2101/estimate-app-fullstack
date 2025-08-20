/**
 * Отладочный модуль для мобильного workflow создания смет
 * Помогает отследить поток данных: WorkSelection -> Navigation Context -> EstimateSummary
 */

/**
 * Включение подробного логирования для отладки workflow
 */
export const enableWorkflowDebug = () => {
  console.log('🐞 WorkflowDebug: Включено подробное логирование мобильного workflow');
  
  // Переопределяем console.log для более читаемого вывода
  const originalLog = console.log;
  console.log = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('🔧')) {
      originalLog('='.repeat(60));
      originalLog(...args);
      if (args[1] && typeof args[1] === 'object') {
        originalLog('Детали:', JSON.stringify(args[1], null, 2));
      }
      originalLog('='.repeat(60));
    } else {
      originalLog(...args);
    }
  };
};

/**
 * Тестовые данные для отладки
 */
export const createTestWorks = () => {
  return [
    {
      id: 1,
      work_type_id: 1,
      name: 'Тестовая работа 1',
      work_name: 'Тестовая работа 1',
      unit: 'м²',
      unit_of_measurement: 'м²',
      quantity: 10,
      cost_price: 100,
      client_price: 150,
      category_id: 1
    },
    {
      id: 2,
      work_type_id: 2,
      name: 'Тестовая работа 2',
      work_name: 'Тестовая работа 2',
      unit: 'шт',
      unit_of_measurement: 'шт',
      quantity: 5,
      cost_price: 50,
      client_price: 75,
      category_id: 1
    }
  ];
};

/**
 * Проверка целостности данных на каждом этапе workflow
 */
export const validateWorkflowData = (stage, data) => {
  console.log(`🔍 WorkflowDebug: Валидация данных на этапе "${stage}"`);
  
  if (!data) {
    console.error(`❌ Данные отсутствуют на этапе "${stage}"`);
    return false;
  }
  
  if (stage === 'work-selection') {
    const isValid = Array.isArray(data) && data.length > 0 && 
                   data.every(work => work.id || work.work_type_id);
    console.log(`✅ Валидация работ в WorkSelection: ${isValid ? 'УСПЕШНО' : 'ОШИБКА'}`);
    return isValid;
  }
  
  if (stage === 'navigation-context') {
    const isValid = data.selectedWorks && Array.isArray(data.selectedWorks);
    console.log(`✅ Валидация данных в Navigation Context: ${isValid ? 'УСПЕШНО' : 'ОШИБКА'}`);
    return isValid;
  }
  
  if (stage === 'estimate-summary') {
    const isValid = Array.isArray(data) && data.every(work => 
      (work.id || work.work_type_id) && (work.name || work.work_name)
    );
    console.log(`✅ Валидация работ в EstimateSummary: ${isValid ? 'УСПЕШНО' : 'ОШИБКА'}`);
    return isValid;
  }
  
  return true;
};

/**
 * Трассировка потока данных
 */
export const traceDataFlow = (from, to, data) => {
  console.log(`📊 WorkflowDebug: Поток данных ${from} → ${to}`);
  console.log('Данные:', {
    type: Array.isArray(data) ? 'Array' : typeof data,
    count: Array.isArray(data) ? data.length : 'N/A',
    keys: typeof data === 'object' && data ? Object.keys(data) : 'N/A'
  });
  
  if (Array.isArray(data) && data.length > 0) {
    console.log('Первый элемент:', data[0]);
  }
};

/**
 * Мониторинг изменений состояния
 */
export const monitorStateChanges = (componentName, prevState, newState) => {
  console.log(`🔄 WorkflowDebug: Изменение состояния в ${componentName}`);
  console.log('Было:', prevState);
  console.log('Стало:', newState);
  
  if (Array.isArray(prevState) && Array.isArray(newState)) {
    const diff = newState.length - prevState.length;
    console.log(`Изменение количества элементов: ${diff > 0 ? '+' : ''}${diff}`);
  }
};

// Автоматическое включение отладки в dev режиме
if (import.meta.env.DEV) {
  enableWorkflowDebug();
}