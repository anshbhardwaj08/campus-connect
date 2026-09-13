import axios from 'axios';
import { store } from '../store';
import { setAdminCredentials, adminLogout } from '../store/slices/adminAuthSlice';

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

adminApi.interceptors.request.use((config) => {
  const token = store.getState().adminAuth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  refreshQueue = [];
};

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh-token')) {
      store.dispatch(adminLogout());
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then(() => adminApi(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await adminApi.post('/auth/refresh-token');
      processQueue(null);
      return adminApi(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      store.dispatch(adminLogout());
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default adminApi;
