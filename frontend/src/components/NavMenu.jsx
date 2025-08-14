
import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const NavMenu = ({ currentPage, onNavigate, currentUser }) => {
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

    const isManager = currentUser?.role === 'менеджер';
    
    const managementPages = [
        { key: 'projects', label: 'Управление объектами' },
        { key: 'work_categories', label: 'Категории работ' },
        { key: 'works', label: 'Работы' },
        { key: 'assignments', label: 'Назначения' },
        { key: 'materials', label: 'Материалы' },
        { key: 'users', label: 'Пользователи' },
        { key: 'statuses', label: 'Статусы' },
    ].filter(page => {
        // Для прорабов показываем только базовые страницы
        if (!isManager) {
            return ['projects', 'work_categories', 'works'].includes(page.key);
        }
        return true;
    });

    return (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', gap: 1 }}>
            <Button color={currentPage === 'list' ? 'primary' : 'inherit'} onClick={() => onNavigate('list')}>Список смет</Button>
            <Button color={currentPage === 'project_finance' ? 'primary' : 'inherit'} onClick={() => onNavigate('project_finance')}>Финансы по объектам</Button>
            {managementPages.length > 0 && (
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
            )}
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
