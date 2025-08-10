
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Box, Typography, Select, MenuItem, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
    Chip, IconButton, FormControl, InputLabel, useMediaQuery, useTheme, Stack, Dialog, DialogTitle, DialogContent, DialogActions, ButtonGroup
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as VisibilityIcon, Business as BusinessIcon } from '@mui/icons-material';

const getStatusColor = (status) => {
    switch (status) {
        case 'В работе': return 'primary';
        case 'Завершена': return 'success';
        case 'Черновик': return 'warning';
        case 'На согласование': return 'info';
        default: return 'default';
    }
};

const formatAmount = (amount, currency) => {
    const formattedNumber = new Intl.NumberFormat('ru-RU').format(amount || 0);
    return `${formattedNumber} ${currency}`;
};

const EstimatesList = ({ currentUser, allUsers, objects, allObjects, estimates, onCreateEstimate, onEditEstimate, onNavigateToProjects }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [selectedObjectId, setSelectedObjectId] = useState(objects[0]?.project_id || '');
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [creationObjectId, setCreationObjectId] = useState('');

    // Обновляем selectedObjectId, если список объектов изменился (например, при смене роли)
    useEffect(() => {
        setSelectedObjectId(objects[0]?.project_id || '');
    }, [objects]);

    const handleOpenCreateDialog = () => {
        setCreationObjectId(allObjects[0]?.project_id || '');
        setCreateDialogOpen(true);
    };

    const handleConfirmCreate = () => {
        onCreateEstimate(creationObjectId);
        setCreateDialogOpen(false);
    };

    const filteredEstimates = useMemo(() => {
        if (currentUser.role === 'менеджер') return estimates;
        return estimates.filter(e => e.objectId === selectedObjectId);
    }, [selectedObjectId, estimates, currentUser.role]);

    const renderManagerView = () => (
        <TableContainer>
            <Table>
                <TableHead><TableRow><TableCell>Название сметы</TableCell><TableCell>Объект</TableCell><TableCell>Прораб</TableCell><TableCell>Статус</TableCell><TableCell>Сумма</TableCell></TableRow></TableHead>
                <TableBody>
                    {filteredEstimates.map((estimate) => (
                        <TableRow key={estimate.estimate_id} hover sx={{ cursor: 'pointer' }} onClick={() => onEditEstimate(estimate)}>
                            <TableCell>{estimate.name}</TableCell>
                            <TableCell>{allObjects.find(o => o.project_id === estimate.objectId)?.project_name || '-'}</TableCell>
                            <TableCell>{allUsers.find(u => u.user_id === estimate.foreman_id)?.full_name || 'Не назначен'}</TableCell>
                            <TableCell><Chip label={estimate.status} color={getStatusColor(estimate.status)} size="small" /></TableCell>
                            <TableCell>{formatAmount(estimate.totalAmount, estimate.currency)}</TableCell>
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
                    {filteredEstimates.map((estimate) => (
                        <TableRow key={estimate.estimate_id} hover sx={{ cursor: 'pointer' }} onClick={() => onEditEstimate(estimate)}>
                            <TableCell>{estimate.name}</TableCell>
                            <TableCell><Chip label={estimate.status} color={getStatusColor(estimate.status)} size="small" /></TableCell>
                            <TableCell>{estimate.createdDate}</TableCell>
                            <TableCell>{formatAmount(estimate.totalAmount, estimate.currency)}</TableCell>
                            <TableCell align="right"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditEstimate(estimate); }}><EditIcon fontSize="small" /></IconButton></TableCell>
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
                                {objects.map(obj => (<MenuItem key={obj.project_id} value={obj.project_id}>{obj.project_name}</MenuItem>))}
                            </Select>
                        </FormControl>
                    )}
                    <Button fullWidth={isMobile} variant="contained" startIcon={<AddIcon />} onClick={currentUser.role === 'менеджер' ? handleOpenCreateDialog : () => onCreateEstimate(selectedObjectId)}>
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
                            {allObjects.map(obj => (<MenuItem key={obj.project_id} value={obj.project_id}>{obj.project_name}</MenuItem>))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
                    <Button onClick={handleConfirmCreate} variant="contained">Продолжить</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default EstimatesList;
