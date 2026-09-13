// UI state: dark mode toggle and sidebar collapsed/open state
import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: false,
    sidebarOpen: true,
  },
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleDarkMode, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
