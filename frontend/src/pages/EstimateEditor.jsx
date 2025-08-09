import React, { useState, useMemo, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, TextField, Select, MenuItem, Chip, Accordion, AccordionSummary, AccordionDetails, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, DialogContentText, useMediaQuery, useTheme, Stack
} from '@mui/material';
import { 
    ArrowBack as ArrowBackIcon, Save as SaveIcon, Settings as SettingsIcon, Delete as DeleteIcon, Add as AddIcon, 
    Article as ArticleIcon
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TransferList from '../components/TransferList';

const getStatusColor = (status) => {
    if (status === 'В работе') return 'primary';
    if (status === 'Завершена') return 'success';
    return 'warning';
};

const EstimateEditor = ({ estimate, categories, works, onBack, onSave }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [estimateData, setEstimateData] = useState({ name: '', status: 'Черновик', items: [] });
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [autocompleteResetKey, setAutocompleteResetKey] = useState(0);
    const [dialogLeft, setDialogLeft] = useState([]);
    const [dialogRight, setDialogRight] = useState([]);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, categoryId: null });

    useEffect(() => {
        const initialData = estimate || { name: 'Новая смета', status: 'Черновик', items: [] };
        setEstimateData(initialData);
        const initialCategories = estimate ? [...new Set(initialData.items.map(i => i.categoryId))] : [];
        setSelectedCategories(initialCategories);
    }, [estimate]);

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

    const handleOpenCategoryDialog = () => { setDialogRight(selectedCategories); setDialogLeft(categories.map(c => c.id).filter(cId => !selectedCategories.includes(cId))); setCategoryDialogOpen(true); };
    const handleCloseCategoryDialog = () => { setSelectedCategories(dialogRight); setCategoryDialogOpen(false); };
    const handleAddItem = (categoryId, work) => { if (!work || !work.id) return; const newItem = { ...work, categoryId, quantity: 1, total: work.price }; setEstimateData(prev => ({ ...prev, items: [...(prev.items || []), newItem] })); setAutocompleteResetKey(prev => prev + 1); };
    const handleRemoveItem = (itemId) => { setEstimateData(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) })); };
    const handleQuantityChange = (itemId, quantity) => { const numQuantity = Number(quantity); if (numQuantity < 0) return; setEstimateData(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, quantity: numQuantity, total: i.price * numQuantity } : i) })); };
    const totalAmount = useMemo(() => (estimateData.items || []).reduce((sum, item) => sum + item.total, 0), [estimateData.items]);

    const renderWorkItem = (item, catId) => (
        <Paper key={item.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
            <Typography variant="body1">{item.name}</Typography>
            <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                <Grid xs={6}><TextField label="Цена за ед." size="small" fullWidth value={item.price} disabled /></Grid>
                <Grid xs={6}><TextField label="Ед. изм." size="small" fullWidth value={item.unit} disabled /></Grid>
                <Grid xs={8}><TextField label="Количество" type="number" size="small" fullWidth value={item.quantity} onChange={e => handleQuantityChange(item.id, e.target.value)} /></Grid>
                <Grid xs={4} sx={{textAlign: 'right'}}><IconButton onClick={() => handleRemoveItem(item.id)}><DeleteIcon /></IconButton></Grid>
            </Grid>
            <Typography align="right" sx={{mt:1, fontWeight:'bold'}}>Сумма: {item.total} грн.</Typography>
        </Paper>
    );

    const renderCategoryAccordion = (catId) => {
        const category = categories.find(c => c.id === catId);
        if (!category) return null;
        const itemsInCategory = (estimateData.items || []).filter(i => i.categoryId === catId);
        const categoryTotal = itemsInCategory.reduce((sum, item) => sum + item.total, 0);
        const addedWorkIds = new Set(itemsInCategory.map(i => i.id));
        const allCategoryWorks = works[catId] || [];
        const availableWorks = allCategoryWorks.filter(w => !addedWorkIds.has(w.id));
        const popularWorks = availableWorks.filter(w => w.popular);

        return (
            <Accordion key={catId} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Box sx={{display: 'flex', alignItems: 'center', width: '100%'}}><Typography sx={{ flexGrow: 1 }}>{category.name}</Typography><Typography sx={{ mr: 2, color: 'text.secondary' }}>{new Intl.NumberFormat('ru-RU').format(categoryTotal)} грн.</Typography><Box component="span" role="button" onClick={(e) => {e.stopPropagation(); handleCategoryDeleteClick(catId);}} sx={{ p: 1, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}><DeleteIcon fontSize="small" /></Box></Box></AccordionSummary>
                <AccordionDetails sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary">Доступные работы:</Typography>
                    <Autocomplete id={`autocomplete-${catId}`} key={`${catId}-${autocompleteResetKey}`} options={availableWorks} getOptionLabel={(option) => option?.name || ''} renderInput={(params) => <TextField {...params} label="Поиск работ..." size="small" />} onChange={(event, newValue) => { if (newValue) handleAddItem(catId, newValue); }} sx={{ my: 2 }} />
                    <Typography variant="subtitle2" color="text.secondary">Популярные работы:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, mb: 2 }}>{popularWorks.slice(0, 5).map(work => (<Button key={work.id} variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => handleAddItem(catId, work)}>{work.name}</Button>))}</Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{mt: 3}}>Наименование:</Typography>
                    <Stack spacing={1} sx={{mt: 1}}>{itemsInCategory.map(item => renderWorkItem(item, catId))}</Stack>
                </AccordionDetails>
            </Accordion>
        );
    };

    return (
        <Paper sx={{ p: isMobile ? 1.5 : 3, backgroundColor: '#1e1e1e' }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Редактирование сметы</Button>
                    <Box sx={{ display: 'flex', gap: 1}}><Button variant="outlined" size={isMobile ? 'small' : 'medium'} startIcon={<SettingsIcon />} onClick={handleOpenCategoryDialog}>Редактировать категории</Button><Button variant="contained" size={isMobile ? 'small' : 'medium'} startIcon={<SaveIcon />} onClick={() => onSave(estimateData)}>Сохранить</Button></Box>
                </Box>
                <Grid container spacing={2} alignItems="center"><Grid xs={12} sm={8}><TextField fullWidth label="Название сметы" value={estimateData.name} onChange={e => setEstimateData(p => ({...p, name: e.target.value}))} /></Grid><Grid xs={7} sm={2}><Select fullWidth value={estimateData.status} onChange={e => setEstimateData(p => ({...p, status: e.target.value}))}><MenuItem value="Черновик">Черновик</MenuItem><MenuItem value="В работе">В работе</MenuItem><MenuItem value="Завершена">Завершена</MenuItem></Select></Grid><Grid xs={5} sm={2}><Chip label={estimateData.status} color={getStatusColor(estimateData.status)} sx={{width: '100%'}} /></Grid></Grid>
                <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}><Typography variant="h5">Общая стоимость: {new Intl.NumberFormat('ru-RU').format(totalAmount)} грн.</Typography></Box>
                {selectedCategories.map(catId => renderCategoryAccordion(catId))}
                <Paper variant="outlined" sx={{mt: 4, p: 2, backgroundColor: 'rgba(0,0,0,0.2)'}}>
                    <Typography variant="h5" gutterBottom>Сводка по всем работам</Typography>
                    <TableContainer><Table><TableHead><TableRow><TableCell>Категория</TableCell><TableCell>Наименование</TableCell><TableCell>Сумма</TableCell></TableRow></TableHead><TableBody>{(estimateData.items || []).map(item => (<TableRow key={item.id}><TableCell>{categories.find(c => c.id === item.categoryId)?.name}</TableCell><TableCell>{item.name}</TableCell><TableCell>{item.total}</TableCell></TableRow>))}<TableRow sx={{'& td': {border: 0, fontWeight: 'bold'}}}><TableCell colSpan={2} align="right">ОБЩАЯ СУММА:</TableCell><TableCell>{new Intl.NumberFormat('ru-RU').format(totalAmount)} грн.</TableCell></TableRow></TableBody></Table></TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2}}><Button variant="outlined" startIcon={<ArticleIcon />}>Экспорт</Button></Box>
                </Paper>
            </Stack>
            <Dialog open={isCategoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="md"><DialogTitle>Настройка категорий</DialogTitle><DialogContent><TransferList left={dialogLeft} setLeft={setDialogLeft} right={dialogRight} setRight={setDialogRight} allItems={categories} /></DialogContent><DialogActions><Button onClick={handleCloseCategoryDialog}>Готово</Button></DialogActions></Dialog>
            <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, categoryId: null })}><DialogTitle>Подтвердите удаление</DialogTitle><DialogContent><DialogContentText>В этой категории есть добавленные работы. Вы уверены, что хотите удалить категорию и все связанные с ней работы из сметы?</DialogContentText></DialogContent><DialogActions><Button onClick={() => setConfirmDelete({ open: false, categoryId: null })}>Отмена</Button><Button onClick={handleConfirmDelete} color="error">Да, удалить</Button></DialogActions></Dialog>
        </Paper>
    );
};

export default EstimateEditor;