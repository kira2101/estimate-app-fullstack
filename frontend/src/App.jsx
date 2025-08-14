import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Button, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, TextField } from '@mui/material';
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
import { api } from './api/client';

const darkTheme = createTheme({ palette: { mode: 'dark', primary: { main: '#90caf9' }, secondary: { main: '#f48fb1' }, background: { default: '#121212', paper: '#1e1e1e' } } });

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

  const fetchData = async () => {
    if (currentUser) {
        setIsLoading(true);
        try {
            // Основные запросы, нужные всем
            const corePromises = [
                api.getProjects(),
                api.getEstimates(),
                api.getStatuses(),
                api.getWorkCategories(), // Теперь доступно всем
                api.getWorkTypes(),      // Теперь доступно всем
            ];

            // Запросы только для менеджера
            if (currentUser.role === 'менеджер') {
                corePromises.push(api.getUsers());
            }

            const results = await Promise.all(corePromises);

            const [projectsData, estimatesData, statusesData, categoriesData, worksData] = results;
            let usersData = [];
            if (currentUser.role === 'менеджер') {
                usersData = results[5];
            }

            // Обновляем состояние
            setObjects(projectsData);
            setEstimates(estimatesData);
            setStatuses(statusesData);
            setCategories(categoriesData);
            setWorks(Array.isArray(worksData) ? worksData : []);
            
            if (currentUser.role === 'менеджер') {
                setUsers(usersData);
                setForemen(usersData.filter(u => u.role === 'прораб'));
                setAllObjects(projectsData); 
            }

        } catch (error) {
            console.error("Failed to fetch data:", error);
            if (error.message.includes('Invalid token')) {
                handleLogout();
            }
        }
        setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

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
    const projectName = estimate.project?.project_name || 'Объект';
    return `Смета_${year}-${month}-${day}-${projectName}`;
  };
  
  const handleSaveEstimate = async (estimateToSave) => {
    const estimateName = estimateToSave.name?.trim();
    
    // Проверяем, пустое ли название
    if (!estimateName && !estimateToSave.estimate_id) {
      // Для новой сметы без названия - показываем диалог
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
        if (estimateToSave.estimate_id) {
            await api.updateEstimate(estimateToSave.estimate_id, dataToSend);
        } else {
            await api.createEstimate(dataToSend);
        }
        handleBackToList();
    } catch (error) {
        console.error("Ошибка при сохранении сметы:", error);
    }
  };
  const handleNavigate = (page) => setCurrentPage(page);
  
  const handleDeleteEstimate = async (estimateId) => {
    try {
        console.log('Начинаем удаление сметы:', estimateId);
        await api.deleteEstimate(estimateId);
        console.log('Смета успешно удалена, обновляем данные...');
        
        // Обновляем список сразу, убирая удаленную смету из состояния
        setEstimates(prevEstimates => prevEstimates.filter(e => e.estimate_id !== estimateId));
        
        // Также обновляем данные с сервера для синхронизации
        await fetchData();
        
        console.log('Данные обновлены после удаления');
    } catch (error) {
        console.error('Failed to delete estimate:', error);
        alert('Ошибка при удалении сметы: ' + (error.message || 'Неизвестная ошибка'));
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
            return <EstimatesList currentUser={currentUser} allUsers={users} objects={objects} allObjects={allObjects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} onDeleteEstimate={handleDeleteEstimate} />
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
            return <ProjectAssignmentsPage />;
        default:
            return <EstimatesList currentUser={currentUser} allUsers={users} objects={objects} allObjects={allObjects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} onDeleteEstimate={handleDeleteEstimate} />;
    }
  };

  if (!currentUser) return <ThemeProvider theme={darkTheme}><CssBaseline /><LoginPage onLogin={handleLogin} /></ThemeProvider>;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Сервис строительных смет</Typography>
          {currentUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip icon={<AccountCircleIcon />} label={`${currentUser.full_name} (${currentUser.role})`} />
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
    </ThemeProvider>
  );
}

export default App;