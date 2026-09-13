// Mobile bottom tab bar: Home, Browse, Post (highlighted), Chat, Profile
import { NavLink } from 'react-router-dom';
import { Home, Compass, PlusCircle, MessageCircle, User } from 'lucide-react';

const TABS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/browse', icon: Compass, label: 'Browse' },
  { to: '/listings/new', icon: PlusCircle, label: 'Sell', highlight: true },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-zinc-100 bg-white/95 px-2 py-2 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
      {TABS.map(({ to, icon: Icon, label, highlight }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${
              highlight
                ? 'text-white'
                : isActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-zinc-400 dark:text-zinc-500'
            }`
          }
        >
          {highlight ? (
            <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-soft-lg">
              <Icon className="h-6 w-6 text-white" />
            </span>
          ) : (
            <Icon className="h-5 w-5" />
          )}
          {!highlight && label}
        </NavLink>
      ))}
    </nav>
  );
}
