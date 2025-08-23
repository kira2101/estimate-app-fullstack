import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileAuth } from '../MobileApp';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import { normalizeApiResponse } from '../utils/apiHelpers';

/**
 * Профиль - Информация
 * Показывает информацию о прорабе и настройки
 */
const ProfileInfo = () => {
  const { user, logout } = useMobileAuth();
  const { navigateToScreen } = useMobileNavigationContext();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Загружаем сметы пользователя для подсчета активных
  const { data: estimatesResponse } = useQuery({
    queryKey: ['estimates', user?.id],
    queryFn: api.getEstimates,
    enabled: !!user
  });
  
  // Normalize estimates data
  const estimates = normalizeApiResponse(estimatesResponse);

  // Подсчет активных смет (все кроме завершенных)
  const activeEstimatesCount = estimates.filter(estimate => {
    const status = estimate.status?.status_name || estimate.status;
    return status !== 'Завершена';
  }).length;

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
          <div className="profile-name">
            {user?.full_name || (user?.email?.split('@')[0] || 'Пользователь')}
          </div>
        </div>

        <div className="profile-info">
          <div className="profile-item">
            <div className="profile-item-label">Email</div>
            <div className="profile-item-value">{user?.email || '—'}</div>
          </div>
          <div className="profile-item">
            <div className="profile-item-label">Телефон</div>
            <div className="profile-item-value">{user?.phone || '—'}</div>
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
                : '—'
              }
            </div>
          </div>
          <div className="profile-item">
            <div className="profile-item-label">Активных смет</div>
            <div className="profile-item-value">{activeEstimatesCount}</div>
          </div>
        </div>

        <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
          🚪 Выйти из аккаунта
        </button>
      </div>

      {/* Подтверждение выхода */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-content">
              <div className="logout-modal-icon">🚪</div>
              <h3 className="logout-modal-title">Выход из аккаунта</h3>
              <p className="logout-modal-text">
                Вы уверены, что хотите выйти из приложения?
              </p>
            </div>
            <div className="logout-modal-actions">
              <button 
                className="logout-btn-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Отмена
              </button>
              <button 
                className="logout-btn-confirm"
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