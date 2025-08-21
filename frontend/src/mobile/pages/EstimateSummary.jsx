import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
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
  
  // Извлекаем данные
  const selectedProject = screenData?.selectedProject;
  const selectedEstimate = screenData?.selectedEstimate;
  const createNewEstimate = screenData?.createNewEstimate;
  const editMode = screenData?.editMode;
  const viewMode = screenData?.viewMode;
  
  // Состояния компонента (СОХРАНЯЕМ СТАРЫЙ UI)
  const [estimateName, setEstimateName] = useState(() => {
    return selectedEstimate?.name || selectedEstimate?.estimate_number || '';
  });
  const [originalEstimateName] = useState(() => {
    return selectedEstimate?.name || selectedEstimate?.estimate_number || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ИСПРАВЛЕНО: Безопасная инициализация selectedWorks без зависимостей от screenData в useState
  const [selectedWorks, setSelectedWorks] = useState([]);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalWorks, setOriginalWorks] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false); // Флаг инициализации

  // Функция проверки уникальности имени сметы
  const checkNameUniqueness = (name) => {
    if (!name.trim()) return null;
    
    const trimmedName = name.trim();
    const existingEstimate = allEstimates.find(est => 
      est.estimate_number === trimmedName && 
      est.estimate_id !== selectedEstimate?.estimate_id // Исключаем текущую смету при редактировании
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

  // ОТЛАДКА после инициализации состояний
  console.log('📊 ОТЛАДКА EstimateSummary - selectedWorks.length:', selectedWorks.length);
  console.log('📊 ОТЛАДКА EstimateSummary - selectedWorks:', selectedWorks);

  // Загрузка всех работ
  const { data: allWorks = [], isLoading: isLoadingAllWorks } = useQuery({
    queryKey: ['all-work-types'],
    queryFn: api.getAllWorkTypes,
  });

  // Загрузка всех смет для проверки уникальности имени
  const { data: allEstimates = [] } = useQuery({
    queryKey: ['estimates'],
    queryFn: api.getEstimates,
  });

  // Загрузка элементов сметы для режима редактирования
  const shouldLoadItems = Boolean(selectedEstimate?.estimate_id && !createNewEstimate);
  
  const { data: estimateItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['estimate-items', selectedEstimate?.estimate_id],
    queryFn: () => api.getEstimateItems(selectedEstimate.estimate_id),
    enabled: shouldLoadItems
  });

  // ПРОСТАЯ инициализация без зацикливания
  React.useEffect(() => {
    console.log('🔄 EstimateSummary: Простая инициализация selectedWorks');
    
    // Просто устанавливаем флаг инициализации при первом рендере
    if (!isInitialized) {
      setIsInitialized(true);
      console.log('✅ EstimateSummary: Инициализация завершена');
    }
  }, [isInitialized]);

  // ИСПРАВЛЕНО: Загрузка работ с учетом estimateId для изоляции данных между сметами
  React.useEffect(() => {
    console.log('🚀 ОТЛАДКА EstimateSummary: useEffect#1 НАЧАЛО');
    console.log('🚀 ОТЛАДКА EstimateSummary: isInitialized =', isInitialized);
    console.log('🚀 ОТЛАДКА EstimateSummary: selectedEstimate =', selectedEstimate);
    console.log('🚀 ОТЛАДКА EstimateSummary: createNewEstimate =', createNewEstimate);
    
    if (!isInitialized) {
      console.log('⏰ ОТЛАДКА EstimateSummary: Ожидаем инициализации, выход');
      return; // Дожидаемся инициализации
    }
    
    // КРИТИЧНО: При создании новой сметы очищаем selectedWorks если они пустые в navigation context
    if (createNewEstimate) {
      const worksInContext = getWorksFromScreen('estimate-summary');
      console.log('🧹 ОТЛАДКА EstimateSummary: Проверка очистки для новой сметы, работ в context:', worksInContext.length);
      
      if (worksInContext.length === 0 && selectedWorks.length > 0) {
        console.log('🧹 ОТЛАДКА EstimateSummary: Очищаем selectedWorks для новой сметы');
        setSelectedWorks([]);
        setOriginalWorks([]);
        return;
      }
    }
    
    console.log('🔄 ОТЛАДКА EstimateSummary: НАЧАЛО загрузки данных с estimateId для изоляции');
    
    // КРИТИЧНО: Получаем ID текущей сметы для изоляции данных
    const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    console.log('🔑 ОТЛАДКА EstimateSummary: Используем currentEstimateId =', currentEstimateId);
    console.log('🔑 ОТЛАДКА EstimateSummary: createNewEstimate =', createNewEstimate);
    console.log('🔑 ОТЛАДКА EstimateSummary: editMode =', editMode);
    
    // ИСПРАВЛЕНО: Для новой сметы используем обычный ключ, для существующей - с ID
    let worksToLoad;
    if (createNewEstimate || !currentEstimateId) {
      console.log('🆕 ОТЛАДКА EstimateSummary: Режим создания новой сметы, используем обычный ключ');
      worksToLoad = getWorksFromScreen('estimate-summary');
    } else {
      console.log('📝 ОТЛАДКА EstimateSummary: Режим редактирования существующей сметы, используем estimateId');
      worksToLoad = getWorksFromScreen('estimate-summary', currentEstimateId);
    }
    
    console.log('💾 ОТЛАДКА EstimateSummary: worksToLoad =', worksToLoad);
    console.log('💾 ОТЛАДКА EstimateSummary: worksToLoad.length =', worksToLoad.length);
    
    if (worksToLoad.length > 0) {
      console.log('✅ ОТЛАДКА EstimateSummary: Найдены работы для загрузки, нормализуем...');
      const normalizedWorks = normalizeWorksData(worksToLoad);
      console.log('✅ ОТЛАДКА EstimateSummary: normalizedWorks =', normalizedWorks);
      console.log('✅ ОТЛАДКА EstimateSummary: normalizedWorks.length =', normalizedWorks.length);
      console.log('✅ ОТЛАДКА EstimateSummary: Детали работ:', {
        count: normalizedWorks.length,
        estimateId: currentEstimateId,
        works: normalizedWorks.map(w => ({ 
          id: w.work_type_id || w.id, 
          name: w.work_name || w.name, 
          quantity: w.quantity 
        }))
      });
      
      console.log('💾 ОТЛАДКА EstimateSummary: Устанавливаем selectedWorks через setSelectedWorks');
      setSelectedWorks(normalizedWorks);
      console.log('💾 ОТЛАДКА EstimateSummary: Устанавливаем originalWorks через setOriginalWorks');
      setOriginalWorks(normalizedWorks);
      console.log('✅ ОТЛАДКА EstimateSummary: selectedWorks И originalWorks УСТАНОВЛЕНЫ для сметы', currentEstimateId);
    } else {
      console.log('⚠️ ОТЛАДКА EstimateSummary: НЕТ РАБОТ ДЛЯ ЗАГРУЗКИ для estimateId =', currentEstimateId);
    }
    
    console.log('🏁 ОТЛАДКА EstimateSummary: useEffect ЗАВЕРШЕН для estimateId =', currentEstimateId);
  }, [isInitialized, selectedEstimate]); // Выполняется при изменении инициализации или сметы
  
  // ИСПРАВЛЕНО: Загрузка существующих работ сметы в navigation context при редактировании
  React.useEffect(() => {
    // Для режима редактирования: загружаем существующие работы в navigation context
    const shouldLoadExistingWorks = (
      editMode && 
      selectedEstimate && 
      selectedEstimate.estimate_id &&
      !createNewEstimate &&
      allWorks.length > 0 && 
      estimateItems?.length > 0
    );
    
    if (shouldLoadExistingWorks) {
      const currentEstimateId = selectedEstimate.estimate_id || selectedEstimate.id;
      const existingWorksInContext = getWorksFromScreen('estimate-summary', currentEstimateId);
      
      console.log('🔄 EstimateSummary: Проверка необходимости загрузки существующих работ сметы');
      console.log('🔍 EstimateSummary: existingWorksInContext.length =', existingWorksInContext.length);
      console.log('🔍 EstimateSummary: estimateItems.length =', estimateItems.length);
      
      // Загружаем работы из API только если их нет в context
      if (existingWorksInContext.length === 0 && estimateItems.length > 0) {
        console.log('📥 EstimateSummary: Загружаем существующие работы из API в navigation context');
        
        const works = convertEstimateItemsToWorks(estimateItems);
        console.log('✅ EstimateSummary: Конвертировано работ из сметы:', works.length);
        
        // КРИТИЧНО: Добавляем существующие работы в navigation context с estimateId
        addWorksToScreen('estimate-summary', works, currentEstimateId);
        console.log('✅ EstimateSummary: Существующие работы добавлены в navigation context для estimateId =', currentEstimateId);
        console.log('✅ EstimateSummary: Детали загруженных работ из API:', works.map(w => ({ 
          id: w.work_type_id, 
          name: w.work_name, 
          quantity: w.quantity,
          item_id: w.item_id
        })));
        
        setOriginalWorks(works);
        setHasUnsavedChanges(false);
      } else if (existingWorksInContext.length > 0) {
        console.log('✅ EstimateSummary: Работы уже есть в navigation context, пропускаем загрузку из API');
        
        // КРИТИЧНО: Но нужно загрузить эти работы в selectedWorks если их там нет
        if (selectedWorks.length === 0) {
          console.log('📥 EstimateSummary: Загружаем работы из navigation context в selectedWorks');
          const normalizedWorks = normalizeWorksData(existingWorksInContext);
          setSelectedWorks(normalizedWorks);
          setOriginalWorks(normalizedWorks);
          setHasUnsavedChanges(false);
          console.log('✅ EstimateSummary: Работы загружены из navigation context:', normalizedWorks.length);
        }
      }
    }
  }, [editMode, selectedEstimate, allWorks, estimateItems, createNewEstimate, selectedWorks.length]); // Добавлена зависимость от selectedWorks.length
  
  // НОВОЕ: Отслеживание изменений для активации кнопки "Сохранить" при редактировании
  React.useEffect(() => {
    if (!editMode || createNewEstimate || !isInitialized) return;
    
    // Сравниваем текущие работы с оригинальными для определения изменений
    const hasChanges = JSON.stringify(selectedWorks) !== JSON.stringify(originalWorks);
    console.log('🔍 EstimateSummary: Проверка изменений для режима редактирования:', {
      hasChanges,
      selectedWorksCount: selectedWorks.length,
      originalWorksCount: originalWorks.length,
      currentHasUnsavedChanges: hasUnsavedChanges
    });
    
    if (hasChanges !== hasUnsavedChanges) {
      console.log('🔄 EstimateSummary: Обновляем hasUnsavedChanges =', hasChanges);
      setHasUnsavedChanges(hasChanges);
    }
  }, [selectedWorks, originalWorks, editMode, createNewEstimate, hasUnsavedChanges, isInitialized]);

  // Мутация для создания сметы
  const createMutation = useMutation({
    mutationFn: api.createEstimate,
    onSuccess: (createdEstimate) => {
      // КРИТИЧНО: Принудительно обновляем кэш смет для правильного отображения суммы
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['projects']);
      
      // Дополнительно: рефетчим данные смет
      queryClient.refetchQueries(['estimates']);
      console.log('🔄 EstimateSummary: Принудительно обновляем кэш смет после создания');
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
    mutationFn: ({ id, data }) => api.updateEstimate(id, data),
    onSuccess: (updatedEstimate) => {
      // КРИТИЧНО: Принудительно обновляем кэш смет для правильного отображения суммы
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['estimate-items']);
      queryClient.invalidateQueries(['projects']);
      
      // Дополнительно: рефетчим данные конкретной сметы
      queryClient.refetchQueries(['estimates']);
      console.log('🔄 EstimateSummary: Принудительно обновляем кэш смет для отображения суммы');
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

  // Фильтрация работ
  const filteredWorks = useMemo(() => {
    if (!searchTerm.trim()) return selectedWorks;
    
    const searchLower = searchTerm.toLowerCase();
    return selectedWorks.filter(work => {
      const workName = (work.name || work.work_name || '').toLowerCase();
      const workUnit = (work.unit || work.unit_of_measurement || '').toLowerCase();
      return workName.includes(searchLower) || workUnit.includes(searchLower);
    });
  }, [selectedWorks, searchTerm]);

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
      <div className="mobile-card">
        <div className="estimate-header">
          <button 
            className="back-button"
            onClick={() => {
              if (editMode || viewMode) {
                navigateToScreen('project-info', false, { selectedProject });
              } else {
                navigateToScreen('categories', false, screenData);
              }
            }}
            aria-label="Назад"
          >
            ←
          </button>
          <div className="estimate-title">
            <h2>{createNewEstimate ? 'Новая смета' : editMode ? 'Редактирование' : 'Просмотр сметы'}</h2>
            <p>{selectedProject.name || selectedProject.project_name}</p>
          </div>
        </div>

        {/* Estimate Info */}
        {(createNewEstimate || editMode) && (
          <div className="estimate-form">
            <div className="form-group">
              <label htmlFor="estimate-name">Название сметы</label>
              <input
                id="estimate-name"
                type="text"
                value={estimateName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Введите название сметы"
                className="mobile-input"
                style={{ 
                  borderColor: nameError ? '#f44336' : undefined 
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

        {selectedEstimate && viewMode && (
          <div className="estimate-info">
            <div className="info-item">
              <span className="info-label">Смета:</span>
              <span className="info-value">{selectedEstimate.estimate_number || estimateName}</span>
            </div>
            {selectedEstimate.description && (
              <div className="info-item">
                <span className="info-label">Описание:</span>
                <span className="info-value">{selectedEstimate.description}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      {selectedWorks.length > 3 && (
        <div className="mobile-search">
          <input
            type="text"
            placeholder="Поиск работ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mobile-input search-input"
          />
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
                <div className="work-name total-label">ИТОГО:</div>
              </div>
              <div className="table-cell-qty total-items">
                {selectedWorks.reduce((sum, work) => sum + (parseFloat(work.quantity) || 0), 0).toFixed(1)}
              </div>
              <div className="table-cell-price"></div>
              <div className="table-cell-total total-amount">{totalCost.toFixed(2)} ₴</div>
            </div>
            
            {/* SecurityExpert: Клиентские итоги только для не-прорабов */}
            {canViewClientPrices && (
              <div className="works-table-total-row">
                <div className="table-cell-name">
                  <div className="work-name total-label">КЛИЕНТСКАЯ СУММА:</div>
                </div>
                <div className="table-cell-qty"></div>
                <div className="table-cell-price"></div>
                <div className="table-cell-total total-amount">{totalClient.toFixed(2)} ₴</div>
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
          Добавить работы
        </button>
        
        {/* Кнопка сохранения */}
        <button 
          className="mobile-btn mobile-btn-primary mobile-btn-compact"
          onClick={handleSave}
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
  // ОТЛАДКА: Логирование данных работы для диагностики проблемы с количеством
  React.useEffect(() => {
    console.log(`🔍 WorkTableRow[${index}]: Данные работы:`, {
      workName: work.work_name || work.name,
      workId: work.id || work.work_type_id,
      quantity: work.quantity,
      quantityType: typeof work.quantity,
      rawWork: work
    });
  }, [work.quantity, work.work_name, work.id, work.work_type_id, index]);
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempQuantity, setTempQuantity] = React.useState(work.quantity);
  const [touchTimer, setTouchTimer] = React.useState(null);
  const [touchStart, setTouchStart] = React.useState(null);
  const [swipeDistance, setSwipeDistance] = React.useState(0);
  const [isSwipeDeleteActive, setIsSwipeDeleteActive] = React.useState(false);

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
    
    if (isSwipeDeleteActive) {
      onRemove();
    }
    
    setTouchStart(null);
    setSwipeDistance(0);
    setIsSwipeDeleteActive(false);
  };

  const handleQuantitySubmit = () => {
    onQuantityChange(tempQuantity);
    setIsEditing(false);
  };

  const costPrice = parseFloat(work.cost_price_per_unit || work.cost_price || 0);
  const clientPrice = parseFloat(work.client_price_per_unit || work.client_price || costPrice);
  const quantity = parseFloat(work.quantity || 0);
  const totalCost = costPrice * quantity;
  const totalClient = clientPrice * quantity;

  return (
    <div 
      className={`works-table-row ${isSwipeDeleteActive ? 'swipe-delete' : ''}`}
      style={{ transform: `translateX(-${swipeDistance}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="table-cell-name">
        <div className="work-name">{work.name || work.work_name}</div>
        <div className="work-unit">{work.unit || work.unit_of_measurement}</div>
      </div>
      
      <div className="table-cell-qty">
        {isEditing ? (
          <div className="quantity-edit">
            <input
              type="number"
              value={tempQuantity}
              onChange={(e) => setTempQuantity(parseFloat(e.target.value) || 0)}
              onBlur={handleQuantitySubmit}
              onKeyPress={(e) => e.key === 'Enter' && handleQuantitySubmit()}
              autoFocus
              step="0.1"
              min="0.1"
            />
          </div>
        ) : (
          <span>{quantity.toFixed(1)}</span>
        )}
      </div>
      
      <div className="table-cell-price">
        <div className="price-cost">{formatCurrency(costPrice)}</div>
        {canViewClientPrices && (
          <div className="price-client">{formatCurrency(clientPrice)}</div>
        )}
      </div>
      
      <div className="table-cell-total">
        <div className="total-cost">{formatCurrency(totalCost)}</div>
        {canViewClientPrices && (
          <div className="total-client">{formatCurrency(totalClient)}</div>
        )}
      </div>
      
      {isSwipeDeleteActive && (
        <div className="delete-indicator">
          🗑️ Удалить
        </div>
      )}
    </div>
  );
};

export default EstimateSummary;