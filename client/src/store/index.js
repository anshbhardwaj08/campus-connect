import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import notifReducer from './slices/notifSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    notif: notifReducer,
    ui: uiReducer,
  },
});

export default store;
