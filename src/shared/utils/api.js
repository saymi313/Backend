import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  // baseURL: 'https://api.scholarslee.com/api',
  timeout: 10000, // 10 seconds for normal operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;

      // Handle 401 Unauthorized
      if (status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please login again.'));
      }

      // Handle 403 Forbidden
      if (status === 403) {
        return Promise.reject(new Error('Access denied. You do not have permission to perform this action.'));
      }

      // Handle 404 Not Found
      if (status === 404) {
        return Promise.reject(new Error('Resource not found.'));
      }

      // Handle 500 Server Error
      if (status >= 500) {
        return Promise.reject(new Error('Server error. Please try again later.'));
      }

      // Return the error message from the server
      return Promise.reject(new Error(data.message || 'An error occurred'));
    }

    // Handle network errors
    if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle other errors
    return Promise.reject(new Error('An unexpected error occurred'));
  }
);

// API endpoints
export const authAPI = {
  // Mentees/Mentors Authentication
  register: (userData) => api.post('/mentees/auth/register', userData),
  login: (credentials) => api.post('/mentees/auth/login', credentials),
  logout: () => api.post('/mentees/auth/logout'),
  getCurrentUser: () => api.get('/mentees/auth/me'),

  // Mentor Authentication
  mentorRegister: (userData) => api.post('/mentors/auth/register', userData),
  mentorLogin: (credentials) => api.post('/mentors/auth/login', credentials),
  mentorLogout: () => api.post('/mentors/auth/logout'),
  getCurrentMentor: () => api.get('/mentors/auth/me'),

  // Admin Authentication
  adminLogin: (credentials) => api.post('/admin/auth/login', credentials),
  adminLogout: () => api.post('/admin/auth/logout'),
  getCurrentAdmin: () => api.get('/admin/auth/me'),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
};

export default api;