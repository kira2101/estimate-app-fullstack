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
  const { navigateToScreen, getScreenData, setScreenData, addWorksToScreen, clearWorksFromScreen, currentScreen, navigationData } = useMobileNavigationContext();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();
  
  console.log('📊 EstimateSummary - Пользователь:', user?.role);
  
  // SecurityExpert: Проверка роли для безопасности данных
  const isForeman = user?.role === 'прораб';
  const canViewClientPrices = !isForeman; // Прорабы НЕ могут видеть клиентские цены
  
  console.log('🔒 Права доступа:', {
    userRole: user?.role,
    isForeman,
    canViewClientPrices
  });

  // Получаем данные экрана
  let screenData;
  try {
    screenData = getScreenData();
    console.log('📄 Данные экрана:', screenData);
  } catch (error) {
    console.error('❌ Ошибка в getScreenData:', error);
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
  const [estimateDescription, setEstimateDescription] = useState(() => {
    return selectedEstimate?.description || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ОПТИМИЗИРОВАННАЯ ИНИЦИАЛИЗАЦИЯ selectedWorks
  const [selectedWorks, setSelectedWorks] = useState(() => {
    // При создании новой сметы начинаем с пустого массива
    if (screenData?.createNewEstimate) {
      console.log('🏁 Новая смета: начинаем с пустого массива');
      return [];
    }
    
    // Для редактирования сметы получаем накопленные работы
    const initialWorks = screenData?.selectedWorks || [];
    console.log('🏁 Инициализация selectedWorks:', initialWorks.length, 'работ для', screenData?.editMode ? 'редактирования' : 'просмотра');
    return initialWorks;
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalWorks, setOriginalWorks] = useState(() => {
    return screenData?.selectedWorks || [];
  });
  
  // Упростили - флаги больше не нужны

  // Загрузка всех работ
  const { data: allWorks = [], isLoading: isLoadingAllWorks } = useQuery({
    queryKey: ['all-work-types'],
    queryFn: api.getAllWorkTypes,
  });

  // Загрузка элементов сметы для режима редактирования
  const shouldLoadItems = Boolean(selectedEstimate?.estimate_id && !createNewEstimate);
  
  const { data: estimateItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['estimate-items', selectedEstimate?.estimate_id],
    queryFn: () => api.getEstimateItems(selectedEstimate.estimate_id),
    enabled: shouldLoadItems
  });

  // ОПТИМИЗИРОВАННАЯ ЛОГИКА: Автоматическое получение работ через navigation context
  React.useEffect(() => {
    const currentScreenData = getScreenData();
    const availableWorks = currentScreenData?.selectedWorks || [];
    
    console.log('🔄 EstimateSummary: Обновление работ через navigation:', {
      availableWorksCount: availableWorks.length,
      currentWorksCount: selectedWorks.length,
      returnFromWorkSelection: currentScreenData?.returnFromWorkSelection
    });
    
    // Синхронизируем локальное состояние с navigation context
    if (availableWorks.length !== selectedWorks.length || 
        currentScreenData?.returnFromWorkSelection) {
      
      setSelectedWorks(availableWorks);
      
      if (currentScreenData?.returnFromWorkSelection) {
        setHasUnsavedChanges(true);
        
        // Очищаем флаг
        setScreenData('estimate-editor', {
          ...currentScreenData,
          returnFromWorkSelection: false
        }, true); // merge mode
      }
    }
  }, [getScreenData, selectedWorks.length, setScreenData]);
  
  // ЗАГРУЗКА РАБОТ ИЗ СМЕТЫ ПРИ РЕДАКТИРОВАНИИ
  React.useEffect(() => {
    // Проверяем, что мы в режиме редактирования существующей сметы
    const shouldLoadFromEstimate = (
      editMode && 
      selectedEstimate && 
      selectedEstimate.estimate_id &&
      allWorks.length > 0 && 
      estimateItems?.length > 0 &&
      selectedWorks.length === 0 && // Еще не загружали
      !createNewEstimate // Не создаем новую
    );
    
    if (shouldLoadFromEstimate) {
      console.log('🔄 Загрузка работ существующей сметы:', selectedEstimate.estimate_id);
      
      const works = estimateItems.map(item => {
        const workId = item.work_type?.work_type_id || item.work_type_id || item.work_type;
        const work = allWorks.find(w => (w.work_type_id || w.id) === workId);
        
        return {
          item_id: item.item_id,
          work_type: workId,
          work_type_id: workId,
          work_name: work?.name || work?.work_name || item.work_name,
          unit_of_measurement: work?.unit || work?.unit_of_measurement || item.unit_of_measurement,
          quantity: parseFloat(item.quantity) || 1,
          cost_price_per_unit: parseFloat(item.cost_price_per_unit) || 0,
          client_price_per_unit: parseFloat(item.client_price_per_unit) || 0,
          total_cost: parseFloat(item.total_cost) || 0,
          total_client: parseFloat(item.total_client) || 0,
          id: workId,
          name: work?.name || work?.work_name || item.work_name,
          unit: work?.unit || work?.unit_of_measurement || item.unit_of_measurement,
          cost_price: parseFloat(item.cost_price_per_unit) || 0
        };
      });
      
      console.log('✅ Загружено работ из сметы:', works.length);
      
      // Сохраняем в локальном состоянии
      setSelectedWorks(works);
      setOriginalWorks(works);
      setHasUnsavedChanges(false);
      
      // Обновляем navigation context
      setScreenData('estimate-editor', {
        ...getScreenData(),
        selectedWorks: works
      }, true); // merge mode
    }
  }, [editMode, selectedEstimate, allWorks, estimateItems, selectedWorks.length, createNewEstimate, setScreenData, getScreenData]);

  // Мутация для создания сметы
  const createMutation = useMutation({
    mutationFn: api.createEstimate,
    onSuccess: () => {
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['projects']);
      console.log('✅ Смета успешно создана');
      
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
    onSuccess: () => {
      queryClient.invalidateQueries(['estimates']);
      queryClient.invalidateQueries(['estimate-items']);
      queryClient.invalidateQueries(['projects']);
      console.log('✅ Смета успешно обновлена');
      
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

  // Вычисление итогов (SecurityExpert: С учетом ролей)
  const totalCost = selectedWorks.reduce((sum, work) => {
    const cost = parseFloat(work.cost_price_per_unit || work.cost_price || 0);
    const quantity = parseFloat(work.quantity || 0);
    return sum + (cost * quantity);
  }, 0);

  const totalClient = canViewClientPrices ? selectedWorks.reduce((sum, work) => {
    const client = parseFloat(work.client_price_per_unit || work.client_price || work.cost_price_per_unit || work.cost_price || 0);
    const quantity = parseFloat(work.quantity || 0);
    return sum + (client * quantity);
  }, 0) : 0; // Прорабы не видят клиентские цены

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

    setIsSaving(true);
    setError(null);

    try {
      const estimateData = {
        project: selectedProject.project_id || selectedProject.id,
        name: estimateName,
        description: estimateDescription,
        items: selectedWorks.map(work => ({
          work_type: work.work_type || work.work_type_id || work.id,
          quantity: parseFloat(work.quantity) || 1,
          cost_price_per_unit: parseFloat(work.cost_price_per_unit || work.cost_price) || 0,
          client_price_per_unit: parseFloat(work.client_price_per_unit || work.client_price || work.cost_price_per_unit || work.cost_price) || 0
        }))
      };

      if (createNewEstimate) {
        await createMutation.mutateAsync(estimateData);
      } else if (editMode && selectedEstimate) {
        await updateMutation.mutateAsync({
          id: selectedEstimate.estimate_id,
          data: estimateData
        });
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
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
                onChange={(e) => setEstimateName(e.target.value)}
                placeholder="Введите название сметы"
                className="mobile-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="estimate-description">Описание</label>
              <textarea
                id="estimate-description"
                value={estimateDescription}
                onChange={(e) => setEstimateDescription(e.target.value)}
                placeholder="Описание сметы (необязательно)"
                className="mobile-textarea"
                rows="3"
              />
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
              // СТАБИЛЬНЫЙ КЛЮЧ: используем item_id (уникален) + index для гарантии
              const stableKey = work.item_id ? work.item_id : `work_${workId}_${index}`;
              return (
                <WorkTableRow 
                  key={stableKey}
                  work={work}
                  index={index}
                  onQuantityChange={(qty) => updateItem(workId, 'quantity', qty)}
                  onRemove={() => removeItem(workId)}
                  formatCurrency={(amount) => `${amount.toFixed(2)} ₴`}
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
            
            // Сохраняем текущие работы в navigation context
            setScreenData('estimate-editor', {
              ...getScreenData(),
              selectedWorks
            }, true); // merge mode
            
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
          disabled={isSaving || (createNewEstimate && selectedWorks.length === 0) || (!createNewEstimate && !hasUnsavedChanges)}
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