// Root app component: wraps the app with Redux, React Query, Router, and Toaster
import { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { store } from './store';
import AppRoutes from './routes/AppRoutes';

const queryClient = new QueryClient();

// Keeps the <html> class in sync with the darkMode flag in Redux so
// Tailwind's `dark:` variants respond to the toggle.
function DarkModeSync() {
  const darkMode = useSelector((state) => state.ui.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return null;
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DarkModeSync />
          <AppRoutes />
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              classNames: {
                toast: 'rounded-xl shadow-soft-lg font-medium',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
