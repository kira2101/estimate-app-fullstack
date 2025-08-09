
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Эта страница является копией ProjectsPage, адаптированной для категорий работ
const WorkCategoryPage = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState(null);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            const data = await api.getWorkCategories();
            setCategories(data);
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

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
            try {
                await api.deleteWorkCategory(id);
                fetchCategories();
            } catch (err) {
                setError(err.message);
            }
        }
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
                    <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Название категории</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                    <TableBody>
                        {categories.map((cat) => (
                            <TableRow key={cat.category_id}>
                                <TableCell>{cat.category_id}</TableCell>
                                <TableCell>{cat.category_name}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenDialog(cat)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(cat.category_id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

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
                        <Button type="submit">Сохранить</Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Paper>
    );
};

export default WorkCategoryPage;
