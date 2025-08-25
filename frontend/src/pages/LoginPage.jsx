import React, { useState } from 'react';
import { Paper, Typography, Button, Stack, Box, TextField, Alert } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await onLogin(email, password);
        } catch (err) {
            setError(err.message || 'Failed to login');
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    Авторизация
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Stack spacing={2}>
                    <TextField 
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField 
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button 
                        type="submit"
                        variant="contained" 
                        size="large" 
                        startIcon={<LoginIcon />}
                    >
                        Войти
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
};

export default LoginPage;