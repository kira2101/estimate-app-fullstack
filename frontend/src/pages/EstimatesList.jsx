import React, { useState, useMemo, useEffect } from 'react';
import { 
    Box, Typography, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
    Chip, IconButton, FormControl, InputLabel, useMediaQuery, useTheme, Stack, Dialog, DialogTitle, DialogContent, DialogActions, ButtonGroup, DialogContentText
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as VisibilityIcon, Business as BusinessIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    try {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results;
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
        console.warn('EstimatesList ensureArray: неожиданный тип данных:', typeof data, data);
        return [];
    } catch (error) {
        console.error('EstimatesList ensureArray: ошибка обработки данных:', error, data);
        return [];
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'В работе': return 'primary';
        case 'Завершена': return 'success';
        case 'Черновик': return 'warning';
        case 'На согласовании': return 'info';
        default: return 'default';
    }
};

const formatAmount = (amount, currency) => {
    const formattedNumber = new Intl.NumberFormat('ru-RU').format(amount || 0);
    return `${formattedNumber} ${currency}`;
};

const EstimatesList = ({ currentUser, allUsers, objects, allObjects, estimates, onCreateEstimate, onEditEstimate, onDeleteEstimate, onNavigateToProjects }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [selectedObjectId, setSelectedObjectId] = useState('all');
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [creationObjectId, setCreationObjectId] = useState('');
    const [deleteDialog, setDeleteDialog] = useState({ open: false, estimate: null });

    // Эффект для сброса фильтра, если выбранный объект более недоступен
    useEffect(() => {
        if (selectedObjectId !== 'all' && !objects.some(o => o.project_id === selectedObjectId)) {
            setSelectedObjectId('all');
        }
    }, [objects, selectedObjectId]);

    const handleOpenCreateDialog = () => {
        const availableObjects = currentUser.role === 'менеджер' ? allObjects : objects;
        // Если у прораба выбран конкретный объект, предлагаем его. Иначе — первый из доступных.
        const preselectedId = (currentUser.role === 'прораб' && selectedObjectId !== 'all')
            ? selectedObjectId
            : availableObjects[0]?.project_id;
        
        setCreationObjectId(preselectedId || '');
        setCreateDialogOpen(true);
    };

    const handleConfirmCreate = () => {
        if (!creationObjectId) {
            alert('Пожалуйста, выберите объект.');
            return;
        }
        onCreateEstimate(creationObjectId);
        setCreateDialogOpen(false);
    };

    const handleDeleteClick = (estimate, event) => {
        event.stopPropagation(); // Предотвращаем открытие редактора
        setDeleteDialog({ open: true, estimate });
    };

    const handleConfirmDelete = () => {
        if (deleteDialog.estimate) {
            onDeleteEstimate(deleteDialog.estimate.estimate_id);
        }
        setDeleteDialog({ open: false, estimate: null });
    };

    const filteredEstimates = useMemo(() => {
        // Для менеджера логика фильтрации может быть другой или отсутствовать
        if (currentUser.role === 'менеджер') {
            return estimates;
        }
        // Для прораба
        if (selectedObjectId === 'all') {
            return estimates; // Показываем все сметы, доступные пользователю
        }
        return estimates.filter(e => e.objectId === selectedObjectId);
    }, [selectedObjectId, estimates, currentUser.role]);

    const renderManagerView = () => (
        <TableContainer>
            <Table>
                <TableHead><TableRow><TableCell>Название сметы</TableCell><TableCell>Объект</TableCell><TableCell>Составил</TableCell><TableCell>Статус</TableCell><TableCell>Сумма</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                <TableBody>
                    {ensureArray(filteredEstimates).map((estimate) => (
                        <TableRow key={estimate.estimate_id} hover sx={{ cursor: 'pointer' }} onClick={() => onEditEstimate(estimate)}>
                            <TableCell>{estimate.name}</TableCell>
                            <TableCell>{allObjects.find(o => o.project_id === estimate.objectId)?.project_name || '-'}</TableCell>
                            <TableCell>{estimate.foreman_name || 'Не назначен'}</TableCell>
                            <TableCell><Chip label={estimate.status} color={getStatusColor(estimate.status)} size="small" /></TableCell>
                            <TableCell>{formatAmount(estimate.totalAmount, estimate.currency)}</TableCell>
                            <TableCell align="right">
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={(e) => handleDeleteClick(estimate, e)}
                                    title="Удалить смету"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderForemanView = () => (
        <TableContainer>
            <Table>
                <TableHead><TableRow><TableCell>Название сметы</TableCell><TableCell>Статус</TableCell><TableCell>Дата</TableCell><TableCell>Сумма</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
                <TableBody>
                    {ensureArray(filteredEstimates).map((estimate) => (
                        <TableRow key={estimate.estimate_id} hover sx={{ cursor: 'pointer' }} onClick={() => onEditEstimate(estimate)}>
                            <TableCell>{estimate.name}</TableCell>
                            <TableCell><Chip label={estimate.status} color={getStatusColor(estimate.status)} size="small" /></TableCell>
                            <TableCell>{estimate.createdDate}</TableCell>
                            <TableCell>{formatAmount(estimate.totalAmount, estimate.currency)}</TableCell>
                            <TableCell align="right">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditEstimate(estimate); }} title="Редактировать">
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={(e) => handleDeleteClick(estimate, e)}
                                    title="Удалить смету"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e' }}>
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h4" component="h1">Список смет</Typography>
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 2, width: isMobile ? '100%' : 'auto' }}>
                    {currentUser.role === 'прораб' && (
                        <FormControl fullWidth={isMobile} sx={{ minWidth: 250 }} size="small">
                            <InputLabel>Выберите объект</InputLabel>
                            <Select value={selectedObjectId} label="Выберите объект" onChange={(e) => setSelectedObjectId(e.target.value)}>
                                <MenuItem value="all"><em>Все объекты</em></MenuItem>
                                {ensureArray(objects).map(obj => (<MenuItem key={obj.project_id} value={obj.project_id}>{obj.project_name}</MenuItem>))}
                            </Select>
                        </FormControl>
                    )}
                    <Button fullWidth={isMobile} variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
                        Создать смету
                    </Button>
                </Box>
            </Box>
            
            {currentUser.role === 'менеджер' ? renderManagerView() : renderForemanView()}

            <Dialog open={isCreateDialogOpen} onClose={() => setCreateDialogOpen(false)}>
                <DialogTitle>Создание новой сметы</DialogTitle>
                <DialogContent sx={{pt: '16px !important'}}>
                    <FormControl fullWidth sx={{mt: 1}}>
                        <InputLabel>Выберите объект для новой сметы</InputLabel>
                        <Select value={creationObjectId} label="Выберите объект для новой сметы" onChange={(e) => setCreationObjectId(e.target.value)}>
                            {ensureArray(currentUser.role === 'менеджер' ? allObjects : objects).map(obj => (<MenuItem key={obj.project_id} value={obj.project_id}>{obj.project_name}</MenuItem>))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
                    <Button onClick={handleConfirmCreate} variant="contained">Продолжить</Button>
                </DialogActions>
            </Dialog>

            {/* Диалог подтверждения удаления */}
            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, estimate: null })}>
                <DialogTitle>Подтвердите удаление</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Вы уверены, что хотите удалить смету «{deleteDialog.estimate?.name || deleteDialog.estimate?.estimate_number}»?
                        <br /><br />
                        Это действие нельзя отменить.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, estimate: null })}>Отмена</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">Удалить</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default EstimatesList;