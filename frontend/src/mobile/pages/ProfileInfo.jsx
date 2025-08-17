import React, { useState } from 'react';
import { useMobileAuth } from '../MobileApp';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';

/**
 * Профиль - Информация
 * Показывает информацию о прорабе и настройки
 */
const ProfileInfo = () => {
  const { user, logout } = useMobileAuth();
  const { navigateToScreen } = useMobileNavigationContext();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    // После выхода пользователь автоматически перенаправится на страницу логина
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Информация о приложении
  const appInfo = {
    version: '1.0.0',
    buildDate: '2025-08-16',
    platform: 'Мобильная версия для прорабов'
  };

  return (
    <div className="mobile-screen">
      {/* Информация о пользователе */}
      <div className="mobile-card profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
        </div>
        <div className="profile-info">
          <h2 className="profile-name">
            {user?.first_name} {user?.last_name}
          </h2>
          <div className="profile-role">{user?.role?.name}</div>
          <div className="profile-email">{user?.email}</div>
        </div>
      </div>

      {/* Статистика пользователя */}
      <div className="mobile-card">
        <h3 className="section-title">Ваша активность</h3>
        <div className="user-stats">
          <div className="user-stat">
            <span className="stat-label">Дата регистрации:</span>
            <span className="stat-value">
              {user?.date_joined ? formatDate(user.date_joined) : 'Неизвестно'}
            </span>
          </div>
          <div className="user-stat">
            <span className="stat-label">Последний вход:</span>
            <span className="stat-value">
              {user?.last_login ? formatDate(user.last_login) : 'Неизвестно'}
            </span>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="mobile-card">
        <h3 className="section-title">Быстрые действия</h3>
        <div className="quick-actions">
          <button 
            className="quick-action-btn"
            onClick={() => navigateToScreen('projects')}
          >
            <span className="action-icon">🏗️</span>
            <span className="action-text">Мои проекты</span>
            <span className="action-arrow">→</span>
          </button>
          
          <button 
            className="quick-action-btn"
            onClick={() => navigateToScreen('estimates')}
          >
            <span className="action-icon">📋</span>
            <span className="action-text">Все сметы</span>
            <span className="action-arrow">→</span>
          </button>
          
          <button 
            className="quick-action-btn"
            onClick={() => navigateToScreen('finance')}
          >
            <span className="action-icon">💰</span>
            <span className="action-text">Финансы</span>
            <span className="action-arrow">→</span>
          </button>
        </div>
      </div>

      {/* Информация о приложении */}
      <div className="mobile-card">
        <h3 className="section-title">О приложении</h3>
        <div className="app-info">
          <div className="app-info-item">
            <span className="info-label">Версия:</span>
            <span className="info-value">{appInfo.version}</span>
          </div>
          <div className="app-info-item">
            <span className="info-label">Сборка:</span>
            <span className="info-value">{appInfo.buildDate}</span>
          </div>
          <div className="app-info-item">
            <span className="info-label">Платформа:</span>
            <span className="info-value">{appInfo.platform}</span>
          </div>
        </div>
      </div>

      {/* Выход */}
      <div className="mobile-card">
        <button 
          className="mobile-btn danger logout-btn"
          onClick={() => setShowLogoutConfirm(true)}
        >
          Выйти из аккаунта
        </button>
      </div>

      {/* Подтверждение выхода */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Подтверждение выхода</h3>
            <p className="modal-text">
              Вы уверены, что хотите выйти из аккаунта?
            </p>
            <div className="modal-actions">
              <button 
                className="mobile-btn secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Отмена
              </button>
              <button 
                className="mobile-btn danger"
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileInfo;