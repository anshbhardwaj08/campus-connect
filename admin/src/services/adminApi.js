// Same shape as client/src/services/api.js: the access token lives in an
// httpOnly cookie, not in Redux, so there is no Authorization header to set —
// `withCredentials` is what carries the session on every request.
import axios from 'axios';
import { store } from '../store';
import { adminLogout } from '../store/slices/adminAuthSlice';

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
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

// A 401 from /auth/login itself means "wrong credentials", not "session
// expired" — attempting a refresh here would mask the real error.
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/refresh-token'];

adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (PUBLIC_AUTH_PATHS.some((path) => originalRequest.url?.includes(path))) {
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        store.dispatch(adminLogout());
      }
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
