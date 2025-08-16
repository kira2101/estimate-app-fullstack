import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Box, Typography, Button, Paper, TextField, Select, MenuItem, Chip, Accordion, AccordionSummary, AccordionDetails, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, DialogContentText, FormControl, InputLabel, Stack, Divider
} from '@mui/material';
import { 
    ArrowBack as ArrowBackIcon, Save as SaveIcon, Settings as SettingsIcon, Delete as DeleteIcon, Add as AddIcon, 
    Article as ArticleIcon, TrendingUp as TrendingUpIcon, FileDownload as FileDownloadIcon, 
    BusinessCenter as BusinessCenterIcon, Assignment as AssignmentIcon
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TransferList from '../components/TransferList';
import { api } from '../api/client';

// Утилитарная функция для безопасного обеспечения массива
const ensureArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
    return [];
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
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

const EstimateEditor = ({ estimate, categories, works, statuses, onBack, onSave, currentUser }) => {
    const [estimateData, setEstimateData] = useState({ name: '', status: '', items: [] });
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
    const [exportLoading, setExportLoading] = useState(false);
    const [exportConfirmDialog, setExportConfirmDialog] = useState({ open: false, type: null });
    const [searchValue, setSearchValue] = useState(null);
    const [searchInputValue, setSearchInputValue] = useState('');

    const isManager = currentUser.role === 'менеджер';

    // Отладочная информация
    useEffect(() => {
        if (works) {
            const worksByCategory = works.reduce((acc, work) => {
                const catName = work.category?.category_name || 'Без категории';
                acc[catName] = (acc[catName] || 0) + 1;
                return acc;
            }, {});
            console.log('EstimateEditor получил работ:', works.length);
            console.log('Работы по категориям в EstimateEditor:', worksByCategory);
        }
    }, [works]);

    // --- Логика черновиков ---
    const getStorageKey = () => estimate?.estimate_id ? `estimate_draft_${estimate.estimate_id}` : `estimate_draft_new`;
    const saveDraftToStorage = (data, categories) => {
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify({ estimateData: data, selectedCategories, timestamp: Date.now(), originalEstimate: estimate }));
        } catch (error) { console.error('Failed to save draft:', error); }
    };
    const loadDraftFromStorage = () => {
        try {
            const saved = localStorage.getItem(getStorageKey());
            if (saved) {
                const draftData = JSON.parse(saved);
                if (Date.now() - draftData.timestamp < 24 * 60 * 60 * 1000) return draftData;
                localStorage.removeItem(getStorageKey());
            }
        } catch (error) { console.error('Failed to load draft:', error); }
        return null;
    };
    const clearDraftFromStorage = () => {
        localStorage.removeItem(getStorageKey());
        setHasUnsavedChanges(false);
    };

    // --- Инициализация и обработка данных --- 
    useEffect(() => {
        const savedDraft = loadDraftFromStorage();
        if (savedDraft && ((savedDraft.originalEstimate?.estimate_id === estimate?.estimate_id) || (!savedDraft.originalEstimate?.estimate_id && !estimate?.estimate_id))) {
            setEstimateData(savedDraft.estimateData);
            setSelectedCategories(savedDraft.selectedCategories);
            setHasUnsavedChanges(true);
        } else if (estimate) {
            const augmentedItems = ensureArray(estimate.items).map(item => {
                const workDetails = works.find(w => w.work_type_id === item.work_type);
                const cost = parseFloat(item.cost_price_per_unit) || 0;
                const client = parseFloat(item.client_price_per_unit) || 0;
                const qty = parseFloat(item.quantity) || 0;
                return { ...item, categoryId: workDetails?.category?.category_id, total_cost: cost * qty, total_client: client * qty };
            });
            setEstimateData({ ...estimate, name: estimate.name || estimate.estimate_number || '', status: estimate.status?.status_id || estimate.status, items: augmentedItems });
            const initialCategories = augmentedItems.length > 0 ? [...new Set(augmentedItems.map(i => i.categoryId).filter(id => id !== undefined))] : [];
            setSelectedCategories(initialCategories);
            setHasUnsavedChanges(false);
        } else {
            const draftStatus = statuses.find(s => s.status_name === 'Черновик');
            setEstimateData({ name: '', status: draftStatus?.status_id || '', items: [] });
            setSelectedCategories([]);
            setHasUnsavedChanges(false);
        }
    }, [estimate, statuses, works]);

    // --- Хуки для автосохранения и предупреждений ---
    useEffect(() => { if (estimateData.name || estimateData.items?.length > 0) { saveDraftToStorage(estimateData, selectedCategories); setHasUnsavedChanges(true); } }, [estimateData, selectedCategories]);
    useEffect(() => { const handleBeforeUnload = (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload); }, [hasUnsavedChanges]);

    // --- Обработчики UI --- 
    const handleOpenCategoryDialog = () => { setDialogRight(selectedCategories); setDialogLeft(ensureArray(categories).map(c => c.category_id).filter(cId => !selectedCategories.includes(cId))); setCategoryDialogOpen(true); };
    const handleCloseDialog = () => { setSelectedCategories(dialogRight); setCategoryDialogOpen(false); };
    const handleSaveWithCleanup = () => { 
        clearDraftFromStorage(); 
        // Объединяем данные формы с исходными данными сметы (включая estimate_id)
        const dataToSave = {
            ...estimate, // Исходные данные сметы (включая estimate_id)
            ...estimateData, // Измененные данные из формы
        };
        console.log('Сохранение данных в EstimateEditor:', dataToSave);
        onSave(dataToSave); 
    };
    const handleSafeBack = () => { if (hasUnsavedChanges) { setPendingAction(() => onBack); setShowUnsavedDialog(true); } else { onBack(); } };
    const handleSaveAndContinue = () => { setShowUnsavedDialog(false); handleSaveWithCleanup(); if (pendingAction) { pendingAction(); setPendingAction(null); } };
    const handleDiscardChanges = () => { setShowUnsavedDialog(false); clearDraftFromStorage(); if (pendingAction) { pendingAction(); setPendingAction(null); } };
    const handleCancelNavigation = () => { setShowUnsavedDialog(false); setPendingAction(null); };

    // --- Обработчики удаления категории ---
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

    // --- Обработчики элементов сметы --- 
    const handleAddItem = (categoryId, work) => {
        if (!work || !work.work_type_id) return;
        const cost = parseFloat(work.prices.cost_price);
        const client = parseFloat(work.prices.client_price);
        const newItem = { item_id: `new_${work.work_type_id}_${Date.now()}`, work_type: work.work_type_id, work_name: work.work_name, unit_of_measurement: work.unit_of_measurement, quantity: 1, cost_price_per_unit: cost, client_price_per_unit: client, categoryId: categoryId, total_cost: cost, total_client: client };
        setEstimateData(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        setAutocompleteResetKey(prev => prev + 1);
    };
    const handleRemoveItem = (itemId) => { setEstimateData(prev => ({ ...prev, items: prev.items.filter(i => i.item_id !== itemId) })); };
    const updateItem = (itemId, field, value) => {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) && value !== '') return;
        setEstimateData(prev => ({ ...prev, items: prev.items.map(i => { if (i.item_id === itemId) { const updatedItem = { ...i, [field]: numericValue }; const cost = parseFloat(updatedItem.cost_price_per_unit) || 0; const client = parseFloat(updatedItem.client_price_per_unit) || 0; const qty = parseFloat(updatedItem.quantity) || 0; return { ...updatedItem, total_cost: cost * qty, total_client: client * qty }; } return i; }) }));
    };

    // --- Функция добавления работы из поиска ---
    const handleAddWorkFromSearch = (work) => {
        if (!work || !work.work_type_id) return;
        
        const categoryId = work.category?.category_id;
        
        // Добавляем категорию в selectedCategories если её еще нет
        if (categoryId && !selectedCategories.includes(categoryId)) {
            setSelectedCategories(prev => [...prev, categoryId]);
        }
        
        // Добавляем работу в смету
        handleAddItem(categoryId, work);
        
        // Очищаем поиск
        setSearchValue(null);
        setSearchInputValue('');
    };

    // --- Функции экспорта ---
    const downloadFile = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const checkStatusBeforeExport = (exportType) => {
        const currentStatus = statuses.find(s => s.status_id === estimateData.status);
        if (currentStatus && currentStatus.status_name === 'Отклонена') {
            setExportConfirmDialog({ open: true, type: exportType });
            return false;
        }
        return true;
    };

    const handleExportConfirm = () => {
        const exportType = exportConfirmDialog.type;
        setExportConfirmDialog({ open: false, type: null });
        
        if (exportType === 'client') {
            performClientExport();
        } else if (exportType === 'internal') {
            performInternalExport();
        }
    };

    const handleExportForClient = async () => {
        if (!estimateData.estimate_id) {
            alert('Сначала сохраните смету перед экспортом');
            return;
        }

        if (!checkStatusBeforeExport('client')) {
            return;
        }

        performClientExport();
    };

    const performClientExport = async () => {
        setExportLoading(true);
        try {
            const blob = await api.exportEstimateForClient(estimateData.estimate_id);
            const filename = `${estimateData.name || 'Смета'}.xlsx`;
            downloadFile(blob, filename);
        } catch (error) {
            console.error('Ошибка экспорта для клиента:', error);
            alert('Произошла ошибка при экспорте: ' + error.message);
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportInternal = async () => {
        if (!estimateData.estimate_id) {
            alert('Сначала сохраните смету перед экспортом');
            return;
        }

        if (!checkStatusBeforeExport('internal')) {
            return;
        }

        performInternalExport();
    };

    const performInternalExport = async () => {
        setExportLoading(true);
        try {
            const blob = await api.exportEstimateInternal(estimateData.estimate_id);
            const filename = `ВН_${estimateData.name || 'Смета'}.xlsx`;
            downloadFile(blob, filename);
        } catch (error) {
            console.error('Ошибка внутреннего экспорта:', error);
            alert('Произошла ошибка при экспорте: ' + error.message);
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportToCRM = () => {
        alert('Экспорт в CRM - функция в разработке');
    };

    // --- Мемоизированные вычисления --- 
    const { totalCost, totalClient, totalProfit } = useMemo(() => {
        const totals = (estimateData.items || []).reduce((acc, item) => { acc.cost += item.total_cost || 0; acc.client += item.total_client || 0; return acc; }, { cost: 0, client: 0 });
        return { totalCost: totals.cost, totalClient: totals.client, totalProfit: totals.client - totals.cost };
    }, [estimateData.items]);

    // --- Рендеринг --- 
    const renderWorkItem = (item) => (
        <Paper key={item.item_id} variant="outlined" sx={{ p: 0.77, mb: 0.51 }}>
            <Typography variant="body1" sx={{ textAlign: 'center' }}>{item.work_name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1.5, width: '95%' }}>
                <TextField 
                    label="Кол-во" 
                    type="number" 
                    size="small" 
                    value={item.quantity || ''} 
                    onChange={e => updateItem(item.item_id, 'quantity', e.target.value)}
                    sx={{ 
                        flex: 1,
                        minWidth: '70px',
                        '& input[type=number]': {
                            '-moz-appearance': 'textfield',
                            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                '-webkit-appearance': 'none',
                                margin: 0
                            }
                        }
                    }}
                />
                <TextField 
                    label="Ед. изм." 
                    size="small" 
                    value={item.unit_of_measurement || ''} 
                    disabled 
                    sx={{ 
                        flex: 1,
                        minWidth: '60px'
                    }}
                />
                <TextField 
                    label="Цена базовая" 
                    type="number" 
                    size="small" 
                    value={item.cost_price_per_unit || ''} 
                    onChange={e => updateItem(item.item_id, 'cost_price_per_unit', e.target.value)} 
                    disabled={!isManager}
                    sx={{ 
                        flex: 1,
                        minWidth: '100px',
                        '& input[type=number]': {
                            '-moz-appearance': 'textfield',
                            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                '-webkit-appearance': 'none',
                                margin: 0
                            }
                        }
                    }}
                />
                {isManager && (
                    <TextField 
                        label="Цена клиента" 
                        type="number" 
                        size="small" 
                        value={item.client_price_per_unit || ''} 
                        onChange={e => updateItem(item.item_id, 'client_price_per_unit', e.target.value)}
                        sx={{ 
                            flex: 1,
                            minWidth: '100px',
                            '& input[type=number]': {
                                '-moz-appearance': 'textfield',
                                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                                    '-webkit-appearance': 'none',
                                    margin: 0
                                }
                            }
                        }}
                    />
                )}
                <IconButton size="small" onClick={() => handleRemoveItem(item.item_id)} sx={{ color: 'error.main', ml: 1 }}><DeleteIcon /></IconButton>
            </Box>
            <Divider sx={{ my: 0.77 }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2">Сумма (себест.): {formatCurrency(item.total_cost)} грн.</Typography>
                    {isManager && <Typography variant="body2" color="primary.main">Сумма (клиент): {formatCurrency(item.total_client)} грн.</Typography>}
                    {isManager && (
                        <Chip 
                            size="small" 
                            icon={<TrendingUpIcon />} 
                            label={`Прибыль: ${formatCurrency(item.total_client - item.total_cost)} грн.`} 
                            sx={{
                                color: (item.total_client - item.total_cost) >= 0 ? '#4caf50' : '#f44336',
                                borderColor: (item.total_client - item.total_cost) >= 0 ? '#4caf50' : '#f44336'
                            }}
                            variant="outlined" 
                        />
                    )}
                </Stack>
            </Box>
        </Paper>
    );

    const renderCategoryAccordion = (catId) => {
        const category = categories.find(c => c.category_id === catId);
        if (!category) return null;
        const itemsInCategory = (estimateData.items || []).filter(i => i.categoryId === catId);
        const { cost: categoryCost, client: categoryClient } = itemsInCategory.reduce((acc, item) => { acc.cost += item.total_cost || 0; acc.client += item.total_client || 0; return acc; }, { cost: 0, client: 0 });
        const addedWorkIds = new Set(itemsInCategory.map(i => i.work_type));
        const availableWorks = (works || []).filter(w => w.category?.category_id === catId && !addedWorkIds.has(w.work_type_id));
        const popularWorks = availableWorks.slice(0, 5);
        
        // Отладочная информация
        if (catId === 1 || catId === 2 || catId === 3) { // Для первых трех категорий
            console.log(`Категория ${catId} (${category.category_name}):`, {
                totalWorks: works?.length || 0,
                worksInCategory: availableWorks.length,
                sampleWorks: availableWorks.slice(0, 3).map(w => ({
                    id: w.work_type_id,
                    name: w.work_name,
                    categoryId: w.category?.category_id
                }))
            });
        }

        return (
            <Box sx={{ maxWidth: '80%', mx: 'auto' }}>
                <Accordion key={catId} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Box sx={{display: 'flex', alignItems: 'center', width: '100%', flexWrap: 'wrap'}}><Typography sx={{ flexGrow: 1, fontWeight: 'bold' }}>{category.category_name}</Typography>{isManager && (
                                <Chip 
                                    size="small" 
                                    icon={<TrendingUpIcon />} 
                                    label={`Прибыль: ${formatCurrency(categoryClient - categoryCost)} грн.`} 
                                    sx={{ 
                                        mr: 2, 
                                        my: 0.5,
                                        color: (categoryClient - categoryCost) >= 0 ? '#4caf50' : '#f44336',
                                        borderColor: (categoryClient - categoryCost) >= 0 ? '#4caf50' : '#f44336'
                                    }} 
                                    variant="outlined"
                                />
                            )}
                            <Typography sx={{ mr: 2, color: 'text.secondary', my: 0.5 }}>Сумма: {formatCurrency(isManager ? categoryClient : categoryCost)} грн.</Typography><Box component="span" role="button" onClick={(e) => {e.stopPropagation(); handleCategoryDeleteClick(catId);}} sx={{ p: 1, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}><DeleteIcon fontSize="small" /></Box></Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Autocomplete id={`autocomplete-${catId}`} key={`${catId}-${autocompleteResetKey}`} options={availableWorks} getOptionLabel={(option) => option?.work_name || ''} renderInput={(params) => <TextField {...params} label="Поиск работ..." size="small" />} onChange={(event, newValue) => { if (newValue) handleAddItem(catId, newValue); }} sx={{ my: 2 }} />
                        {popularWorks.length > 0 && <><Typography variant="subtitle2" color="text.secondary">Популярные работы:</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>{popularWorks.map(work => (<Button key={work.work_type_id} variant="outlined" startIcon={<AddIcon />} onClick={() => handleAddItem(catId, work)} sx={{ justifyContent: 'flex-start', textTransform: 'none', borderColor: 'rgba(255, 255, 255, 0.23)', flexShrink: 0 }}>{work.work_name}</Button>))}</Box></>}
                        <Stack spacing={1} sx={{mt: 3}}>{itemsInCategory.map(item => renderWorkItem(item))}</Stack>
                    </AccordionDetails>
                </Accordion>
            </Box>
        );
    };

    return (
        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={handleSafeBack}>Назад к списку</Button>
                {estimate && estimate.project && (
                    <Typography variant="h6" sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                        {estimate.project.project_name || 'Неизвестный объект'}
                    </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1}}><Button variant="outlined" startIcon={<SettingsIcon />} onClick={handleOpenCategoryDialog}>Категории</Button><Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveWithCleanup}>Сохранить</Button></Box>
            </Box>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={8}><TextField fullWidth label="Название сметы" value={estimateData.name || ''} onChange={(e) => {
                                console.log('Изменение названия сметы:', e.target.value);
                                setEstimateData(p => ({...p, name: e.target.value}))
                            }} inputRef={nameInputRef}/></Grid>
                <Grid item xs={6} sm={2}><FormControl fullWidth><InputLabel>Статус</InputLabel><Select value={estimateData.status || ''} label="Статус" onChange={e => setEstimateData(p => ({...p, status: e.target.value}))}>{ensureArray(statuses).map(s => (<MenuItem key={s.status_id} value={s.status_id}>{s.status_name}</MenuItem>))}</Select></FormControl></Grid>
                <Grid item xs={6} sm={2}><Chip label={statuses.find(s => s.status_id === estimateData.status)?.status_name || ''} color={getStatusColor(statuses.find(s => s.status_id === estimateData.status)?.status_name || '')} sx={{width: '100%'}} /></Grid>
            </Grid>
            <Paper elevation={3} sx={{ p: 2, borderRadius: 1, mb: 3, background: 'linear-gradient(45deg, #1e1e1e 30%, #2c2c2c 90%)' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-around" alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
                    <Box textAlign="center"><Typography variant="overline" color="text.secondary">Себестоимость</Typography><Typography variant="h5">{formatCurrency(totalCost)} грн.</Typography></Box>
                    {isManager && <Box textAlign="center"><Typography variant="overline" color="text.secondary">Цена для клиента</Typography><Typography variant="h5" color="primary.main">{formatCurrency(totalClient)} грн.</Typography></Box>}
                    {isManager && (
                        <Box textAlign="center">
                            <Typography variant="overline" color="text.secondary">Прибыль</Typography>
                            <Typography 
                                variant="h5" 
                                sx={{ color: totalProfit >= 0 ? '#4caf50' : '#f44336' }}
                            >
                                {formatCurrency(totalProfit)} грн.
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </Paper>
            {/* Информация о составителе */}
            {estimate && estimate.creator && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        Составил: {estimate.creator.full_name || estimate.creator.email} ({estimate.creator.role || 'Неизвестная роль'}) {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString('ru-RU') : ''}
                    </Typography>
                </Box>
            )}

            {/* Строка поиска работ и кнопка категорий */}
            <Box sx={{ maxWidth: '80%', width: '80%', mx: 'auto', mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Autocomplete
                        value={searchValue}
                        onChange={(event, newValue) => {
                            if (newValue) {
                                handleAddWorkFromSearch(newValue);
                            }
                        }}
                        inputValue={searchInputValue}
                        onInputChange={(event, newInputValue) => {
                            setSearchInputValue(newInputValue);
                        }}
                        options={works || []}
                        limitTags={100}
                        disableListWrap
                        ListboxProps={{
                            style: {
                                maxHeight: 300,
                            },
                        }}
                        filterOptions={(options, { inputValue }) => {
                            const filtered = options.filter(option => {
                                const workName = option.work_name?.toLowerCase() || '';
                                const searchTerm = inputValue.toLowerCase();
                                return workName.includes(searchTerm);
                            });
                            console.log(`Поиск "${inputValue}": найдено ${filtered.length} из ${options.length} работ`);
                            return filtered;
                        }}
                        getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option.work_name;
                        }}
                        renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            return (
                                <Box component="li" key={key} {...otherProps}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {option.work_name}
                                    </Typography>
                                </Box>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="🔍 Поиск работ для добавления в смету..."
                                placeholder="Начните вводить название работы"
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': {
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'primary.main',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'primary.main',
                                        },
                                    },
                                }}
                            />
                        )}
                        filterOptions={(options, { inputValue }) => {
                            if (!inputValue) return options.slice(0, 50);
                            
                            const filtered = options.filter(option =>
                                option.work_name.toLowerCase().includes(inputValue.toLowerCase()) ||
                                option.category?.category_name.toLowerCase().includes(inputValue.toLowerCase())
                            );
                            
                            // Сортируем по релевантности
                            return filtered.sort((a, b) => {
                                const aRelevance = a.work_name.toLowerCase().indexOf(inputValue.toLowerCase());
                                const bRelevance = b.work_name.toLowerCase().indexOf(inputValue.toLowerCase());
                                
                                if (aRelevance !== bRelevance) {
                                    if (aRelevance === -1) return 1;
                                    if (bRelevance === -1) return -1;
                                    return aRelevance - bRelevance;
                                }
                                
                                return a.work_name.localeCompare(b.work_name);
                            }).slice(0, 100);
                        }}
                        noOptionsText="Работы не найдены"
                        loadingText="Поиск работ..."
                        clearOnBlur
                        selectOnFocus
                        handleHomeEndKeys
                    />
                </Box>
                <Button 
                    variant="outlined" 
                    onClick={handleOpenCategoryDialog} 
                    startIcon={<SettingsIcon />}
                    size="small"
                    sx={{ 
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                        height: '40px' // Точная высота кнопки small size
                    }}
                >
                    Редактировать категории
                </Button>
            </Box>
            {selectedCategories.map(catId => renderCategoryAccordion(catId))}

            {/* Итоговая таблица */}
            {(estimateData.items || []).length > 0 && (
                <Box sx={{ maxWidth: '80%', mx: 'auto', mt: 4 }}>
                    <Paper sx={{ p: 2, background: 'linear-gradient(45deg, #2c2c2c 30%, #1e1e1e 90%)' }}>
                        <Typography variant="h6" gutterBottom>Итоговая сводка по работам</Typography>
                        <TableContainer>
                            <Table size="small" aria-label="a dense table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center" sx={{width: '5%', p: '6px 8px'}}>№</TableCell>
                                        <TableCell sx={{width: '45%', p: '6px 8px'}}>Наименование работы</TableCell>
                                        <TableCell sx={{width: '10%', p: '6px 8px'}} align="center">Кол-во</TableCell>
                                        <TableCell sx={{width: '10%', p: '6px 8px'}} align="center">Ед. изм.</TableCell>
                                        {isManager && <TableCell sx={{width: '10%', p: '6px 8px'}} align="center">Цена (себест.)</TableCell>}
                                        <TableCell sx={{width: '5%', p: '6px 8px'}} align="center">{isManager ? 'Цена (клиент)' : 'Цена'}</TableCell>
                                        {isManager && <TableCell sx={{width: '10%', p: '6px 8px'}} align="center">Сумма (себест.)</TableCell>}
                                        <TableCell sx={{width: '10%', p: '6px 8px'}} align="center">{isManager ? 'Сумма (клиент)' : 'Сумма'}</TableCell>
                                        {isManager && <TableCell sx={{width: '10%', p: '6px 8px'}} align="center">Прибыль</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(() => {
                                        let counter = 1;
                                        return selectedCategories.map(catId => {
                                            const category = categories.find(c => c.category_id === catId);
                                            const itemsInCategory = (estimateData.items || []).filter(i => i.categoryId === catId);
                                            if (itemsInCategory.length === 0) return null;

                                            const categorySubtotalCost = itemsInCategory.reduce((sum, item) => sum + (item.total_cost || 0), 0);
                                            const categorySubtotalClient = itemsInCategory.reduce((sum, item) => sum + (item.total_client || 0), 0);
                                            const categorySubtotalProfit = categorySubtotalClient - categorySubtotalCost;

                                            return (
                                                <React.Fragment key={`summary-${catId}`}>
                                                    <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                                                        <TableCell colSpan={isManager ? 9 : 6} sx={{ fontWeight: 'bold', backgroundColor: 'rgba(255, 255, 255, 0.08)', pt: 1.5, pb: 1.5 }}>
                                                            {category?.category_name}
                                                        </TableCell>
                                                    </TableRow>
                                                    {itemsInCategory.map(item => {
                                                        const itemProfit = (item.total_client || 0) - (item.total_cost || 0);
                                                        return (
                                                            <TableRow key={`summary-item-${item.item_id}`}>
                                                                <TableCell align="center" sx={{p: '6px 8px'}}>{counter++}</TableCell>
                                                                <TableCell sx={{p: '6px 8px'}}>{item.work_name}</TableCell>
                                                                <TableCell align="center" sx={{p: '6px 8px'}}>{formatCurrency(item.quantity)}</TableCell>
                                                                <TableCell align="center" sx={{p: '6px 8px'}}>{item.unit_of_measurement}</TableCell>
                                                                {isManager && <TableCell align="center" sx={{p: '6px 8px'}}>{formatCurrency(item.cost_price_per_unit)}</TableCell>}
                                                                <TableCell align="center" sx={{p: '6px 8px'}}>{formatCurrency(isManager ? item.client_price_per_unit : item.cost_price_per_unit)}</TableCell>
                                                                {isManager && <TableCell align="center" sx={{p: '6px 8px', fontWeight: '500'}}>{formatCurrency(item.total_cost)}</TableCell>}
                                                                <TableCell align="center" sx={{p: '6px 8px', fontWeight: '500'}}>{formatCurrency(isManager ? item.total_client : item.total_cost)}</TableCell>
                                                                {isManager && <TableCell align="center" sx={{p: '6px 8px', fontWeight: '500', color: itemProfit >= 0 ? 'success.main' : 'error.main'}}>{formatCurrency(itemProfit)}</TableCell>}
                                                            </TableRow>
                                                        );
                                                    })}
                                                    {/* Subtotal Row */}
                                                    {isManager ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} sx={{border: 0}} />
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.23)', whiteSpace: 'nowrap' }}>Итого по разделу:</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.23)' }}>{formatCurrency(categorySubtotalCost)}</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.23)' }}>{formatCurrency(categorySubtotalClient)}</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', borderTop: '1px solid rgba(255, 255, 255, 0.23)', color: categorySubtotalProfit >= 0 ? '#4caf50' : '#f44336' }}>{formatCurrency(categorySubtotalProfit)}</TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} />
                                                            <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Итого по разделу:</TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                                                {formatCurrency(categorySubtotalCost)} грн.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                    {/* Grand Total Row */}
                                    {isManager ? (
                                        <TableRow sx={{ '& > *': { borderTop: '2px solid rgba(255, 255, 255, 0.23)' } }}>
                                            <TableCell colSpan={5} />
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>ОБЩИЙ ИТОГ:</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(totalCost)}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(totalClient)}</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: totalProfit >= 0 ? '#4caf50' : '#f44336' }}>{formatCurrency(totalProfit)}</TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow sx={{ '& > *': { borderTop: '2px solid rgba(255, 255, 255, 0.23)' } }}>
                                            <TableCell colSpan={4} />
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>ОБЩАЯ СУММА:</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                {formatCurrency(totalCost)} грн.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Кнопки экспорта */}
                        {estimateData.estimate_id && (
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<BusinessCenterIcon />}
                                    onClick={handleExportForClient}
                                    disabled={exportLoading}
                                    color="primary"
                                >
                                    Экспорт для клиента
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<AssignmentIcon />}
                                    onClick={handleExportInternal}
                                    disabled={exportLoading}
                                    color="secondary"
                                >
                                    Экспорт внутренний
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<FileDownloadIcon />}
                                    onClick={handleExportToCRM}
                                    disabled={exportLoading}
                                    color="info"
                                >
                                    Экспорт в CRM
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Box>
            )}
            
            <Dialog open={isCategoryDialogOpen} onClose={handleCloseDialog} maxWidth="md"><DialogTitle>Настройка категорий</DialogTitle><DialogContent><TransferList left={dialogLeft} setLeft={setDialogLeft} right={dialogRight} setRight={setDialogRight} allItems={categories} /></DialogContent><DialogActions><Button onClick={handleCloseDialog}>Готово</Button></DialogActions></Dialog>
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, categoryId: null })}><DialogTitle>Подтвердите удаление</DialogTitle><DialogContent><DialogContentText>В этой категории есть добавленные работы. Вы уверены, что хотите удалить категорию и все связанные с ней работы из сметы?</DialogContentText></DialogContent><DialogActions><Button onClick={() => setConfirmDelete({ open: false, categoryId: null })}>Отмена</Button><Button onClick={handleConfirmDelete} color="error">Да, удалить</Button></DialogActions></Dialog>
            <Dialog open={showUnsavedDialog} onClose={handleCancelNavigation}><DialogTitle>Несохраненные изменения</DialogTitle><DialogContent><DialogContentText>У вас есть несохраненные изменения в смете. Что вы хотите сделать?</DialogContentText></DialogContent><DialogActions sx={{ gap: 1 }}><Button onClick={handleCancelNavigation}>Остаться</Button><Button onClick={handleDiscardChanges} color="error">Не сохранять</Button><Button onClick={handleSaveAndContinue} variant="contained">Сохранить</Button></DialogActions></Dialog>
            <Dialog open={exportConfirmDialog.open} onClose={() => setExportConfirmDialog({ open: false, type: null })}><DialogTitle>Подтверждение экспорта</DialogTitle><DialogContent><DialogContentText>Смета имеет статус "Отклонена". Вы уверены, что хотите экспортировать данную смету?</DialogContentText></DialogContent><DialogActions><Button onClick={() => setExportConfirmDialog({ open: false, type: null })}>Отмена</Button><Button onClick={handleExportConfirm} variant="contained" color="warning">Да, экспортировать</Button></DialogActions></Dialog>
        </Paper>
    );
};

export default EstimateEditor;