/**
 * Тестовый файл для проверки работы функций нормализации и объединения работ
 * Для диагностики проблемы с добавлением работ
 */

import { normalizeWork, normalizeWorksData, mergeWorksArrays } from './dataUtils.js';

// Тестовые данные в формате API
const testWorkFromAPI = {
  "work_type_id": 501,
  "work_name": "Демонтаж вентилятора канального",
  "unit_of_measurement": "шт",
  "category": {
    "category_id": 26,
    "category_name": "Вентиляція"
  },
  "prices": {
    "cost_price": "150.00",
    "client_price": "200.00"
  }
};

console.log('🧪 ТЕСТИРОВАНИЕ normalizeWork:');
console.log('Исходные данные из API:', testWorkFromAPI);

const normalizedWork = normalizeWork(testWorkFromAPI);
console.log('Нормализованная работа:', normalizedWork);

console.log('\n🧪 ТЕСТИРОВАНИЕ mergeWorksArrays:');

const existingWorks = [normalizedWork];
const newWorks = [{
  ...testWorkFromAPI,
  quantity: 2
}];

console.log('Существующие работы:', existingWorks.length);
console.log('Новые работы:', newWorks.length);

const mergedWorks = mergeWorksArrays(existingWorks, newWorks);
console.log('Объединенные работы:', mergedWorks);
console.log('Количество после объединения:', mergedWorks[0]?.quantity);

export { testWorkFromAPI, normalizedWork, mergedWorks };