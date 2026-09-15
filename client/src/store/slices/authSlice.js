// Auth state: current user, token, and authentication status
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    // False until the boot-time "who am I?" call has answered. Guards
    // exist so ProtectedRoute does not bounce a signed-in user to /login
    // in the moment before their session has been restored.
    ready: false,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token ?? state.token;
      state.isAuthenticated = true;
      state.ready = true;
    },

    // The session check finished and found nobody signed in.
    sessionChecked: (state) => {
      state.ready = true;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.ready = true;
    },
  },
});

export const { setCredentials, sessionChecked, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
