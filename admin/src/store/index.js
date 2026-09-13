import { configureStore } from '@reduxjs/toolkit';
import adminAuthReducer from './slices/adminAuthSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    adminAuth: adminAuthReducer,
    ui: uiReducer,
  },
});

export default store;
