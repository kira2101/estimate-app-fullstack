import React from 'react';
import { Grid, List, ListItem, ListItemIcon, Checkbox, ListItemText, Button, Paper, Typography } from '@mui/material';

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

    const customList = (title, items) => (
        <Paper sx={{ height: 300, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                {title}
            </Typography>
            <List dense component="div" role="list" sx={{ flexGrow: 1, overflow: 'auto' }}>
                {items.map(value => (
                    <ListItem key={value} role="listitem" onClick={handleToggle(value)} sx={{cursor: 'pointer'}}>
                        <ListItemIcon><Checkbox checked={checked.includes(value)} tabIndex={-1} disableRipple /></ListItemIcon>
                        {/* ИСПРАВЛЕНИЕ: Используем category_name и category_id */}
                        <ListItemText primary={allItems.find(c => c.category_id === value)?.category_name} />
                    </ListItem>
                ))}
                 {items.length === 0 && (
                    <ListItem>
                        <ListItemText secondary="Список пуст" sx={{textAlign: 'center'}}/>
                    </ListItem>
                )}
            </List>
        </Paper>
    );

    return (
        <Grid container spacing={2} justifyContent="center" alignItems="center">
            <Grid xs={5.5}>{customList('Доступные категории', left)}</Grid>
            <Grid xs={1}>
                <Grid container direction="column" alignItems="center">
                    <Button sx={{ my: 0.5 }} variant="outlined" size="small" onClick={handleCheckedRight} disabled={leftChecked.length === 0}>&gt;</Button>
                    <Button sx={{ my: 0.5 }} variant="outlined" size="small" onClick={handleCheckedLeft} disabled={rightChecked.length === 0}>&lt;</Button>
                </Grid>
            </Grid>
            <Grid xs={5.5}>{customList('Выбранные для сметы', right)}</Grid>
        </Grid>
    );
};

export default TransferList;