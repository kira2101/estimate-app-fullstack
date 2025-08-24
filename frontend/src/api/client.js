// Определяем базовый URL API в зависимости от окружения
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                    (window.location.hostname.includes('dev.app.iqbs.pro') 
                        ? 'https://dev.app.iqbs.pro/api/v1'             // Dev окружение
                        : window.location.hostname.includes('ngrok-free.app')
                        ? 'http://127.0.0.1:8000/api/v1'                // При работе через ngrok используем localhost backend
                        : 'http://127.0.0.1:8000/api/v1');             // localhost

console.log('API_BASE_URL:', API_BASE_URL);

const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    
    const headers = {
        'Content-Type': 'application/json', // По умолчанию
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Если Content-Type установлен в undefined, удаляем его, чтобы браузер установил его сам (для FormData)
    if (headers['Content-Type'] === undefined) {
        delete headers['Content-Type'];
    }

    const config = {
        ...options,
        headers,
        cache: 'no-cache',
    };

    const response = await fetch(url, config);
    
    console.log(`API Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
        if (response.status === 401) {
            console.error("Unauthorized or token expired");
        }
        let errorData;
        try {
            errorData = await response.json();
            console.error('API Error Data:', errorData);
        } catch (e) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Улучшенное извлечение сообщения об ошибке
        let errorMessage = 'Something went wrong';
        if (errorData.detail) {
            errorMessage = errorData.detail;
        } else if (errorData.error) {
            errorMessage = errorData.error;
        } else if (errorData.message) {
            errorMessage = errorData.message;
        } else if (Array.isArray(errorData) && errorData.length > 0) {
            // Обработка массива ошибок от Django REST Framework
            const firstError = errorData[0];
            if (typeof firstError === 'string') {
                // Извлекаем текст из ErrorDetail если он есть
                const match = firstError.match(/string="([^"]+)"/);
                errorMessage = match ? match[1] : firstError;
            } else if (firstError.string) {
                errorMessage = firstError.string;
            }
        } else if (typeof errorData === 'string') {
            // Обработка строки с ErrorDetail - извлекаем текст из строки
            const match = errorData.match(/string="([^"]+)"/);
            errorMessage = match ? match[1] : errorData;
        }
        
        throw new Error(errorMessage);
    }
    if (response.status === 204) {
        return;
    }
    return response.json();
};

export const api = {
    login: (email, password) => request('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getCurrentUser: () => request('/auth/me/'),
    
    // Справочники
    getWorkCategories: () => request('/work-categories/'),
    createWorkCategory: (data) => request('/work-categories/', { method: 'POST', body: JSON.stringify(data) }),
    updateWorkCategory: (id, data) => request(`/work-categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWorkCategory: (id) => request(`/work-categories/${id}/`, { method: 'DELETE' }),

    getWorkTypes: (page = 1, pageSize = 20) => request(`/work-types/?page=${page}&page_size=${pageSize}`),
    getAllWorkTypes: () => request('/work-types/?all=true'), // Для поиска и выбора без пагинации - все работы
    createWorkType: (data) => request('/work-types/', { method: 'POST', body: JSON.stringify(data) }),
    updateWorkType: (id, data) => request(`/work-types/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWorkType: (id) => request(`/work-types/${id}/`, { method: 'DELETE' }),
    importWorkTypes: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        // Для multipart/form-data Content-Type устанавливается браузером автоматически
        return request('/work-types/import/', { 
            method: 'POST', 
            body: formData, 
            headers: {
                'Content-Type': undefined 
            }
        });
    },

    getStatuses: () => request('/statuses/'),

    // Проекты (Объекты)
    getProjects: () => request('/projects/'),
    createProject: (data) => request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
    updateProject: (id, data) => request(`/projects/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProject: (id) => request(`/projects/${id}/`, { method: 'DELETE' }),

    // Сметы
    getEstimates: () => {
        // ИСПРАВЛЕНИЕ: убираем параметр mobile_sum - прорабы везде видят только свои работы
        return request('/estimates/');
    },
    getEstimate: (id) => request(`/estimates/${id}/`), // Для получения одной сметы
    createEstimate: (data) => request('/estimates/', { method: 'POST', body: JSON.stringify(data) }),
    updateEstimate: (id, data) => request(`/estimates/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEstimate: (id) => request(`/estimates/${id}/`, { method: 'DELETE' }),

    // Пользователи
    getUsers: () => request('/users/'),
    createUser: (data) => request('/users/', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (id, data) => request(`/users/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id) => request(`/users/${id}/`, { method: 'DELETE' }),

    // Роли
    getRoles: () => request('/roles/'), // Предполагая, что такой эндпоинт будет создан

    // Назначения
    getProjectAssignments: () => request('/project-assignments/'),
    createProjectAssignment: (data) => request('/project-assignments/', { method: 'POST', body: JSON.stringify(data) }),
    deleteProjectAssignment: (id) => request(`/project-assignments/${id}/`, { method: 'DELETE' }),

    // Экспорт смет
    exportEstimateForClient: async (estimateId) => {
        const token = localStorage.getItem('authToken');
        const url = `${API_BASE_URL}/estimates/${estimateId}/export/client/`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-cache',
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || 'Ошибка экспорта');
        }
        
        return response.blob();
    },

    exportEstimateInternal: async (estimateId) => {
        const token = localStorage.getItem('authToken');
        const url = `${API_BASE_URL}/estimates/${estimateId}/export/internal/`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-cache',
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || 'Ошибка экспорта');
        }
        
        return response.blob();
    },

    // Работа с элементами смет
    getEstimateItems: async (estimateId) => {
        // ИСПРАВЛЕНИЕ: убираем параметр mobileFilter - прорабы везде видят только свои работы
        const url = `${API_BASE_URL}/estimate-items/?estimate=${estimateId}`;
            
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch estimate items');
        }
        return response.json();
    },
    
    createEstimateItem: (data) => {
        console.log('🔗 Создание элемента сметы через новый ViewSet:', data);
        return request('/estimate-items/', { method: 'POST', body: JSON.stringify(data) });
    },
};