import React, { useState } from 'react';
import {
    Paper, Typography, Box, TextField, Button, Stack, Divider, Chip, 
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, 
    DialogContent, DialogActions, DialogContentText, Grid
} from '@mui/material';
import { 
    ArrowBack as ArrowBackIcon, 
    Check as CheckIcon, 
    Close as CloseIcon,
    Gavel as GavelIcon 
} from '@mui/icons-material';
import { api } from '../api/client';

// Форматирование валюты в украинском формате
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
};

// Форматирование даты для отображения
const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleString('ru-RU');
};

// Определение цвета чипа статуса
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return 'warning';
        case 'approved': return 'success';
        case 'rejected': return 'error';
        case 'counter_offered': return 'info';
        default: return 'default';
    }
};

const PriceChangeRequestEditor = ({ request, onBack, onSave }) => {
    const [reviewData, setReviewData] = useState({
        status: request?.status || 'pending',
        reviewer_comment: request?.reviewer_comment || '',
        counter_price: request?.counter_price || ''
    });
    const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
    const [loading, setLoading] = useState(false);

    // Обработка изменения статуса
    const handleStatusChange = (newStatus) => {
        setReviewData(prev => ({
            ...prev,
            status: newStatus,
            // Очищаем counter_price если не встречное предложение
            counter_price: newStatus === 'counter_offered' ? prev.counter_price : ''
        }));
    };

    // Сохранение решения менеджера
    const handleSave = async () => {
        try {
            setLoading(true);
            
            // Валидация
            if (reviewData.status === 'counter_offered' && !reviewData.counter_price) {
                alert('При встречном предложении необходимо указать цену');
                return;
            }

            await api.updatePriceChangeRequest(request.request_id, reviewData);
            // После успешного обновления возвращаемся к списку
            onSave();
        } catch (error) {
            console.error('Ошибка при сохранении решения:', error);
            alert('Произошла ошибка при сохранении решения: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Обработка быстрых действий (одобрить/отклонить)
    const handleQuickAction = (action) => {
        setConfirmDialog({ open: true, action });
    };

    // Подтверждение быстрого действия
    const handleConfirmAction = async () => {
        const { action } = confirmDialog;
        let newReviewData = { ...reviewData };
        
        switch (action) {
            case 'approve':
                newReviewData.status = 'approved';
                if (!newReviewData.reviewer_comment) {
                    newReviewData.reviewer_comment = 'Запрос одобрен';
                }
                break;
            case 'reject':
                newReviewData.status = 'rejected';
                if (!newReviewData.reviewer_comment) {
                    newReviewData.reviewer_comment = 'Запрос отклонен';
                }
                break;
        }
        
        setReviewData(newReviewData);
        setConfirmDialog({ open: false, action: null });
        
        // Автоматически сохраняем для быстрых действий
        try {
            setLoading(true);
            await api.updatePriceChangeRequest(request.request_id, newReviewData);
            // После успешного обновления возвращаемся к списку
            onSave();
        } catch (error) {
            console.error('Ошибка при сохранении решения:', error);
            alert('Произошла ошибка при сохранении решения: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Отмена подтверждения
    const handleCancelConfirm = () => {
        setConfirmDialog({ open: false, action: null });
    };

    if (!request) {
        return (
            <Paper sx={{ p: 3 }}>
                <Typography>Запрос не найден</Typography>
            </Paper>
        );
    }

    const isPending = request.status === 'pending';
    const canEdit = isPending;

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={onBack}
                    sx={{ mr: 2 }}
                >
                    Назад к списку
                </Button>
                <Typography variant="h5">
                    Запрос на изменение цены
                </Typography>
                <Box sx={{ ml: 'auto' }}>
                    <Chip 
                        label={request.status_display} 
                        color={getStatusColor(request.status)}
                        size="medium"
                    />
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Информация о запросе */}
                <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: 'fit-content' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Информация о запросе
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Смета:</Typography>
                                <Typography variant="body1">{request.estimate_name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Работа:</Typography>
                                <Typography variant="body1">{request.work_name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Прораб:</Typography>
                                <Typography variant="body1">{request.requester_name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Дата создания:</Typography>
                                <Typography variant="body1">{formatDate(request.created_at)}</Typography>
                            </Box>
                            {request.reviewed_at && (
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Дата рассмотрения:</Typography>
                                    <Typography variant="body1">{formatDate(request.reviewed_at)}</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Ценовая информация */}
                <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: 'fit-content' }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Ценовая информация
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Текущая цена:</Typography>
                                <Typography variant="h6">{formatCurrency(request.current_price)} грн.</Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Запрошенная цена:</Typography>
                                <Typography variant="h6" color="primary.main">
                                    {formatCurrency(request.requested_price)} грн.
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Разница:</Typography>
                                <Typography 
                                    variant="h6" 
                                    color={request.requested_price > request.current_price ? 'error.main' : 'success.main'}
                                >
                                    {request.requested_price > request.current_price ? '+' : ''}
                                    {formatCurrency(request.requested_price - request.current_price)} грн.
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>

                {/* Комментарий прораба */}
                <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Комментарий прораба
                        </Typography>
                        <Typography variant="body1">
                            {request.comment || 'Комментарий не указан'}
                        </Typography>
                    </Paper>
                </Grid>

                {/* Форма рассмотрения */}
                <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            {canEdit ? 'Рассмотрение запроса' : 'Решение менеджера'}
                        </Typography>
                        
                        <Stack spacing={3}>
                            <FormControl fullWidth>
                                <InputLabel>Решение</InputLabel>
                                <Select
                                    value={reviewData.status}
                                    label="Решение"
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <MenuItem value="pending">Ожидает рассмотрения</MenuItem>
                                    <MenuItem value="approved">Одобрить</MenuItem>
                                    <MenuItem value="rejected">Отклонить</MenuItem>
                                    <MenuItem value="counter_offered">Встречное предложение</MenuItem>
                                </Select>
                            </FormControl>

                            {reviewData.status === 'counter_offered' && (
                                <TextField
                                    label="Встречная цена (грн)"
                                    type="number"
                                    step="0.01"
                                    value={reviewData.counter_price}
                                    onChange={(e) => setReviewData(prev => ({ ...prev, counter_price: e.target.value }))}
                                    disabled={!canEdit}
                                    fullWidth
                                    required
                                />
                            )}

                            <TextField
                                label="Комментарий менеджера"
                                multiline
                                rows={4}
                                value={reviewData.reviewer_comment}
                                onChange={(e) => setReviewData(prev => ({ ...prev, reviewer_comment: e.target.value }))}
                                disabled={!canEdit}
                                fullWidth
                                placeholder="Оставьте комментарий к вашему решению..."
                            />
                            
                            {canEdit && (
                                <>
                                    <Divider />
                                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                        {/* Быстрые действия */}
                                        <Button 
                                            variant="contained" 
                                            color="success"
                                            startIcon={<CheckIcon />}
                                            onClick={() => handleQuickAction('approve')}
                                            disabled={loading}
                                        >
                                            Одобрить
                                        </Button>
                                        <Button 
                                            variant="contained" 
                                            color="error"
                                            startIcon={<CloseIcon />}
                                            onClick={() => handleQuickAction('reject')}
                                            disabled={loading}
                                        >
                                            Отклонить
                                        </Button>
                                        <Button 
                                            variant="outlined"
                                            startIcon={<GavelIcon />}
                                            onClick={handleSave}
                                            disabled={loading}
                                        >
                                            Сохранить решение
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Диалог подтверждения */}
            <Dialog open={confirmDialog.open} onClose={handleCancelConfirm}>
                <DialogTitle>
                    Подтвердите действие
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {confirmDialog.action === 'approve' && 
                            'Вы уверены, что хотите одобрить данный запрос на изменение цены?'}
                        {confirmDialog.action === 'reject' && 
                            'Вы уверены, что хотите отклонить данный запрос на изменение цены?'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelConfirm}>Отмена</Button>
                    <Button 
                        onClick={handleConfirmAction}
                        variant="contained"
                        color={confirmDialog.action === 'approve' ? 'success' : 'error'}
                    >
                        {confirmDialog.action === 'approve' ? 'Одобрить' : 'Отклонить'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default PriceChangeRequestEditor;