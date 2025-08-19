import { useState, useCallback, useEffect } from 'react';
import { normalizeWorksData, getWorkId, mergeWorksArrays } from '../utils/dataUtils';

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

  // Navigate to a screen
  const navigateToScreen = useCallback((screenId, addToHistory = true, data = null) => {
    console.log('🧭 useMobileNavigation: navigateToScreen вызван', {
      от: currentScreen,
      к: screenId,
      добавитьВИсторию: addToHistory,
      данные: data
    });
    
    if (addToHistory && currentScreen !== screenId) {
      setNavigationHistory(prev => [...prev, currentScreen]);
      setForwardHistory([]); // Clear forward history on new navigation
    }
    setCurrentScreen(screenId);
    
    // Update current tab based on screen
    const newTab = Object.keys(tabScreens).find(tab => tabScreens[tab] === screenId);
    if (newTab && newTab !== currentTab) {
      setCurrentTab(newTab);
    }
    
    if (data) {
      setScreenData(prev => ({ ...prev, [screenId]: data }));
      console.log('📄 useMobileNavigation: Сохранены данные для экрана', screenId, data);
    }
    
    console.log('✅ useMobileNavigation: Переход завершен к экрану', screenId);
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

  // Accumulate works data (специальный метод для работ)
  const addWorksToScreen = useCallback((screen, newWorks) => {
    console.log('🔧 useMobileNavigation: addWorksToScreen:', {
      screen,
      newWorksCount: newWorks?.length || 0,
      existingWorksCount: screenData[screen]?.selectedWorks?.length || 0
    });
    
    setScreenData(prev => {
      const existingData = prev[screen] || {};
      const existingWorks = existingData.selectedWorks || [];
      
      // Используем утилитарную функцию для объединения работ
      const mergedWorks = mergeWorksArrays(existingWorks, newWorks);
      
      console.log('✅ Работы объединены:', {
        before: existingWorks.length,
        added: (newWorks || []).length,
        after: mergedWorks.length
      });
      
      return {
        ...prev,
        [screen]: {
          ...existingData,
          selectedWorks: mergedWorks
        }
      };
    });
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