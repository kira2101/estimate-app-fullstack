import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as ImportIcon } from '@mui/icons-material';

const WorksPage = () => {
    const [workTypes, setWorkTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [worksData, catsData] = await Promise.all([api.getWorkTypes(), api.getWorkCategories()]);
            setWorkTypes(worksData);
            setCategories(catsData);
        } catch (err) { setError(err.message); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenDialog = (item = null) => {
        setCurrentItem(item);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentItem(null);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data = {
            work_name: formData.get('work_name'),
            unit_of_measurement: formData.get('unit_of_measurement'),
            category_id: formData.get('category_id'),
        };

        try {
            if (currentItem) {
                await api.updateWorkType(currentItem.work_type_id, data);
            } else {
                await api.createWorkType(data);
            }
            fetchData();
            handleCloseDialog();
        } catch (err) { setError(err.message); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту работу из каталога?')) {
            try {
                await api.deleteWorkType(id);
                fetchData();
            } catch (err) { setError(err.message); }
        }
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Каталог работ</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Добавить работу</Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TableContainer>
                <Table>
                    <TableHead><TableRow><TableCell>Название работы</TableCell><TableCell>Категория</TableCell><TableCell>Ед. изм.</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                    <TableBody>
                        {workTypes.map((item) => (
                            <TableRow key={item.work_type_id}>
                                <TableCell>{item.work_name}</TableCell>
                                <TableCell>{item.category?.category_name}</TableCell>
                                <TableCell>{item.unit_of_measurement}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenDialog(item)}><EditIcon /></IconButton>
                                    <IconButton onClick={() => handleDelete(item.work_type_id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{mt: 2, display: 'flex', justifyContent: 'flex-end'}}>
                <Button variant="outlined" startIcon={<ImportIcon />}>Импорт</Button>
            </Box>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <Box component="form" onSubmit={handleSave}>
                    <DialogTitle>{currentItem ? 'Редактировать работу' : 'Создать новую работу'}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{mt: 1}}>
                            <TextField name="work_name" label="Название работы" defaultValue={currentItem?.work_name} required />
                            <TextField name="unit_of_measurement" label="Ед. измерения" defaultValue={currentItem?.unit_of_measurement} required />
                            <FormControl fullWidth required>
                                <InputLabel>Категория</InputLabel>
                                <Select name="category_id" label="Категория" defaultValue={currentItem?.category?.category_id || ''}>
                                    {categories.map(cat => <MenuItem key={cat.category_id} value={cat.category_id}>{cat.category_name}</MenuItem>)}
                                </Select>
                            </FormControl>
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

export default WorksPage;