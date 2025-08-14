import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, IconButton, Button,
    Paper, Stack, Avatar, Table, TableBody, TableCell, TableContainer, 
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
    Accordion, AccordionSummary, AccordionDetails, Divider, Alert
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Business as BusinessIcon,
    Receipt as ReceiptIcon,
    AttachMoney as AttachMoneyIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { api } from '../api/client';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU');
};

const getStatusColor = (statusName) => {
    switch (statusName) {
        case 'В работе': return 'primary';
        case 'Завершена': return 'success';
        case 'Черновик': return 'warning';
        case 'На согласовании': return 'info';
        case 'Отклонена': return 'error';
        default: return 'default';
    }
};

const ProjectFinanceDetail = ({ project, currentUser, onBack }) => {
    const [estimates, setEstimates] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [paymentDialog, setPaymentDialog] = useState({ open: false, type: '', estimateId: null });
    const [paymentForm, setPaymentForm] = useState({ amount: '', date: '', description: '', foreman: '' });
    const [mockPayments, setMockPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const isManager = currentUser.role === 'менеджер';

    useEffect(() => {
        fetchProjectData();
    }, [project]);

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            const estimatesData = await api.getEstimates();
            const projectEstimates = estimatesData.filter(est => est.project?.project_id === project.project_id);
            setEstimates(projectEstimates);
            
            // Генерируем mock данные для платежей/авансов
            generateMockPayments(projectEstimates);
        } catch (error) {
            console.error('Ошибка загрузки данных проекта:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateMockPayments = (projectEstimates) => {
        const payments = [];
        projectEstimates.forEach((estimate, index) => {
            if (estimate.totalAmount > 0) {
                // Добавляем mock аванс
                payments.push({
                    id: `advance_${estimate.estimate_id}_1`,
                    type: 'advance',
                    estimateId: estimate.estimate_id,
                    estimateName: estimate.estimate_number || `Смета ${estimate.estimate_id}`,
                    amount: Math.floor(estimate.totalAmount * 0.3),
                    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    description: 'Аванс за выполненные работы',
                    foreman: estimate.foreman?.full_name || 'Не назначен'
                });
                
                // Добавляем mock оплату (только для некоторых смет)
                if (Math.random() > 0.5) {
                    payments.push({
                        id: `payment_${estimate.estimate_id}_1`,
                        type: 'payment',
                        estimateId: estimate.estimate_id,
                        estimateName: estimate.estimate_number || `Смета ${estimate.estimate_id}`,
                        amount: Math.floor(estimate.totalAmount * 0.4),
                        date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
                        description: 'Оплата по завершению работ',
                        foreman: estimate.foreman?.full_name || 'Не назначен'
                    });
                }
            }
        });
        
        payments.sort((a, b) => new Date(b.date) - new Date(a.date));
        setMockPayments(payments);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleOpenPaymentDialog = (type, estimateId = null) => {
        setPaymentDialog({ open: true, type, estimateId });
        setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], description: '', foreman: '' });
    };

    const handleClosePaymentDialog = () => {
        setPaymentDialog({ open: false, type: '', estimateId: null });
        setPaymentForm({ amount: '', date: '', description: '', foreman: '' });
    };

    const handleSavePayment = () => {
        // В реальном приложении здесь был бы вызов API
        const newPayment = {
            id: `${paymentDialog.type}_${Date.now()}`,
            type: paymentDialog.type,
            estimateId: paymentDialog.estimateId,
            estimateName: paymentDialog.estimateId ? 
                estimates.find(e => e.estimate_id === paymentDialog.estimateId)?.estimate_number || `Смета ${paymentDialog.estimateId}` :
                'Общий платеж',
            amount: parseFloat(paymentForm.amount),
            date: new Date(paymentForm.date).toISOString(),
            description: paymentForm.description,
            foreman: paymentForm.foreman || currentUser.full_name
        };
        
        setMockPayments(prev => [newPayment, ...prev]);
        handleClosePaymentDialog();
    };

    // Расчеты финансов
    const totalEstimateAmount = estimates.reduce((sum, est) => sum + (est.totalAmount || 0), 0);
    const totalAdvances = mockPayments.filter(p => p.type === 'advance').reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = mockPayments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
    const totalDebt = totalEstimateAmount - totalAdvances - totalPayments;

    // Группировка прорабов
    const foremanStats = estimates.reduce((acc, est) => {
        const foremanName = est.foreman?.full_name || 'Не назначен';
        if (!acc[foremanName]) {
            acc[foremanName] = {
                name: foremanName,
                estimatesCount: 0,
                totalAmount: 0,
                advances: 0,
                payments: 0
            };
        }
        acc[foremanName].estimatesCount++;
        acc[foremanName].totalAmount += est.totalAmount || 0;
        
        // Добавляем авансы и платежи для этого прораба
        const foremanPayments = mockPayments.filter(p => p.foreman === foremanName);
        acc[foremanName].advances += foremanPayments.filter(p => p.type === 'advance').reduce((sum, p) => sum + p.amount, 0);
        acc[foremanName].payments += foremanPayments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
        
        return acc;
    }, {});

    const renderEstimatesTab = () => (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Сметы по объекту ({estimates.length})</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenPaymentDialog('advance')}
                    size="small"
                >
                    Добавить аванс
                </Button>
            </Box>
            
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>№</TableCell>
                            <TableCell>Название сметы</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell>Прораб</TableCell>
                            <TableCell align="right">Сумма</TableCell>
                            <TableCell align="right">Получено</TableCell>
                            <TableCell align="right">Долг</TableCell>
                            <TableCell align="center">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {estimates.map((estimate, index) => {
                            const estimatePayments = mockPayments.filter(p => p.estimateId === estimate.estimate_id);
                            const received = estimatePayments.reduce((sum, p) => sum + p.amount, 0);
                            const debt = (estimate.totalAmount || 0) - received;
                            
                            return (
                                <TableRow key={estimate.estimate_id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                            {estimate.estimate_number || `Смета ${estimate.estimate_id}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Создана: {formatDate(estimate.created_at)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={estimate.status_obj?.status_name || estimate.status || 'Неизвестно'}
                                            color={getStatusColor(estimate.status_obj?.status_name || estimate.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={<PersonIcon />}
                                            label={estimate.foreman?.full_name || 'Не назначен'}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {formatCurrency(estimate.totalAmount)} грн.
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                                            {formatCurrency(received)} грн.
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography 
                                            variant="body2" 
                                            color={debt > 0 ? 'error.main' : 'success.main'}
                                            sx={{ fontWeight: 'bold' }}
                                        >
                                            {formatCurrency(debt)} грн.
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1}>
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleOpenPaymentDialog('advance', estimate.estimate_id)}
                                                color="primary"
                                            >
                                                <AttachMoneyIcon />
                                            </IconButton>
                                            {isManager && (
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleOpenPaymentDialog('payment', estimate.estimate_id)}
                                                    color="success"
                                                >
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    const renderPaymentsTab = () => (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">История платежей ({mockPayments.length})</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenPaymentDialog('advance')}
                        size="small"
                    >
                        Аванс
                    </Button>
                    {isManager && (
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenPaymentDialog('payment')}
                            size="small"
                            color="success"
                        >
                            Оплата
                        </Button>
                    )}
                </Stack>
            </Box>
            
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Дата</TableCell>
                            <TableCell>Тип</TableCell>
                            <TableCell>Смета</TableCell>
                            <TableCell>Прораб</TableCell>
                            <TableCell>Описание</TableCell>
                            <TableCell align="right">Сумма</TableCell>
                            <TableCell align="center">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mockPayments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell>
                                    <Typography variant="body2">
                                        {formatDate(payment.date)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={payment.type === 'advance' ? 'Аванс' : 'Оплата'}
                                        color={payment.type === 'advance' ? 'info' : 'success'}
                                        size="small"
                                        icon={payment.type === 'advance' ? <ScheduleIcon /> : <CheckCircleIcon />}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {payment.estimateName}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        icon={<PersonIcon />}
                                        label={payment.foreman}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {payment.description}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography 
                                        variant="body2" 
                                        sx={{ fontWeight: 'bold' }}
                                        color={payment.type === 'advance' ? 'info.main' : 'success.main'}
                                    >
                                        {formatCurrency(payment.amount)} грн.
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    {isManager && (
                                        <Stack direction="row" spacing={1}>
                                            <IconButton size="small" color="primary">
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </Stack>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    const renderForemanTab = () => (
        <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
                Статистика по прорабам ({Object.keys(foremanStats).length})
            </Typography>
            
            <Grid container spacing={3}>
                {Object.values(foremanStats).map((foreman) => {
                    const debt = foreman.totalAmount - foreman.advances - foreman.payments;
                    return (
                        <Grid item xs={12} md={6} key={foreman.name}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                            <PersonIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                {foreman.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {foreman.estimatesCount} смет
                                            </Typography>
                                        </Box>
                                    </Box>
                                    
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2">Общая сумма:</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                {formatCurrency(foreman.totalAmount)} грн.
                                            </Typography>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2">Авансы:</Typography>
                                            <Typography variant="body2" color="info.main">
                                                {formatCurrency(foreman.advances)} грн.
                                            </Typography>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2">Оплаты:</Typography>
                                            <Typography variant="body2" color="success.main">
                                                {formatCurrency(foreman.payments)} грн.
                                            </Typography>
                                        </Box>
                                        
                                        <Divider />
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                Долг:
                                            </Typography>
                                            <Chip
                                                label={`${formatCurrency(debt)} грн.`}
                                                size="small"
                                                color={debt > 0 ? 'error' : 'success'}
                                                icon={debt > 0 ? <WarningIcon /> : <CheckCircleIcon />}
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Typography variant="h6">Загрузка данных...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Заголовок */}
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <IconButton onClick={onBack} sx={{ color: 'white' }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 56, height: 56 }}>
                        <BusinessIcon fontSize="large" />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                            {project.project_name}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {project.address || 'Адрес не указан'}
                        </Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* Финансовая сводка */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.main', color: 'white' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(totalEstimateAmount)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Общая сумма (грн.)
                        </Typography>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'info.main', color: 'white' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(totalAdvances)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Авансы (грн.)
                        </Typography>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'success.main', color: 'white' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(totalPayments)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Оплачено (грн.)
                        </Typography>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2, bgcolor: totalDebt > 0 ? 'error.main' : 'success.main', color: 'white' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(totalDebt)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {totalDebt > 0 ? 'Долг (грн.)' : 'Переплата (грн.)'}
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Вкладки */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Сметы" icon={<ReceiptIcon />} />
                    <Tab label="Платежи" icon={<AttachMoneyIcon />} />
                    {isManager && <Tab label="Прорабы" icon={<PersonIcon />} />}
                </Tabs>
            </Paper>

            {/* Контент вкладок */}
            <Box sx={{ mt: 3 }}>
                {tabValue === 0 && renderEstimatesTab()}
                {tabValue === 1 && renderPaymentsTab()}
                {tabValue === 2 && isManager && renderForemanTab()}
            </Box>

            {/* Диалог добавления платежа */}
            <Dialog open={paymentDialog.open} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Добавить {paymentDialog.type === 'advance' ? 'аванс' : 'оплату'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Сумма"
                            type="number"
                            fullWidth
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm(prev => ({...prev, amount: e.target.value}))}
                            InputProps={{ endAdornment: 'грн.' }}
                        />
                        
                        <TextField
                            label="Дата"
                            type="date"
                            fullWidth
                            value={paymentForm.date}
                            onChange={(e) => setPaymentForm(prev => ({...prev, date: e.target.value}))}
                            InputLabelProps={{ shrink: true }}
                        />
                        
                        <TextField
                            label="Описание"
                            fullWidth
                            multiline
                            rows={2}
                            value={paymentForm.description}
                            onChange={(e) => setPaymentForm(prev => ({...prev, description: e.target.value}))}
                        />
                        
                        {paymentDialog.estimateId && (
                            <Alert severity="info">
                                Платеж будет привязан к смете: {estimates.find(e => e.estimate_id === paymentDialog.estimateId)?.estimate_number || paymentDialog.estimateId}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePaymentDialog}>Отмена</Button>
                    <Button 
                        onClick={handleSavePayment} 
                        variant="contained"
                        disabled={!paymentForm.amount || !paymentForm.date}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProjectFinanceDetail;