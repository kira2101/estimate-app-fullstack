
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Button, Chip, CircularProgress } from '@mui/material';
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
// import UsersPage from './pages/UsersPage';
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

  const fetchData = async () => {
    if (currentUser) {
        setIsLoading(true);
        try {
            const [projectsData, estimatesData, categoriesData, statusesData, worksData, usersData] = await Promise.all([
                api.getProjects(),
                api.getEstimates(),
                api.getWorkCategories(),
                api.getStatuses(),
                api.getWorkTypes(),
                api.getUsers()
            ]);
            setObjects(projectsData);
            setEstimates(estimatesData);
            setCategories(categoriesData);
            setStatuses(statusesData);
            setWorks(Array.isArray(worksData) ? worksData : []);
            setUsers(usersData);
            setForemen(usersData.filter(u => u.role === 'прораб'));
            if (currentUser.role === 'менеджер') {
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
  const handleCreateEstimate = (preselectedObjectId) => { setSelectedEstimate({ project: preselectedObjectId, status: statuses.find(s => s.status_name === 'Черновик')?.status_id, items: [] }); setCurrentPage('editor'); };
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
  const handleSaveEstimate = async (estimateToSave) => {
    try {
        if (estimateToSave.estimate_id) {
            await api.updateEstimate(estimateToSave.estimate_id, estimateToSave);
        } else {
            await api.createEstimate(estimateToSave);
        }
        handleBackToList();
    } catch (error) {
        console.error("Failed to save estimate:", error);
        // Optionally, show an error message to the user
    }
  };
  const handleNavigate = (page) => setCurrentPage(page);

  const renderContent = () => {
    if (isLoading) return <Box sx={{display: 'flex', justifyContent: 'center', p: 4}}><CircularProgress /></Box>;
    
    console.log("DEBUG App.jsx: works before passing to EstimateEditor:", works, "Type:", typeof works, "Is Array:", Array.isArray(works));

    switch (currentPage) {
        case 'list':
            return <EstimatesList currentUser={currentUser} allUsers={users} objects={objects} allObjects={allObjects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} />;
        case 'editor':
            return <EstimateEditor estimate={selectedEstimate} categories={categories} works={works} statuses={statuses} foremen={foremen} users={users} onBack={handleBackToList} onSave={handleSaveEstimate} />;
        case 'projects':
            return <ProjectsPage onProjectsUpdate={fetchData} />;
        case 'work_categories':
            return <WorkCategoryPage />;
        case 'works':
            return <WorksPage />;
        default:
            return <EstimatesList currentUser={currentUser} allUsers={users} objects={objects} allObjects={allObjects} estimates={estimates} onCreateEstimate={handleCreateEstimate} onEditEstimate={handleEditEstimate} />;
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
    </ThemeProvider>
  );
}

export default App;
