// Redirects to /login unless the current user is an admin or moderator
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

export default function AdminProtectedRoute() {
  const { isAuthenticated, user } = useAdminAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!['admin', 'moderator'].includes(user?.role)) return <Navigate to="/login" replace />;

  return <Outlet />;
}
