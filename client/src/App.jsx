// Root app component: wraps the app with Redux, React Query, Router, and Toaster
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { store } from './store';
import AppRoutes from './routes/AppRoutes';
import useSessionRestore from './hooks/useSessionRestore';
import useSocket from './hooks/useSocket';
import useNotifications from './hooks/useNotifications';

const queryClient = new QueryClient();

// All of these have to live inside <Provider>, since they read or dispatch.
//
//  * useSessionRestore — restores the signed-in user from the httpOnly
//    session cookie on every page load. Redux is memory-only, so without
//    this a refresh looks like a logout.
//  * useSocket        — opens the Socket.io connection once signed in, and
//    closes it on logout. Chat and notifications both ride on it.
//  * useNotifications — feeds `notification:new` into the store and raises
//    a toast, which is how anyone finds out a message arrived.
function AppSession() {
  useSessionRestore();
  useSocket();
  useNotifications();
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppSession />
          <AppRoutes />

          {/* Toasts are panels, but sonner keeps its own layout and mount
              animation — the Comic Noir paint is applied in index.css under
              "Toasts".

              Do NOT set `unstyled: true` here. That drops sonner's
              [data-styled] rule, which is what supplies width, display:flex
              and padding, so the toast renders as a zero-size box and nothing
              appears on screen.

              `richColors` stays off: it ships green and red, which would be a
              second and third accent. Errors go crimson in index.css. */}
          {/* Offset clears the 67px masthead. Without it, toasts render
              directly over the chat, bell and avatar controls and swallow
              clicks aimed at them for as long as the toast is up — the
              buttons look fine and simply do not respond. */}
          {/* Both offsets clear the 64px masthead. Below 600px sonner reads
              mobileOffset instead of offset; without it, a toast on a phone
              covers the menu, chat and account buttons. */}
          <Toaster
            position="top-right"
            duration={4000}
            closeButton
            offset={{ top: 80 }}
            mobileOffset={{ top: 80 }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
