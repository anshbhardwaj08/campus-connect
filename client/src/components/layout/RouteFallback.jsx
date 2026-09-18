// What sits on screen while a route's JavaScript is being fetched.
//
// Every page is loaded on demand now (see routes/AppRoutes.jsx), so there is
// a gap between clicking a link and the page existing. On a warm cache that
// gap is a frame or two — which is exactly why this is quiet. A spinner that
// appears for 40ms and vanishes reads as a glitch, not as progress.
//
// So: no spinner, no wipe, no crimson. The same breathing halftone blocks
// the grids already use, laid out roughly like a page so the arriving
// content does not jump into a different shape.
import Skeleton from '../ui/Skeleton';

export default function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6" aria-busy="true" aria-live="polite">
      {/* Announced for screen readers, which get no benefit from the
          blocks below. */}
      <span className="sr-only">Loading the page</span>

      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-xs" />

      <div className="mt-8 grid grid-cols-4 gap-[9px] md:grid-cols-8 xl:grid-cols-12">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="col-span-4 h-52" />
        ))}
      </div>
    </div>
  );
}
