import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Estimate Summary Screen
 * Final step to review and save estimate with selected works
 */
const EstimateSummary = () => {
  const { navigateToScreen, navigationData } = useMobileNavigationContext();
  const { user } = useMobileAuth();
  const queryClient = useQueryClient();
  const [estimateName, setEstimateName] = useState('');
  const [estimateDescription, setEstimateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const selectedProject = navigationData?.selectedProject;
  const selectedEstimate = navigationData?.selectedEstimate;
  const selectedWorks = navigationData?.selectedWorks || [];
  const createNewEstimate = navigationData?.createNewEstimate;

  // Redirect if no context
  if (!selectedProject || selectedWorks.length === 0) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  // Calculate totals
  const totalCost = selectedWorks.reduce((sum, work) => 
    sum + (work.cost_price || 0) * work.quantity, 0
  );

  const totalItems = selectedWorks.length;

  // Generate auto name if needed
  const generateEstimateName = () => {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    return `Смета_${timestamp}_${selectedProject.name}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      let estimate = selectedEstimate;

      // Create new estimate if needed
      if (createNewEstimate || !estimate) {
        const estimateData = {
          name: estimateName || generateEstimateName(),
          description: estimateDescription,
          project: selectedProject.id,
          foreman: user.id,
          status: 1, // Draft status
        };

        estimate = await api.createEstimate(estimateData);
      }

      // Add works to estimate
      for (const work of selectedWorks) {
        await api.createEstimateItem({
          estimate: estimate.id,
          work_type: work.id,
          quantity: work.quantity,
          cost_price: work.cost_price,
          client_price: work.cost_price, // Default to cost price
        });
      }

      // Invalidate cache and navigate
      queryClient.invalidateQueries(['mobile-estimates']);
      queryClient.invalidateQueries(['mobile-projects']);

      // Navigate back to project info
      navigateToScreen('project-info', false, { selectedProject });

    } catch (error) {
      console.error('Failed to save estimate:', error);
      setError('Не удалось сохранить смету. Попробуйте еще раз.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaving) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Сохраняем смету..." />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Context Header */}
      <div className="mobile-card context-header">
        <h2 className="context-title">
          {createNewEstimate ? 'Создание сметы' : 'Добавление работ'}
        </h2>
        <div className="context-details">
          <div className="context-item">
            <span className="context-label">Проект:</span>
            <span className="context-value">{selectedProject.name}</span>
          </div>
          <div className="context-item">
            <span className="context-label">Работ выбрано:</span>
            <span className="context-value">{totalItems}</span>
          </div>
        </div>
      </div>

      {/* Estimate Details (only for new estimates) */}
      {createNewEstimate && (
        <div className="mobile-card">
          <h3 className="section-title">Детали сметы</h3>
          <div className="form-group">
            <label className="form-label">Название сметы</label>
            <input
              type="text"
              placeholder="Оставьте пустым для автоматического названия"
              value={estimateName}
              onChange={(e) => setEstimateName(e.target.value)}
              className="mobile-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Описание (необязательно)</label>
            <textarea
              placeholder="Краткое описание сметы"
              value={estimateDescription}
              onChange={(e) => setEstimateDescription(e.target.value)}
              className="mobile-input textarea"
              rows="3"
            />
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mobile-card">
        <h3 className="section-title">Итоги</h3>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Позиций:</span>
            <span className="stat-value">{totalItems}</span>
          </div>
          <div className="summary-stat total">
            <span className="stat-label">Общая стоимость:</span>
            <span className="stat-value">{totalCost.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </div>

      {/* Selected Works List */}
      <div className="mobile-card">
        <h3 className="section-title">Выбранные работы</h3>
        <div className="selected-works-list">
          {selectedWorks.map((work, index) => (
            <div key={work.id} className="selected-work-item">
              <div className="work-item-info">
                <div className="work-item-name">{work.name}</div>
                <div className="work-item-details">
                  {work.quantity} {work.unit} × {(work.cost_price || 0).toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="work-item-total">
                {((work.cost_price || 0) * work.quantity).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mobile-card">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="mobile-card action-buttons">
        <button 
          className="mobile-btn secondary"
          onClick={() => navigateToScreen('works', false)}
        >
          Назад
        </button>
        <button 
          className="mobile-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {createNewEstimate ? 'Создать смету' : 'Добавить работы'}
        </button>
      </div>
    </div>
  );
};

export default EstimateSummary;