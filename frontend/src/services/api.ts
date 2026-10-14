import axios from 'axios';

const API_BASE_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/devices/login') ||
        requestUrl.includes('/login');

      // Clear token and redirect ONLY if session expired while on a protected dashboard route
      if (!isLoginRequest && window.location.pathname !== '/login' && window.location.pathname !== '/device-login') {
        localStorage.removeItem('bit_token');
        localStorage.removeItem('bit_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
