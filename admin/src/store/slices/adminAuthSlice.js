// Admin auth state: current admin/moderator user, and whether the boot-time
// "who am I?" call has answered yet.
//
// The access token lives in an httpOnly cookie (same as /client), so Redux
// only ever mirrors it — `ready` exists so AdminProtectedRoute doesn't bounce
// a signed-in admin to /login in the instant before the session is restored
// on a refresh. See hooks/useAdminSessionRestore.js.
import { createSlice } from '@reduxjs/toolkit';

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState: {
    user: null,
    isAuthenticated: false,
    ready: false,
  },
  reducers: {
    setAdminCredentials: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.ready = true;
    },
    adminSessionChecked: (state) => {
      state.ready = true;
    },
    adminLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.ready = true;
    },
  },
});

export const { setAdminCredentials, adminSessionChecked, adminLogout } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
