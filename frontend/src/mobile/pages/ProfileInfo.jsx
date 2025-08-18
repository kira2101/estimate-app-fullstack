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
      <div className="profile-container">
        {/* По образцу из mobile-prototype-final.html */}
        <div className="profile-header">
          <div className="profile-avatar">👤</div>
          <div className="profile-name">{user?.first_name || 'Иван'} {user?.last_name || 'Петров'}</div>
          <div className="profile-role">Прораб</div>
        </div>

        <div className="profile-info">
          <div className="profile-item">
            <div className="profile-item-label">Email</div>
            <div className="profile-item-value">{user?.email || 'foreman@example.com'}</div>
          </div>
          <div className="profile-item">
            <div className="profile-item-label">Телефон</div>
            <div className="profile-item-value">+380 (67) 123-45-67</div>
          </div>
          <div className="profile-item">
            <div className="profile-item-label">Последний вход</div>
            <div className="profile-item-value">
              {user?.last_login 
                ? new Date(user.last_login).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '18.08.2025 09:30'
              }
            </div>
          </div>
          <div className="profile-item">
            <div className="profile-item-label">Активных смет</div>
            <div className="profile-item-value">8</div>
          </div>
        </div>

        <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
          🚪 Выйти из аккаунта
        </button>
      </div>

      {/* Подтверждение выхода */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Подтверждение выхода</h3>
            <p className="modal-text">
              Вы уверены, что хотите выйти?
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