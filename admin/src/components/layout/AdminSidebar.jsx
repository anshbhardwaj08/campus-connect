// Persistent left rail: branding, navigation, sign out. Ink ground — the
// one place in the admin app that stays dark permanently, the same way the
// client's masthead is a fixture rather than a Panel (see client/src/
// components/layout/Navbar.jsx). Crimson budget here is the Wordmark and
// the active nav item's bar; nothing else in this rail takes the accent.
//
// Below lg the rail would eat most of a phone screen, so it collapses: a
// slim ink bar with a menu button takes its place (AdminWrapper), and the
// same contents open as a drawer over the page.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShieldAlert,
  Flag,
  Handshake,
  Tags,
  CalendarDays,
  Megaphone,
  ScrollText,
  LogOut,
  X,
} from 'lucide-react';

import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useAdminSignOut } from '../../hooks/useAdminSignOut';
import Wordmark from '../ui/Wordmark';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { gsap, panelWipe } from '../../lib/motion';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/listings/pending', label: 'Pending listings', icon: ShieldAlert },
  { to: '/reports', label: 'Reports', icon: Flag },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/listings', label: 'All listings', icon: Package },
  { to: '/deals', label: 'Deals', icon: Handshake },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/community/events', label: 'Events', icon: CalendarDays },
  { to: '/notifications/broadcast', label: 'Broadcast', icon: Megaphone },
  { to: '/logs', label: 'Logs', icon: ScrollText },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 border-l-[3px] px-4 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[.05em] transition-colors ${
    isActive
      ? 'border-crimson bg-paper-3/[0.06] text-paper-3'
      : 'border-transparent text-paper-3/60 hover:text-paper-3'
  }`;

export default function AdminSidebar({ open = false, onClose }) {
  return (
    <>
      {/* `sticky top-0` with a full-viewport height: the rail is navigation,
          so it stays put while the page behind it scrolls. Without this the
          whole column scrolls away with the content and you have to scroll
          back up to change page. */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r-[3px] border-ink bg-ink lg:flex">
        <SidebarContents />
      </aside>

      {open && <Drawer onClose={onClose} />}
    </>
  );
}

function Drawer({ onClose }) {
  const sheet = useRef(null);

  useLayoutEffect(() => {
    if (!sheet.current) return;
    const ctx = gsap.context(() => panelWipe(sheet.current, { stagger: 0 }), sheet);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="screen-coarse fixed inset-0 z-50 bg-ink/60 lg:hidden" onClick={onClose}>
      <aside
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[248px] max-w-[85vw] flex-col border-r-[3px] border-ink bg-ink"
      >
        <SidebarContents onClose={onClose} />
      </aside>
    </div>
  );
}

// `onClose` is only passed inside the drawer: it adds the close button.
// Picking a page closes the drawer from AdminWrapper, which watches the
// route, so the links themselves need nothing extra.
function SidebarContents({ onClose }) {
  const { user } = useAdminAuth();
  const signOut = useAdminSignOut();

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b-2 border-paper-3/10 px-4 py-5">
        <Wordmark size="sm" tone="paper" to="/" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center border-2 border-paper-3/40 text-paper-3 transition-colors hover:border-paper-3"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="border-b-2 border-paper-3/10 px-4 py-3">
        <Badge tone="crimson">{user?.role === 'admin' ? 'Admin' : 'Moderator'}</Badge>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t-2 border-paper-3/10 p-3">
        <div className="flex items-center gap-2.5 px-1 pb-3">
          <Avatar name={user?.name} src={user?.avatar} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-extrabold leading-tight text-paper-3">
              {user?.name}
            </p>
            <p className="truncate text-[10.5px] font-semibold text-paper-3/50">
              {user?.collegeEmail}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 border-2 border-paper-3/15 px-3 py-2.5 text-left text-[11.5px] font-extrabold uppercase tracking-[.05em] text-paper-3/75 transition-colors hover:border-crimson hover:text-crimson"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          Sign out
        </button>
      </div>
    </>
  );
}
