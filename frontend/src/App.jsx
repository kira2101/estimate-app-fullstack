import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, TextField } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

// Основные страницы
import EstimatesList from './pages/EstimatesList';
import EstimateEditor from './pages/EstimateEditor';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';

// Страницы управления
import WorkCategoryPage from './pages/WorkCategoryPage';
import WorksPage from './pages/WorksPage';
// import MaterialsPage from './pages/MaterialsPage';
import UsersPage from './pages/UsersPage.jsx';
import ProjectAssignmentsPage from './pages/ProjectAssignmentsPage.jsx';
// import StatusesPage from './pages/StatusesPage';

import NavMenu from './components/NavMenu';
import EventBusMonitor from './components/EventBusMonitor';
import SSEConnection from './components/SSEConnection';
import { api } from './api/client';
import apiWithEvents from './api/apiWithEvents';
import eventBus from './utils/EventBus';
import { useEventBusListener } from './hooks/useEventBus';
import { ESTIMATE_EVENTS, PROJECT_EVENTS, USER_EVENTS } from './utils/EventTypes';
import MobileDetector from './mobile/MobileDetector';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    try {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
        console.warn('ensureArray: неожиданный тип данных:', typeof data, data);
        return [];
    } catch (error) {
        console.error('ensureArray: ошибка обработки данных:', error, data);
        return [];
    }
};

const darkTheme = createTheme({ palette: { mode: 'dark', primary: { main: '#90caf9' }, secondary: { main: '#f48fb1' }, background: { default: '#121212', paper: '#1e1e1e' } } });

// Глобальный QueryClient для синхронизации mobile и desktop
const globalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Подключаем QueryClient к EventBus для автоматической инвалидации
eventBus.setQueryClient(globalQueryClient);

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [estimates, setEstimates] = useState([]);
  const [objects, setObjects] = useState([]);
  const [allObjects, setAllObjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [foremen, setForemen] = useState([]);
  const [categories, setCategories] = useState([]);
  const [works, setWorks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nameDialog, setNameDialog] = useState({ open: false, estimateToSave: null, defaultName: '' });
  const [showEventMonitor, setShowEventMonitor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    console.log('🔥 fetchData вызван! CurrentUser:', currentUser);
    if (currentUser) {
        setIsLoading(true);
        console.log('🔍 Отладка пользователя:', {
            role: currentUser.role,
            userId: currentUser.user_id,
            fullName: currentUser.full_name
        });
        
        try {
            // Основные запросы, нужные всем
            const corePromises = [
                api.getProjects().catch(err => { console.error('Error loading projects:', err); return { results: [] }; }),
                api.getEstimates().catch(err => { console.error('Error loading estimates:', err); return { results: [] }; }),
                api.getStatuses().catch(err => { console.error('Error loading statuses:', err); return { results: [] }; }),
                api.getWorkCategories().catch(err => { console.error('Error loading categories:', err); return { results: [] }; }),
                api.getAllWorkTypes().catch(err => { console.error('Error loading work types:', err); return { results: [] }; }),
            ];

            // Запросы только для менеджера
            if (currentUser.role === 'менеджер') {
                corePromises.push(api.getUsers().catch(err => { console.error('Error loading users:', err); return { results: [] }; }));
            }

            const results = await Promise.allSettled(corePromises);

            // Извлекаем успешные результаты
            const [projectsData, estimatesData, statusesData, categoriesData, worksData] = results.map(result => 
                result.status === 'fulfilled' ? result.value : { results: [] }
            );
            let usersData = { results: [] };
            if (currentUser.role === 'менеджер' && results[5]) {
                usersData = results[5].status === 'fulfilled' ? results[5].value : { results: [] };
            }

            // Обновляем состояние - извлекаем results из пагинированных ответов
            // Принудительно создаем новые массивы для обновления React
            const allProjects = [...ensureArray(projectsData)];
            const allEstimates = [...ensureArray(estimatesData)];
            const allStatuses = [...ensureArray(statusesData)];
            const allCategories = [...ensureArray(categoriesData)];
            const allWorks = [...ensureArray(worksData)];
            
            console.log('🔄 Обновляем состояние React:', {
                projects: allProjects.length,
                estimates: allEstimates.length,
                statuses: allStatuses.length,
                categories: allCategories.length,
                works: allWorks.length
            });
            
            console.log('🔍 Отладка данных проектов:', {
                rawProjectsData: projectsData,
                allProjects: allProjects,
                userRole: currentUser.role
            });
            
            setObjects(allProjects);
            setEstimates(allEstimates);
            setStatuses(allStatuses);
            setCategories(allCategories);
            setWorks(allWorks);
            
            // Отладочная информация о работах по категориям
            const worksByCategory = allWorks.reduce((acc, work) => {
                const catId = work.category?.category_id || 'no-category';
                acc[catId] = (acc[catId] || 0) + 1;
                return acc;
            }, {});
            console.log('Загружено работ по категориям:', worksByCategory);
            console.log('Всего работ загружено:', allWorks.length);
            
            if (currentUser.role === 'менеджер') {
                const allUsers = ensureArray(usersData);
                setUsers(allUsers);
                setForemen(allUsers.filter(u => u.role === 'прораб'));
                setAllObjects(allProjects); 
            }
            
            // Принудительное обновление UI (refreshKey будет обновлен в следующем рендере)
            setRefreshKey(prev => {
                const newKey = prev + 1;
                console.log('✅ Состояние React обновлено, новый refreshKey:', newKey);
                return newKey;
            });

        } catch (error) {
            console.error("Failed to fetch data:", error);
            if (error.message.includes('Invalid token')) {
                handleLogout();
            }
        }
        setIsLoading(false);
    }
  }, [currentUser?.user_id, currentUser?.role]);

  // Автоматическое обновление данных при событиях
  useEventBusListener(
    [ESTIMATE_EVENTS.CREATED, ESTIMATE_EVENTS.UPDATED, ESTIMATE_EVENTS.DELETED],
    async (eventData) => {
      console.log('📨 Получено событие сметы, обновляем данные. EventData:', eventData);
      console.log('📨 Источник события:', eventData?.metadata?.source);
      
      // Проверяем, что событие пришло от SSE (от другого пользователя)
      if (eventData?.metadata?.source === 'sse') {
        console.log('📨 Событие от SSE, обновляем данные...');
        await fetchData(); // Ждём завершения загрузки
        
        // Принудительно обновляем компонент после загрузки данных
        setRefreshKey(prev => prev + 1);
        console.log('✅ Данные обновлены после SSE события');
      } else {
        console.log('📨 Локальное событие, пропускаем обновление');
      }
    },
    [fetchData] // Добавляем fetchData в зависимости
  );

  useEventBusListener(
    [PROJECT_EVENTS.CREATED, PROJECT_EVENTS.UPDATED, PROJECT_EVENTS.DELETED],
    async (eventData) => {
      if (eventData?.metadata?.source === 'sse') {
        console.log('📨 Получено SSE событие проекта, обновляем данные');
        await fetchData();
        setRefreshKey(prev => prev + 1);
      }
    },
    [fetchData]
  );

  useEventBusListener(
    [USER_EVENTS.CREATED, USER_EVENTS.UPDATED, USER_EVENTS.DELETED],
    async (eventData) => {
      if (currentUser?.role === 'менеджер' && eventData?.metadata?.source === 'sse') {
        console.log('📨 Получено SSE событие пользователя, обновляем данные');
        await fetchData();
        setRefreshKey(prev => prev + 1);
      }
    },
    [currentUser?.role, fetchData]
  );

  useEffect(() => { fetchData(); }, [fetchData]);

  // Проверка токена при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token && !currentUser) {
        try {
          // Получаем информацию о текущем пользователе
          const user = await api.getCurrentUser();
          setCurrentUser(user);
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('authToken');
        }
      }
    };
    
    checkAuth();
  }, [currentUser]);

  const handleLogin = async (email, password) => { const { token, user } = await api.login(email, password); localStorage.setItem('authToken', token); setCurrentUser(user); };
  const handleLogout = () => { localStorage.removeItem('authToken'); setCurrentUser(null); setEstimates([]); setObjects([]); setCurrentPage('list'); };
  const handleCreateEstimate = (preselectedObjectId) => { 
    // Принудительно очищаем черновик для новой сметы перед началом работы
    localStorage.removeItem('estimate_draft_new');

    // Используем `objects`, так как этот список корректно отфильтрован для любой роли
    const project = objects.find(o => o.project_id === preselectedObjectId);
    const draftStatus = statuses.find(s => s.status_name === 'Черновик');
    
    // Создаем новую смету с пустым названием
    setSelectedEstimate({ 
      project: project, 
      status: draftStatus, 
      name: '', // Пустое имя - пользователь должен сам ввести или выбрать дефолтное
      foreman: currentUser, 
      items: [] 
    }); 
    setCurrentPage('editor'); 
  };
  const handleEditEstimate = async (estimate) => {
    try {
        setIsLoading(true);
        const fullEstimate = await api.getEstimate(estimate.estimate_id);
        console.log('🔍 DEBUG: Получена смета от API:', fullEstimate);
        console.log('🔍 DEBUG: Количество работ в смете:', fullEstimate.items?.length || 0);
        if (fullEstimate.items) {
            fullEstimate.items.forEach((item, idx) => {
                console.log(`🔍 DEBUG: Работа ${idx + 1}:`, {
                    name: item.work_name || item.work_type?.work_name,
                    added_by: item.added_by,
                    added_by_name: item.added_by_name
                });
            });
        }
        setSelectedEstimate(fullEstimate);
        setCurrentPage('editor');
    } catch (error) {
        console.error("Failed to fetch estimate details:", error);
    } finally {
        setIsLoading(false);
    }
  };
  const handleBackToList = () => { setSelectedEstimate(null); setCurrentPage('list'); fetchData(); };
  
  // Функция для генерации дефолтного названия: Смета_(год)-(месяц)-(день)-(объект)
  const generateDefaultName = (estimate) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const projectName = estimate.project?.project_name || 'Объект';
    
    const finalName = `Смета_${year}-${month}-${day}_${hours}-${minutes}-${seconds}_${projectName}`;
    
    console.log('Генерация имени для сметы:', {
      project_name: estimate.project?.project_name,
      timestamp: `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`,
      finalName: finalName
    });
    
    return finalName;
  };
  
  const handleSaveEstimate = async (estimateToSave) => {
    const estimateName = estimateToSave.name?.trim();
    
    console.log('HandleSaveEstimate вызвана с:', {
      estimateToSave: estimateToSave,
      estimate_id: estimateToSave.estimate_id,
      name: estimateName,
      hasName: !!estimateName
    });
    
    // Проверяем, пустое ли название
    if (!estimateName) {
      // Для сметы без названия (новой или существующей) - показываем диалог
      const defaultName = generateDefaultName(estimateToSave);
      setNameDialog({
        open: true,
        estimateToSave: estimateToSave,
        defaultName: defaultName
      });
      return;
    }
    
    // Сохраняем смету
    await performSaveEstimate(estimateToSave, estimateName);
  };
  
  const performSaveEstimate = async (estimateToSave, finalName) => {
    // 1. Подготавливаем массив работ. Теперь структура item едина.
    const itemsToSave = (estimateToSave.items || []).map(item => ({
        work_type: item.work_type, // Просто передаем ID
        quantity: item.quantity,
        cost_price_per_unit: item.cost_price_per_unit,
        client_price_per_unit: item.client_price_per_unit,
    }));

    // 2. Формируем основной объект для отправки
    const dataToSend = {
        project_id: estimateToSave.project?.project_id || estimateToSave.project,
        status_id: estimateToSave.status?.status_id || estimateToSave.status,
        foreman_id: estimateToSave.foreman?.user_id || estimateToSave.foreman_id,
        estimate_number: finalName,
        items: itemsToSave,
    };

    // 3. Отправляем данные на сервер
    try {
        let result;
        if (estimateToSave.estimate_id) {
            console.log('📝 Обновляем смету:', estimateToSave.estimate_id, dataToSend);
            result = await apiWithEvents.updateEstimate(estimateToSave.estimate_id, dataToSend);
        } else {
            console.log('➕ Создаём новую смету:', dataToSend);
            result = await apiWithEvents.createEstimate(dataToSend);
        }
        console.log('✅ Смета успешно сохранена:', result);
        
        // Обновляем данные после успешного сохранения
        await fetchData();
        handleBackToList();
    } catch (error) {
        console.error("❌ Ошибка при сохранении сметы:", error);
        alert('Ошибка при сохранении сметы: ' + (error.message || 'Неизвестная ошибка'));
    }
  };
  const handleNavigate = (page) => setCurrentPage(page);
  
  const handleDeleteEstimate = async (estimateId) => {
    try {
        console.log('🗑️ Начинаем удаление сметы:', estimateId);
        const result = await apiWithEvents.deleteEstimate(estimateId);
        console.log('✅ Смета успешно удалена:', result);
        
        // Обновляем список сразу, убирая удаленную смету из состояния
        setEstimates(prevEstimates => prevEstimates.filter(e => e.estimate_id !== estimateId));
        
        // Дополнительно обновляем данные с сервера для синхронизации
        await fetchData();
        
        console.log('📨 Данные обновлены после удаления');
    } catch (error) {
        console.error('❌ Ошибка при удалении сметы:', error);
        alert('Ошибка при удалении сметы: ' + (error.message || 'Неизвестная ошибка'));
        // Обновляем данные при ошибке для восстановления состояния
        await fetchData();
    }
  };

  // Обработчики для диалога названия
  const handleNameDialogClose = () => {
    setNameDialog({ open: false, estimateToSave: null, defaultName: '' });
  };

  const handleUseDefaultName = async () => {
    const { estimateToSave, defaultName } = nameDialog;
    handleNameDialogClose();
    await performSaveEstimate(estimateToSave, defaultName);
  };

  const handleProvideCustomName = () => {
    const { estimateToSave } = nameDialog;
    handleNameDialogClose();
    
    // Возвращаем пользователя к редактору для ввода названия с флагом для фокуса
    setSelectedEstimate({ ...estimateToSave, needsName: true });
  };

  const renderContent = () => {
    if (isLoading) return <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /></Box>;

    switch (currentPage) {
        case 'list':
            return <EstimatesList key={refreshKey} currentUser={currentUser} allUsers={users} objects={objects} allObjects={allObjects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} onDeleteEstimate={handleDeleteEstimate} />
        case 'editor':
            return <EstimateEditor 
                estimate={selectedEstimate} 
                categories={categories} 
                works={works} 
                statuses={statuses} 
                onBack={handleBackToList} 
                onSave={handleSaveEstimate} 
                currentUser={currentUser} 
                // foremen and users are also needed by the component
                foremen={foremen}
                users={users}
            />;
        case 'projects':
            return <ProjectsPage onProjectsUpdate={fetchData} />;
        case 'work_categories':
            return <WorkCategoryPage />;
        case 'works':
            return <WorksPage />;
        case 'users':
            return <UsersPage />;
        case 'assignments':
            return <ProjectAssignmentsPage projects={objects} users={users} foremen={foremen} />;
        default:
            return <EstimatesList key={refreshKey} currentUser={currentUser} allUsers={users} objects={objects} allObjects={allObjects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} onDeleteEstimate={handleDeleteEstimate} />;
    }
  };

  if (!currentUser) return (
    <QueryClientProvider client={globalQueryClient}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <SSEConnection user={currentUser}>
          <MobileDetector currentUser={currentUser} queryClient={globalQueryClient} onLogout={handleLogout}>
            <LoginPage onLogin={handleLogin} />
          </MobileDetector>
        </SSEConnection>
      </ThemeProvider>
    </QueryClientProvider>
  );

  return (
    <QueryClientProvider client={globalQueryClient}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <SSEConnection user={currentUser}>
          <MobileDetector currentUser={currentUser} queryClient={globalQueryClient} onLogout={handleLogout}>
        <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Сервис строительных смет</Typography>
            {currentUser && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip icon={<AccountCircleIcon />} label={`${currentUser.full_name} (${currentUser.role})`} />
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => setShowEventMonitor(true)}
                  >
                    EventBus
                  </Button>
                )}
                <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>Выйти</Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {currentUser.role === 'менеджер' && <NavMenu currentPage={currentPage} onNavigate={handleNavigate} />}
          {renderContent()}
        </Box>
        
        {/* Диалог для проверки названия сметы */}
        <Dialog open={nameDialog.open} onClose={handleNameDialogClose}>
          <DialogTitle>Смета без названия</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Вы не указали название для сметы. Мы можем использовать предложенное название:
            </DialogContentText>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {nameDialog.defaultName}
              </Typography>
            </Box>
            <DialogContentText sx={{ mt: 2 }}>
              Выберите один из вариантов:
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ gap: 1 }}>
            <Button onClick={handleProvideCustomName}>
              Дать имя
            </Button>
            <Button onClick={handleUseDefaultName} variant="contained">
              Использовать предложенное
            </Button>
          </DialogActions>
        </Dialog>

        {/* Event Bus Monitor (только для разработки) */}
        {process.env.NODE_ENV === 'development' && (
          <EventBusMonitor 
            open={showEventMonitor} 
            onClose={() => setShowEventMonitor(false)} 
          />
        )}
        </MobileDetector>
        </SSEConnection>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;