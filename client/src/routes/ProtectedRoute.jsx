// Redirects unauthenticated users to /login before rendering nested routes.
//
// Waits for `ready` first: the session is restored from an httpOnly cookie
// on boot, so for a moment after a refresh a signed-in user still looks
// signed out. Redirecting during that window would throw them to /login
// every time they reloaded a protected page.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, ready } = useAuth();

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
