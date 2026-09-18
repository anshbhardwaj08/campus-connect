// All admin panel routes, defined with React Router v6.
//
// Every page is a lazy import. Without this the panel shipped as one file,
// so the login screen downloaded the dashboard's charts, the live socket
// client, every table and every modal before it could ask for a password —
// and most people who open this only ever look at one or two screens.
//
// Shared things (Panel, Button, DataTable, the sidebar) are imported
// normally by the pages that use them and the bundler hoists them into a
// chunk loaded once. Do NOT lazy-load those.
//
// AdminProtectedRoute and AdminWrapper stay eager: the guard decides the
// first frame, and the wrapper is the shell the fallback renders inside.
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import AdminProtectedRoute from './AdminProtectedRoute';
import AdminWrapper from '../components/layout/AdminWrapper';

const AdminLogin = lazy(() => import('../pages/auth/AdminLogin'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const UserList = lazy(() => import('../pages/users/UserList'));
const UserDetail = lazy(() => import('../pages/users/UserDetail'));
const AllListings = lazy(() => import('../pages/listings/AllListings'));
const PendingListings = lazy(() => import('../pages/listings/PendingListings'));
const ReportQueue = lazy(() => import('../pages/reports/ReportQueue'));
const AllDeals = lazy(() => import('../pages/deals/AllDeals'));
const CategoryManager = lazy(() => import('../pages/categories/CategoryManager'));
const EventsAdmin = lazy(() => import('../pages/community/EventsAdmin'));
const Broadcaster = lazy(() => import('../pages/notifications/Broadcaster'));
const AuditLogs = lazy(() => import('../pages/logs/AuditLogs'));
const NotFound = lazy(() => import('../pages/NotFound'));

export default function AdminRoutes() {
  return (
    // Two boundaries, not one. The protected pages get theirs inside
    // AdminWrapper (see that file), so the sidebar stays on screen while a
    // page loads. This outer one only ever covers login and the 404, which
    // render standalone — and its fallback is deliberately nothing, because
    // the paper ground and its halftone live on <body> (index.css). A
    // skeleton shaped like a page it is about to replace would be a worse
    // guess than the empty page it already looks like.
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />

        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminWrapper />}>
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
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
