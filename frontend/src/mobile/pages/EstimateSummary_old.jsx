import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Estimate Summary Screen
 * Final step to review and save estimate with selected works
 */
const EstimateSummary = () => {
  const { navigateToScreen, getScreenData, setScreenData, currentScreen, navigationData } = useMobileNavigationContext();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();
  
  // === ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ===
  console.log('🚀 EstimateSummary COMPONENT RENDERED:');
  console.log('   currentScreen:', currentScreen);
  
  // Получаем данные экрана в зависимости от того, на каком экране мы находимся
  let screenData;
  let screenError = null;
  try {
    // Получаем данные для текущего экрана
    screenData = getScreenData();
    console.log('✅ getScreenData успешно выполнен для экрана:', currentScreen);
    console.log('📄 Данные экрана:', screenData);
    
    // ПОДРОБНАЯ ОТЛАДКА
    console.log('🔍 ПОДРОБНАЯ ОТЛАДКА НАВИГАЦИОННЫХ ДАННЫХ:');
    console.log('   - Текущий экран:', currentScreen);
    console.log('   - Есть ли данные для текущего экрана:', !!screenData);
    console.log('   - Есть ли selectedWorks в данных:', !!screenData?.selectedWorks);
    console.log('   - Количество selectedWorks:', screenData?.selectedWorks?.length || 0);
    console.log('   - Полные навигационные данные:', navigationData);
    console.log('   - Данные estimate-editor экрана:', navigationData?.['estimate-editor']);
    console.log('   - Данные estimate-editor экрана (дубликат):', navigationData?.['estimate-editor']);
  } catch (error) {
    console.error('❌ Ошибка в getScreenData:', error);
    screenError = error;
  }
  
  // Извлекаем данные сразу для использования в useState
  const selectedProject = screenData?.selectedProject;
  const selectedEstimate = screenData?.selectedEstimate;
  const createNewEstimate = screenData?.createNewEstimate;
  const editMode = screenData?.editMode;
  const viewMode = screenData?.viewMode;
  
  // Инициализируем все состояния сразу с безопасными значениями по умолчанию
  const [estimateName, setEstimateName] = useState(() => {
    // Для существующей сметы загружаем её название
    return selectedEstimate?.name || selectedEstimate?.estimate_number || '';
  });
  const [estimateDescription, setEstimateDescription] = useState(() => {
    // Для существующей сметы загружаем её описание
    return selectedEstimate?.description || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorks, setSelectedWorks] = useState(() => {
    const initialWorks = screenData?.selectedWorks || [];
    console.log('🏁 ИНИЦИАЛИЗАЦИЯ selectedWorks:', initialWorks.length, 'работ из screenData');
    console.log('🏁 screenData:', screenData);
    return initialWorks;
  });
  
  // Состояние для отслеживания изменений
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalWorks, setOriginalWorks] = useState(() => {
    return screenData?.selectedWorks || [];
  });
  
  // === ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ПОСЛЕ ИНИЦИАЛИЗАЦИИ ===
  console.log('📊 СОСТОЯНИЯ ПОСЛЕ ИНИЦИАЛИЗАЦИИ:');
  console.log('   selectedWorks.length:', selectedWorks.length);
  console.log('   screenData?.selectedWorks?.length:', screenData?.selectedWorks?.length);
  console.log('   screenData?.returnToEditor:', screenData?.returnToEditor);
  
  // Загрузка всех работ для dropdown
  const { data: allWorks = [], isLoading: isLoadingAllWorks } = useQuery({
    queryKey: ['all-work-types'],
    queryFn: api.getAllWorkTypes,
  });

  // Загружаем элементы сметы только для существующих смет (не для создания новых)
  const shouldLoadItems = Boolean(
    selectedEstimate?.estimate_id && !createNewEstimate
  );
  
  console.log('🔍 DataExpert: Анализ условий загрузки элементов:', {
    shouldLoadItems,
    hasEstimateId: !!selectedEstimate?.estimate_id,
    createNewEstimate,
    editMode,
    viewMode,
    estimateId: selectedEstimate?.estimate_id
  });
  
  const { data: estimateItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['estimate-items', selectedEstimate?.estimate_id],
    queryFn: () => {
      const estimateId = selectedEstimate?.estimate_id;
      console.log('🔄 Загружаем элементы для сметы ID:', estimateId);
      if (!estimateId) {
        throw new Error('Не указан ID сметы');
      }
      return api.getEstimateItems(estimateId);
    },
    enabled: shouldLoadItems
  });

  // Обработка загруженных элементов сметы - ТОЛЬКО ОДИН РАЗ
  React.useEffect(() => {
    if (estimateItems && estimateItems.length > 0 && allWorks && allWorks.length > 0 && !isEstimateItemsLoaded) {
      console.log('📋 Загружены элементы сметы (ПЕРВЫЙ РАЗ):', estimateItems);
      console.log('🔧 Доступные работы:', allWorks.slice(0, 3));
      console.log('⚠️ ТЕКУЩЕЕ СОСТОЯНИЕ selectedWorks ПЕРЕД ЗАГРУЗКОЙ:', selectedWorks.length);
      
      // Преобразуем элементы сметы в формат работ с поиском по каталогу
      const works = estimateItems.map(item => {
        console.log('🔍 Структура элемента сметы:', item);
        
        // Поиск работы в каталоге по ID
        const workTypeId = item.work_type?.work_type_id || item.work_type_id || item.work_type;
        const workFromCatalog = allWorks.find(w => 
          (w.work_type_id || w.id) === workTypeId
        );
        
        console.log(`🔎 Поиск работы ID=${workTypeId}:`, workFromCatalog);
        
        return {
          id: workTypeId,
          name: workFromCatalog?.name || workFromCatalog?.work_name || item.work_type?.work_name || item.work_type_name || item.name || `Работа #${workTypeId}`,
          work_name: workFromCatalog?.name || workFromCatalog?.work_name || item.work_type?.work_name || item.work_type_name || item.name,
          unit: workFromCatalog?.unit || workFromCatalog?.unit_of_measurement || item.work_type?.unit_of_measurement || item.unit || item.unit_of_measurement,
          unit_of_measurement: workFromCatalog?.unit || workFromCatalog?.unit_of_measurement || item.work_type?.unit_of_measurement || item.unit || item.unit_of_measurement,
          cost_price: item.cost_price_per_unit || item.cost_price || workFromCatalog?.cost_price || 0,
          client_price: item.client_price_per_unit || item.client_price || workFromCatalog?.client_price || 0,
          price: item.cost_price_per_unit || item.cost_price || workFromCatalog?.cost_price || 0,
          quantity: parseFloat(item.quantity) || 1.0
        };
      });
      console.log('🔧 Преобразованные работы:', works);
      console.log('🚨 УСТАНОВКА selectedWorks ИЗ ЗАГРУЖЕННЫХ ЭЛЕМЕНТОВ СМЕТЫ');
      console.log('⚠️ ТЕКУЩИЕ РАБОТЫ ПЕРЕД УСТАНОВКОЙ:', selectedWorks.length);
      
      // КРИТИЧНОЕ ИСПРАВЛЕНИЕ: НЕ перезаписываем, если работы уже инициализированы
      if (!isWorksInitialized) {
        console.log('✅ Первая инициализация работ из сметы');
        setSelectedWorks(works);
        setOriginalWorks(works); // Сохраняем оригинальное состояние
        setHasUnsavedChanges(false); // Сбрасываем флаг изменений
        setIsWorksInitialized(true); // Помечаем что работы инициализированы
      } else {
        console.log('⚠️ РАБОТЫ УЖЕ ИНИЦИАЛИЗИРОВАНЫ - НЕ ПЕРЕЗАПИСЫВАЕМ');
        // Не трогаем selectedWorks, только обновляем оригинальное состояние если нужно
      }
      
      setIsEstimateItemsLoaded(true); // Помечаем что элементы загружены
    }
  }, [estimateItems, allWorks, isEstimateItemsLoaded, isWorksInitialized]);
  
  // SecurityExpert: Стабильная ссылка на selectedWorks для предотвращения бесконечного цикла
  const stableSelectedWorks = useMemo(() => {
    const works = screenData?.selectedWorks;
    if (!works || !Array.isArray(works)) return null;
    // Создаем стабильную строку-ключ для сравнения
    return JSON.stringify(works.map(w => ({ id: w.id || w.work_type_id, quantity: w.quantity })));
  }, [screenData?.selectedWorks]);

  // Обработка добавления новых работ из WorkSelection - ИСПРАВЛЕННАЯ ВЕРСИЯ
  React.useEffect(() => {
    console.log('🔄 useEffect для добавления работ сработал:', {
      stableSelectedWorks,
      hasScreenData: !!screenData,
      hasSelectedWorks: !!screenData?.selectedWorks,
      returnToEditor: screenData?.returnToEditor,
      selectedWorksCount: screenData?.selectedWorks?.length || 0,
      currentWorksInTable: selectedWorks.length
    });
    
    // Игнорируем если нет работ в screenData
    if (!screenData?.selectedWorks || screenData.selectedWorks.length === 0) {
      console.log('❌ НЕТ РАБОТ в screenData для добавления');
      return;
    }
    
    // ВАЖНО: Проверяем флаг returnToEditor - это гарантирует что мы пришли из WorkSelection
    if (!screenData?.returnToEditor) {
      console.log('❌ НЕТ ФЛАГА returnToEditor - это НЕ возврат из WorkSelection');
      return;
    }
    
    console.log('✅ ПОДТВЕРЖДЕНО: Возврат из WorkSelection с работами для добавления');
    
    console.log('🔄 ПРОВЕРКА НА ДОБАВЛЕНИЕ РАБОТ:', {
      currentScreen,
      hasScreenData: !!screenData,
      hasSelectedWorks: !!screenData?.selectedWorks,
      selectedWorksCount: screenData?.selectedWorks?.length || 0,
      currentWorksInTable: selectedWorks.length,
      returnToEditor: screenData?.returnToEditor
    });
    
    // Получаем работы из screenData
    const worksToAdd = screenData?.selectedWorks;
    
    console.log('🎯 НАЙДЕНЫ РАБОТЫ ДЛЯ ДОБАВЛЕНИЯ!');
    console.log('📋 Работы для добавления:', worksToAdd);
    
    // ПРОСТАЯ ЛОГИКА ДОБАВЛЕНИЯ - ВСЕГДА ДОБАВЛЯЕМ К СУЩЕСТВУЮЩИМ
    console.log('🔄 ПРОСТОЕ ДОБАВЛЕНИЕ РАБОТ');
    console.log('📋 ТЕКУЩЕЕ СОСТОЯНИЕ:');
    console.log('   - Работ в таблице ДО добавления:', selectedWorks.length);
    console.log('   - Работ для добавления:', worksToAdd.length);
    
    setSelectedWorks(currentWorks => {
      console.log('🔥 ВНУТРИ setSelectedWorks:');
      console.log('   - Текущие работы:', currentWorks.length);
      console.log('   - Структура текущих работ:', currentWorks.map(w => ({ id: w.id, name: w.name })));
      console.log('   - Добавляем работы:', worksToAdd.length);
      console.log('   - Структура добавляемых работ:', worksToAdd.map(w => ({ id: w.id || w.work_type_id, name: w.name || w.work_name })));
      
      // ПРОСТО ДОБАВЛЯЕМ все новые работы к существующим
      const newWorksToAdd = worksToAdd.map(newWork => {
        const workId = newWork.id || newWork.work_type_id;
        const cost = parseFloat(newWork.prices?.cost_price) || parseFloat(newWork.cost_price) || parseFloat(newWork.price) || 0;
        const client = parseFloat(newWork.prices?.client_price) || cost;
        const quantity = parseFloat(newWork.quantity) || 1;
        
        return {
          // Desktop структура
          item_id: `new_${workId}_${Date.now()}_${Math.random()}`,
          work_type: workId,
          work_type_id: workId,
          work_name: newWork.name || newWork.work_name,
          unit_of_measurement: newWork.unit || newWork.unit_of_measurement,
          quantity: quantity,
          cost_price_per_unit: cost,
          client_price_per_unit: client,
          total_cost: cost * quantity,
          total_client: client * quantity,
          // UI совместимость
          id: workId,
          name: newWork.name || newWork.work_name,
          unit: newWork.unit || newWork.unit_of_measurement,
          cost_price: cost
        };
      });
      
      const finalWorks = [...currentWorks, ...newWorksToAdd];
      console.log('✅ ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:', finalWorks.length, 'работ');
      console.log('✅ СТРУКТУРА ФИНАЛЬНОГО РЕЗУЛЬТАТА:', finalWorks.map((w, index) => ({ 
        index, 
        id: w.id, 
        name: w.name, 
        item_id: w.item_id 
      })));
      return finalWorks;
    });
    
    setHasUnsavedChanges(true);
    console.log('✅ Работы успешно объединены с существующими');
    
    // КРИТИЧНО: Очищаем screenData чтобы избежать повторной обработки
    console.log('🧹 Очищаем screenData после обработки работ');
    setScreenData('estimate-editor', {
      ...screenData,
      selectedWorks: null,
      returnToEditor: false
    });
    
  }, [stableSelectedWorks, screenData?.returnToEditor, setScreenData]); // ПРАВИЛЬНЫЕ зависимости

  // Функция сравнения массивов работ для определения изменений
  const worksHaveChanged = (current, original) => {
    if (current.length !== original.length) return true;
    
    return current.some((work, index) => {
      const originalWork = original[index];
      if (!originalWork) return true;
      
      return (
        work.id !== originalWork.id ||
        work.quantity !== originalWork.quantity
      );
    });
  };
  
  // Отслеживание изменений в работах
  React.useEffect(() => {
    const hasChanges = worksHaveChanged(selectedWorks, originalWorks);
    setHasUnsavedChanges(hasChanges);
    console.log('🔄 Проверка изменений:', { hasChanges, currentCount: selectedWorks.length, originalCount: originalWorks.length });
  }, [selectedWorks, originalWorks]);

  // Filter works by search term - ВАЖНО: переместили ДО условных returns
  const filteredWorks = useMemo(() => {
    if (!searchTerm.trim()) return selectedWorks;
    
    const searchLower = searchTerm.toLowerCase();
    return selectedWorks.filter(work => {
      const workName = (work.name || work.work_name || '').toLowerCase();
      const workUnit = (work.unit || work.unit_of_measurement || '').toLowerCase();
      return workName.includes(searchLower) || workUnit.includes(searchLower);
    });
  }, [selectedWorks, searchTerm]);

  // Защита от отсутствия данных
  React.useEffect(() => {
    if (!selectedProject) {
      console.warn('EstimateSummary: отсутствует selectedProject, редирект на projects');
      navigateToScreen('projects');
    }
  }, [selectedProject, navigateToScreen]);

  // Обработка ошибки загрузки данных экрана
  if (screenError) {
    return (
      <div className="mobile-screen">
        <div className="mobile-error">
          <h3>Ошибка загрузки данных</h3>
          <p>Не удалось получить данные экрана: {screenError.message}</p>
        </div>
      </div>
    );
  }

  // Показываем загрузку пока данные не готовы
  if (!selectedProject) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем данные сметы..." />
      </div>
    );
  }

  // Если нет выбранных работ, показываем пустое состояние
  if (selectedWorks.length === 0) {
    console.log('⚠️ Показываем пустое состояние. Причины:', {
      selectedWorksLength: selectedWorks.length,
      isLoadingItems,
      selectedEstimate: !!selectedEstimate,
      createNewEstimate,
      shouldShowEmpty: selectedWorks.length === 0
    });
    
    return (
      <div className="mobile-screen">
        <div className="mobile-empty">
          <div className="mobile-empty-text">Нет выбранных работ</div>
          <div className="mobile-empty-subtext">
            {isLoadingItems ? 'Загружаем работы из сметы...' : 'Вернитесь к выбору работ для создания сметы'}
          </div>
          <button 
            className="mobile-btn"
            onClick={() => navigateToScreen('categories')}
            style={{ marginTop: '16px' }}
          >
            Выбрать работы
          </button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalCost = selectedWorks.reduce((sum, work) => {
    const price = work.cost_price || work.prices?.cost_price || work.price || 0;
    const quantity = parseFloat(work.quantity) || 1.0;
    return sum + price * quantity;
  }, 0);

  const totalItems = selectedWorks.reduce((sum, work) => {
    return sum + (parseFloat(work.quantity) || 1.0);
  }, 0);

  // Handle work quantity change
  const handleQuantityChange = (workIndex, newQuantity) => {
    const updatedWorks = [...selectedWorks];
    updatedWorks[workIndex].quantity = Math.max(1.0, parseFloat(newQuantity) || 1.0);
    setSelectedWorks(updatedWorks);
    console.log('📝 Изменено количество работы:', updatedWorks[workIndex]);
  };

  // Handle work removal
  const handleRemoveWork = (workIndex) => {
    const updatedWorks = selectedWorks.filter((_, index) => index !== workIndex);
    setSelectedWorks(updatedWorks);
    console.log('🗑️ Удалена работа, осталось:', updatedWorks.length);
  };

  // Handle adding work from dropdown
  // === ЭТАЛОННАЯ ЛОГИКА ИЗ DESKTOP EDITOR ===
  
  // Обновление элемента сметы с автоматическим пересчетом - ТОЧНАЯ КОПИЯ
  const updateItem = (itemId, field, value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) && value !== '') return;
    
    setSelectedWorks(prev => prev.map(item => {
      if (item.item_id === itemId) {
        const updatedItem = { ...item, [field]: numericValue };
        const cost = parseFloat(updatedItem.cost_price_per_unit) || 0;
        const client = parseFloat(updatedItem.client_price_per_unit) || 0;
        const qty = parseFloat(updatedItem.quantity) || 0;
        
        return {
          ...updatedItem,
          total_cost: cost * qty,
          total_client: client * qty
        };
      }
      return item;
    }));
    
    setHasUnsavedChanges(true);
  };

  // Добавление работ в смету - АДАПТИРОВАННАЯ ЛОГИКА ИЗ DESKTOP
  const handleAddWorksToEstimate = (newWorks) => {
    console.log('➕ Добавление работ в смету (desktop логика):', newWorks);
    
    const newItems = newWorks.map(work => {
      const cost = parseFloat(work.prices?.cost_price) || 0;
      const client = parseFloat(work.prices?.client_price) || 0;
      
      return {
        item_id: `new_${work.work_type_id}_${Date.now()}_${Math.random()}`,
        work_type: work.work_type_id,
        work_type_id: work.work_type_id,
        work_name: work.work_name,
        unit_of_measurement: work.unit_of_measurement,
        quantity: 1,
        cost_price_per_unit: cost,
        client_price_per_unit: client,
        total_cost: cost,
        total_client: client
      };
    });
    
    setSelectedWorks(prev => [...(prev || []), ...newItems]);
    setHasUnsavedChanges(true);
    console.log('✅ Добавлено работ с desktop логикой:', newItems.length);
  };

  const handleAddWork = (work) => {
    // Совместимость со старым UI - преобразуем в новый формат
    handleAddWorksToEstimate([{
      work_type_id: work.id || work.work_type_id,
      work_name: work.name || work.work_name,
      unit_of_measurement: work.unit || work.unit_of_measurement,
      prices: {
        cost_price: work.cost_price || work.prices?.cost_price || work.price || 0,
        client_price: work.cost_price || work.prices?.client_price || work.price || 0
      }
    }]);
    
    setSearchTerm(''); // Очищаем поиск
  };
  
  // Функция сохранения изменений
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);

    try {
      console.log('💾 Сохранение изменений в смете:', {
        selectedEstimate,
        selectedWorksCount: selectedWorks.length
      });

      // Подготавливаем массив работ - ЭТАЛОННАЯ ЛОГИКА
      const itemsToSave = selectedWorks.map(work => ({
        work_type: work.work_type || work.work_type_id,
        quantity: parseFloat(work.quantity) || 1,
        cost_price_per_unit: parseFloat(work.cost_price_per_unit) || 0,
        client_price_per_unit: parseFloat(work.client_price_per_unit) || 0
      }));

      // Формируем объект для отправки
      const dataToSend = {
        project_id: selectedProject.project_id || selectedProject.id,
        foreman_id: user.user_id || user.id,
        estimate_number: estimateName || selectedEstimate?.estimate_number || 'Смета',
        status_id: selectedEstimate?.status_id || 1,
        items: itemsToSave,
      };

      console.log('📝 Обновление сметы с данными:', dataToSend);

      // Обновляем смету
      const estimate = await api.updateEstimate(selectedEstimate.estimate_id, dataToSend);
      console.log('✅ Смета обновлена:', estimate);

      // Invalidate cache
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['estimate-items']);
      queryClient.invalidateQueries(['projects']);

      // Обновляем состояние
      setOriginalWorks([...selectedWorks]);
      setHasUnsavedChanges(false);
      
      console.log('🎉 Изменения успешно сохранены!');

    } catch (error) {
      console.error('❌ Ошибка сохранения изменений:', error);
      setError(`Не удалось сохранить изменения: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Форматирование в гривнах
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Generate auto name if needed
  const generateEstimateName = () => {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    return `Смета_${timestamp}_${selectedProject.name}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      console.log('🔍 Сохранение сметы по аналогии с обычным UI:', {
        createNewEstimate,
        selectedEstimate,
        selectedProject,
        user,
        selectedWorksCount: selectedWorks.length
      });

      // Подготавливаем массив работ в формате обычного UI - ЭТАЛОННАЯ ЛОГИКА
      const itemsToSave = selectedWorks.map(work => ({
        work_type: work.work_type || work.work_type_id || work.id,
        quantity: parseFloat(work.quantity) || 1,
        cost_price_per_unit: parseFloat(work.cost_price_per_unit) || parseFloat(work.cost_price) || parseFloat(work.prices?.cost_price) || parseFloat(work.price) || 0,
        client_price_per_unit: parseFloat(work.client_price_per_unit) || parseFloat(work.cost_price) || parseFloat(work.prices?.client_price) || parseFloat(work.price) || 0
      }));

      // Формируем объект для отправки как в обычном UI
      const dataToSend = {
        project_id: selectedProject.project_id || selectedProject.id,
        foreman_id: user.user_id || user.id,
        estimate_number: estimateName || generateEstimateName(),
        status_id: 1, // Draft status
        items: itemsToSave,
      };

      console.log('📝 Создание/обновление сметы с items:', dataToSend);

      let estimate;
      if (editMode && selectedEstimate) {
        // В режиме редактирования - обновляем существующую смету
        estimate = await api.updateEstimate(selectedEstimate.estimate_id, dataToSend);
        console.log('✅ Смета обновлена в режиме редактирования:', estimate);
      } else if (createNewEstimate || !selectedEstimate) {
        // Создаем новую смету со всеми элементами сразу
        estimate = await api.createEstimate(dataToSend);
        console.log('✅ Смета создана:', estimate);
      } else {
        // Обновляем существующую смету (старая логика)
        estimate = await api.updateEstimate(selectedEstimate.estimate_id, dataToSend);
        console.log('✅ Смета обновлена:', estimate);
      }

      // Invalidate cache and navigate
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['projects']);

      console.log('🎉 Смета успешно сохранена!');
      
      // Navigate back to project info
      navigateToScreen('project-info', false, { selectedProject });

    } catch (error) {
      console.error('❌ Ошибка сохранения сметы:', error);
      console.error('Stack trace:', error.stack);
      setError(`Не удалось сохранить смету: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Сохраняем смету..." />
      </div>
    );
  }

  if (isLoadingItems) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем данные сметы..." />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Estimate Name Card */}
      <div className="mobile-card">
        <div className="estimate-header-section">
          <div className="form-field">
            <label className="form-label">Название сметы</label>
            <input
              type="text"
              value={estimateName}
              onChange={(e) => setEstimateName(e.target.value)}
              className="field-input"
              style={{ background: '#1E1E1E', border: '2px solid #333' }}
              placeholder="Введите название сметы..."
            />
          </div>
          <div className="project-name-display" style={{ textAlign: 'center', marginTop: '16px', fontSize: '16px', color: '#CCCCCC', fontWeight: '500' }}>
            {selectedProject?.name || selectedProject?.project_name || 'Не указан'}
          </div>
        </div>
      </div>

      {/* Add Works Dropdown - centered title */}
      <div style={{ marginTop: '8px' }}>
        <WorksDropdown 
          allWorks={allWorks}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddWork={handleAddWork}
          selectedWorks={selectedWorks}
        />
      </div>

      {/* Selected Works Table */}
      <div className="works-table-container">
        <div className="works-table-header">
          <h3 className="section-title" style={{ textAlign: 'center' }}>Итоговая смета</h3>
        </div>
        
        {filteredWorks.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-text">
              {searchTerm ? 'Ничего не найдено' : 'Нет выбранных работ'}
            </div>
          </div>
        ) : (
          <div className="works-table">
            <div className="works-table-head">
              <div className="table-cell-name">Работа</div>
              <div className="table-cell-qty">Кол-во</div>
              <div className="table-cell-price">Цена</div>
              <div className="table-cell-total">Итого</div>
            </div>
            
            {filteredWorks.map((work, index) => {
              const originalIndex = selectedWorks.findIndex(w => w === work);
              return (
                <WorkTableRow 
                  key={`${work.id}-${originalIndex}`}
                  work={work}
                  index={originalIndex}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveWork}
                  formatCurrency={formatCurrency}
                />
              );
            })}
            
            {/* Total Row */}
            <div className="works-table-total-row">
              <div className="table-cell-name">
                <div className="work-name total-label">ИТОГО:</div>
              </div>
              <div className="table-cell-qty total-items">{totalItems.toFixed(1)}</div>
              <div className="table-cell-price"></div>
              <div className="table-cell-total total-amount">{formatCurrency(totalCost)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mobile-card">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="mobile-card action-buttons">
        
        {/* Кнопка редактирования работ - ЕДИНАЯ ЛОГИКА для всех случаев */}
        <button 
          className="mobile-btn mobile-btn-compact"
          onClick={() => {
            console.log('🔧 UI/UxDesiner: УНИФИЦИРОВАННАЯ кнопка "Редактировать работы":', {
              selectedProject: selectedProject?.project_name,
              selectedEstimate: selectedEstimate?.estimate_id,
              createNewEstimate,
              editMode,
              viewMode
            });
            // Всегда используем логику как при редактировании существующей сметы
            navigateToScreen('works', true, { 
              selectedProject, 
              selectedEstimate, 
              editMode: true,
              createNewEstimate: createNewEstimate,  // ✅ ПЕРЕДАЕМ РЕАЛЬНОЕ ЗНАЧЕНИЕ
              viewMode: false
            });
          }}
        >
          Редактировать работы
        </button>
        
        {/* Кнопка сохранения - для ВСЕХ случаев (создания и редактирования) */}
        <button 
          className="mobile-btn mobile-btn-primary mobile-btn-compact"
          onClick={createNewEstimate ? handleSave : handleSaveChanges}
          disabled={createNewEstimate ? (selectedWorks.length === 0 || isSaving) : (!hasUnsavedChanges || isSaving)}
          style={{ 
            backgroundColor: (createNewEstimate ? selectedWorks.length > 0 : hasUnsavedChanges) ? '#4CAF50' : '#333', 
            borderColor: (createNewEstimate ? selectedWorks.length > 0 : hasUnsavedChanges) ? '#4CAF50' : '#333',
            color: (createNewEstimate ? selectedWorks.length > 0 : hasUnsavedChanges) ? '#000' : '#666'
          }}
        >
          {isSaving ? 'Сохраняем...' : (createNewEstimate ? 'Создать смету' : 'Сохранить изменения')}
        </button>
      </div>
    </div>
  );
};

/**
 * Work Table Row Component
 * Individual row in the works table with touch edit/delete functionality
 */
const WorkTableRow = ({ work, index, onQuantityChange, onRemove, formatCurrency }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempQuantity, setTempQuantity] = React.useState(work.quantity);
  const [touchTimer, setTouchTimer] = React.useState(null);
  const [touchStart, setTouchStart] = React.useState(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
  const [isSwipeDeleteActive, setIsSwipeDeleteActive] = React.useState(false);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setSwipeDistance(0);
    
    const timer = setTimeout(() => {
      setIsEditing(true);
      setTouchTimer(null);
    }, 500); // 500ms long press
    setTouchTimer(timer);
  };

  const handleTouchMove = (e) => {
    if (!touchStart || isEditing) return;
    
    const touch = e.touches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = Math.abs(touchStart.y - touch.clientY);
    
    // Только горизонтальный свайп
    if (deltaY < 30 && deltaX > 10) {
      if (touchTimer) {
        clearTimeout(touchTimer);
        setTouchTimer(null);
      }
      
      setSwipeDistance(Math.min(deltaX, 120));
      if (deltaX > 80) {
        setIsSwipeDeleteActive(true);
      } else {
        setIsSwipeDeleteActive(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
    
    if (swipeDistance > 80) {
      // Удаляем работу при достаточном свайпе
      onRemove(index);
    } else {
      // Возвращаем в исходное положение
      setSwipeDistance(0);
      setIsSwipeDeleteActive(false);
    }
    
    setTouchStart(null);
  };

  const handleQuantitySubmit = () => {
    onQuantityChange(index, tempQuantity);
    setIsEditing(false);
  };

  const handleRemoveClick = () => {
    onRemove(index);
  };

  if (isEditing) {
    return (
      <div className="works-table-row editing">
        <div className="table-cell-name">
          <div className="work-name">
            {work.name || work.work_name || `Работа #${work.id}`}
          </div>
          <div className="work-unit">{work.unit || work.unit_of_measurement}</div>
        </div>
        <div className="table-cell-qty editing-cell">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={tempQuantity}
            onChange={(e) => setTempQuantity(parseInt(e.target.value) || 1)}
            className="quantity-edit-input-large"
            min="1"
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="table-cell-price">
          {formatCurrency(work.cost_price || work.prices?.cost_price || work.price || 0)}
        </div>
        <div className="table-cell-actions">
          <button 
            className="action-btn save-btn"
            onClick={handleQuantitySubmit}
          >
            ✓
          </button>
          <button 
            className="action-btn delete-btn"
            onClick={handleRemoveClick}
          >
            ✗
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-container">
      <div 
        className={`works-table-row ${isSwipeDeleteActive ? 'swipe-delete-active' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${swipeDistance}px)`,
          transition: swipeDistance === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        <div className="table-cell-name">
          <div className="work-name">
            {work.name || work.work_name || `Работа #${work.id}`}
          </div>
          <div className="work-unit">{work.unit || work.unit_of_measurement}</div>
        </div>
        <div className="table-cell-qty">{parseFloat(work.quantity || 1).toFixed(1)}</div>
        <div className="table-cell-price">
          {formatCurrency(work.cost_price || work.prices?.cost_price || work.price || 0)}
        </div>
        <div className="table-cell-total">
          {formatCurrency((work.cost_price || work.prices?.cost_price || work.price || 0) * work.quantity)}
        </div>
      </div>
      
      {swipeDistance > 0 && (
        <div 
          className={`swipe-delete-background ${isSwipeDeleteActive ? 'active' : ''}`}
          style={{ width: `${swipeDistance}px` }}
        >
          <span className="delete-icon">🗑️</span>
          <span className="delete-text">Удалить</span>
        </div>
      )}
    </div>
  );
};

/**
 * Works Dropdown Component
 * Dropdown for adding works to estimate
 */
const WorksDropdown = ({ allWorks, searchTerm, setSearchTerm, onAddWork, selectedWorks }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredWorks = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const searchLower = searchTerm.toLowerCase();
    const selectedWorkIds = selectedWorks.map(w => w.id || w.work_type_id);
    
    // Фильтруем работы и добавляем систему оценки релевантности
    const matchingWorks = allWorks
      .filter(work => {
        const workName = (work.name || work.work_name || '').toLowerCase();
        const isAlreadySelected = selectedWorkIds.includes(work.id || work.work_type_id);
        return workName.includes(searchLower) && !isAlreadySelected;
      })
      .map(work => {
        const workName = (work.name || work.work_name || '').toLowerCase();
        let relevanceScore = 0;
        
        // Система приоритетов для максимальной релевантности результатов:
        
        // 1. Точное совпадение - наивысший приоритет
        if (workName === searchLower) {
          relevanceScore = 1000;
        }
        // 2. Совпадение с начала строки - очень высокий приоритет  
        else if (workName.startsWith(searchLower)) {
          relevanceScore = 900;
        }
        // 3. Совпадение с начала любого слова - высокий приоритет
        else if (workName.includes(' ' + searchLower)) {
          relevanceScore = 800;
        }
        // 4. Анализ по отдельным словам для составных запросов
        else {
          const searchWords = searchLower.split(' ').filter(word => word.length > 0);
          let wordMatches = 0;
          let totalWordScore = 0;
          
          searchWords.forEach(searchWord => {
            if (workName.includes(searchWord)) {
              wordMatches++;
              // Дополнительные очки за позиционное совпадение
              if (workName.startsWith(searchWord) || workName.includes(' ' + searchWord)) {
                totalWordScore += 50;
              } else {
                totalWordScore += 25;
              }
            }
          });
          
          // Финальный расчет на основе покрытия слов
          const wordMatchRatio = wordMatches / searchWords.length;
          relevanceScore = Math.floor(wordMatchRatio * 700 + totalWordScore);
        }
        
        // Дополнительный бонус за компактность названия
        if (relevanceScore > 0 && workName.length < 50) {
          relevanceScore += 10;
        }
        
        return { ...work, relevanceScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore) // Сортировка по релевантности
      .slice(0, 10); // Лимит результатов для удобства
    
    return matchingWorks;
  }, [allWorks, searchTerm, selectedWorks]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(value.length > 0);
  };

  const handleSelectWork = (work) => {
    onAddWork(work);
    setIsOpen(false);
  };

  return (
    <div className="works-dropdown-container">
      <div className="dropdown-header">
        <h3 className="dropdown-title" style={{ textAlign: 'center' }}>Добавить работу</h3>
      </div>
      
      <div className="dropdown-search-wrapper">
        <input
          type="text"
          placeholder="Начните вводить название работы..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="dropdown-search-input"
          onFocus={() => setIsOpen(searchTerm.length > 0)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        
        {isOpen && filteredWorks.length > 0 && (
          <div className="dropdown-results">
            {filteredWorks.map((work) => (
              <div
                key={work.id || work.work_type_id}
                className="dropdown-item"
                onMouseDown={() => handleSelectWork(work)}
              >
                <div className="dropdown-item-name">
                  {work.name || work.work_name}
                </div>
                <div className="dropdown-item-details">
                  {work.unit || work.unit_of_measurement} • 
                  {new Intl.NumberFormat('uk-UA', {
                    style: 'currency',
                    currency: 'UAH',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(work.cost_price || work.prices?.cost_price || work.price || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isOpen && searchTerm.length > 0 && filteredWorks.length === 0 && (
          <div className="dropdown-no-results">
            <div className="no-results-text">Ничего не найдено</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimateSummary;