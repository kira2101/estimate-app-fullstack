import React from 'react';
import { Grid, List, ListItem, ListItemIcon, Checkbox, ListItemText, Button, Paper, Typography, Box } from '@mui/material';

const TransferList = ({ left, setLeft, right, setRight, allItems }) => {
    const [checked, setChecked] = React.useState([]);
    const leftChecked = checked.filter(value => left.includes(value));
    const rightChecked = checked.filter(value => right.includes(value));

    const handleToggle = (value) => () => {
        const currentIndex = checked.indexOf(value);
        const newChecked = [...checked];
        if (currentIndex === -1) newChecked.push(value); else newChecked.splice(currentIndex, 1);
        setChecked(newChecked);
    };

    const handleCheckedRight = () => {
        setRight(right.concat(leftChecked));
        setLeft(left.filter(value => !leftChecked.includes(value)));
        setChecked(checked.filter(value => !leftChecked.includes(value)));
    };

    const handleCheckedLeft = () => {
        setLeft(left.concat(rightChecked));
        setRight(right.filter(value => !rightChecked.includes(value)));
        setChecked(checked.filter(value => !rightChecked.includes(value)));
    };

    // Находим максимальную ширину текста для выравнивания кнопок
    const getMaxWidth = (itemsList) => {
        if (!itemsList || itemsList.length === 0) return '280px';
        const maxLength = Math.max(...itemsList.map(value => {
            const categoryName = allItems.find(c => c.category_id === value)?.category_name || '';
            return categoryName.length;
        }));
        // Базовая ширина + дополнительные пиксели на каждый символ
        return Math.max(280, 140 + maxLength * 8) + 'px';
    };

    const customList = (title, items) => {
        const maxWidth = getMaxWidth(items);
        
        return (
            <Paper sx={{ height: 300, display: 'flex', flexDirection: 'column', minWidth: 'fit-content' }}>
                <Typography variant="subtitle1" sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    {title}
                </Typography>
                <List dense component="div" role="list" sx={{ flexGrow: 1, overflow: 'auto', minWidth: 'fit-content', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                {items.map(value => {
                    const isChecked = checked.includes(value);
                    const categoryName = allItems.find(c => c.category_id === value)?.category_name;
                    
                    return (
                        <ListItem key={value} role="listitem" sx={{ p: 0.5, display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* Скрытый чекбокс */}
                                <input 
                                    type="checkbox" 
                                    id={`checkbox-${value}`}
                                    checked={isChecked}
                                    onChange={handleToggle(value)}
                                    style={{ display: 'none' }}
                                />
                                {/* Кастомный лейбл */}
                                <Box
                                    component="label"
                                    htmlFor={`checkbox-${value}`}
                                    sx={{
                                        backgroundColor: isChecked ? '#0d47a1' : '#373740',
                                        border: '2px solid',
                                        borderColor: isChecked ? '#0d47a1' : '#555',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        color: isChecked ? '#FFF' : '#FFF',
                                        fontSize: '0.85em',
                                        letterSpacing: '2px',
                                        textDecoration: 'none',
                                        fontFamily: 'PT Sans, sans-serif',
                                        textAlign: 'center',
                                        width: maxWidth,
                                        height: '50px', // Увеличена высота
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start', // Выравнивание по левому краю
                                        position: 'relative',
                                        transition: 'all 150ms ease-in',
                                        boxShadow: isChecked ? '0 2px 8px rgba(13, 71, 161, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.2)',
                                        gap: 2, // Отступ между чекбоксом и текстом
                                        padding: '0 16px',
                                        '&:hover': {
                                            backgroundColor: isChecked ? '#0a368a' : '#0d47a1',
                                            borderColor: isChecked ? '#0a368a' : '#0d47a1',
                                            boxShadow: isChecked ? '0 4px 12px rgba(10, 54, 138, 0.4)' : '0 2px 8px rgba(13, 71, 161, 0.3)',
                                            transform: 'translateY(-1px)'
                                        }
                                    }}
                                >
                                    {/* Визуальный чекбокс */}
                                    <Box
                                        sx={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '4px',
                                            border: '2px solid',
                                            borderColor: isChecked ? '#FFF' : '#999',
                                            backgroundColor: isChecked ? '#FFF' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            transition: 'all 150ms ease-in',
                                            boxShadow: isChecked ? '0 0 0 2px rgba(255, 255, 255, 0.3)' : 'none'
                                        }}
                                    >
                                        {isChecked && (
                                            <Box
                                                sx={{
                                                    color: '#0d47a1',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    lineHeight: 1
                                                }}
                                            >
                                                ✓
                                            </Box>
                                        )}
                                    </Box>
                                    
                                    {/* Текст категории */}
                                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                                        {categoryName}
                                    </Box>
                                </Box>
                            </Box>
                        </ListItem>
                    );
                })}
                 {items.length === 0 && (
                    <ListItem sx={{ display: 'flex', justifyContent: 'center' }}>
                        <ListItemText secondary="Список пуст" sx={{textAlign: 'center'}}/>
                    </ListItem>
                )}
            </List>
        </Paper>
        );
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 auto', minWidth: '300px' }}>
                {customList('Доступные категории', left)}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                <Button sx={{ my: 0.5 }} variant="outlined" size="small" onClick={handleCheckedRight} disabled={leftChecked.length === 0}>&gt;</Button>
                <Button sx={{ my: 0.5 }} variant="outlined" size="small" onClick={handleCheckedLeft} disabled={rightChecked.length === 0}>&lt;</Button>
            </Box>
            <Box sx={{ flex: '1 1 auto', minWidth: '300px' }}>
                {customList('Выбранные для сметы', right)}
            </Box>
        </Box>
    );
};

export default TransferList;