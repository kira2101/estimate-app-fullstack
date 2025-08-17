import React from 'react';
import { useMobileNavigationContext } from './context/MobileNavigationContext';
import ProjectsList from './pages/ProjectsList';
import ProjectInfo from './pages/ProjectInfo';
import AllEstimates from './pages/AllEstimates';
import WorkCategories from './pages/WorkCategories';
import WorkSelection from './pages/WorkSelection';
import EstimateSummary from './pages/EstimateSummary';
import FinanceOverview from './pages/FinanceOverview';
import ProfileInfo from './pages/ProfileInfo';

/**
 * Mobile Router Component
 * Routes between different mobile screens based on navigation state
 */
const MobileRouter = () => {
  const { currentScreen } = useMobileNavigationContext();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'projects':
        return <ProjectsList />;
      case 'project-info':
        return <ProjectInfo />;
      case 'estimates':
        return <AllEstimates />;
      case 'categories':
        return <WorkCategories />;
      case 'works':
        return <WorkSelection />;
      case 'works-summary':
        return <EstimateSummary />;
      case 'finance':
        return <FinanceOverview />;
      case 'profile':
        return <ProfileInfo />;
      default:
        return (
          <div className="mobile-error">
            <h2>Страница не найдена</h2>
            <p>Экран "{currentScreen}" не существует</p>
          </div>
        );
    }
  };

  return (
    <div className="mobile-router">
      {renderScreen()}
    </div>
  );
};

export default MobileRouter;