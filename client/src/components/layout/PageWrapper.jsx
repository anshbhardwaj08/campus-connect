// Common page shell: Navbar + centered content + mobile BottomNav
import Navbar from './Navbar';
import BottomNav from './BottomNav';

export default function PageWrapper({ children, className = '' }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <main className={`mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 ${className}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
