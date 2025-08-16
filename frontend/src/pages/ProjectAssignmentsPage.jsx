import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, 
    DialogActions, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, Stack
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { api } from '../api/client';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
    return [];
};

const ProjectAssignmentsPage = ({ projects: propProjects = [], users: propUsers = [], foremen: propForemen = [] }) => {
    const [assignments, setAssignments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [foremen, setForemen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [assignmentsData, projectsData, usersData] = await Promise.all([
                api.getProjectAssignments(),
                api.getProjects(),
                api.getUsers(),
            ]);
            setAssignments(assignmentsData);
            setProjects(projectsData);
            setForemen(usersData.filter(u => u.role === 'прораб'));
        } catch (err) {
            setError(err.message || 'Не удалось загрузить данные');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenDialog = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleDelete = async (assignmentId) => {
        if (window.confirm('Вы уверены, что хотите удалить это назначение?')) {
            try {
                await api.deleteProjectAssignment(assignmentId);
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
            project: formData.get('project_id'),
            user: formData.get('user_id'),
        };

        try {
            await api.createProjectAssignment(data);
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
                <Typography variant="h5">Назначение прорабов на объекты</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>Добавить назначение</Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Объект (Проект)</TableCell>
                            <TableCell>Прораб</TableCell>
                            <TableCell align="right">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {ensureArray(assignments).map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.project_name}</TableCell>
                                <TableCell>{item.user_full_name}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleDelete(item.id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle>Новое назначение</DialogTitle>
                <form onSubmit={handleSave}>
                    <DialogContent>
                        <Stack spacing={2} sx={{mt: 1}}>
                            <FormControl fullWidth required>
                                <InputLabel>Проект</InputLabel>
                                <Select name="project_id" label="Проект">
                                    {ensureArray(projects).map((project) => (
                                        <MenuItem key={project.project_id} value={project.project_id}>{project.project_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required>
                                <InputLabel>Прораб</InputLabel>
                                <Select name="user_id" label="Прораб">
                                    {ensureArray(foremen).map((user) => (
                                        <MenuItem key={user.user_id} value={user.user_id}>{user.full_name}</MenuItem>
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

export default ProjectAssignmentsPage;
