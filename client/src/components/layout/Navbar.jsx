// The masthead. Sticky, flat ink, full-bleed — deliberately NOT a Panel:
// persistent chrome reads as a fixture, not as a piece of content, so it
// skips the jagged clip-path and just sits as a solid bar with a hard ink
// border underneath it.
//
// Crimson budget for this region: the wordmark (identity) and the search
// GO button (the one action every visitor might take). The Sell / Sign up
// buttons use `variant="ink"` rather than crimson — a third crimson hit in
// one 64px strip stops reading as emphasis and starts reading as wallpaper.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { MessageCircle, Bell, Plus, Menu, X, User, Settings, LogOut, Package } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import useSignOut from '../../hooks/useSignOut';
import useUnreadCounts from '../../hooks/useUnreadCounts';
import { gsap, panelWipe } from '../../lib/motion';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Wordmark from '../ui/Wordmark';
import SearchBar from '../search/SearchBar';

const NAV_LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/looking-for', label: 'Wanted' },
  { to: '/events', label: 'Events' },
  { to: '/lost-found', label: 'Lost & found' },
  { to: '/carpool', label: 'Carpool' },
];

const navLinkClass = ({ isActive }) =>
  `border-b-2 px-1 py-2 text-[12.5px] font-extrabold uppercase tracking-[.06em] transition-colors ${
    isActive
      ? 'border-crimson text-paper-3'
      : 'border-transparent text-paper-3/65 hover:text-paper-3'
  }`;

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  // Server-backed, so both numbers are right on a cold page load — the
  // Redux slices only know about what arrived live on this connection.
  const { chats: unreadChat, notifications: unreadNotifs } = useUnreadCounts();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const signOut = useSignOut();
  const menuRef = useRef(null);

  const goSearch = (q) => navigate(`/browse?q=${encodeURIComponent(q)}`);

  useLayoutEffect(() => {
    if (!mobileOpen || !menuRef.current) return;
    const ctx = gsap.context(() => panelWipe(menuRef.current, { stagger: 0 }), menuRef);
    return () => ctx.revert();
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-ink">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Wordmark size="sm" tone="paper" />

        <nav className="hidden items-center gap-5 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden flex-1 md:block">
          <SearchBar onSearch={goSearch} className="mx-auto max-w-md" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button
                variant="ink"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/listings/new')}
              >
                <Plus className="h-4 w-4" strokeWidth={3} /> Sell
              </Button>

              <IconLink to="/chat" label="Chat" icon={MessageCircle} count={unreadChat} />
              <IconLink
                to="/profile?tab=notifications"
                label="Notifications"
                icon={Bell}
                count={unreadNotifs}
              />

              <AccountMenu user={user} />
            </>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Button variant="link" tone="paper" size="sm" onClick={() => navigate('/login')}>
                Sign in
              </Button>
              <Button variant="ink" size="sm" onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </div>
          )}

          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-[46px] w-[46px] items-center justify-center border-2 border-paper-3/40 text-paper-3 transition-colors hover:border-paper-3 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Menu className="h-5 w-5" strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div ref={menuRef} className="border-t-2 border-paper-3/15 bg-ink px-4 py-4 lg:hidden">
          <div className="mb-4 md:hidden">
            <SearchBar onSearch={goSearch} />
          </div>

          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `border-b border-paper-3/10 py-3 text-[13px] font-extrabold uppercase tracking-[.06em] ${
                    isActive ? 'text-crimson' : 'text-paper-3/80'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated && (
            <div className="mt-4 flex flex-col">
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="border-b border-paper-3/10 py-3 text-[13px] font-extrabold uppercase tracking-[.06em] text-paper-3/80"
              >
                Your profile
              </Link>
              <Link
                to="/deals"
                onClick={() => setMobileOpen(false)}
                className="border-b border-paper-3/10 py-3 text-[13px] font-extrabold uppercase tracking-[.06em] text-paper-3/80"
              >
                Your deals
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className="border-b border-paper-3/10 py-3 text-[13px] font-extrabold uppercase tracking-[.06em] text-paper-3/80"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="py-3 text-left text-[13px] font-extrabold uppercase tracking-[.06em] text-crimson"
              >
                Sign out
              </button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="mt-4 flex gap-3 sm:hidden">
              <Button
                variant="paper"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setMobileOpen(false);
                  navigate('/login');
                }}
              >
                Sign in
              </Button>
              <Button
                variant="ink"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setMobileOpen(false);
                  navigate('/register');
                }}
              >
                Sign up
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

// The avatar opens a small panel rather than linking straight to the
// profile: sign out has to be reachable in one place people expect to find
// it, and burying it in Settings is not that place.
function AccountMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const signOut = useSignOut();

  useEffect(() => {
    if (!open) return;

    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    { to: '/profile', label: 'Your profile', icon: User },
    { to: '/profile?tab=listings', label: 'Your panels', icon: Package },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div ref={ref} className="relative ml-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        className="block"
      >
        <Avatar name={user?.name} src={user?.avatar} size="sm" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[210px] border-[3px] border-ink bg-paper-3 shadow-hard"
        >
          <div className="border-b-2 border-ink/10 px-3 py-2.5">
            <p className="truncate text-[13px] font-extrabold leading-tight text-ink">{user?.name}</p>
            <p className="meta truncate">{user?.collegeEmail}</p>
          </div>

          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-b-2 border-ink/10 px-3 py-2.5 text-[12.5px] font-bold text-ink transition-colors hover:bg-paper-2"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              {label}
            </Link>
          ))}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12.5px] font-extrabold text-crimson transition-colors hover:bg-crimson hover:text-paper-3"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// A 46px paper-bordered icon chip with an ink badge for unread counts.
// The badge is ink/paper, not crimson — crimson in this masthead is spent
// on the logo and the search button; a count does not need the accent to
// read as "new", the number itself carries that.
function IconLink({ to, label, icon: Icon, count = 0 }) {
  return (
    <Link
      to={to}
      aria-label={count > 0 ? `${label} (${count} unread)` : label}
      className="relative flex h-[46px] w-[46px] items-center justify-center border-2 border-paper-3/40 text-paper-3 transition-colors hover:border-paper-3"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center border-2 border-ink bg-paper-3 px-1 font-sans text-[9.5px] font-extrabold leading-none text-ink">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
