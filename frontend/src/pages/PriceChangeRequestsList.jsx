import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, IconButton, CircularProgress, Alert
} from '@mui/material';
import { Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
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

const PriceChangeRequestsList = ({ onEditRequest }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Загрузка списка запросов на изменение цен
    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await api.getPriceChangeRequests();
            setRequests(data);
            setError(null);
        } catch (error) {
            console.error('Ошибка при загрузке запросов на изменение цен:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Ошибка при загрузке запросов: {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ mb: 3 }}>
                Запросы на изменение цен
            </Typography>
            
            {requests.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                        Нет запросов на изменение цен
                    </Typography>
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Смета</TableCell>
                                <TableCell>Работа</TableCell>
                                <TableCell>Прораб</TableCell>
                                <TableCell>Текущая цена</TableCell>
                                <TableCell>Запрошенная цена</TableCell>
                                <TableCell>Комментарий</TableCell>
                                <TableCell>Статус</TableCell>
                                <TableCell>Дата создания</TableCell>
                                <TableCell>Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests.map((request) => (
                                <TableRow key={request.request_id} hover>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {request.estimate_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {request.work_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {request.requester_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatCurrency(request.current_price)} грн.
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="primary.main">
                                            {formatCurrency(request.requested_price)} грн.
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {request.comment}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={request.status_display} 
                                            color={getStatusColor(request.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDate(request.created_at)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {request.status === 'pending' ? (
                                            <IconButton 
                                                size="small" 
                                                onClick={() => onEditRequest(request)}
                                                color="primary"
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        ) : (
                                            <IconButton 
                                                size="small" 
                                                onClick={() => onEditRequest(request)}
                                                color="default"
                                            >
                                                <VisibilityIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default PriceChangeRequestsList;