import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import { normalizeApiResponse } from '../utils/apiHelpers';
import WorkCard from '../components/ui/WorkCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Work Selection Screen
 * Displays and allows selection of specific works within a category
 */
const WorkSelection = () => {
  const { navigateToScreen, getScreenData, addWorksToScreen, getWorksFromScreen, replaceWorksInScreen } = useMobileNavigationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorks, setSelectedWorks] = useState([]);
  const [focusedWorkId, setFocusedWorkId] = useState(null); // Для отслеживания фокуса карточки
  
  const screenData = getScreenData();
  const selectedProject = screenData?.selectedProject;
  const selectedEstimate = screenData?.selectedEstimate;
  const selectedCategory = screenData?.selectedCategory;
  const createNewEstimate = screenData?.createNewEstimate;
  const editMode = screenData?.editMode;

  // Fetch all work types for search functionality
  const { 
    data: allWorksResponse, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['all-work-types'],
    queryFn: api.getAllWorkTypes,
    onError: (error) => {
      console.error('Failed to fetch work types:', error);
    }
  });
  
  // Normalize works data
  const allWorks = normalizeApiResponse(allWorksResponse);

  // В режиме редактирования загружаем существующие работы из сметы
  React.useEffect(() => {
    console.log('🚨🚨🚨 WorkSelection: КОМПОНЕНТ ЗАГРУЖЕН - Проверка загрузки существующих работ:', {
      editMode,
      hasSelectedEstimate: !!selectedEstimate,
      hasEstimateItems: !!(selectedEstimate && selectedEstimate.items),
      itemsLength: selectedEstimate?.items?.length || 0,
      allWorksLength: allWorks.length,
      selectedWorksLength: selectedWorks.length,
      estimateId: selectedEstimate?.estimate_id || selectedEstimate?.id
    });
    
    // ИСПРАВЛЕНО: Сначала пытаемся загрузить из navigation context
    if (editMode && selectedEstimate && allWorks.length > 0) {
      const estimateId = selectedEstimate.estimate_id || selectedEstimate.id;
      
      // Проверяем, есть ли уже работы в navigation context для этой сметы
      const existingWorksFromContext = getWorksFromScreen('estimate-summary', estimateId);
      
      console.log('🔍 WorkSelection: Работы в navigation context для estimate-summary-' + estimateId + ':', existingWorksFromContext.length);
      
      // Если в context есть работы и мы их еще не загрузили
      if (existingWorksFromContext.length > 0 && selectedWorks.length === 0) {
        console.log('✅ WorkSelection: Загружаем работы из navigation context');
        const worksWithFlag = existingWorksFromContext.map(work => ({
          ...work,
          isFromExistingEstimate: true
        }));
        setSelectedWorks(worksWithFlag);
        console.log('🟢 WorkSelection: РАБОТЫ ИЗ КОНТЕКСТА ЗАГРУЖЕНЫ КАК ВЫБРАННЫЕ:', worksWithFlag.map(w => w.work_name || w.name));
        return;
      }
      
      // Fallback: загружаем из selectedEstimate.items если есть
      if (selectedEstimate.items && selectedEstimate.items.length > 0 && selectedWorks.length === 0) {
        console.log('🔄 WorkSelection: Загружаем существующие работы из selectedEstimate.items');
        console.log('🔄 WorkSelection: Items в selectedEstimate:', selectedEstimate.items);
        
        const existingWorks = selectedEstimate.items.map(item => {
          const workId = item.work_type?.work_type_id || item.work_type_id || item.work_type;
          console.log('🔍 WorkSelection: Ищем работу с ID:', workId);
          
          const work = allWorks.find(w => 
            (w.work_type_id || w.id) === workId
          );
          
          if (work) {
            console.log('✅ WorkSelection: Найдена работа:', work.name || work.work_name);
            return {
              ...work,
              quantity: item.quantity || 1,
              cost_price_per_unit: item.cost_price_per_unit,
              client_price_per_unit: item.client_price_per_unit,
              // Добавляем флаг, что это работа из существующей сметы
              isFromExistingEstimate: true
            };
          } else {
            console.warn('❌ WorkSelection: Не найдена работа с ID:', workId);
          }
          return null;
        }).filter(Boolean);
        
        console.log('✅ WorkSelection: Загружены работы из сметы:', existingWorks);
        console.log('✅ WorkSelection: Количество загруженных работ:', existingWorks.length);
        
        if (existingWorks.length > 0) {
          setSelectedWorks(existingWorks);
          console.log('🟢 WorkSelection: РАБОТЫ ЗАГРУЖЕНЫ КАК ВЫБРАННЫЕ:', existingWorks.map(w => w.work_name || w.name));
        }
      }
    }
  }, [editMode, selectedEstimate, allWorks, selectedWorks.length]);

  // Filter works by category and search term
  const filteredWorks = useMemo(() => {
    let works = allWorks;
    
    // Filter by category if selected
    if (selectedCategory) {
      const categoryId = selectedCategory.id || selectedCategory.category_id;
      works = works.filter(work => {
        const workCategoryId = work.category?.category_id || work.category_id || work.category;
        return workCategoryId === categoryId;
      });
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      works = works.filter(work => {
        const workName = (work.name || work.work_name || '').toLowerCase();
        const workUnit = (work.unit || work.unit_of_measurement || '').toLowerCase();
        return workName.includes(searchLower) || workUnit.includes(searchLower);
      });
    }
    
    return works;
  }, [allWorks, selectedCategory, searchTerm]);

  // Redirect if no context - в режиме редактирования категория необязательна
  if (!selectedProject || (!selectedCategory && !editMode)) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  const handleWorkToggle = (work) => {
    const workId = work.id || work.work_type_id;
    console.log('🔧 WorkSelection: handleWorkToggle вызван для работы:', {
      workId: workId,
      workName: work.name || work.work_name,
      currentSelectedCount: selectedWorks.length
    });
    
    setSelectedWorks(prev => {
      const isSelected = prev.find(w => (w.id || w.work_type_id) === workId);
      
      if (!isSelected) {
        // Добавляем работу только если она еще не выбрана
        const newWorks = [...prev, { ...work, quantity: 1 }];
        console.log('➕ WorkSelection: Работа добавлена в выбор, всего:', newWorks.length);
        return newWorks;
      }
      
      return prev; // Если уже выбрана, не изменяем состояние
    });
  };

  const handleWorkRemove = (work) => {
    const workId = work.id || work.work_type_id;
    console.log('🗑️ WorkSelection: handleWorkRemove вызван для работы:', {
      workId: workId,
      workName: work.name || work.work_name,
      currentSelectedCount: selectedWorks.length
    });
    
    // ИСПРАВЛЕНО: Вынесем синхронизацию navigation context наружу
    const newWorks = selectedWorks.filter(w => (w.id || w.work_type_id) !== workId);
    console.log('➖ WorkSelection: Работа убрана из выбора, было:', selectedWorks.length, 'стало:', newWorks.length);
    
    // Обновляем локальное состояние
    setSelectedWorks(newWorks);
    
    // ИСПРАВЛЕНО: Используем replaceWorksInScreen для замены всего списка
    const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    try {
      if (createNewEstimate || !currentEstimateId) {
        replaceWorksInScreen('estimate-summary', newWorks);
        console.log('💾 WorkSelection: ЗАМЕНЕН navigation context для новой сметы после удаления работы, работ:', newWorks.length);
      } else {
        replaceWorksInScreen('estimate-summary', newWorks, currentEstimateId);
        console.log('💾 WorkSelection: ЗАМЕНЕН navigation context для сметы', currentEstimateId, 'после удаления работы, работ:', newWorks.length);
      }
    } catch (error) {
      console.error('❌ WorkSelection: Ошибка синхронизации navigation context при удалении:', error);
    }
  };

  const handleQuantityChange = (workId, quantity) => {
    setSelectedWorks(prev => 
      prev.map(work => 
        (work.id || work.work_type_id) === workId 
          ? { ...work, quantity: quantity === '' ? 1 : Math.max(1, quantity) }
          : work
      )
    );
  };

  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleContinue = () => {
    console.log('🚀 ОТЛАДКА WorkSelection: handleContinue НАЧАЛО');
    console.log('📊 ОТЛАДКА WorkSelection: selectedWorks.length =', selectedWorks.length);
    console.log('📊 ОТЛАДКА WorkSelection: selectedWorks =', selectedWorks);
    
    if (selectedWorks.length === 0) {
      console.log('❌ ОТЛАДКА WorkSelection: Нет выбранных работ, выход');
      return;
    }
    
    if (isProcessing) {
      console.log('⚠️ ОТЛАДКА WorkSelection: handleContinue уже выполняется, игнорируем повторный вызов');
      return;
    }
    
    setIsProcessing(true);
    console.log('🔒 ОТЛАДКА WorkSelection: isProcessing установлен в true');
    
    console.log('🔧 ОТЛАДКА WorkSelection: КРИТИЧНЫЙ handleContinue - начало обработки:', {
      selectedWorksCount: selectedWorks.length,
      selectedWorks: selectedWorks.map(w => ({ 
        id: w.id || w.work_type_id, 
        name: w.name || w.work_name, 
        quantity: w.quantity,
        prices: { cost: w.cost_price, client: w.client_price }
      }))
    });
    
    // КРИТИЧНО: Проверяем что работы валидны перед добавлением
    const validWorks = selectedWorks.filter(work => {
      const isValid = (work.id || work.work_type_id) && work.work_name && work.quantity > 0;
      if (!isValid) {
        console.warn('⚠️ WorkSelection: Невалидная работа отфильтрована:', work);
      }
      return isValid;
    });
    
    if (validWorks.length === 0) {
      console.error('❌ WorkSelection: Нет валидных работ для добавления');
      return;
    }
    
    console.log('🔧 WorkSelection: Валидные работы для добавления:', {
      originalCount: selectedWorks.length,
      validCount: validWorks.length
    });
    
    // КРИТИЧНО: ЕДИНСТВЕННЫЙ ИСТОЧНИК ДАННЫХ - через addWorksToScreen
    console.log('💾 ОТЛАДКА WorkSelection: Начинаем добавление работ в navigation context');
    console.log('💾 ОТЛАДКА WorkSelection: Экран назначения = estimate-summary');
    console.log('💾 ОТЛАДКА WorkSelection: validWorks для добавления:', validWorks);
    
    // КРИТИЧНО: Получаем ID сметы для изоляции данных
    const currentEstimateId = selectedEstimate?.estimate_id || selectedEstimate?.id;
    console.log('🔑 ОТЛАДКА WorkSelection: Используем estimateId =', currentEstimateId);
    console.log('🔑 ОТЛАДКА WorkSelection: createNewEstimate =', createNewEstimate);
    
    try {
      // ИСПРАВЛЕНО: Для новой сметы не передаем estimateId
      if (createNewEstimate || !currentEstimateId) {
        console.log('🆕 ОТЛАДКА WorkSelection: Режим создания новой сметы, не используем estimateId');
        addWorksToScreen('estimate-summary', validWorks);
        console.log('✅ ОТЛАДКА WorkSelection: addWorksToScreen ВЫПОЛНЕН УСПЕШНО для новой сметы');
      } else {
        console.log('📝 ОТЛАДКА WorkSelection: Режим редактирования, используем estimateId =', currentEstimateId);
        addWorksToScreen('estimate-summary', validWorks, currentEstimateId);
        console.log('✅ ОТЛАДКА WorkSelection: addWorksToScreen ВЫПОЛНЕН УСПЕШНО для сметы', currentEstimateId);
      }
    } catch (error) {
      console.error('❌ ОТЛАДКА WorkSelection: ОШИБКА в addWorksToScreen:', error);
      setIsProcessing(false);
      return; // Прерываем при ошибке
    }
    
    // КРИТИЧНО: ПЕРЕХОД с правильными данными и флагом синхронизации
    const transitionData = {
      selectedProject,
      selectedEstimate,
      selectedCategory,
      createNewEstimate,
      editMode: true,
      returnFromWorkSelection: true // КРИТИЧНЫЙ флаг для синхронизации в EstimateSummary
    };
    
    console.log('🔧 ОТЛАДКА WorkSelection: Подготавливаем transitionData:', transitionData);
    console.log('🔧 ОТЛАДКА WorkSelection: selectedProject =', selectedProject);
    console.log('🔧 ОТЛАДКА WorkSelection: returnFromWorkSelection =', true);
    
    // КРИТИЧНО: убеждаемся что переход происходит
    console.log('🚀 ОТЛАДКА WorkSelection: Начинаем переход на estimate-summary через 100ms');
    setTimeout(() => {
      console.log('🎯 ОТЛАДКА WorkSelection: ВЫЗЫВАЕМ navigateToScreen для estimate-summary');
      navigateToScreen('estimate-summary', true, transitionData);
      console.log('✅ ОТЛАДКА WorkSelection: navigateToScreen ВЫЗВАН для estimate-summary');
      console.log('✅ ОТЛАДКА WorkSelection: Данные переданы:', transitionData);
      setIsProcessing(false); // Разблокируем после завершения
      console.log('🔓 ОТЛАДКА WorkSelection: isProcessing установлен в false');
    }, 100);
    
    console.log('✅ ОТЛАДКА WorkSelection: setTimeout запланирован, ожидаем переход');
  };

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем каталог работ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить каталог работ" 
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Заголовок с названием категории перенесен в MobileHeader через getCurrentTitle */}

      {/* Search */}
      <div className="mobile-search" onClick={() => setFocusedWorkId(null)}>
        <input
          type="text"
          placeholder="Поиск работ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mobile-input search-input"
          onFocus={() => setFocusedWorkId(null)}
        />
      </div>

      {/* Works List */}
      {filteredWorks.length === 0 ? (
        <div className="mobile-empty" onClick={() => setFocusedWorkId(null)}>
          <div className="mobile-empty-icon">🔍</div>
          <div className="mobile-empty-text">
            {searchTerm ? 'Ничего не найдено' : 'Нет работ в категории'}
          </div>
          <div className="mobile-empty-subtext">
            {searchTerm 
              ? 'Попробуйте изменить поисковый запрос'
              : 'Обратитесь к менеджеру для добавления работ'
            }
          </div>
        </div>
      ) : (
        <div className="mobile-list">
          {filteredWorks.map((work) => {
            const workId = work.id || work.work_type_id;
            const selectedWork = selectedWorks.find(w => (w.id || w.work_type_id) === workId);
            
            // Определяем, есть ли эта работа уже в смете
            // Проверяем как по items сметы, так и по selectedWork (если была загружена ранее)
            const isAlreadyInEstimate = selectedWork?.isFromExistingEstimate || 
              (editMode && selectedEstimate?.items?.some(item => {
                const itemWorkId = item.work_type?.work_type_id || item.work_type_id || item.work_type;
                return itemWorkId === workId;
              }));
            
            return (
              <WorkCard
                key={workId}
                work={work}
                isSelected={!!selectedWork}
                quantity={selectedWork?.quantity || 1}
                onToggle={() => handleWorkToggle(work)}
                onQuantityChange={(quantity) => handleQuantityChange(workId, quantity)}
                isAlreadyInEstimate={isAlreadyInEstimate}
                isFocused={focusedWorkId === workId}
                onFocus={() => setFocusedWorkId(workId)}
                onBlur={() => setFocusedWorkId(null)}
                onRemove={() => handleWorkRemove(work)}
              />
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mobile-action-buttons">
        <button 
          className="mobile-btn secondary categories-btn"
          onClick={() => {
            setFocusedWorkId(null); // Убираем фокус перед переходом
            // Сохраняем текущие выбранные работы перед переходом
            if (selectedWorks.length > 0) {
              const currentEstimateId = screenData?.selectedEstimate?.estimate_id || screenData?.selectedEstimate?.id;
              try {
                // ИСПРАВЛЕНО: Для новой сметы не передаем estimateId
                if (createNewEstimate || !currentEstimateId) {
                  addWorksToScreen('estimate-summary', selectedWorks);
                  console.log('✅ WorkSelection: Текущие работы сохранены для новой сметы перед переходом к категориям');
                } else {
                  addWorksToScreen('estimate-summary', selectedWorks, currentEstimateId);
                  console.log('✅ WorkSelection: Текущие работы сохранены для сметы', currentEstimateId, 'перед переходом к категориям');
                }
              } catch (error) {
                console.error('❌ WorkSelection: Ошибка сохранения работ:', error);
              }
            }
            navigateToScreen('categories', false, { selectedProject, createNewEstimate, editMode });
          }}
        >
          Выбор категорий
        </button>
        
        {selectedWorks.length > 0 && (
          <button 
            className="mobile-btn continue-btn"
            onClick={() => {
              setFocusedWorkId(null); // Убираем фокус перед переходом
              handleContinue();
            }}
          >
            {editMode ? `Добавить в смету (${selectedWorks.length})` : `Продолжить (${selectedWorks.length})`}
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkSelection;