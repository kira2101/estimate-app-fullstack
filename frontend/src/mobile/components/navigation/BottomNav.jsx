import React from 'react';
import { useMobileNavigationContext } from '../../context/MobileNavigationContext';
import './BottomNav.css';

/**
 * Bottom Navigation Component
 * Features: Tab navigation for Projects, Estimates, Finance, Profile
 */
const BottomNav = () => {
  const { currentTab, switchTab } = useMobileNavigationContext();

  const handleTabClick = (tabId, disabled = false) => {
    if (disabled) {
      console.log(`BottomNav: Таб ${tabId} временно недоступен`);
      return;
    }
    console.log(`BottomNav: Переключение на таб ${tabId}, текущий таб: ${currentTab}`);
    switchTab(tabId);
  };

  const navItems = [
    {
      id: 'projects',
      icon: 'icon-projects',
      label: 'Проекты',
      ariaLabel: 'Переключиться на проекты'
    },
    {
      id: 'estimates',
      icon: 'icon-estimates', 
      label: 'Сметы',
      ariaLabel: 'Переключиться на сметы'
    },
    {
      id: 'finance',
      icon: 'icon-finance',
      label: 'Финансы', 
      ariaLabel: 'Переключиться на финансы',
      disabled: true
    },
    {
      id: 'profile',
      icon: 'icon-profile',
      label: 'Профиль',
      ariaLabel: 'Переключиться на профиль'
    }
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Основная навигация">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${currentTab === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
          onClick={() => handleTabClick(item.id, item.disabled)}
          aria-label={item.ariaLabel}
          aria-current={currentTab === item.id ? 'page' : undefined}
          disabled={item.disabled}
        >
          <div className="nav-indicator"></div>
          <div className={`nav-icon ${item.icon}`}></div>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;