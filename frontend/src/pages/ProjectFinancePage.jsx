import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, IconButton, Button,
    Paper, Stack, Avatar, Tooltip, LinearProgress, Fade
} from '@mui/material';
import {
    Business as BusinessIcon,
    AccountBalance as AccountBalanceIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    Person as PersonIcon,
    Receipt as ReceiptIcon,
    AttachMoney as AttachMoneyIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { api } from '../api/client';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
};

const getDebtColor = (debt) => {
    if (debt > 50000) return 'error';
    if (debt > 10000) return 'warning';
    return 'success';
};

const ProjectFinancePage = ({ currentUser, onSelectProject }) => {
    const [projects, setProjects] = useState([]);
    const [estimates, setEstimates] = useState([]);
    const [loading, setLoading] = useState(true);

    const isManager = currentUser.role === 'менеджер';

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projectsData, estimatesData] = await Promise.all([
                api.getProjects(),
                api.getEstimates()
            ]);
            setProjects(projectsData);
            setEstimates(estimatesData);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    };

    // Группировка смет по проектам
    const getProjectStats = (projectId) => {
        const projectEstimates = estimates.filter(est => est.project?.project_id === projectId);
        
        const totalEstimates = projectEstimates.length;
        const completedEstimates = projectEstimates.filter(est => est.status?.status_name === 'Завершена').length;
        const totalAmount = projectEstimates.reduce((sum, est) => sum + (est.totalAmount || 0), 0);
        
        // Имитация данных для авансов и оплат (в реальном проекте будут из API)
        const mockAdvances = Math.floor(totalAmount * 0.3); // 30% от суммы как аванс
        const mockPayments = Math.floor(totalAmount * 0.2); // 20% как оплаты
        const debt = totalAmount - mockAdvances - mockPayments;
        
        return {
            totalEstimates,
            completedEstimates,
            totalAmount,
            advances: mockAdvances,
            payments: mockPayments,
            debt: Math.max(0, debt)
        };
    };

    // Получение назначенных прорабов для проекта (для менеджера)
    const getProjectForemen = (projectId) => {
        const projectEstimates = estimates.filter(est => est.project?.project_id === projectId);
        const foremen = [...new Set(projectEstimates.map(est => est.foreman?.full_name).filter(Boolean))];
        return foremen;
    };

    const renderProjectCard = (project) => {
        const stats = getProjectStats(project.project_id);
        const foremen = isManager ? getProjectForemen(project.project_id) : [];
        const completionRate = stats.totalEstimates > 0 ? (stats.completedEstimates / stats.totalEstimates) * 100 : 0;

        return (
            <Fade in={true} key={project.project_id} timeout={300}>
                <Grid item xs={12} sm={6} lg={4}>
                    <Card 
                        sx={{ 
                            height: '100%',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease-in-out',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6,
                                background: 'linear-gradient(135deg, #2c2c2c 0%, #1e1e1e 100%)'
                            },
                            background: 'linear-gradient(135deg, #1e1e1e 0%, #2c2c2c 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        onClick={() => onSelectProject(project)}
                    >
                        <CardContent>
                            {/* Заголовок проекта */}
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                    <BusinessIcon />
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }} noWrap>
                                        {project.project_name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {project.address || 'Адрес не указан'}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Прогресс выполнения */}
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Прогресс выполнения
                                    </Typography>
                                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                        {Math.round(completionRate)}%
                                    </Typography>
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={completionRate} 
                                    sx={{ 
                                        height: 8, 
                                        borderRadius: 4,
                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: completionRate > 70 ? '#4caf50' : completionRate > 30 ? '#ff9800' : '#f44336'
                                        }
                                    }} 
                                />
                            </Box>

                            {/* Статистика смет */}
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={1} justifyContent="center">
                                    <Chip 
                                        icon={<ReceiptIcon />} 
                                        label={`${stats.totalEstimates} смет`} 
                                        size="small" 
                                        variant="outlined"
                                    />
                                    <Chip 
                                        icon={<TrendingUpIcon />} 
                                        label={`${stats.completedEstimates} готово`} 
                                        size="small" 
                                        color="success"
                                        variant="outlined"
                                    />
                                </Stack>
                            </Box>

                            {/* Финансовая информация */}
                            <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', mb: 2 }}>
                                <Stack spacing={1}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Общая сумма:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {formatCurrency(stats.totalAmount)} грн.
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Получено авансов:
                                        </Typography>
                                        <Typography variant="body2" color="info.main">
                                            {formatCurrency(stats.advances)} грн.
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Оплачено:
                                        </Typography>
                                        <Typography variant="body2" color="success.main">
                                            {formatCurrency(stats.payments)} грн.
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            Долг:
                                        </Typography>
                                        <Chip
                                            label={`${formatCurrency(stats.debt)} грн.`}
                                            size="small"
                                            color={getDebtColor(stats.debt)}
                                            icon={stats.debt > 0 ? <WarningIcon /> : <AttachMoneyIcon />}
                                        />
                                    </Box>
                                </Stack>
                            </Paper>

                            {/* Назначенные прорабы (только для менеджера) */}
                            {isManager && foremen.length > 0 && (
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Прорабы:
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {foremen.slice(0, 2).map((foreman, index) => (
                                            <Chip
                                                key={index}
                                                icon={<PersonIcon />}
                                                label={foreman}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ))}
                                        {foremen.length > 2 && (
                                            <Chip
                                                label={`+${foremen.length - 2}`}
                                                size="small"
                                                variant="outlined"
                                            />
                                        )}
                                    </Stack>
                                </Box>
                            )}

                            {/* Время последнего обновления */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} color="action" />
                                <Typography variant="caption" color="text.secondary">
                                    Последнее обновление: сегодня
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Fade>
        );
    };

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
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 56, height: 56 }}>
                        <AccountBalanceIcon fontSize="large" />
                    </Avatar>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                            Финансы по объектам
                        </Typography>
                        <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {isManager ? 
                                'Полная финансовая отчетность по всем объектам' : 
                                'Финансовая информация по назначенным объектам'
                            }
                        </Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* Статистика */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                            <BusinessIcon />
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {projects.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isManager ? 'Всего объектов' : 'Назначенных объектов'}
                        </Typography>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                            <ReceiptIcon />
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {estimates.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Всего смет
                        </Typography>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                            <AttachMoneyIcon />
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(estimates.reduce((sum, est) => sum + (est.totalAmount || 0), 0))}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Общий объем (грн.)
                        </Typography>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                        <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                            <WarningIcon />
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            {projects.filter(p => getProjectStats(p.project_id).debt > 0).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Объектов с долгами
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Список проектов */}
            {projects.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        {isManager ? 'Нет доступных объектов' : 'Нет назначенных объектов'}
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {projects.map(renderProjectCard)}
                </Grid>
            )}
        </Box>
    );
};

export default ProjectFinancePage;