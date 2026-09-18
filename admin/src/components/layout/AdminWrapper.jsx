// The shell every protected admin route renders inside: sidebar on the
// left, page content on the right. Each page owns its own <AdminNavbar>
// (title/blurb/actions differ per page) rather than this wrapper trying to
// thread that through context — see pages/dashboard/Dashboard.jsx for the
// pattern.
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import AdminSidebar from './AdminSidebar';
import RouteFallback from './RouteFallback';

export default function AdminWrapper() {
  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        {/* The boundary sits here rather than around the whole route tree
            so that only the page suspends. Pages are fetched on demand now
            (routes/AdminRoutes.jsx), and a sidebar that vanished every time
            you clicked an item in it would be worse than the wait. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
