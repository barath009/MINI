
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach authentication token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bit_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API responses and expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';

      const isLoginRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/devices/login') ||
        requestUrl.includes('/login');

      const currentPath = window.location.pathname;

      // Redirect only when a protected session has expired
      if (
        !isLoginRequest &&
        currentPath !== '/login' &&
        currentPath !== '/device-login'
      ) {
        localStorage.removeItem('bit_token');
        localStorage.removeItem('bit_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
