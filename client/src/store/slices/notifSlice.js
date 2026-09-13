// Notifications state: in-app notification feed
import { createSlice } from '@reduxjs/toolkit';

const notifSlice = createSlice({
  name: 'notif',
  initialState: {
    notifications: [],
  },
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
    markAsRead: (state, action) => {
      const notif = state.notifications.find((n) => n._id === action.payload);
      if (notif) notif.read = true;
    },
  },
});

export const { setNotifications, addNotification, markAsRead } = notifSlice.actions;
export default notifSlice.reducer;
