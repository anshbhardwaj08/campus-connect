// Mobile tab bar. Flat ink, same as the masthead — persistent chrome, no
// panel clip-path. Sell is a raised crimson square (never a circle: the
// spec allows radius over 4px only on speech bubbles), and it is this bar's
// one crimson element, so the other tabs signal "active" through brightness
// and weight instead — paper-3 + a small dot vs. muted steel.
import { NavLink } from 'react-router-dom';
import { Home, Compass, Plus, MessageCircle, User } from 'lucide-react';

const TABS = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/browse', icon: Compass, label: 'Browse' },
  { to: '/listings/new', icon: Plus, label: 'Sell', sell: true },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] items-stretch border-t-[3px] border-ink bg-ink sm:hidden"
      aria-label="Primary"
    >
      {TABS.map(({ to, end, icon: Icon, label, sell }) =>
        sell ? (
          <NavLink key={to} to={to} className="flex flex-1 items-center justify-center">
            <span className="-mt-4 flex h-[50px] w-[50px] items-center justify-center border-2 border-ink bg-crimson shadow-hard-sm">
              <Icon className="h-6 w-6 text-paper-3" strokeWidth={3} />
            </span>
            <span className="sr-only">{label}</span>
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-5 w-5 ${isActive ? 'text-paper-3' : 'text-steel'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[9.5px] font-extrabold uppercase tracking-[.04em] ${
                    isActive ? 'text-paper-3' : 'text-steel'
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`h-[3px] w-[3px] ${isActive ? 'bg-paper-3' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
              </>
            )}
          </NavLink>
        )
      )}
    </nav>
  );
}
