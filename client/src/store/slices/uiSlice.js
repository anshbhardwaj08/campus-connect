// UI state: dark mode toggle and sidebar visibility
import { createSlice } from '@reduxjs/toolkit';

const getInitialDarkMode = () => {
  try {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable — fall through to system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    darkMode: getInitialDarkMode(),
    sidebarOpen: false,
  },
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      try {
        localStorage.setItem('darkMode', String(state.darkMode));
      } catch {
        // ignore — per-viewer convenience only
      }
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleDarkMode, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
