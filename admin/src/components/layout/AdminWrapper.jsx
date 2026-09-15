// The shell every protected admin route renders inside: sidebar on the
// left, page content on the right. Each page owns its own <AdminNavbar>
// (title/blurb/actions differ per page) rather than this wrapper trying to
// thread that through context — see pages/dashboard/Dashboard.jsx for the
// pattern.
import { Outlet } from 'react-router-dom';

import AdminSidebar from './AdminSidebar';

export default function AdminWrapper() {
  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
