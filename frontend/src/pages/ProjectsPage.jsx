
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { apiWithEvents } from '../api/apiWithEvents';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
    return [];
};

const ProjectsPage = ({ onProjectsUpdate }) => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState(null); // Для редактирования

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const data = await api.getProjects();
            setProjects(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleOpenDialog = (project = null) => {
        setCurrentProject(project);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentProject(null);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = {
            project_name: formData.get('project_name'),
            address: formData.get('address'),
        };

        try {
            if (currentProject) {
                await apiWithEvents.updateProject(currentProject.project_id, data);
            } else {
                await apiWithEvents.createProject(data);
            }
            fetchProjects(); // Обновляем список
            if (onProjectsUpdate) {
                onProjectsUpdate();
            }
            handleCloseDialog();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить этот объект?')) {
            try {
                await apiWithEvents.deleteProject(id);
                fetchProjects();
                if (onProjectsUpdate) {
                    onProjectsUpdate();
                }
            } catch (err) {
                setError(err.message);
            }
        }
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Управление объектами</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Создать объект</Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TableContainer>
                <Table>
                    <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Название объекта</TableCell><TableCell>Адрес</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                    <TableBody>
                        {ensureArray(projects).map((project) => (
                            <TableRow key={project.project_id}>
                                <TableCell>{project.project_id}</TableCell>
                                <TableCell>{project.project_name}</TableCell>
                                <TableCell>{project.address}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenDialog(project)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(project.project_id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={handleSave}>
                    <DialogTitle>{currentProject ? 'Редактировать объект' : 'Создать новый объект'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{mt: 1}}>
                            <TextField name="project_name" label="Название объекта" defaultValue={currentProject?.project_name} required />
                            <TextField name="address" label="Адрес" defaultValue={currentProject?.address} />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Отмена</Button>
                        <Button type="submit">Сохранить</Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Paper>
    );
};

export default ProjectsPage;
