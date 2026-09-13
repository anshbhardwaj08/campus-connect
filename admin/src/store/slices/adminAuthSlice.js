// Admin auth state: current admin/moderator user and token
import { createSlice } from '@reduxjs/toolkit';

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
  },
  reducers: {
    setAdminCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token ?? state.token;
      state.isAuthenticated = true;
    },
    adminLogout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setAdminCredentials, adminLogout } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
