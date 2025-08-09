
import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const NavMenu = ({ currentPage, onNavigate }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = (page) => {
        setAnchorEl(null);
        if (typeof page === 'string') {
            onNavigate(page);
        }
    };

    const managementPages = [
        { key: 'projects', label: 'Управление объектами' },
        { key: 'work_categories', label: 'Категории работ' },
        { key: 'works', label: 'Работы' },
        { key: 'materials', label: 'Материалы' },
        { key: 'users', label: 'Пользователи' },
        { key: 'statuses', label: 'Статусы' },
    ];

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', gap: 1 }}>
            <Button color={currentPage === 'list' ? 'primary' : 'inherit'} onClick={() => onNavigate('list')}>Список смет</Button>
            <Button
                id="management-button"
                aria-controls={open ? 'management-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleMenuClick}
                endIcon={<ArrowDropDownIcon />}
                color={managementPages.some(p => p.key === currentPage) ? 'primary' : 'inherit'}
            >
                Управление
            </Button>
            <Menu
                id="management-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{ 'aria-labelledby': 'management-button' }}
            >
                {managementPages.map(page => (
                    <MenuItem key={page.key} onClick={() => handleMenuClose(page.key)}>{page.label}</MenuItem>
                ))}
            </Menu>
        </Box>
    );
};

export default NavMenu;
