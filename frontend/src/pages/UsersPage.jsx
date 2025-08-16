import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, 
    DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, Stack
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { api } from '../api/client';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
    return [];
};

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [usersData, rolesData] = await Promise.all([
                api.getUsers(),
                api.getRoles(),
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (err) {
            setError(err.message || 'Не удалось загрузить данные');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenDialog = (user = null) => {
        setCurrentUser(user);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentUser(null);
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            try {
                await api.deleteUser(userId);
                fetchData(); // Обновить список
            } catch (err) {
                setError(err.message || 'Ошибка при удалении');
            }
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            role_id: formData.get('role_id'),
        };

        const password = formData.get('password');
        if (password) {
            data.password = password;
        }

        try {
            if (currentUser) {
                await api.updateUser(currentUser.user_id, data);
            } else {
                await api.createUser(data);
            }
            fetchData();
            handleCloseDialog();
        } catch (err) {
            setError(err.message || 'Ошибка при сохранении');
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Управление пользователями</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Добавить пользователя</Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Полное имя</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Роль</TableCell>
                            <TableCell align="right">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {ensureArray(users).map((user) => (
                            <TableRow key={user.user_id}>
                                <TableCell>{user.full_name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenDialog(user)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(user.user_id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>{currentUser ? 'Редактировать пользователя' : 'Добавить пользователя'}</DialogTitle>
                <form onSubmit={handleSave}>
                    <DialogContent>
                        <Stack spacing={2} sx={{mt: 1}}>
                            <TextField name="full_name" label="Полное имя" defaultValue={currentUser?.full_name} required fullWidth />
                            <TextField name="email" type="email" label="Email" defaultValue={currentUser?.email} required fullWidth />
                            <TextField name="password" type="password" label={currentUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'} fullWidth required={!currentUser} />
                            <FormControl fullWidth required>
                                <InputLabel>Роль</InputLabel>
                                <Select name="role_id" defaultValue={roles.find(r => r.role_name === currentUser?.role)?.role_id || ''} label="Роль">
                                    {ensureArray(roles).map((role) => (
                                        <MenuItem key={role.role_id} value={role.role_id}>{role.role_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Отмена</Button>
                        <Button type="submit" variant="contained">Сохранить</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Paper>
    );
};

export default UsersPage;
