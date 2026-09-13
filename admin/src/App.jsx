// Root admin app component: wraps the app with Redux, Router, and Toaster
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { store } from './store';
import AdminRoutes from './routes/AdminRoutes';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AdminRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
