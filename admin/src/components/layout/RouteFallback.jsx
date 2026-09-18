// What sits in the content area while a page's JavaScript is being fetched.
//
// Every page is loaded on demand now (see routes/AdminRoutes.jsx). This
// renders inside AdminWrapper, to the right of the sidebar, so the rail
// stays put and only the page swaps — the sidebar is navigation and must
// not flash away when you use it.
//
// No spinner and no crimson: on a warm cache this is on screen for a frame
// or two, and something that appears for 40ms reads as a glitch rather than
// as progress. It borrows AdminNavbar's strip so the arriving page does not
// shift the whole column down.
import Skeleton from '../ui/Skeleton';

export default function RouteFallback() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the page</span>

      <div className="border-b-[3px] border-ink bg-paper px-6 py-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-3 w-72" />
      </div>

      <div className="flex flex-col gap-[9px] p-6">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
