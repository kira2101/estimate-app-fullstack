
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert, DialogContentText,
    Tooltip, Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
    return [];
};

// Эта страница является копией ProjectsPage, адаптированной для категорий работ
const WorkCategoryPage = () => {
    const [categories, setCategories] = useState([]);
    const [works, setWorks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const [categoriesData, worksData] = await Promise.all([
                api.getWorkCategories(),
                api.getAllWorkTypes()
            ]);
            setCategories(categoriesData);
            setWorks(worksData.results || worksData || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleOpenDialog = (category = null) => {
        setCurrentCategory(category);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentCategory(null);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = {
            category_name: formData.get('category_name'),
        };

        try {
            if (currentCategory) {
                await api.updateWorkCategory(currentCategory.category_id, data);
            } else {
                await api.createWorkCategory(data);
            }
            fetchCategories();
            handleCloseDialog();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteClick = (category) => {
        setDeleteDialog({ open: true, category });
    };

    const getWorkCountForCategory = (categoryId) => {
        return works.filter(work => work.category?.category_id === categoryId).length;
    };

    const handleDeleteConfirm = async () => {
        try {
            console.log('Начинаем удаление категории:', deleteDialog.category.category_id);
            await api.deleteWorkCategory(deleteDialog.category.category_id);
            console.log('Категория успешно удалена');
            fetchCategories();
            setDeleteDialog({ open: false, category: null });
        } catch (err) {
            console.error('Ошибка при удалении категории:', err);
            setError(`Ошибка удаления: ${err.message}`);
            setDeleteDialog({ open: false, category: null });
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialog({ open: false, category: null });
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Управление категориями работ</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Создать категорию</Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TableContainer>
                <Table>
                    <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Название категории</TableCell><TableCell>Количество работ</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                    <TableBody>
                        {ensureArray(categories).map((cat) => {
                            const workCount = getWorkCountForCategory(cat.category_id);
                            return (
                            <TableRow key={cat.category_id} sx={{ backgroundColor: workCount === 0 ? 'rgba(255, 193, 7, 0.1)' : 'inherit' }}>
                                <TableCell>{cat.category_id}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {cat.category_name}
                                        {workCount === 0 && (
                                            <Chip label="Пустая" size="small" color="warning" variant="outlined" />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={workCount} 
                                        size="small" 
                                        color={workCount === 0 ? 'warning' : 'primary'}
                                        variant={workCount === 0 ? 'filled' : 'outlined'}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Редактировать">
                                        <IconButton onClick={() => handleOpenDialog(cat)} color="primary">
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Удалить">
                                        <IconButton onClick={() => handleDeleteClick(cat)} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Диалог создания/редактирования */}
            <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={handleSave}>
                    <DialogTitle>{currentCategory ? 'Редактировать категорию' : 'Создать новую категорию'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{mt: 1}}>
                            <TextField name="category_name" label="Название категории" defaultValue={currentCategory?.category_name} required />
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Отмена</Button>
                        <Button type="submit" variant="contained">Сохранить</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <Dialog open={deleteDialog.open} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="error" />
                    Подтвердите удаление
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Вы действительно хотите удалить категорию <strong>"{deleteDialog.category?.category_name}"</strong>?
                    </DialogContentText>
                    {deleteDialog.category && getWorkCountForCategory(deleteDialog.category.category_id) > 0 ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            <strong>Внимание!</strong> В этой категории {getWorkCountForCategory(deleteDialog.category.category_id)} работ. 
                            Сначала удалите все работы из этой категории или переместите их в другие категории, а затем удаляйте саму категорию.
                        </Alert>
                    ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <strong>Готово к удалению:</strong> Эта категория пустая и может быть безопасно удалена.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} variant="outlined">
                        Отмена
                    </Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" color="error">
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default WorkCategoryPage;
