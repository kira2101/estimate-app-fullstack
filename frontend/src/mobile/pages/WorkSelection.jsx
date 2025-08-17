import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMobileNavigationContext } from '../context/MobileNavigationContext';
import { api } from '../../api/client';
import WorkCard from '../components/ui/WorkCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

/**
 * Work Selection Screen
 * Displays and allows selection of specific works within a category
 */
const WorkSelection = () => {
  const { navigateToScreen, navigationData } = useMobileNavigationContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorks, setSelectedWorks] = useState([]);
  
  const selectedProject = navigationData?.selectedProject;
  const selectedEstimate = navigationData?.selectedEstimate;
  const selectedCategory = navigationData?.selectedCategory;
  const createNewEstimate = navigationData?.createNewEstimate;

  // Fetch all work types for search functionality
  const { 
    data: allWorks = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['mobile-all-work-types'],
    queryFn: api.getAllWorkTypes,
    onError: (error) => {
      console.error('Failed to fetch work types:', error);
    }
  });

  // Filter works by category and search term
  const filteredWorks = useMemo(() => {
    let works = allWorks;
    
    // Filter by category if selected
    if (selectedCategory) {
      works = works.filter(work => work.category === selectedCategory.id);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      works = works.filter(work => 
        work.name.toLowerCase().includes(searchLower) ||
        work.unit.toLowerCase().includes(searchLower)
      );
    }
    
    return works;
  }, [allWorks, selectedCategory, searchTerm]);

  // Redirect if no context
  if (!selectedProject || !selectedCategory) {
    React.useEffect(() => {
      navigateToScreen('projects');
    }, [navigateToScreen]);
    return null;
  }

  const handleWorkToggle = (work) => {
    setSelectedWorks(prev => {
      const isSelected = prev.find(w => w.id === work.id);
      if (isSelected) {
        return prev.filter(w => w.id !== work.id);
      } else {
        return [...prev, { ...work, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (workId, quantity) => {
    setSelectedWorks(prev => 
      prev.map(work => 
        work.id === workId 
          ? { ...work, quantity: Math.max(0, quantity) }
          : work
      ).filter(work => work.quantity > 0)
    );
  };

  const handleContinue = () => {
    if (selectedWorks.length === 0) return;
    
    navigateToScreen('works-summary', true, { 
      selectedProject,
      selectedEstimate,
      selectedCategory,
      selectedWorks,
      createNewEstimate 
    });
  };

  if (isLoading) {
    return (
      <div className="mobile-screen">
        <LoadingSpinner message="Загружаем каталог работ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-screen">
        <ErrorMessage 
          message="Не удалось загрузить каталог работ" 
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="mobile-screen">
      {/* Context Header */}
      <div className="mobile-card context-header">
        <h2 className="context-title">Выбор работ</h2>
        <div className="context-details">
          <div className="context-item">
            <span className="context-label">Категория:</span>
            <span className="context-value">{selectedCategory.name}</span>
          </div>
          <div className="context-item">
            <span className="context-label">Выбрано:</span>
            <span className="context-value">{selectedWorks.length} работ</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mobile-search">
        <input
          type="text"
          placeholder="Поиск работ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mobile-input search-input"
        />
      </div>

      {/* Works List */}
      {filteredWorks.length === 0 ? (
        <div className="mobile-empty">
          <div className="mobile-empty-icon">🔍</div>
          <div className="mobile-empty-text">
            {searchTerm ? 'Ничего не найдено' : 'Нет работ в категории'}
          </div>
          <div className="mobile-empty-subtext">
            {searchTerm 
              ? 'Попробуйте изменить поисковый запрос'
              : 'Обратитесь к менеджеру для добавления работ'
            }
          </div>
        </div>
      ) : (
        <div className="mobile-list">
          {filteredWorks.map((work) => {
            const selectedWork = selectedWorks.find(w => w.id === work.id);
            return (
              <WorkCard
                key={work.id}
                work={work}
                isSelected={!!selectedWork}
                quantity={selectedWork?.quantity || 1}
                onToggle={() => handleWorkToggle(work)}
                onQuantityChange={(quantity) => handleQuantityChange(work.id, quantity)}
              />
            );
          })}
        </div>
      )}

      {/* Continue Button */}
      {selectedWorks.length > 0 && (
        <div className="mobile-floating">
          <button 
            className="mobile-btn continue-btn"
            onClick={handleContinue}
          >
            Продолжить ({selectedWorks.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkSelection;