import React, { useState, useEffect, useRef } from 'react';
import './WorkSearchDropdown.css';

/**
 * Touch-optimized work search dropdown component
 * Allows searching and selecting works to add to estimate
 */
const WorkSearchDropdown = ({ 
  allWorks = [], 
  onWorkSelect, 
  placeholder = "Поиск работ...", 
  disabled = false,
  selectedWorks = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredWorks, setFilteredWorks] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef([]);

  // Filter and group works based on search term with relevance scoring
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredWorks([]);
      setSelectedIndex(-1);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const searchWords = searchLower.split(' ').filter(word => word.length > 0);
    
    const filtered = allWorks
      .map(work => {
        const workName = (work.work_name || work.name || '').toLowerCase();
        const categoryName = (work.category?.category_name || '').toLowerCase();
        const unit = (work.unit_of_measurement || work.unit || '').toLowerCase();
        
        let score = 0;
        
        // Highest priority: exact match at start of work name
        if (workName.startsWith(searchLower)) {
          score += 1000;
        }
        // High priority: work name starts with any search word
        else if (searchWords.some(word => workName.startsWith(word))) {
          score += 500;
        }
        // Medium priority: work name contains search term
        else if (workName.includes(searchLower)) {
          score += 200;
        }
        // Lower priority: any search word in work name
        else if (searchWords.some(word => workName.includes(word))) {
          score += 100;
        }
        
        // Category matches (lower priority than work name)
        if (categoryName.startsWith(searchLower)) {
          score += 50;
        } else if (categoryName.includes(searchLower)) {
          score += 25;
        }
        
        // Unit matches (lowest priority)
        if (unit.includes(searchLower)) {
          score += 10;
        }
        
        return { work, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Primary sort by score (descending)
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Secondary sort by category name, then work name
        const aCategoryName = a.work.category?.category_name || 'Без категории';
        const bCategoryName = b.work.category?.category_name || 'Без категории';
        if (aCategoryName !== bCategoryName) {
          return aCategoryName.localeCompare(bCategoryName);
        }
        // Tertiary sort by work name length (shorter names first for exact matches)
        const aName = a.work.work_name || a.work.name || '';
        const bName = b.work.work_name || b.work.name || '';
        return aName.length - bName.length;
      })
      .slice(0, 20) // Limit to 20 results for performance
      .map(item => item.work);

    setFilteredWorks(filtered);
    setSelectedIndex(-1);
  }, [searchTerm, allWorks]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(value.trim().length > 0);
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (searchTerm.trim().length > 0) {
      setIsOpen(true);
    }
  };

  // Handle input blur with delay to allow clicks
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Handle work selection
  const handleWorkSelect = (work) => {
    console.log('🔍 WorkSearchDropdown: Выбрана работа:', work.work_name || work.name);
    
    // Check if work is already selected
    const workId = work.work_type_id || work.id;
    const isAlreadySelected = selectedWorks.some(w => 
      (w.work_type_id || w.id) === workId
    );

    if (isAlreadySelected) {
      console.log('⚠️ WorkSearchDropdown: Работа уже добавлена в смету');
      // Could show a toast message here
      return;
    }

    // Clear search and close dropdown
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Blur input to close mobile keyboard
    if (inputRef.current) {
      inputRef.current.blur();
    }

    // Call parent callback
    onWorkSelect(work);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredWorks.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredWorks.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredWorks.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredWorks.length) {
          handleWorkSelect(filteredWorks[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className="work-search-dropdown" ref={dropdownRef}>
      {/* Search Input */}
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="search-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        
        {/* Search Icon */}
        <div className="search-icon">
          🔍
        </div>
        
        {/* Clear Button */}
        {searchTerm && (
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
              setSelectedIndex(-1);
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown List */}
      {isOpen && filteredWorks.length > 0 && (
        <div className="dropdown-list">
          {(() => {
            // Group works by category
            const groupedWorks = filteredWorks.reduce((groups, work) => {
              const categoryName = work.category?.category_name || 'Без категории';
              if (!groups[categoryName]) {
                groups[categoryName] = [];
              }
              groups[categoryName].push(work);
              return groups;
            }, {});

            let currentIndex = 0;
            return Object.entries(groupedWorks).map(([categoryName, works]) => (
              <div key={categoryName} className="dropdown-category-group">
                {/* Category Header */}
                <div className="dropdown-category-header">
                  {categoryName}
                </div>
                
                {/* Works in this category */}
                {works.map((work) => {
                  const workId = work.work_type_id || work.id;
                  const isAlreadySelected = selectedWorks.some(w => 
                    (w.work_type_id || w.id) === workId
                  );
                  const itemIndex = currentIndex++;

                  return (
                    <div
                      key={workId}
                      ref={el => itemRefs.current[itemIndex] = el}
                      className={`dropdown-item ${
                        itemIndex === selectedIndex ? 'selected' : ''
                      } ${isAlreadySelected ? 'already-added' : ''}`}
                      onClick={() => handleWorkSelect(work)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="work-info">
                        <div className="work-name">
                          {work.work_name || work.name}
                          {isAlreadySelected && (
                            <span className="already-added-badge">✓ Добавлено</span>
                          )}
                        </div>
                        <div className="work-details">
                          <span className="work-unit">
                            {work.unit_of_measurement || work.unit || 'шт.'}
                          </span>
                          {(work.prices?.cost_price !== undefined || work.cost_price !== undefined) && (
                            <span className="work-price">
                              {parseFloat(work.prices?.cost_price || work.cost_price || 0).toFixed(2)} ₴
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
          
          {/* Show "not found" message if no results */}
          {searchTerm.trim() && filteredWorks.length === 0 && (
            <div className="dropdown-item no-results">
              <div className="work-info">
                <div className="work-name">Работы не найдены</div>
                <div className="work-details">Попробуйте изменить поисковый запрос</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkSearchDropdown;