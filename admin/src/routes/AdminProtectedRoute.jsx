// Redirects to /login unless the current user is an admin or moderator.
//
// Waits for `ready` first — the session restores from an httpOnly cookie on
// boot (see hooks/useAdminSessionRestore.js), so for a moment after a
// refresh a signed-in admin still looks signed out. Redirecting during that
// window would throw them to /login every time they reloaded.
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

export default function AdminProtectedRoute() {
  const { isAuthenticated, ready } = useAdminAuth();

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
