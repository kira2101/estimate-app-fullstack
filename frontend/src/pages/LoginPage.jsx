
import React from 'react';
import { Paper, Typography, Button, Stack, Box } from '@mui/material';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import ManagerIcon from '@mui/icons-material/BusinessCenter';

const LoginPage = ({ onLogin }) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    Авторизация
                </Typography>
                <Typography align="center" color="text.secondary" sx={{ mb: 4 }}>
                    Выберите вашу роль для входа в систему.
                </Typography>
                <Stack spacing={2}>
                    <Button 
                        variant="contained" 
                        size="large" 
                        startIcon={<ManagerIcon />} 
                        onClick={() => onLogin('manager')}
                    >
                        Войти как Менеджер
                    </Button>
                    <Button 
                        variant="outlined" 
                        size="large" 
                        startIcon={<SupervisorAccountIcon />} 
                        onClick={() => onLogin('foreman')}
                    >
                        Войти как Прораб
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default LoginPage;
