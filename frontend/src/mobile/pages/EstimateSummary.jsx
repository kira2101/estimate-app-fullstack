import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import { apiWithEvents } from '../../api/apiWithEvents';
import { normalizeApiResponse } from '../utils/apiHelpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import WorkSearchDropdown from '../components/ui/WorkSearchDropdown';
import './EstimateSummary.css';
import { 
  normalizeWorksData, 
  convertEstimateItemsToWorks, 
  createStableKey, 
  calculateTotalAmount, 
  formatCurrency,
  isValidWork,
  mergeWorksArrays
} from '../utils/dataUtils';

/**
 * Estimate Summary Screen
 * Final step to review and save estimate with selected works
 */
const EstimateSummary = () => {
  const { navigateToScreen, getScreenData, setScreenData, addWorksToScreen, getWorksFromScreen, clearWorksFromScreen, currentScreen, navigationData } = useMobileNavigationContext();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();
  
  console.log('🚀 ОТЛАДКА EstimateSummary: Компонент НАЧАЛО рендера');
  console.log('📊 ОТЛАДКА EstimateSummary - Пользователь:', user?.role);
  
  // SecurityExpert: Проверка роли для безопасности данных
  const isForeman = user?.role === 'прораб';
  const canViewClientPrices = !isForeman; // Прорабы НЕ могут видеть клиентские цены
  
  console.log('🔒 ОТЛАДКА EstimateSummary - Права доступа:', {
    userRole: user?.role,
    isForeman,
    canViewClientPrices
  });

  // Получаем данные экрана
  let screenData;
  try {
    screenData = getScreenData();
    console.log('📄 ОТЛАДКА EstimateSummary - Данные экрана:', screenData);
  } catch (error) {
    console.error('❌ ОТЛАДКА EstimateSummary - Ошибка в getScreenData:', error);
  }
  
  // Извлекаем данные из screenData
  const selectedProject = screenData?.selectedProject;
  const selectedEstimate = screenData?.selectedEstimate;
  const createNewEstimate = screenData?.createNewEstimate;
  const editMode = screenData?.editMode;
  const viewMode = screenData?.viewMode;
  const screenDataWorks = screenData?.selectedWorks || [];
  
  console.log('🔍 ОТЛАДКА EstimateSummary - screenData.selectedWorks:', screenDataWorks.length, 'работ');
  
  // ПРИНУДИТЕЛЬНО ОЧИЩАЕМ КЭШ ПРИ МОНТИРОВАНИИ (БЕЗОПАСНО)
  React.useEffect(() => {
    try {
      if (selectedEstimate?.estimate_id) {
        console.log('🧹 [CACHE] Очищаем кэш для estimate-items:', selectedEstimate.estimate_id);
        queryClient.removeQueries(['estimate-items', selectedEstimate.estimate_id]);
        queryClient.invalidateQueries(['estimate-items', selectedEstimate.estimate_id]);
      }
    } catch (error) {
      console.error('❌ [CACHE] Ошибка очистки кэша:', error);
    }
  }, [selectedEstimate?.estimate_id, queryClient]);
  
  console.log('🔍 ОТЛАДКА EstimateSummary - selectedEstimate:', selectedEstimate?.estimate_id);
  console.log('🔍 ОТЛАДКА EstimateSummary - createNewEstimate:', createNewEstimate);
  
  // Состояния компонента (СОХРАНЯЕМ СТАРЫЙ UI)
  const [estimateName, setEstimateName] = useState(() => {
    // Если редактируем существующую смету, используем её название
    if (selectedEstimate?.name || selectedEstimate?.estimate_number) {
      return selectedEstimate.name || selectedEstimate.estimate_number;
    }
    
    // Для новой сметы генерируем имя по умолчанию: См_(объект)-(дата)-(время)
    const now = new Date();
    const date = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const projectName = selectedProject?.name || selectedProject?.project_name || 'Объект';
    return `См_${projectName}-${date}-${time}`;
  });
  const [originalEstimateName] = useState(() => {
    return selectedEstimate?.name || selectedEstimate?.estimate_number || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [nameError, setNameError] = useState(null);
  
  // Безопасная инициализация selectedWorks 
  const [selectedWorks, setSelectedWorks] = useState([]);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalWorks, setOriginalWorks] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false); // Флаг инициализации

  // Логирование состояний ПОСЛЕ объявления
  console.log('🔍 ОТЛАДКА EstimateSummary - Состояния:', {
    hasUnsavedChanges,
    selectedWorksCount: selectedWorks?.length || 0,
    originalWorksCount: originalWorks?.length || 0,
    createNewEstimate: screenData?.createNewEstimate,
    editMode: screenData?.editMode,
    isInitialized
  });

  // Функция проверки уникальности имени сметы
  const checkNameUniqueness = (name) => {
    if (!name.trim()) return null;
    
    const trimmedName = name.trim();
    // ИСПРАВЛЕНО: Проверяем только активные (не удаленные) сметы
    const existingEstimate = allEstimates.find(est => 
      est.estimate_number === trimmedName && 
      est.estimate_id !== selectedEstimate?.estimate_id && // Исключаем текущую смету при редактировании
      !est.deleted_at // Исключаем удаленные сметы
    );
    
    return existingEstimate ? 'Смета с таким именем уже существует' : null;
  };

  // Обработка изменения имени сметы
  const handleNameChange = (newName) => {
    setEstimateName(newName);
    
    // Проверяем уникальность только если имя не пустое
    const error = checkNameUniqueness(newName);
    setNameError(error);
    
    // КРИТИЧНО: Активируем кнопку сохранения при изменении имени (даже при редактировании)
    const nameChanged = newName.trim() !== originalEstimateName.trim();
    if (nameChanged && !error) {
      setHasUnsavedChanges(true);
      console.log('🔄 EstimateSummary: Имя сметы изменено, активируем кнопку сохранения');
    }
  };


  // Загрузка всех работ
  const { data: allWorksResponse, isLoading: isLoadingAllWorks } = useQuery({
    queryKey: ['all-work-types'],
    queryFn: api.getAllWorkTypes,
  });
  
  // Normalize works data
  const allWorks = normalizeApiResponse(allWorksResponse);

  // Загрузка всех смет для проверки уникальности имени
  const { data: allEstimatesResponse } = useQuery({
    queryKey: ['estimates-mobile'],
    queryFn: () => api.getEstimates(), // ИСПРАВЛЕНИЕ: убираем mobile_sum
  });
  
  // Normalize estimates data
  const allEstimates = normalizeApiResponse(allEstimatesResponse);

  // Загрузка элементов сметы для режима редактирования
  const shouldLoadItems = Boolean(selectedEstimate?.estimate_id && !createNewEstimate);
  
  console.log('📋 [QUERY] shouldLoadItems:', shouldLoadItems, ', selectedEstimate:', selectedEstimate?.estimate_id, ', createNewEstimate:', createNewEstimate, ', screenData.createNewEstimate:', screenData?.createNewEstimate);
  
  console.log('🗺️ [QUERY] Конфигурация useQuery:', { 
    queryKey: ['estimate-items', selectedEstimate?.estimate_id],
    enabled: shouldLoadItems 
  });
  
  const { data: estimateItems, isLoading: isLoadingItems, error: queryError } = useQuery({
    queryKey: ['estimate-items', selectedEstimate?.estimate_id],
    queryFn: async () => {
      console.log('🔥 [QUERY_START] *** QUERY_FN ЗАПУЩЕН ***');
      console.log('🗺️ [QUERY] Исполняем запрос getEstimateItems для ID:', selectedEstimate.estimate_id);
      console.log('🗺️ [QUERY] Токен авторизации:', localStorage.getItem('authToken')?.substring(0, 10) + '...');
      
      try {
        console.log('🔄 [QUERY] Начинаем HTTP запрос...');
        const result = await api.getEstimateItems(selectedEstimate.estimate_id); // ИСПРАВЛЕНИЕ: убираем mobileFilter
        console.log('✅ [QUERY] Ответ от API getEstimateItems:', result);
        console.log('✅ [QUERY] Тип ответа:', typeof result, ', Является массивом:', Array.isArray(result));
        if (result && result.results) {
          console.log('✅ [QUERY] Пагинированные данные - results.length:', result.results.length);
          result.results.forEach((item, idx) => {
            console.log(`🔍 DEBUG: Работа ${idx + 1}:`, {
              name: item.work_name,
              added_by: item.added_by,
              added_by_name: item.added_by_name
            });
          });
        }
        console.log('🏁 [QUERY_END] *** QUERY_FN ЗАВЕРШЕН ***');
        return result;
      } catch (error) {
        console.error('❌ [QUERY] Ошибка в queryFn:', error);
        console.error('🔥 [QUERY_ERROR] *** QUERY_FN ОШИБКА ***');
        throw error;
      }
    },
    enabled: shouldLoadItems,
    staleTime: 0, // ПРИНУДИТЕЛЬНО ОЧИЩАЕМ КЭШ
    cacheTime: 0, // ОТКЛЮЧАЕМ КЭШИРОВАНИЕ
    refetchOnMount: 'always', // ВСЕГДА перезапрашиваем
    onSuccess: (data) => {
      console.log('✅ [QUERY] Успешно получены estimateItems:', data);
      const normalized = normalizeApiResponse(data);
      console.log('✅ [QUERY] Нормализованные estimateItems:', normalized.length);
    },
    onError: (error) => {
      console.error('❌ [QUERY] Ошибка загрузки estimateItems:', error);
    }
  });
  
  console.log('🗺️ [QUERY] Состояние запроса:', { 
    isLoading: isLoadingItems, 
    hasData: !!estimateItems,
    dataLength: estimateItems?.length || 0,
    hasError: !!queryError 
  });

  // Инициализация компонента и загрузка работ из navigation context
  React.useEffect(() => {
    try {
      console.log('🔄 [INIT] *** USEEFFECT ВЫПОЛНЯЕТСЯ *** selectedEstimate:', selectedEstimate?.estimate_id);
      console.log('🔄 [INIT] Инициализация EstimateSummary, selectedEstimate:', selectedEstimate?.estimate_id);
      
      // КРИТИЧНО: При открытии существующей сметы сразу загружаем работы из navigation context
      if (selectedEstimate && !createNewEstimate) {
        const estimateId = selectedEstimate.estimate_id || selectedEstimate.id;
        if (estimateId) {
          const worksFromContext = getWorksFromScreen('estimate-summary', estimateId);
          console.log('🔄 [INIT_WORKS] Проверка работ в navigation context при инициализации:', {
            estimateId,
            worksCount: worksFromContext.length,
            uniqueKey: `estimate-summary-${estimateId}`,
            works: worksFromContext.map(w => ({ id: w.work_type_id || w.id, name: w.work_name || w.name }))
          });
          
          if (worksFromContext.length > 0) {
            const normalizedWorks = normalizeWorksData(worksFromContext);
            console.log('✅ [INIT_WORKS] Загружаем работы из context при инициализации:', normalizedWorks.length);
            setSelectedWorks(normalizedWorks);
          } else {
            console.log('⚠️ [INIT_WORKS] Работы в navigation context не найдены, будем загружать из API');
            // ПРОСТОЕ ПРАВИЛО: Если работ нет в контексте - откладываем загрузку на следующий useEffect
            console.log('⚠️ [INIT_WORKS] Работы в navigation context не найдены, будем загружать из API через следующий useEffect');
          }
        }
      }
      
      setIsInitialized(true);
      console.log('✅ [INIT] Инициализация завершена');
    } catch (error) {
      console.error('❌ [INIT] Ошибка в инициализации:', error);
      setIsInitialized(true); // В любом случае помечаем как инициализированный
    }
  }, [selectedEstimate, createNewEstimate, estimateItems]); // Добавляем estimateItems в зависимости

  // ПРИНУДИТЕЛЬНОЕ ЛОГИРОВАНИЕ для отладки
  React.useEffect(() => {
    console.log('🔄 [FORCED_TRIGGER] Принудительный useEffect для returnFromWorkSelection =', screenData?.returnFromWorkSelection);
    console.log('🔄 [FORCED_TRIGGER] screenData keys =', Object.keys(screenData || {}));
    console.log('🔄 [FORCED_TRIGGER] isInitialized =', isInitialized);
    
    // КРИТИЧНО: Проверяем, что есть в navigation context для этой сметы
    const estimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    if (estimateId) {
      const worksInContext = getWorksFromScreen('estimate-summary', estimateId);
      console.log('🔍 [FORCED_CHECK] Navigation context для estimate-summary-' + estimateId + ':', worksInContext.length, 'работ');
      if (worksInContext.length > 0) {
        console.log('🔍 [FORCED_CHECK] Первая работа:', worksInContext[0]?.work_name || worksInContext[0]?.name);
      }
    }
  }, [screenData?.returnFromWorkSelection, getWorksFromScreen, selectedEstimate]);

  // ИСПРАВЛЕНО: Добавляем useEffect для отслеживания изменений в navigation context
  React.useEffect(() => {
    const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    if (currentEstimateId && isInitialized) {
      const worksInContext = getWorksFromScreen('estimate-summary', currentEstimateId);
      console.log('🔄 [CONTEXT_SYNC] Проверка синхронизации с navigation context:', {
        currentSelectedWorksCount: selectedWorks.length,
        contextWorksCount: worksInContext.length,
        estimateId: currentEstimateId
      });
      
      // Если количество работ в контексте отличается от текущих selectedWorks, обновляем
      if (worksInContext.length !== selectedWorks.length) {
        console.log('🔄 [CONTEXT_SYNC] Обнаружены изменения, синхронизируем selectedWorks');
        const normalizedWorks = normalizeWorksData(worksInContext);
        setSelectedWorks(normalizedWorks);
      }
    }
  }, [getWorksFromScreen, selectedEstimate, isInitialized, selectedWorks.length]); // Добавляем selectedWorks.length для принудительного обновления

  // Основная загрузка данных для сметы
  React.useEffect(() => {
    console.log('🔄 [USEEFFECT_START] Основной useEffect загрузки данных НАЧАЛСЯ');
    
    const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    const returnFromWorkSelection = screenData?.returnFromWorkSelection;
    
    console.log('📋 [USER_ACTION] Открытие сметы:', {
      estimateId: currentEstimateId,
      estimateName: selectedEstimate?.estimate_number || 'Новая смета',
      mode: createNewEstimate ? 'CREATE' : editMode ? 'EDIT' : 'VIEW',
      returnFromWorkSelection: returnFromWorkSelection,
      isInitialized,
      screenDataKeys: Object.keys(screenData || {})
    });
    
    // ИСПРАВЛЕНО: При возврате из WorkSelection НЕ принудительно активируем кнопку
    // Пусть логика отслеживания изменений сама определит, нужно ли активировать кнопку
    if (returnFromWorkSelection && isInitialized) {
      console.log('⬅️ [RETURN] Возвращение из WorkSelection - пусть useEffect отслеживания изменений решает про кнопку');
      // НЕ устанавливаем hasUnsavedChanges принудительно - дадим возможность правильному сравнению
    }
    
    if (!isInitialized) {
      console.log('⏳ [STATUS] Ожидание инициализации компонента');
      return;
    }
    
    if (createNewEstimate) {
      const worksInContext = getWorksFromScreen('estimate-summary');
      console.log('🆕 [DATA_CHECK] Проверка новой сметы - работ в контексте:', worksInContext.length);
      
      if (worksInContext.length === 0 && selectedWorks.length > 0) {
        console.log('🧹 [ACTION] Очистка работ для новой сметы');
        setSelectedWorks([]);
        setOriginalWorks([]);
        return;
      }
    }
    
    // ИСПРАВЛЕНО: Загрузка работ с ПРИОРИТЕТОМ navigation context для существующих смет
    let worksToLoad;
    if (createNewEstimate || !currentEstimateId) {
      // Для новых смет сначала проверяем screenData.selectedWorks, потом navigation context
      if (screenDataWorks.length > 0) {
        worksToLoad = screenDataWorks;
        console.log('🆕 [DATA_LOAD] Загрузка для новой сметы из screenData:', {
          worksCount: worksToLoad.length,
          source: 'screenData.selectedWorks',
          works: worksToLoad.map(w => ({ id: w.work_type_id || w.id, name: w.work_name || w.name }))
        });
      } else {
        worksToLoad = getWorksFromScreen('estimate-summary');
        console.log('🆕 [DATA_LOAD] Загрузка для новой сметы из navigation context:', {
          worksCount: worksToLoad.length,
          source: 'getWorksFromScreen',
          screenKey: 'estimate-summary',
          works: worksToLoad.map(w => ({ id: w.work_type_id || w.id, name: w.work_name || w.name }))
        });
      }
    } else {
      // ИСПРАВЛЕНО: Для существующих смет ПРИОРИТЕТ у navigation context с estimateId
      const uniqueKey = `estimate-summary-${currentEstimateId}`;
      worksToLoad = getWorksFromScreen('estimate-summary', currentEstimateId);
      console.log('📝 [DATA_LOAD] Загрузка для существующей сметы из navigation context:', {
        estimateId: currentEstimateId,
        uniqueKey: uniqueKey,
        worksCount: worksToLoad.length,
        worksToLoad: worksToLoad.map(w => ({ id: w.work_type_id || w.id, name: w.work_name || w.name }))
      });
      
      // ДОПОЛНИТЕЛЬНО: Если в navigation context нет работ, проверяем screenData
      if (worksToLoad.length === 0 && screenDataWorks.length > 0) {
        worksToLoad = screenDataWorks;
        console.log('📝 [DATA_LOAD] Fallback: Загрузка из screenData для существующей сметы:', {
          estimateId: currentEstimateId,
          worksCount: worksToLoad.length,
          source: 'screenData.selectedWorks fallback'
        });
      }
    }
    
    if (worksToLoad.length > 0) {
      const normalizedWorks = normalizeWorksData(worksToLoad);
      console.log('✅ [RESULT] Работы загружены:', {
        исходно: worksToLoad.length,
        нормализовано: normalizedWorks.length,
        работы: normalizedWorks.map(w => w.work_name || w.name).join(', ')
      });
      
      setSelectedWorks(normalizedWorks);
      
      // КРИТИЧНО ИСПРАВЛЕНО: originalWorks устанавливается ТОЛЬКО при загрузке существующей сметы из БД
      // НЕ устанавливаем при загрузке из navigation context (это уже измененные данные)
      if (originalWorks.length === 0 && !screenData?.returnFromWorkSelection) {
        console.log('📝 [ORIGINAL_WORKS] Устанавливаем originalWorks ИЗ БД (первичная загрузка без returnFromWorkSelection)');
        setOriginalWorks(normalizedWorks);
      } else {
        console.log('📝 [ORIGINAL_WORKS] НЕ обновляем originalWorks - сохраняем для отслеживания изменений');
        console.log('📝 [ORIGINAL_WORKS] Причина: returnFromWorkSelection =', screenData?.returnFromWorkSelection, ', originalWorks.length =', originalWorks.length);
      }
    } else {
      console.log('⚠️ [RESULT] Работы не найдены для сметы ID:', currentEstimateId || 'новая');
    }
    
    console.log('🏁 [USEEFFECT_END] Основной useEffect загрузки данных ЗАВЕРШЕН');
  }, [isInitialized, selectedEstimate, screenData?.returnFromWorkSelection, screenData?.selectedEstimate?.estimate_id]); // ИСПРАВЛЕНО: Отслеживаем конкретные значения, не весь объект
  
  // Загрузка существующих работ из API при редактировании
  React.useEffect(() => {
    console.log('📋 [SHOULD_LOAD] Проверка условий shouldLoadFromAPI:', {
      editMode,
      selectedEstimate: !!selectedEstimate,
      estimate_id: selectedEstimate?.estimate_id,
      createNewEstimate: createNewEstimate,
      allWorksLength: allWorks.length,
      estimateItemsLength: estimateItems?.results?.length || estimateItems?.length || 0,
      estimateItemsData: estimateItems
    });
    
    const shouldLoadFromAPI = (
      editMode && 
      selectedEstimate && 
      selectedEstimate.estimate_id &&
      !createNewEstimate &&
      allWorks.length > 0 && 
      (estimateItems?.results?.length > 0 || estimateItems?.length > 0)
    );
    
    console.log('📋 [SHOULD_LOAD] shouldLoadFromAPI =', shouldLoadFromAPI);
    
    if (shouldLoadFromAPI) {
      const currentEstimateId = selectedEstimate.estimate_id || selectedEstimate.id;
      const existingWorksInContext = getWorksFromScreen('estimate-summary', currentEstimateId);
      
      const apiItemsLength = estimateItems?.results?.length || estimateItems?.length || 0;
      console.log('🔍 [API_CHECK] Проверка загрузки из API - работ в контексте:', existingWorksInContext.length, ', из API:', apiItemsLength);
      
      if (existingWorksInContext.length === 0 && estimateItems && apiItemsLength > 0) {
        console.log('📥 [API_LOAD] Нормализуем estimateItems:', apiItemsLength);
        const normalizedItems = normalizeApiResponse(estimateItems);
        console.log('📥 [API_LOAD] Нормализованные items:', normalizedItems.length);
        
        const works = convertEstimateItemsToWorks(normalizedItems);
        console.log('📥 [API_LOAD] Загрузка работ из API:', works.length, 'работ');
        
        const normalizedWorks = normalizeWorksData(works);
        setSelectedWorks(normalizedWorks);
        addWorksToScreen('estimate-summary', works, currentEstimateId);
        console.log('📝 [ORIGINAL_WORKS] ПРИНУДИТЕЛЬНО устанавливаем originalWorks из API:', works.length, 'работ');
        setOriginalWorks(works); // КРИТИЧНО: Это правильное состояние из БД
        setHasUnsavedChanges(false);
      } else if (existingWorksInContext.length > 0 && selectedWorks.length === 0) {
        console.log('📥 [CONTEXT_LOAD] Работы есть в контексте, загружаем в selectedWorks');
        const normalizedWorks = normalizeWorksData(existingWorksInContext);
        setSelectedWorks(normalizedWorks);
        
        // ПРИНУДИТЕЛЬНО устанавливаем originalWorks ТОЛЬКО из API, не из контекста
        if (estimateItems?.results?.length > 0 || estimateItems?.length > 0) {
          const normalizedItems = normalizeApiResponse(estimateItems);
          const originalWorksFromAPI = convertEstimateItemsToWorks(normalizedItems);
          console.log('📝 [ORIGINAL_WORKS] ПРИНУДИТЕЛЬНО устанавливаем originalWorks из API (fallback):', originalWorksFromAPI.length, 'работ');
          setOriginalWorks(originalWorksFromAPI); // КРИТИЧНО: Всегда из API, независимо от текущего состояния
        }
        setHasUnsavedChanges(false);
      }
    }
  }, [editMode, selectedEstimate, allWorks, estimateItems, createNewEstimate, selectedWorks.length]);
  
  // Отслеживание изменений для активации кнопки "Сохранить"
  React.useEffect(() => {
    // ИСПРАВЛЕНО: Отслеживаем изменения для редактирования существующих смет (не для новых)
    if (!editMode || createNewEstimate || !isInitialized) return;
    
    // ИСПРАВЛЕНО: Более точное сравнение работ по ID и количеству
    const selectedIds = selectedWorks.map(w => ({
      id: w.work_type_id || w.id,
      quantity: parseFloat(w.quantity || 0)
    })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    
    const originalIds = originalWorks.map(w => ({
      id: w.work_type_id || w.id,
      quantity: parseFloat(w.quantity || 0)
    })).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    
    const hasChanges = JSON.stringify(selectedIds) !== JSON.stringify(originalIds);
    
    console.log('💾 [SAVE_BUTTON]', hasChanges ? 'АКТИВИРОВАНА' : 'НЕАКТИВНА', '- работ selected/original:', selectedWorks.length, '/', originalWorks.length);
    console.log('💾 [SAVE_BUTTON] Детали сравнения:', {
      selectedIds: selectedIds,
      originalIds: originalIds,
      hasChanges,
      editMode,
      createNewEstimate,
      isInitialized
    });
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('💾 [SAVE_BUTTON] Изменяем hasUnsavedChanges с', hasUnsavedChanges, 'на', hasChanges);
      setHasUnsavedChanges(hasChanges);
    }
  }, [selectedWorks, originalWorks, editMode, createNewEstimate, hasUnsavedChanges, isInitialized, selectedWorks.length, originalWorks.length]); // ИСПРАВЛЕНО: Отслеживаем изменения количества работ

  // Мутация для создания сметы
  const createMutation = useMutation({
    mutationFn: apiWithEvents.createEstimate,
    onSuccess: (createdEstimate) => {
      // КРИТИЧНО: Инвалидируем ВСЕ возможные ключи кэширования для синхронизации
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['estimates-mobile']);
      queryClient.invalidateQueries(['all-estimates-mobile']);
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['estimate-items']);
      
      // Дополнительно: рефетчим данные смет
      queryClient.refetchQueries(['estimates']);
      queryClient.refetchQueries(['estimates-mobile']);
      queryClient.refetchQueries(['all-estimates-mobile']);
      queryClient.refetchQueries(['projects']);
      console.log('🔄 EstimateSummary: Принудительно обновляем ВСЕ кэши смет после создания');
      console.log('✅ Смета успешно создана:', createdEstimate);
      
      // КРИТИЧНО: Сбрасываем флаг изменений после успешного создания
      setHasUnsavedChanges(false);
      setOriginalWorks([...selectedWorks]); // Обновляем оригинальные работы
      console.log('🔄 EstimateSummary: hasUnsavedChanges сброшен после успешного создания сметы');
      
      // КРИТИЧНО: Сохраняем созданную смету с работами для последующего редактирования
      if (createdEstimate && selectedWorks.length > 0) {
        const estimateId = createdEstimate.estimate_id || createdEstimate.id;
        console.log('💾 EstimateSummary: Сохраняем работы созданной сметы в navigation context с ID =', estimateId);
        addWorksToScreen('estimate-summary', selectedWorks, estimateId);
      }
      
      // Переходим на экран проекта
      navigateToScreen('project-info', false, {
        selectedProject
      });
    },
    onError: (error) => {
      console.error('❌ Ошибка создания сметы:', error);
      setError(`Ошибка создания сметы: ${error.message}`);
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  // Мутация для обновления сметы
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiWithEvents.updateEstimate(id, data),
    onSuccess: (updatedEstimate) => {
      // КРИТИЧНО: Инвалидируем ВСЕ возможные ключи кэширования для синхронизации
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['estimates-mobile']);
      queryClient.invalidateQueries(['all-estimates-mobile']);
      queryClient.invalidateQueries(['estimate-items']);
      queryClient.invalidateQueries(['projects']);
      
      // Дополнительно: рефетчим данные смет
      queryClient.refetchQueries(['estimates']);
      queryClient.refetchQueries(['estimates-mobile']);
      queryClient.refetchQueries(['all-estimates-mobile']);
      queryClient.refetchQueries(['projects']);
      console.log('🔄 EstimateSummary: Принудительно обновляем ВСЕ кэши смет для отображения суммы');
      console.log('✅ Смета успешно обновлена:', updatedEstimate);
      
      // КРИТИЧНО: Сбрасываем флаг изменений после успешного сохранения
      setHasUnsavedChanges(false);
      setOriginalWorks([...selectedWorks]); // Обновляем оригинальные работы
      console.log('🔄 EstimateSummary: hasUnsavedChanges сброшен после успешного обновления сметы');
      
      // КРИТИЧНО: Обновляем работы в navigation context после успешного обновления
      if (selectedEstimate && selectedWorks.length > 0) {
        const estimateId = selectedEstimate.estimate_id || selectedEstimate.id;
        console.log('💾 EstimateSummary: Обновляем работы сметы в navigation context с ID =', estimateId);
        // Очищаем старые работы и добавляем новые
        clearWorksFromScreen('estimate-summary', estimateId);
        addWorksToScreen('estimate-summary', selectedWorks, estimateId);
      }
      
      // Переходим на экран проекта
      navigateToScreen('project-info', false, {
        selectedProject
      });
    },
    onError: (error) => {
      console.error('❌ Ошибка обновления сметы:', error);
      setError(`Ошибка обновления сметы: ${error.message}`);
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  // Отображаем все работы без фильтрации
  const filteredWorks = selectedWorks;

  // Вычисление итогов с использованием новых утилит
  const totalCost = calculateTotalAmount(selectedWorks, 'cost');
  const totalClient = canViewClientPrices ? calculateTotalAmount(selectedWorks, 'client') : 0;

  // Обработчики
  const updateItem = (itemId, field, value) => {
    setSelectedWorks(prev => 
      prev.map(work => {
        const workItemId = work.item_id || work.id || work.work_type_id;
        if (workItemId === itemId) {
          const updatedWork = { ...work, [field]: value };
          
          // Пересчитываем итоги
          const cost = parseFloat(updatedWork.cost_price_per_unit || updatedWork.cost_price || 0);
          const client = parseFloat(updatedWork.client_price_per_unit || updatedWork.client_price || cost);
          const quantity = parseFloat(updatedWork.quantity || 0);
          
          updatedWork.total_cost = cost * quantity;
          updatedWork.total_client = client * quantity;
          
          return updatedWork;
        }
        return work;
      }).filter(work => parseFloat(work.quantity || 0) > 0)
    );
    setHasUnsavedChanges(true);
  };

  const removeItem = (itemId) => {
    setSelectedWorks(prev => 
      prev.filter(work => {
        const workItemId = work.item_id || work.id || work.work_type_id;
        return workItemId !== itemId;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Handle adding work from search dropdown
  const handleWorkFromSearch = (work) => {
    console.log('🔍 EstimateSummary: Добавление работы из поиска:', work.work_name || work.name);
    console.log('🔍 EstimateSummary: Полные данные работы:', work);
    
    // Check if work is already in the list
    const workId = work.work_type_id || work.id;
    const isAlreadySelected = selectedWorks.some(w => 
      (w.work_type_id || w.id) === workId
    );

    if (isAlreadySelected) {
      console.log('⚠️ EstimateSummary: Работа уже добавлена в смету');
      return;
    }

    // Create new work item with prices from database
    // Цены хранятся в поле prices (из WorkPrice model)
    const costPrice = parseFloat(work.prices?.cost_price || work.cost_price || 0);
    const clientPrice = parseFloat(work.prices?.client_price || work.client_price || costPrice || 0);
    
    console.log('💰 EstimateSummary: Извлеченные цены:', {
      raw_prices_object: work.prices,
      raw_cost_price: work.cost_price,
      calculated_cost_price: costPrice,
      calculated_client_price: clientPrice
    });
    
    const newWorkItem = {
      work_type_id: workId,
      work_type: workId,
      id: workId,
      work_name: work.work_name || work.name,
      name: work.work_name || work.name,
      unit_of_measurement: work.unit_of_measurement || work.unit || 'шт.',
      unit: work.unit_of_measurement || work.unit || 'шт.',
      category: work.category,
      quantity: 1, // Default quantity
      cost_price_per_unit: costPrice,
      cost_price: costPrice,
      client_price_per_unit: clientPrice,
      client_price: clientPrice
    };

    // Calculate totals
    newWorkItem.total_cost = newWorkItem.cost_price_per_unit * newWorkItem.quantity;
    newWorkItem.total_client = newWorkItem.client_price_per_unit * newWorkItem.quantity;

    console.log('✅ EstimateSummary: Создан элемент работы:', {
      id: newWorkItem.work_type_id,
      name: newWorkItem.work_name,
      quantity: newWorkItem.quantity,
      cost_price: newWorkItem.cost_price_per_unit,
      client_price: newWorkItem.client_price_per_unit
    });

    // Add to selected works
    setSelectedWorks(prev => [...prev, newWorkItem]);
    setHasUnsavedChanges(true);

    // Also add to navigation context for persistence
    const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    if (createNewEstimate || !currentEstimateId) {
      addWorksToScreen('estimate-summary', [...selectedWorks, newWorkItem]);
    } else {
      addWorksToScreen('estimate-summary', [...selectedWorks, newWorkItem], currentEstimateId);
    }

    console.log('💾 EstimateSummary: Работа добавлена и сохранена в navigation context');
  };

  const handleSave = async () => {
    if (!selectedProject || selectedWorks.length === 0) {
      setError('Нет работ для сохранения');
      return;
    }
    
    if (!estimateName.trim()) {
      setError('Введите название сметы');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('🔧 EstimateSummary: Подготовка данных для API:', {
        selectedProject,
        estimateName,
        selectedWorks: selectedWorks.map(w => ({ 
          id: w.work_type_id || w.id, 
          name: w.work_name, 
          quantity: w.quantity,
          cost_price: w.cost_price_per_unit || w.cost_price,
          client_price: w.client_price_per_unit || w.client_price
        }))
      });

      // ИСПРАВЛЕНО: Корректный формат данных для EstimateDetailSerializer
      const estimateData = {
        project_id: selectedProject.project_id || selectedProject.id,
        estimate_number: estimateName.trim(), // ИСПРАВЛЕНО: используем estimate_number вместо name
        items: selectedWorks.map(work => {
          const workType = work.work_type_id || work.work_type || work.id;
          const quantity = parseFloat(work.quantity) || 1;
          const costPrice = parseFloat(work.cost_price_per_unit || work.cost_price) || 0;
          const clientPrice = parseFloat(work.client_price_per_unit || work.client_price || costPrice) || 0;
          
          console.log(`🔧 EstimateSummary: Обрабатываем работу ${workType}:`, {
            workType,
            quantity,
            costPrice,
            clientPrice
          });
          
          // ИСПРАВЛЕНО: Добавлена валидация данных работы
          if (!workType || quantity <= 0 || costPrice < 0 || clientPrice < 0) {
            console.error('❌ EstimateSummary: Некорректные данные работы:', {
              workType, quantity, costPrice, clientPrice
            });
            throw new Error(`Некорректные данные работы: ${work.work_name || 'неизвестная работа'}`);
          }
          
          return {
            work_type: workType,
            quantity: quantity,
            cost_price_per_unit: costPrice,
            client_price_per_unit: clientPrice
          };
        }).filter(item => item.work_type && item.quantity > 0) // Дополнительная фильтрация
      };
      
      console.log('🔧 EstimateSummary: Финальные данные для API:', estimateData);

      if (createNewEstimate) {
        await createMutation.mutateAsync(estimateData);
      } else if (editMode && selectedEstimate) {
        await updateMutation.mutateAsync({
          id: selectedEstimate.estimate_id,
          data: estimateData
        });
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      setError(`Ошибка сохранения: ${error.message}`);
      setIsSaving(false);
    }
  };

  // Проверки загрузки и контекста
  if (isLoadingAllWorks || isLoadingItems) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем данные..." />
      </div>
    );
  }

  if (!selectedProject) {
    useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  // СТАРЫЙ UI (БЕЗ ИЗМЕНЕНИЙ) - ТОЛЬКО БИЗНЕС-ЛОГИКА ИСПРАВЛЕНА
  return (
    <div className="mobile-screen">
      {/* Header */}
      <div className="mobile-card" style={{ padding: '12px 16px' }}>
        <div className="estimate-header" style={{ marginBottom: '8px' }}>
          <div className="estimate-title">
            <p style={{ margin: '0', fontSize: '16px', fontWeight: '500' }}>{selectedProject.name || selectedProject.project_name}</p>
          </div>
        </div>

        {/* Estimate Info */}
        {(createNewEstimate || editMode) && (
          <div className="estimate-form" style={{ marginTop: '8px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label htmlFor="estimate-name" style={{ textAlign: 'center', display: 'block', marginBottom: '6px', fontSize: '14px' }}>Название сметы</label>
              <input
                id="estimate-name"
                type="text"
                value={estimateName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`См_${selectedProject?.name || selectedProject?.project_name || 'объект'}-${new Date().toLocaleDateString('ru-RU').replace(/\./g, '')}-${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(':', '')}`}
                className="mobile-input"
                style={{ 
                  borderColor: nameError ? '#f44336' : undefined,
                  padding: '8px 12px',
                  fontSize: '14px'
                }}
              />
              {nameError && (
                <div className="error-message" style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
                  {nameError}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedEstimate && viewMode && selectedEstimate.description && (
          <div className="estimate-info">
            <div className="info-item">
              <span className="info-label">Описание:</span>
              <span className="info-value">{selectedEstimate.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* Work Search Dropdown - только для создания и редактирования */}
      {(createNewEstimate || editMode) && (
        <div className="mobile-card" style={{ padding: '12px 16px', marginTop: '8px' }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#aaa', 
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Быстрое редактирование работ
            </div>
            <WorkSearchDropdown
              allWorks={allWorks}
              onWorkSelect={handleWorkFromSearch}
              selectedWorks={selectedWorks}
              placeholder="Поиск работ по названию или категории..."
              disabled={isSaving}
            />
          </div>
        </div>
      )}


      {/* Selected Works Table */}
      <div className="works-table-container">
        <div className="works-table-header">
          <h3 className="section-title" style={{ textAlign: 'center' }}>Итоговая смета</h3>
        </div>
        
        {filteredWorks.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-text">
              Нет выбранных работ
            </div>
          </div>
        ) : (
          <div className="works-table">
            <div className="works-table-head">
              <div className="table-cell-name" style={{ fontSize: '12px', fontWeight: 'bold' }}>Работа</div>
              <div className="table-cell-qty" style={{ fontSize: '11px', fontWeight: 'bold' }}>Кол-во</div>
              <div className="table-cell-price" style={{ fontSize: '11px', fontWeight: 'bold' }}>Цена</div>
              <div className="table-cell-total" style={{ fontSize: '11px', fontWeight: 'bold' }}>Итого</div>
            </div>
            
            {filteredWorks.map((work, index) => {
              const workId = work.item_id || work.id || work.work_type_id;
              const stableKey = createStableKey(work, index);
              return (
                <WorkTableRow 
                  key={stableKey}
                  work={work}
                  index={index}
                  onQuantityChange={(qty) => updateItem(workId, 'quantity', qty)}
                  onRemove={() => removeItem(workId)}
                  formatCurrency={formatCurrency}
                  canViewClientPrices={canViewClientPrices}
                  isEditable={createNewEstimate || editMode}
                />
              );
            })}
            
            {/* Total Row */}
            <div className="works-table-total-row">
              <div className="table-cell-name">
                <div className="work-name total-label" style={{ fontSize: '12px', fontWeight: 'bold' }}>ИТОГО:</div>
              </div>
              <div className="table-cell-qty"></div>
              <div className="table-cell-price"></div>
              <div className="table-cell-total total-amount" style={{ fontSize: '11px', fontWeight: 'bold' }}>{totalCost.toFixed(2)}</div>
            </div>
            
            {/* SecurityExpert: Клиентские итоги только для не-прорабов */}
            {canViewClientPrices && (
              <div className="works-table-total-row">
                <div className="table-cell-name">
                  <div className="work-name total-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>КЛИЕНТСКАЯ СУММА:</div>
                </div>
                <div className="table-cell-qty"></div>
                <div className="table-cell-price"></div>
                <div className="table-cell-total total-amount" style={{ fontSize: '11px', fontWeight: 'bold' }}>{totalClient.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <ErrorMessage 
          message={error} 
          onRetry={() => setError(null)}
        />
      )}

      {/* Action Buttons */}
      <div className="mobile-card action-buttons">
        
        {/* Кнопка редактирования работ */}
        <button 
          className="mobile-btn mobile-btn-compact"
          onClick={() => {
            console.log('🔧 EstimateSummary: Переход к выбору категорий');
            console.log('🔧 EstimateSummary: Сохраняем текущие работы перед переходом:', selectedWorks.map(w => ({ id: w.id || w.work_type_id, name: w.name || w.work_name, quantity: w.quantity })));
            
            // КРИТИЧНО: Сохраняем текущие работы в navigation context с учетом estimateId
            const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
            console.log('🔧 EstimateSummary: Сохраняем работы перед переходом к категориям:', {
              selectedWorksCount: selectedWorks.length,
              estimateId: currentEstimateId,
              createNewEstimate
            });
            
            // ИСПРАВЛЕНО: Используем addWorksToScreen с правильным estimateId
            if (createNewEstimate || !currentEstimateId) {
              // Для новой сметы используем обычный ключ
              addWorksToScreen('estimate-summary', selectedWorks);
              console.log('✅ EstimateSummary: Работы сохранены для новой сметы');
            } else {
              // Для редактирования используем estimateId
              addWorksToScreen('estimate-summary', selectedWorks, currentEstimateId);
              console.log('✅ EstimateSummary: Работы сохранены для сметы', currentEstimateId);
            }
            
            navigateToScreen('categories', true, { 
              selectedProject, 
              selectedEstimate, 
              editMode: true,
              createNewEstimate: createNewEstimate,
              viewMode: false
            });
          }}
        >
          Редактировать работы
        </button>
        
        {/* Кнопка сохранения */}
        <button 
          className="mobile-btn mobile-btn-primary mobile-btn-compact"
          onClick={() => {
            console.log('🔘 [SAVE_CLICK] Нажата кнопка сохранения:', {
              hasUnsavedChanges,
              selectedWorksCount: selectedWorks.length,
              originalWorksCount: originalWorks.length,
              createNewEstimate,
              editMode
            });
            handleSave();
          }}
          disabled={isSaving || nameError || (createNewEstimate && selectedWorks.length === 0) || (!createNewEstimate && !hasUnsavedChanges)}
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
const WorkTableRow = ({ work, index, onQuantityChange, onRemove, formatCurrency, canViewClientPrices, isEditable }) => {
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempQuantity, setTempQuantity] = React.useState(work.quantity);
  const [touchTimer, setTouchTimer] = React.useState(null);
  const [touchStart, setTouchStart] = React.useState(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
  const [isSwipeDeleteActive, setIsSwipeDeleteActive] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const inputRef = React.useRef(null);

  const handleTouchStart = (e) => {
    if (!isEditable) return;
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
    if (!touchStart || isEditing || !isEditable) return;
    
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
    
    setTouchStart(null);
    
    // Если свайп активирован для удаления, оставляем его активным на 2 секунды
    if (isSwipeDeleteActive) {
      setTimeout(() => {
        setSwipeDistance(0);
        setIsSwipeDeleteActive(false);
      }, 2000); // 2 секунды задержки для нажатия на кнопку удаления
    } else {
      setSwipeDistance(0);
      setIsSwipeDeleteActive(false);
    }
  };

  // Handle delete like in EstimateCard - direct action
  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      onRemove();
    } catch (error) {
      console.error('Ошибка удаления работы:', error);
    } finally {
      setIsDeleting(false);
      setSwipeDistance(0);
      setIsSwipeDeleteActive(false);
    }
  };

  const handleQuantitySubmit = () => {
    onQuantityChange(tempQuantity);
    setIsEditing(false);
  };

  // Автовыделение текста при открытии modal
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      // Небольшая задержка для корректной работы на мобильных устройствах
      setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.select();
      }, 150);
    }
  }, [isEditing]);

  const costPrice = parseFloat(work.cost_price_per_unit || work.cost_price || 0);
  const clientPrice = parseFloat(work.client_price_per_unit || work.client_price || costPrice);
  const quantity = parseFloat(work.quantity || 0);
  const totalCost = costPrice * quantity;
  const totalClient = clientPrice * quantity;

  return (
    <div 
      className={`works-table-row ${isSwipeDeleteActive ? 'swipe-delete' : ''}`}
      style={{ 
        transform: `translateX(-${swipeDistance}px)`,
        position: 'relative'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="table-cell-name">
        <div className="work-name" style={{ fontSize: '13px', lineHeight: '1.3' }}>{work.name || work.work_name}</div>
        <div className="work-unit" style={{ fontSize: '11px' }}>{work.unit || work.unit_of_measurement}</div>
      </div>
      
      <div className="table-cell-qty">
        {isEditing ? (
          <div className="quantity-edit-overlay">
            <div className="quantity-edit-modal">
              <div className="quantity-edit-header">
                <span>Количество</span>
                <button 
                  className="quantity-close-btn"
                  onClick={() => setIsEditing(false)}
                >
                  ✕
                </button>
              </div>
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={tempQuantity}
                onChange={(e) => setTempQuantity(parseFloat(e.target.value) || 0)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuantitySubmit()}
                onFocus={(e) => {
                  // Выделить весь текст при фокусе для удобного редактирования
                  setTimeout(() => {
                    e.target.select();
                  }, 100);
                }}
                autoFocus
                step="0.1"
                min="0.1"
                className="quantity-input-large"
                placeholder="Введите количество"
              />
              <div className="quantity-edit-actions">
                <button 
                  className="quantity-btn quantity-btn-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  Отмена
                </button>
                <button 
                  className="quantity-btn quantity-btn-save"
                  onClick={handleQuantitySubmit}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '12px' }}>{quantity.toFixed(1)}</span>
        )}
      </div>
      
      <div className="table-cell-price">
        <div className="price-cost" style={{ fontSize: '11px' }}>{formatCurrency(costPrice)}</div>
        {canViewClientPrices && (
          <div className="price-client" style={{ fontSize: '10px' }}>{formatCurrency(clientPrice)}</div>
        )}
      </div>
      
      <div className="table-cell-total">
        <div className="total-cost" style={{ fontSize: '11px' }}>{formatCurrency(totalCost)}</div>
        {canViewClientPrices && (
          <div className="total-client" style={{ fontSize: '10px' }}>{formatCurrency(totalClient)}</div>
        )}
      </div>
      
      {/* Delete button overlay - like in EstimateCard */}
      {isSwipeDeleteActive && (
        <div 
          className="delete-overlay"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            height: '100%',
            width: '120px',
            background: 'linear-gradient(90deg, rgba(244, 67, 54, 0.8), rgba(244, 67, 54, 1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translateX(${120 - swipeDistance}px)`,
            transition: touchStart ? 'none' : 'transform 0.3s ease'
          }}
        >
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '10px'
            }}
          >
            {isDeleting ? '⏳' : '🗑️'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EstimateSummary;