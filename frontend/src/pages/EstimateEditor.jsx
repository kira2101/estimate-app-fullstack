import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Box, Typography, Button, Paper, TextField, Select, MenuItem, Chip, Accordion, AccordionSummary, AccordionDetails, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, DialogContentText, FormControl, InputLabel, Stack
} from '@mui/material';
import { 
    ArrowBack as ArrowBackIcon, Save as SaveIcon, Settings as SettingsIcon, Delete as DeleteIcon, Add as AddIcon, 
    Article as ArticleIcon
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TransferList from '../components/TransferList';

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

const EstimateEditor = ({ estimate, categories, works, statuses, foremen, users, onBack, onSave }) => {
    const [estimateData, setEstimateData] = useState({ name: '', status: '', items: [], foreman_id: '' });
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [autocompleteResetKey, setAutocompleteResetKey] = useState(0);
    const [dialogLeft, setDialogLeft] = useState([]);
    const [dialogRight, setDialogRight] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, categoryId: null });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const nameInputRef = useRef(null);
    
    // Ключ для localStorage (уникальный для каждой сметы)
    const getStorageKey = () => {
        return estimate?.estimate_id 
            ? `estimate_draft_${estimate.estimate_id}`
            : `estimate_draft_new`;
    };
    
    // Сохранение в localStorage
    const saveDraftToStorage = (data, categories) => {
        try {
            const draftData = {
                estimateData: data,
                selectedCategories: categories,
                timestamp: Date.now(),
                originalEstimate: estimate
            };
            localStorage.setItem(getStorageKey(), JSON.stringify(draftData));
        } catch (error) {
            console.error('Failed to save draft to localStorage:', error);
        }
    };
    
    // Восстановление из localStorage
    const loadDraftFromStorage = () => {
        try {
            const saved = localStorage.getItem(getStorageKey());
            if (saved) {
                const draftData = JSON.parse(saved);
                // Проверяем, что данные не старше 24 часов
                if (Date.now() - draftData.timestamp < 24 * 60 * 60 * 1000) {
                    return draftData;
                } else {
                    // Удаляем устаревшие данные
                    localStorage.removeItem(getStorageKey());
                }
            }
        } catch (error) {
            console.error('Failed to load draft from localStorage:', error);
        }
        return null;
    };
    
    // Очистка localStorage
    const clearDraftFromStorage = () => {
        localStorage.removeItem(getStorageKey());
        setHasUnsavedChanges(false);
    };

    const handleCloseDialog = () => {
        setSelectedCategories(dialogRight);
        setCategoryDialogOpen(false);
    };

    useEffect(() => {
        if (estimate) {
            const savedDraft = loadDraftFromStorage();
            if (savedDraft && savedDraft.originalEstimate?.estimate_id === estimate.estimate_id) {
                setEstimateData(savedDraft.estimateData);
                setSelectedCategories(savedDraft.selectedCategories);
                setHasUnsavedChanges(true);
            } else {
                // 1. Обогащаем работы из бэкенда данными, нужными для UI
                const augmentedItems = (estimate.items || []).map(item => {
                    const workDetails = works.find(w => w.work_type_id === item.work_type);
                    return {
                        ...item,
                        categoryId: workDetails?.category?.category_id,
                        prices: workDetails?.prices, // для отображения цены в полях
                        total: parseFloat(item.cost_price_per_unit) * parseFloat(item.quantity),
                    };
                });

                // 2. Устанавливаем состояние данных сметы
                setEstimateData({
                    ...estimate,
                    name: estimate.name || estimate.estimate_number || '',
                    status: estimate.status?.status_id || estimate.status,
                    foreman_id: estimate.foreman?.user_id || estimate.foreman_id || '',
                    items: augmentedItems, // Используем обогащенные данные
                });

                // 3. Правильно определяем начальные категории
                const initialCategories = augmentedItems.length > 0
                    ? [...new Set(augmentedItems.map(i => i.categoryId).filter(id => id !== undefined))]
                    : [];
                setSelectedCategories(initialCategories);
                setHasUnsavedChanges(false);
            }
        } else {
            const savedDraft = loadDraftFromStorage();
            if (savedDraft && !savedDraft.originalEstimate?.estimate_id) {
                setEstimateData(savedDraft.estimateData);
                setSelectedCategories(savedDraft.selectedCategories);
                setHasUnsavedChanges(true);
            } else {
                const draftStatus = statuses.find(s => s.status_name === 'Черновик');
                setEstimateData({
                    name: '',
                    status: draftStatus?.status_id || '',
                    items: [],
                });
                setSelectedCategories([]);
                setHasUnsavedChanges(false);
            }
        }
    }, [estimate, statuses, works]);

    // useEffect для фокуса на поле названия при необходимости
    useEffect(() => {
        if (estimate && estimate.needsName && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [estimate]);
    
    // useEffect для автосохранения при изменении данных
    useEffect(() => {
        if (estimateData.name || estimateData.items?.length > 0 || selectedCategories.length > 0) {
            saveDraftToStorage(estimateData, selectedCategories);
            setHasUnsavedChanges(true);
        }
    }, [estimateData, selectedCategories]);
    
    // Обработчик beforeunload для предупреждения о несохраненных изменениях
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const performDeleteCategory = (catId) => {
        setSelectedCategories(prev => prev.filter(id => id !== catId));
        setEstimateData(prev => ({ ...prev, items: prev.items.filter(i => i.categoryId !== catId) }));
    };

    const handleCategoryDeleteClick = (catId) => {
        const itemsInCategory = (estimateData.items || []).filter(i => i.categoryId === catId);
        if (itemsInCategory.length > 0) {
            setConfirmDelete({ open: true, categoryId: catId });
        } else {
            performDeleteCategory(catId);
        }
    };

    const handleConfirmDelete = () => {
        if (confirmDelete.categoryId) {
            performDeleteCategory(confirmDelete.categoryId);
        }
        setConfirmDelete({ open: false, categoryId: null });
    };

    // Обработчик безопасной навигации с проверкой несохраненных изменений
    const handleSafeBack = () => {
        if (hasUnsavedChanges) {
            setPendingAction(() => onBack);
            setShowUnsavedDialog(true);
        } else {
            onBack();
        }
    };
    
    // Обработчик сохранения с очисткой localStorage
    const handleSaveWithCleanup = () => {
        clearDraftFromStorage();
        onSave(estimateData);
    };
    
    // Обработчики диалога несохраненных изменений
    const handleSaveAndContinue = () => {
        setShowUnsavedDialog(false);
        clearDraftFromStorage();
        onSave(estimateData);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };
    
    const handleDiscardChanges = () => {
        setShowUnsavedDialog(false);
        clearDraftFromStorage();
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };
    
    const handleCancelNavigation = () => {
        setShowUnsavedDialog(false);
        setPendingAction(null);
    };

    const handleOpenCategoryDialog = () => { setDialogRight(selectedCategories); setDialogLeft(categories.map(c => c.category_id).filter(cId => !selectedCategories.includes(cId))); setCategoryDialogOpen(true); };
    const handleAddItem = (categoryId, work) => {
        if (!work || !work.work_type_id) return;

        // Создаем новый элемент сметы со структурой, максимально похожей
        // на ту, что приходит с бэкенда.
        const newItem = {
            item_id: `new_${work.work_type_id}_${Date.now()}`, // Временный ID для ключей React
            work_type: work.work_type_id, // <- Сохраняем ID работы
            work_name: work.work_name,
            unit_of_measurement: work.unit_of_measurement,
            quantity: 1,
            cost_price_per_unit: work.prices.cost_price,
            client_price_per_unit: work.prices.client_price,
            
            // Вспомогательные поля для UI
            prices: work.prices, // Сохраняем для отображения в полях, которые могут быть disabled
            categoryId: categoryId, // Для фильтрации по категориям в UI
            total: parseFloat(work.prices.cost_price) // Начальная общая стоимость
        };

        setEstimateData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        setAutocompleteResetKey(prev => prev + 1);
    };
    const handleRemoveItem = (itemId) => { setEstimateData(prev => ({ ...prev, items: prev.items.filter(i => i.item_id !== itemId) })); };
    const handleQuantityChange = (itemId, quantity) => { const numQuantity = Number(quantity); if (numQuantity < 0) return; setEstimateData(prev => ({ ...prev, items: prev.items.map(i => i.item_id === itemId ? { ...i, quantity: numQuantity, total: i.prices.cost_price * numQuantity } : i) })); };
    const totalAmount = useMemo(() => (estimateData.items || []).reduce((sum, item) => sum + item.total, 0), [estimateData.items]);

    const renderWorkItem = (item, catId) => (
        <Paper key={item.item_id || item.work_type_id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
            <Typography variant="body1">{item.work_name}</Typography>
            <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                <Grid item xs={6}><TextField label="Цена за ед." size="small" fullWidth value={item.prices?.cost_price || ''} disabled /></Grid>
                <Grid item xs={6}><TextField label="Ед. изм." size="small" fullWidth value={item.unit_of_measurement || ''} disabled /></Grid>
                <Grid item xs={8}><TextField label="Количество" type="number" size="small" fullWidth value={item.quantity || ''} onChange={e => handleQuantityChange(item.item_id, e.target.value)} /></Grid>
                <Grid item xs={4} sx={{textAlign: 'right'}}><IconButton onClick={() => handleRemoveItem(item.item_id)}><DeleteIcon /></IconButton></Grid>
            </Grid>
            <Typography align="right" sx={{mt:1, fontWeight:'bold'}}>Сумма: {new Intl.NumberFormat('ru-RU').format(item.total || 0)} грн.</Typography>
        </Paper>
    );

    const renderCategoryAccordion = (catId) => {
        const category = categories.find(c => c.category_id === catId);
        if (!category) return null;
        const itemsInCategory = (estimateData.items || []).filter(i => i.categoryId === catId);
        const categoryTotal = itemsInCategory.reduce((sum, item) => sum + item.total, 0);
        const addedWorkIds = new Set(itemsInCategory.map(i => i.work_type_id));
        const allCategoryWorks = (works || []).filter(w => w.category && w.category.category_id === catId);
        const availableWorks = allCategoryWorks.filter(w => !addedWorkIds.has(w.work_type_id));
        const popularWorks = availableWorks.filter(w => w.popular);

        return (
            <Accordion key={catId} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Box sx={{display: 'flex', alignItems: 'center', width: '100%'}}><Typography sx={{ flexGrow: 1 }}>{category.category_name}</Typography><Typography sx={{ mr: 2, color: 'text.secondary' }}>{new Intl.NumberFormat('ru-RU').format(categoryTotal)} грн.</Typography><Box component="span" role="button" onClick={(e) => {e.stopPropagation(); handleCategoryDeleteClick(catId);}} sx={{ p: 1, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}><DeleteIcon fontSize="small" /></Box></Box></AccordionSummary>
                <AccordionDetails sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary">Доступные работы:</Typography>
                    <Autocomplete id={`autocomplete-${catId}`} key={`${catId}-${autocompleteResetKey}`} options={availableWorks} getOptionLabel={(option) => option?.work_name || ''} renderInput={(params) => <TextField {...params} label="Поиск работ..." size="small" />} onChange={(event, newValue) => { if (newValue) handleAddItem(catId, newValue); }} sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary">Популярные работы:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>{popularWorks.slice(0, 5).map(work => (<Button key={work.work_type_id} variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleAddItem(catId, work)}>{work.work_name}</Button>))}</Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{mt: 3}}>Наименование:</Typography>
                    <Stack spacing={1} sx={{mt: 1}}>{itemsInCategory.map(item => <div key={item.item_id || item.work_type_id}>{renderWorkItem(item, catId)}</div>)}</Stack>
                </AccordionDetails>
            </Accordion>
        );
    };

    return (
        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={handleSafeBack}>Список смет</Button>
                    {estimate && estimate.project && (
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            Объект: {estimate.project.project_name || estimate.project.name || 'Неизвестный объект'}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1}}><Button variant="outlined" startIcon={<SettingsIcon />} onClick={handleOpenCategoryDialog}>Редактировать категории</Button><Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveWithCleanup}>Сохранить</Button></Box>
            </Box>
                        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={8}>
                    <TextField 
                        fullWidth 
                        label="Название сметы" 
                        value={estimateData.name || ''} 
                        onChange={e => setEstimateData(p => ({...p, name: e.target.value}))} 
                        inputRef={nameInputRef}
                    />
                </Grid>
                <Grid item xs={6} sm={2}>
                    <FormControl fullWidth>
                        <InputLabel>Статус</InputLabel>
                        <Select value={estimateData.status || ''} label="Статус" onChange={e => setEstimateData(p => ({...p, status: e.target.value}))}>
                            {statuses.map(s => (<MenuItem key={s.status_id} value={s.status_id}>{s.status_name}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6} sm={2}>
                    <Chip label={statuses.find(s => s.status_id === estimateData.status)?.status_name || ''} color={getStatusColor(statuses.find(s => s.status_id === estimateData.status)?.status_name || '')} sx={{width: '100%'}} />
                </Grid>
            </Grid>
            <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText', borderRadius: 1, mb: 3 }}><Typography variant="h5">Общая стоимость: {new Intl.NumberFormat('ru-RU').format(totalAmount)} грн.</Typography></Box>
            {selectedCategories.map(catId => renderCategoryAccordion(catId))}
            
            <Paper variant="outlined" sx={{mt: 4, p: 2, backgroundColor: 'rgba(0,0,0,0.2)'}}>
                <Typography variant="h5" gutterBottom>Сводка по всем работам</Typography>
                <TableContainer><Table><TableHead><TableRow><TableCell>Категория</TableCell><TableCell>Наименование</TableCell><TableCell>Ед. изм.</TableCell><TableCell>Цена</TableCell><TableCell>Кол-во</TableCell><TableCell>Сумма</TableCell></TableRow></TableHead><TableBody>{(estimateData.items || []).map(item => (<TableRow key={item.item_id || item.work_type_id}><TableCell>{categories.find(c => c.category_id === item.categoryId)?.category_name}</TableCell><TableCell>{item.work_name}</TableCell><TableCell>{item.unit_of_measurement}</TableCell><TableCell>{item.prices?.cost_price}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.total}</TableCell></TableRow>))}<TableRow sx={{'& td': {border: 0, fontWeight: 'bold'}}}><TableCell colSpan={5} align="right">ОБЩАЯ СУММА:</TableCell><TableCell>{new Intl.NumberFormat('ru-RU').format(totalAmount)} грн.</TableCell></TableRow></TableBody></Table></TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2}}><Button variant="outlined" startIcon={<ArticleIcon />}>Экспорт</Button></Box>
            </Paper>

            <Dialog open={isCategoryDialogOpen} onClose={handleCloseDialog} maxWidth="md"><DialogTitle>Настройка категорий</DialogTitle><DialogContent><TransferList left={dialogLeft} setLeft={setDialogLeft} right={dialogRight} setRight={setDialogRight} allItems={categories} /></DialogContent><DialogActions><Button onClick={handleCloseDialog}>Готово</Button></DialogActions></Dialog>
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, categoryId: null })}><DialogTitle>Подтвердите удаление</DialogTitle><DialogContent><DialogContentText>В этой категории есть добавленные работы. Вы уверены, что хотите удалить категорию и все связанные с ней работы из сметы?</DialogContentText></DialogContent><DialogActions><Button onClick={() => setConfirmDelete({ open: false, categoryId: null })}>Отмена</Button><Button onClick={handleConfirmDelete} color="error">Да, удалить</Button></DialogActions></Dialog>
            
            {/* Диалог несохраненных изменений */}
            <Dialog open={showUnsavedDialog} onClose={handleCancelNavigation}>
                <DialogTitle>Несохраненные изменения</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        У вас есть несохраненные изменения в смете. Что вы хотите сделать?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ gap: 1 }}>
                    <Button onClick={handleCancelNavigation}>
                        Остаться
                    </Button>
                    <Button onClick={handleDiscardChanges} color="error">
                        Не сохранять
                    </Button>
                    <Button onClick={handleSaveAndContinue} variant="contained">
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default EstimateEditor;
