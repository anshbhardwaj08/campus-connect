// All admin panel routes, defined with React Router v6
import { Routes, Route } from 'react-router-dom';

import AdminProtectedRoute from './AdminProtectedRoute';

import AdminLogin from '../pages/auth/AdminLogin';
import Dashboard from '../pages/dashboard/Dashboard';
import UserList from '../pages/users/UserList';
import UserDetail from '../pages/users/UserDetail';
import AllListings from '../pages/listings/AllListings';
import PendingListings from '../pages/listings/PendingListings';
import ReportQueue from '../pages/reports/ReportQueue';
import AllDeals from '../pages/deals/AllDeals';
import CategoryManager from '../pages/categories/CategoryManager';
import EventsAdmin from '../pages/community/EventsAdmin';
import Broadcaster from '../pages/notifications/Broadcaster';
import AuditLogs from '../pages/logs/AuditLogs';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />

      <Route element={<AdminProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<UserList />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/listings" element={<AllListings />} />
        <Route path="/listings/pending" element={<PendingListings />} />
        <Route path="/reports" element={<ReportQueue />} />
        <Route path="/deals" element={<AllDeals />} />
        <Route path="/categories" element={<CategoryManager />} />
        <Route path="/community/events" element={<EventsAdmin />} />
        <Route path="/notifications/broadcast" element={<Broadcaster />} />
        <Route path="/logs" element={<AuditLogs />} />
      </Route>

      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}
