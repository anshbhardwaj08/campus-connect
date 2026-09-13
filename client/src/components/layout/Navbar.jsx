// Sticky top navigation: logo, search, quick links, and profile/auth actions
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Bell, Plus, Menu, X } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import SearchBar from '../search/SearchBar';

const NAV_LINKS = [
  { to: '/browse', label: 'Browse' },
  { to: '/events', label: 'Events' },
  { to: '/lost-found', label: 'Lost & Found' },
  { to: '/carpool', label: 'Carpool' },
];

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-sm font-extrabold text-white">
            C
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white sm:block">
            Campus<span className="gradient-text">Connect</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 max-w-md md:block">
          <SearchBar onSearch={(q) => navigate(`/browse?q=${encodeURIComponent(q)}`)} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate('/listings/new')}
              >
                <Plus className="h-4 w-4" /> Sell
              </Button>
              <Link
                to="/chat"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                <Bell className="h-5 w-5" />
              </button>
              <Link to="/profile">
                <Avatar name={user?.name} src={user?.avatar} size="sm" />
              </Link>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </div>
          )}

          <button
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800 lg:hidden">
          <div className="mb-3 md:hidden">
            <SearchBar onSearch={(q) => navigate(`/browse?q=${encodeURIComponent(q)}`)} />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={() => navigate('/register')}>
                  Sign up
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
