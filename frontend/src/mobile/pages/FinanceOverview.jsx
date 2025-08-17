import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { useMobileAuth } from '../MobileApp';
import { api } from '../../api/client';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Финансы - Обзор
 * Показывает финансовую сводку по проектам и сметам прораба
 */
const FinanceOverview = () => {
  const { navigateToScreen } = useMobileNavigationContext();
  const { user } = useMobileAuth();

  // Загружаем проекты и сметы
  const { 
    data: projects = [], 
    isLoading: projectsLoading 
  } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: api.getProjects,
    enabled: !!user
  });

  const { 
    data: estimates = [], 
    isLoading: estimatesLoading,
    error 
  } = useQuery({
    queryKey: ['estimates', user?.id],
    queryFn: api.getEstimates,
    enabled: !!user
  });

  const isLoading = projectsLoading || estimatesLoading;

  // Форматирование в гривнах
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Вычисляем финансовые показатели
  const calculateFinanceData = () => {
    const totalEstimatesValue = estimates.reduce((sum, estimate) => 
      sum + (estimate.total_cost || 0), 0
    );

    const completedEstimates = estimates.filter(e => e.status?.name === 'Завершена');
    const completedValue = completedEstimates.reduce((sum, estimate) => 
      sum + (estimate.total_cost || 0), 0
    );

    const inProgressEstimates = estimates.filter(e => e.status?.name === 'В работе');
    const inProgressValue = inProgressEstimates.reduce((sum, estimate) => 
      sum + (estimate.total_cost || 0), 0
    );

    // Группируем по проектам
    const projectFinance = projects.map(project => {
      const projectEstimates = estimates.filter(e => e.project === project.id);
      const projectValue = projectEstimates.reduce((sum, e) => sum + (e.total_cost || 0), 0);
      
      return {
        project,
        estimatesCount: projectEstimates.length,
        totalValue: projectValue,
        completedValue: projectEstimates
          .filter(e => e.status?.name === 'Завершена')
          .reduce((sum, e) => sum + (e.total_cost || 0), 0)
      };
    }).filter(p => p.estimatesCount > 0);

    return {
      totalEstimatesValue,
      completedValue,
      inProgressValue,
      totalEstimates: estimates.length,
      completedEstimates: completedEstimates.length,
      inProgressEstimates: inProgressEstimates.length,
      projectFinance
    };
  };

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем финансовые данные..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage message="Ошибка загрузки финансовых данных" />
      </div>
    );
  }

  const financeData = calculateFinanceData();

  return (
    <div className="mobile-screen">
      {/* Общие показатели */}
      <div className="mobile-card">
        <h2 className="section-title">Общие показатели</h2>
        <div className="finance-overview">
          <div className="finance-card">
            <div className="finance-value">
              {formatCurrency(financeData.totalEstimatesValue)}
            </div>
            <div className="finance-label">Общая стоимость работ</div>
          </div>
          
          <div className="finance-stats">
            <div className="finance-stat">
              <span className="stat-value">
                {formatCurrency(financeData.completedValue)}
              </span>
              <span className="stat-label">Завершено</span>
            </div>
            <div className="finance-stat">
              <span className="stat-value">
                {formatCurrency(financeData.inProgressValue)}
              </span>
              <span className="stat-label">В работе</span>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика по проектам */}
      <div className="mobile-card">
        <h3 className="section-title">По проектам</h3>
        {financeData.projectFinance.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-text">Нет финансовых данных</div>
            <div className="mobile-empty-subtext">
              Создайте сметы в проектах для отображения финансовой информации
            </div>
          </div>
        ) : (
          <div className="project-finance-list">
            {financeData.projectFinance.map(({ project, estimatesCount, totalValue, completedValue }) => (
              <div key={project.project_id} className="project-finance-item">
                <div className="project-finance-header">
                  <h4 className="project-finance-name">{project.name}</h4>
                  <span className="project-finance-total">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
                <div className="project-finance-details">
                  <div className="project-finance-detail">
                    <span>Смет:</span>
                    <span>{estimatesCount}</span>
                  </div>
                  <div className="project-finance-detail">
                    <span>Завершено:</span>
                    <span>{formatCurrency(completedValue)}</span>
                  </div>
                  <div className="project-finance-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: totalValue > 0 ? `${(completedValue / totalValue) * 100}%` : '0%' 
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {totalValue > 0 ? Math.round((completedValue / totalValue) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Краткая аналитика */}
      <div className="mobile-card">
        <h3 className="section-title">Краткая аналитика</h3>
        <div className="analytics-grid">
          <div className="analytics-item">
            <div className="analytics-value">{projects.length}</div>
            <div className="analytics-label">Активных проектов</div>
          </div>
          <div className="analytics-item">
            <div className="analytics-value">
              {financeData.totalEstimates > 0 
                ? formatCurrency(Math.round(financeData.totalEstimatesValue / financeData.totalEstimates))
                : formatCurrency(0)
              }
            </div>
            <div className="analytics-label">Средняя смета</div>
          </div>
          <div className="analytics-item">
            <div className="analytics-value">
              {financeData.totalEstimates > 0 
                ? Math.round((financeData.completedEstimates / financeData.totalEstimates) * 100)
                : 0
              }%
            </div>
            <div className="analytics-label">Процент завершения</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceOverview;