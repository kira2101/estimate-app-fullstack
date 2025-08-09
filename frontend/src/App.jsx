import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

// Страницы и компоненты
import EstimatesList from './pages/EstimatesList';
import EstimateEditor from './pages/EstimateEditor';
import LoginPage from './pages/LoginPage';
// import { api } from './api/client'; // Будет использоваться для реальных запросов

// --- Тестовые данные удалены. Приложение будет получать данные из API ---

const darkTheme = createTheme({ palette: { mode: 'dark', primary: { main: '#90caf9' }, secondary: { main: '#f48fb1' }, background: { default: '#121212', paper: '#1e1e1e' } } });

function App() {
  // Состояния для данных, которые будут приходить с бэкенда
  const [currentUser, setCurrentUser] = useState(null); // Данные о пользователе
  const [estimates, setEstimates] = useState([]); // Список смет
  const [objects, setObjects] = useState([]); // Список объектов/проектов
  const [users, setUsers] = useState({}); // Список пользователей для сопоставления ID и имен
  const [categories, setCategories] = useState([]); // Справочник категорий работ
  const [works, setWorks] = useState({}); // Справочник работ

  // Состояния для навигации
  const [currentPage, setCurrentPage] = useState('list');
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  // --- Логика для получения данных с бэкенда (пока закомментирована) ---
  /*
  useEffect(() => {
    if (currentUser) {
      // Загрузка основных данных после логина
      const fetchData = async () => {
        const objectsData = await api.getProjects();
        setObjects(objectsData);

        const estimatesData = await api.getEstimates();
        setEstimates(estimatesData);
        
        // ... и т.д.
      }
      fetchData();
    }
  }, [currentUser]);
  */

  const handleLogin = (role) => {
    // В реальности здесь будет запрос к /api/auth/login
    // Пока просто создаем фейкового пользователя для входа
    const fakeUser = role === 'manager' 
      ? { id: 'user-manager-1', name: 'Елена Смирнова', role: 'менеджер' }
      : { id: 'user-foreman-1', name: 'Иван Петров', role: 'прораб', assignedObjectIds: [1, 3] };
    setCurrentUser(fakeUser);
  }

  const handleLogout = () => {
      // Очистка всех данных при выходе
      setCurrentUser(null);
      setEstimates([]);
      setObjects([]);
  };

  const handleCreateEstimate = (preselectedObjectId) => { setSelectedEstimate({ objectId: preselectedObjectId, items: [] }); setCurrentPage('editor'); };
  const handleEditEstimate = (estimate) => { setSelectedEstimate(estimate); setCurrentPage('editor'); };
  const handleBackToList = () => { setSelectedEstimate(null); setCurrentPage('list'); };

  const handleSaveEstimate = (estimateToSave) => {
    // Здесь будет вызов api.createEstimate или api.updateEstimate
    console.log('Сохранение сметы:', estimateToSave);
    handleBackToList();
  };

  const renderContent = () => {
    if (!currentUser) {
      return <LoginPage onLogin={handleLogin} />;
    }
    if (currentPage === 'list') {
      return <EstimatesList currentUser={currentUser} allUsers={users} objects={objects} allObjects={objects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} />;
    }
    if (currentPage === 'editor') {
      return <EstimateEditor estimate={selectedEstimate} categories={categories} works={works} onBack={handleBackToList} onSave={handleSaveEstimate} />;
    }
    return null;
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Сервис строительных смет</Typography>
          {currentUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip icon={<AccountCircleIcon />} label={`${currentUser.name} (${currentUser.role})`} />
              <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>Выйти</Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {renderContent()}
      </Box>
    </ThemeProvider>
  );
}

export default App;