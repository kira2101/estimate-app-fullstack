import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar, DialogContentText,
    Tooltip, Pagination
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as ImportIcon, Warning as WarningIcon } from '@mui/icons-material';

const WorksPage = () => {
    const [workTypes, setWorkTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, workType: null });
    
    // Состояние для импорта
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);
    
    // Состояние для пагинации
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = async (page = 1) => {
        try {
            setIsLoading(true);
            const [worksData, catsData] = await Promise.all([
                api.getWorkTypes(page, 20), 
                api.getWorkCategories()
            ]);
            
            // Обработка пагинированного ответа
            if (worksData.results) {
                setWorkTypes(worksData.results);
                setTotalCount(worksData.count);
                setTotalPages(Math.ceil(worksData.count / 20));
            } else {
                // Fallback для случая без пагинации
                setWorkTypes(worksData);
                setTotalPages(1);
                setTotalCount(worksData.length);
            }
            setCategories(catsData);
        } catch (err) { setError(err.message); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(currentPage); }, [currentPage]);

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
            cost_price: formData.get('cost_price'),
            client_price: formData.get('client_price'),
        };

        try {
            if (currentItem) {
                await api.updateWorkType(currentItem.work_type_id, data);
            } else {
                await api.createWorkType(data);
            }
            fetchData(currentPage);
            handleCloseDialog();
        } catch (err) { setError(err.message); }
    };

    const handleDeleteClick = (workType) => {
        setDeleteDialog({ open: true, workType });
    };

    const handleDeleteConfirm = async () => {
        try {
            console.log('Начинаем удаление работы:', deleteDialog.workType.work_type_id);
            await api.deleteWorkType(deleteDialog.workType.work_type_id);
            console.log('Работа успешно удалена');
            fetchData(currentPage);
            setDeleteDialog({ open: false, workType: null });
        } catch (err) {
            console.error('Ошибка при удалении работы:', err);
            setError(`Ошибка удаления: ${err.message}`);
            setDeleteDialog({ open: false, workType: null });
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialog({ open: false, workType: null });
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        setImportResult(null);
        setError('');

        try {
            const result = await api.importWorkTypes(file);
            setImportResult({ success: true, message: `${result.message} Создано: ${result.created}, обновлено: ${result.updated}.` });
            fetchData(currentPage); // Обновляем список работ
        } catch (err) {
            setImportResult({ success: false, message: err.message || 'Ошибка импорта.' });
        } finally {
            setIsImporting(false);
            // Сбрасываем значение инпута, чтобы можно было загрузить тот же файл снова
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handlePageChange = (event, value) => {
        setCurrentPage(value);
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                    <Typography variant="h4">Каталог работ</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Всего работ: {totalCount}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={isImporting ? <CircularProgress size={20} /> : <ImportIcon />} onClick={handleImportClick} disabled={isImporting}>
                        Импорт из Excel
                    </Button>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>Добавить работу</Button>
                </Stack>
            </Box>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {importResult && <Alert severity={importResult.success ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setImportResult(null)}>{importResult.message}</Alert>}

            <TableContainer>
                <Table>
                    <TableHead><TableRow><TableCell>Название работы</TableCell><TableCell>Категория</TableCell><TableCell>Ед. изм.</TableCell><TableCell>Базовая цена</TableCell><TableCell>Цена клиента</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                    <TableBody>
                        {workTypes.map((item) => (
                            <TableRow key={item.work_type_id}>
                                <TableCell>{item.work_name}</TableCell>
                                <TableCell>{item.category?.category_name}</TableCell>
                                <TableCell>{item.unit_of_measurement}</TableCell>
                                <TableCell>{item.prices?.cost_price ? `${item.prices.cost_price} грн` : 'Не указана'}</TableCell>
                                <TableCell>{item.prices?.client_price ? `${item.prices.client_price} грн` : 'Не указана'}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Редактировать">
                                        <IconButton onClick={() => handleOpenDialog(item)} color="primary">
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Удалить">
                                        <IconButton onClick={() => handleDeleteClick(item)} color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Пагинация */}
            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination 
                        count={totalPages} 
                        page={currentPage} 
                        onChange={handlePageChange}
                        color="primary"
                        size="large"
                    />
                </Box>
            )}

            {/* Диалог создания/редактирования */}
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
                            <TextField 
                                name="cost_price" 
                                label="Базовая цена (грн)" 
                                type="number" 
                                step="0.01" 
                                defaultValue={currentItem?.prices?.cost_price || ''} 
                                required 
                            />
                            <TextField 
                                name="client_price" 
                                label="Цена клиента (грн)" 
                                type="number" 
                                step="0.01" 
                                defaultValue={currentItem?.prices?.client_price || ''} 
                                required 
                            />
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
                        Вы действительно хотите удалить работу <strong>"{deleteDialog.workType?.work_name}"</strong> из каталога?
                    </DialogContentText>
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        <strong>Важно!</strong> Если работа используется в существующих сметах, сначала удалите эти сметы или уберите данную работу из смет, а затем удаляйте работу из каталога.
                    </Alert>
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

export default WorksPage;
