const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const request = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(url, config);
    if (!response.ok) {
        if (response.status === 401) {
            console.error("Unauthorized or token expired");
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || 'Something went wrong');
    }
    if (response.status === 204) {
        return;
    }
    return response.json();
};

export const api = {
    login: (email, password) => request('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) }),
    
    // Справочники
    getWorkCategories: () => request('/work-categories/'),
    createWorkCategory: (data) => request('/work-categories/', { method: 'POST', body: JSON.stringify(data) }),
    updateWorkCategory: (id, data) => request(`/work-categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWorkCategory: (id) => request(`/work-categories/${id}/`, { method: 'DELETE' }),

    getWorkTypes: () => request('/work-types/'),
    createWorkType: (data) => request('/work-types/', { method: 'POST', body: JSON.stringify(data) }),
    updateWorkType: (id, data) => request(`/work-types/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWorkType: (id) => request(`/work-types/${id}/`, { method: 'DELETE' }),

    getStatuses: () => request('/statuses/'),

    // Проекты (Объекты)
    getProjects: () => request('/projects/'),
    createProject: (data) => request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
    updateProject: (id, data) => request(`/projects/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProject: (id) => request(`/projects/${id}/`, { method: 'DELETE' }),

    // Сметы
    getEstimates: () => request('/estimates/'),
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
};