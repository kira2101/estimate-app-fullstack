/**
 * Мобильные API утилиты с интеграцией Event Bus
 * Специализированные функции для React Query с автоматической отправкой событий
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiWithEvents from '../../api/apiWithEvents';
import { useEventBusEmitter } from '../../hooks/useEventBus';
import { ESTIMATE_EVENTS, PROJECT_EVENTS } from '../../utils/EventTypes';

/**
 * Hook для создания сметы с событиями
 */
export const useCreateEstimateWithEvents = () => {
  const queryClient = useQueryClient();
  const emit = useEventBusEmitter();

  return useMutation({
    mutationFn: (estimateData) => apiWithEvents.createEstimate(estimateData),
    onSuccess: (data, variables) => {
      // EventBus автоматически инвалидирует кэши через apiWithEvents
      // Но мы можем добавить дополнительную логику здесь
      console.log('✅ Смета создана через мобильный интерфейс:', data);
      
      // Дополнительные действия для мобильного интерфейса
      queryClient.setQueryData(['estimates'], (oldData) => {
        const estimates = oldData?.results || [];
        return {
          ...oldData,
          results: [data, ...estimates]
        };
      });
    },
    onError: (error) => {
      console.error('❌ Ошибка создания сметы в мобильном интерфейсе:', error);
    }
  });
};

/**
 * Hook для обновления сметы с событиями
 */
export const useUpdateEstimateWithEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiWithEvents.updateEstimate(id, data),
    onSuccess: (data, variables) => {
      console.log('✅ Смета обновлена через мобильный интерфейс:', data);
      
      // Обновляем кэш оптимистично
      queryClient.setQueryData(['estimates'], (oldData) => {
        const estimates = oldData?.results || [];
        const updatedEstimates = estimates.map(estimate => 
          estimate.estimate_id === variables.id ? { ...estimate, ...data } : estimate
        );
        return {
          ...oldData,
          results: updatedEstimates
        };
      });

      // Также обновляем кэш конкретной сметы, если он существует
      queryClient.setQueryData(['estimate', variables.id], data);
    },
    onError: (error) => {
      console.error('❌ Ошибка обновления сметы в мобильном интерфейсе:', error);
    }
  });
};

/**
 * Hook для удаления сметы с событиями
 */
export const useDeleteEstimateWithEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (estimateId) => apiWithEvents.deleteEstimate(estimateId),
    onSuccess: (data, estimateId) => {
      console.log('✅ Смета удалена через мобильный интерфейс:', estimateId);
      
      // Оптимистично удаляем из кэша
      queryClient.setQueryData(['estimates'], (oldData) => {
        const estimates = oldData?.results || [];
        const filteredEstimates = estimates.filter(e => e.estimate_id !== estimateId);
        return {
          ...oldData,
          results: filteredEstimates
        };
      });

      // Удаляем кэш конкретной сметы
      queryClient.removeQueries({ queryKey: ['estimate', estimateId] });
    },
    onError: (error) => {
      console.error('❌ Ошибка удаления сметы в мобильном интерфейсе:', error);
    }
  });
};

/**
 * Hook для создания проекта с событиями
 */
export const useCreateProjectWithEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectData) => apiWithEvents.createProject(projectData),
    onSuccess: (data) => {
      console.log('✅ Проект создан через мобильный интерфейс:', data);
      
      queryClient.setQueryData(['projects'], (oldData) => {
        const projects = oldData?.results || [];
        return {
          ...oldData,
          results: [data, ...projects]
        };
      });
    },
    onError: (error) => {
      console.error('❌ Ошибка создания проекта в мобильном интерфейсе:', error);
    }
  });
};

/**
 * Hook для создания элемента сметы с событиями
 */
export const useCreateEstimateItemWithEvents = () => {
  const queryClient = useQueryClient();
  const emit = useEventBusEmitter();

  return useMutation({
    mutationFn: (itemData) => apiWithEvents.createEstimateItem(itemData),
    onSuccess: (data, variables) => {
      console.log('✅ Элемент сметы создан через мобильный интерфейс:', data);
      
      // Отправляем событие для синхронизации
      emit(ESTIMATE_EVENTS.ITEM_ADDED, {
        estimateId: variables.estimate,
        item: data,
        source: 'mobile'
      });

      // Инвалидируем кэш элементов сметы
      queryClient.invalidateQueries({ 
        queryKey: ['estimate-items', variables.estimate] 
      });
      
      // Также инвалидируем кэш самой сметы
      queryClient.invalidateQueries({ 
        queryKey: ['estimate', variables.estimate] 
      });
    },
    onError: (error) => {
      console.error('❌ Ошибка создания элемента сметы в мобильном интерфейсе:', error);
    }
  });
};

/**
 * Общие утилиты для мобильного API с событиями
 */
export const mobileApiUtils = {
  /**
   * Инвалидировать кэши связанные с проектом
   */
  invalidateProjectCaches: (queryClient, projectId) => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['estimates'] }); // Сметы могут измениться
  },

  /**
   * Инвалидировать кэши связанные со сметой
   */
  invalidateEstimateCaches: (queryClient, estimateId) => {
    queryClient.invalidateQueries({ queryKey: ['estimates'] });
    queryClient.invalidateQueries({ queryKey: ['estimate', estimateId] });
    queryClient.invalidateQueries({ queryKey: ['estimate-items', estimateId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] }); // Статистика проектов может измениться
  },

  /**
   * Получить оптимистичные данные для UI
   */
  getOptimisticEstimate: (variables) => ({
    estimate_id: 'temp_' + Date.now(),
    estimate_number: variables.estimate_number || 'Новая смета',
    status: variables.status || { status_name: 'Черновик' },
    project: variables.project,
    foreman: variables.foreman,
    items: [],
    created_at: new Date().toISOString(),
    ...variables
  }),

  /**
   * Получить оптимистичные данные проекта для UI
   */
  getOptimisticProject: (variables) => ({
    project_id: 'temp_' + Date.now(),
    project_name: variables.project_name,
    project_description: variables.project_description || '',
    created_at: new Date().toISOString(),
    ...variables
  })
};

export default {
  useCreateEstimateWithEvents,
  useUpdateEstimateWithEvents,
  useDeleteEstimateWithEvents,
  useCreateProjectWithEvents,
  useCreateEstimateItemWithEvents,
  mobileApiUtils
};