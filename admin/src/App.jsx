// Root admin app component: wraps the app with Redux, React Query, Router,
// and Toaster. Mirrors client/src/App.jsx.
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { store } from './store';
import AdminRoutes from './routes/AdminRoutes';
import useAdminSessionRestore from './hooks/useAdminSessionRestore';

const queryClient = new QueryClient();

// Restores the signed-in admin from the httpOnly session cookie on every
// page load. Has to live inside <Provider>, since it dispatches.
function AdminSession() {
  useAdminSessionRestore();
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AdminSession />
          <AdminRoutes />

          {/* Do NOT pass `unstyled: true` here — it drops sonner's
              [data-styled] rule and the toast collapses to nothing. See
              client/src/App.jsx and index.css "Toasts". */}
          {/* Below 600px sonner uses mobileOffset, not offset. Without it a
              toast sits on the phone top bar and covers the menu button —
              the only way to change page — for its four seconds. */}
          <Toaster position="top-right" duration={4000} closeButton mobileOffset={{ top: 72 }} />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
