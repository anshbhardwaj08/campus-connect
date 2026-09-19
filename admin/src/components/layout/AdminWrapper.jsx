// The shell every protected admin route renders inside: sidebar on the
// left, page content on the right. Each page owns its own <AdminNavbar>
// (title/blurb/actions differ per page) rather than this wrapper trying to
// thread that through context — see pages/dashboard/Dashboard.jsx for the
// pattern.
import { Suspense, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

import AdminSidebar from './AdminSidebar';
import Wordmark from '../ui/Wordmark';
import RouteFallback from './RouteFallback';

export default function AdminWrapper() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Picking a page in the drawer closes it. Done by watching the route (in
  // render, not an effect) rather than by wiring onClick into every link.
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar open={menuOpen} onClose={closeMenu} />
      <main className="min-w-0 flex-1">
        {/* Below lg the rail is gone; this bar is what is left of it. Its
            height (h-14) is what AdminNavbar's `top-14` offsets by. */}
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b-[3px] border-ink bg-ink px-4 lg:hidden">
          <Wordmark size="sm" tone="paper" to="/" />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex h-[42px] w-[42px] items-center justify-center border-2 border-paper-3/40 text-paper-3 transition-colors hover:border-paper-3"
          >
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

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
