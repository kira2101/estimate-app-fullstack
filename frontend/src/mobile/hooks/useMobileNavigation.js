import { useState, useCallback } from 'react';
import { mergeWorksArrays } from '../utils/dataUtils';

/**
 * Mobile Navigation Hook
 * Manages navigation state, history, and screen transitions
 */
export const useMobileNavigation = () => {
  const [currentScreen, setCurrentScreen] = useState('projects');
  const [currentTab, setCurrentTab] = useState('projects');
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [forwardHistory, setForwardHistory] = useState([]);
  const [screenData, setScreenData] = useState({});

  // Screen titles mapping
  const screenTitles = {
    'projects': 'Проекты',
    'project-info': '', // Динамический заголовок с названием проекта
    'estimates': 'Все сметы',
    'categories': 'Выберите категории',
    'works': 'Работы',
    'estimate-editor': 'Редактор сметы', // Единый редактор для создания и редактирования смет
    'estimate-summary': 'Редактор сметы', // ИСПРАВЛЕНО: добавлен правильный title
    'finance': 'Финансы',
    'profile': 'Профиль'
  };

  // Tab to screen mapping
  const tabScreens = {
    'projects': 'projects',
    'estimates': 'estimates',
    'finance': 'finance',
    'profile': 'profile'
  };

  const canGoBack = navigationHistory.length > 0;
  const canGoForward = forwardHistory.length > 0;

  // ОТЛАДКА: Navigate to a screen
  const navigateToScreen = useCallback((screenId, addToHistory = true, data = null) => {
    console.log('🚀 ОТЛАДКА useMobileNavigation: navigateToScreen НАЧАЛО');
    console.log('🧭 ОТЛАДКА useMobileNavigation: navigateToScreen параметры:', {
      от: currentScreen,
      к: screenId,
      добавитьВИсторию: addToHistory,
      данные: data
    });
    
    if (addToHistory && currentScreen !== screenId) {
      console.log('📚 ОТЛАДКА useMobileNavigation: Добавляем в историю:', currentScreen);
      setNavigationHistory(prev => [...prev, currentScreen]);
      setForwardHistory([]); // Clear forward history on new navigation
    }
    
    console.log('🎯 ОТЛАДКА useMobileNavigation: Устанавливаем currentScreen =', screenId);
    setCurrentScreen(screenId);
    
    // Update current tab based on screen
    const newTab = Object.keys(tabScreens).find(tab => tabScreens[tab] === screenId);
    if (newTab && newTab !== currentTab) {
      console.log('📑 ОТЛАДКА useMobileNavigation: Обновляем таб на:', newTab);
      setCurrentTab(newTab);
    }
    
    if (data) {
      console.log('💾 ОТЛАДКА useMobileNavigation: Сохраняем данные для экрана', screenId);
      console.log('💾 ОТЛАДКА useMobileNavigation: data =', data);
      setScreenData(prev => {
        // КРИТИЧНО: СОХРАНЯЕМ selectedWorks при обновлении данных экрана
        const existingData = prev[screenId] || {};
        const existingSelectedWorks = existingData.selectedWorks || [];
        
        console.log('💾 ОТЛАДКА useMobileNavigation: existingData =', existingData);
        console.log('💾 ОТЛАДКА useMobileNavigation: existingSelectedWorks.length =', existingSelectedWorks.length);
        
        // Объединяем новые данные с существующими selectedWorks
        const mergedData = {
          ...existingData, // Сохраняем существующие данные
          ...data, // Применяем новые данные
          selectedWorks: existingSelectedWorks // КРИТИЧНО: сохраняем selectedWorks
        };
        
        console.log('💾 ОТЛАДКА useMobileNavigation: mergedData =', mergedData);
        console.log('💾 ОТЛАДКА useMobileNavigation: mergedData.selectedWorks.length =', mergedData.selectedWorks?.length || 0);
        
        const newScreenData = { ...prev, [screenId]: mergedData };
        console.log('💾 ОТЛАДКА useMobileNavigation: newScreenData =', newScreenData);
        console.log('💾 ОТЛАДКА useMobileNavigation: newScreenData[screenId] =', newScreenData[screenId]);
        return newScreenData;
      });
      console.log('✅ ОТЛАДКА useMobileNavigation: Данные сохранены для экрана с сохранением selectedWorks', screenId);
    }
    
    console.log('✅ ОТЛАДКА useMobileNavigation: navigateToScreen ЗАВЕРШЕН, переход к экрану', screenId);
  }, [currentScreen, currentTab, tabScreens]);

  // Go back in navigation
  const goBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory[navigationHistory.length - 1];
      setForwardHistory(prev => [currentScreen, ...prev]);
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentScreen(previousScreen);
      
      // Update current tab based on screen
      const newTab = Object.keys(tabScreens).find(tab => tabScreens[tab] === previousScreen);
      if (newTab && newTab !== currentTab) {
        setCurrentTab(newTab);
      }
    }
  }, [currentScreen, navigationHistory, currentTab, tabScreens]);

  // Go forward in navigation
  const goForward = useCallback(() => {
    if (forwardHistory.length > 0) {
      const nextScreen = forwardHistory[0];
      setNavigationHistory(prev => [...prev, currentScreen]);
      setForwardHistory(prev => prev.slice(1));
      setCurrentScreen(nextScreen);
      
      // Update current tab based on screen
      const newTab = Object.keys(tabScreens).find(tab => tabScreens[tab] === nextScreen);
      if (newTab && newTab !== currentTab) {
        setCurrentTab(newTab);
      }
    }
  }, [currentScreen, forwardHistory, currentTab, tabScreens]);

  // Switch tabs (main navigation)
  const switchTab = useCallback((tabId) => {
    console.log(`useMobileNavigation: switchTab вызван с ${tabId}`);
    console.log(`Текущий таб: ${currentTab}, новый таб: ${tabId}`);
    console.log(`Экран для таба ${tabId}: ${tabScreens[tabId]}`);
    
    setCurrentTab(tabId);
    // Clear navigation history when switching main tabs
    setNavigationHistory([]);
    setForwardHistory([]);
    setCurrentScreen(tabScreens[tabId]);
  }, [currentTab, tabScreens]);

  // Get current screen title
  const getCurrentTitle = useCallback(() => {
    if (currentScreen === 'project-info') {
      const projectData = screenData[currentScreen];
      const projectName = projectData?.selectedProject?.name || 
                         projectData?.selectedProject?.project_name;
      return projectName || 'Проект';
    }
    return screenTitles[currentScreen] || 'Загрузка...';
  }, [currentScreen, screenData]);

  // Get data for current or specific screen
  const getScreenData = useCallback((screen = currentScreen) => {
    return screenData[screen] || {};
  }, [screenData, currentScreen]);

  // Set data for specific screen with merge support
  const setScreenDataForScreen = useCallback((screen, data, merge = false) => {
    console.log('📝 useMobileNavigation: setScreenDataForScreen:', {
      screen,
      merge,
      newData: data,
      existingData: screenData[screen]
    });
    
    setScreenData(prev => ({
      ...prev, 
      [screen]: merge ? { ...prev[screen], ...data } : data
    }));
  }, [screenData]);

  // ОТЛАДКА: Accumulate works data (специальный метод для работ)
  const addWorksToScreen = useCallback((screen, newWorks) => {
    console.log('🚀 ОТЛАДКА useMobileNavigation: addWorksToScreen НАЧАЛО');
    console.log('🔧 ОТЛАДКА useMobileNavigation: addWorksToScreen входные параметры:', {
      screen,
      newWorks_type: typeof newWorks,
      newWorks_isArray: Array.isArray(newWorks),
      newWorksCount: newWorks?.length || 0,
      existingWorksCount: screenData[screen]?.selectedWorks?.length || 0,
    });
    console.log('🔧 ОТЛАДКА useMobileNavigation: newWorks RAW =', newWorks);
    console.log('🔧 ОТЛАДКА useMobileNavigation: newWorks детали:', newWorks?.map(w => ({ 
      id: w.id || w.work_type_id, 
      name: w.name || w.work_name, 
      quantity: w.quantity 
    })));
    console.log('🔧 ОТЛАДКА useMobileNavigation: текущий screenData =', screenData);
    console.log('🔧 ОТЛАДКА useMobileNavigation: screenData[screen] =', screenData[screen]);
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Валидация входных данных
    if (!Array.isArray(newWorks) || newWorks.length === 0) {
      console.warn('❌ ОТЛАДКА useMobileNavigation: ВАЛИДАЦИЯ НЕ ПРОШЛА - пустые/невалидные работы:', { 
        newWorks, 
        type: typeof newWorks,
        isArray: Array.isArray(newWorks),
        length: newWorks?.length
      });
      return;
    }
    console.log('✅ ОТЛАДКА useMobileNavigation: Валидация прошла успешно');
    
    setScreenData(prev => {
      console.log('💾 ОТЛАДКА useMobileNavigation: setScreenData функция НАЧАЛО');
      console.log('💾 ОТЛАДКА useMobileNavigation: prev =', prev);
      console.log('💾 ОТЛАДКА useMobileNavigation: screen =', screen);
      console.log('💾 ОТЛАДКА useMobileNavigation: prev[screen] =', prev[screen]);
      
      const existingData = prev[screen] || {};
      const existingWorks = existingData.selectedWorks || [];
      
      console.log('💾 ОТЛАДКА useMobileNavigation: existingData =', existingData);
      console.log('💾 ОТЛАДКА useMobileNavigation: existingWorks =', existingWorks);
      console.log('💾 ОТЛАДКА useMobileNavigation: existingWorks.length =', existingWorks.length);
      
      // Используем утилитарную функцию для объединения работ
      console.log('🔀 ОТЛАДКА useMobileNavigation: Вызываем mergeWorksArrays');
      console.log('🔀 ОТЛАДКА useMobileNavigation: existingWorks для объединения =', existingWorks);
      console.log('🔀 ОТЛАДКА useMobileNavigation: newWorks для объединения =', newWorks);
      
      const mergedWorks = mergeWorksArrays(existingWorks, newWorks);
      
      console.log('✅ ОТЛАДКА useMobileNavigation: mergeWorksArrays ЗАВЕРШЕН');
      console.log('✅ ОТЛАДКА useMobileNavigation: mergedWorks =', mergedWorks);
      console.log('✅ ОТЛАДКА useMobileNavigation: mergedWorks.length =', mergedWorks.length);
      console.log('✅ ОТЛАДКА useMobileNavigation: результат объединения:', {
        before: existingWorks.length,
        added: (newWorks || []).length,
        after: mergedWorks.length,
        mergedWorks: mergedWorks.map(w => ({ id: w.id || w.work_type_id, name: w.name || w.work_name, quantity: w.quantity }))
      });
      
      const newScreenData = {
        ...prev,
        [screen]: {
          ...existingData,
          selectedWorks: mergedWorks
        }
      };
      
      console.log('💾 ОТЛАДКА useMobileNavigation: newScreenData =', newScreenData);
      console.log('💾 ОТЛАДКА useMobileNavigation: newScreenData[screen] =', newScreenData[screen]);
      console.log('✅ ОТЛАДКА useMobileNavigation: setScreenData ЗАВЕРШЕН, возвращаем newScreenData');
      
      return newScreenData;
    });
    
    console.log('🏁 ОТЛАДКА useMobileNavigation: addWorksToScreen ЗАВЕРШЕН');
  }, [screenData]);
  
  // Clear works from screen
  const clearWorksFromScreen = useCallback((screen) => {
    setScreenData(prev => ({
      ...prev,
      [screen]: {
        ...prev[screen],
        selectedWorks: []
      }
    }));
  }, []);

  // Reset navigation state
  const resetNavigation = useCallback(() => {
    setCurrentScreen('projects');
    setCurrentTab('projects');
    setNavigationHistory([]);
    setForwardHistory([]);
    setScreenData({});
  }, []);

  return {
    currentScreen,
    currentTab,
    navigationHistory,
    forwardHistory,
    canGoBack,
    canGoForward,
    navigateToScreen,
    goBack,
    goForward,
    switchTab,
    getCurrentTitle,
    getScreenData,
    setScreenData: setScreenDataForScreen, // Export the new method
    addWorksToScreen, // Новый метод для накопления работ
    clearWorksFromScreen, // Метод очистки работ
    resetNavigation,
    navigationData: screenData // Alias for compatibility
  };
};