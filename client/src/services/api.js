import axios from 'axios';
import { store } from '../store';
import { setCredentials, logout } from '../store/slices/authSlice';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
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

// Public auth endpoints never carry a session — a 401 from these means
// "invalid credentials" / "invalid OTP", not "your session expired".
// Attempting a token refresh here would mask the real error message.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/verify-email',
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Blocked mid-session: every authenticated request starts 403ing, so
    // without this the app just breaks page by page with no explanation.
    // Keyed on the code, not the status — a 403 from a moderator-only
    // route is an ordinary "not for you" and must not sign anyone out.
    //
    // Sign-in is the login screen's own business, though: it hands the
    // suspension reason to /suspended through router state, and a hard
    // redirect from here would win the race and throw that away.
    const isLoginAttempt = originalRequest.url?.includes('/auth/login');
    if (error.response?.data?.code === 'ACCOUNT_BLOCKED' && !isLoginAttempt) {
      store.dispatch(logout());
      if (window.location.pathname !== '/suspended') {
        window.location.assign('/suspended');
      }
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (PUBLIC_AUTH_PATHS.some((path) => originalRequest.url?.includes(path))) {
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        store.dispatch(logout());
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await api.post('/auth/refresh-token');
      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      store.dispatch(logout());
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
