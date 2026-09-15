// The 12-column grid of ListingCards, plus its loading and empty states.
// Cards take col-span-4 on mobile (one per row inside a 4-col grid), half
// width on tablet, a third on desktop.
import { Frown } from 'lucide-react';

import PanelGrid from '../layout/PanelGrid';
import ListingCard from './ListingCard';
import Skeleton from '../ui/Skeleton';

const CARD_SPAN = 'col-span-4 md:col-span-4 xl:col-span-4';

export default function ListingGrid({ listings = [], loading = false, emptyText }) {
  if (loading) {
    return (
      <PanelGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={CARD_SPAN}>
            <Skeleton className="h-[148px] w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <Skeleton className="mt-1.5 h-3 w-2/5" />
          </div>
        ))}
      </PanelGrid>
    );
  }

  if (!listings.length) {
    return (
      <div className="flex flex-col items-center gap-2 border-2 border-dashed border-ink/25 px-6 py-16 text-center">
        <Frown className="h-8 w-8 text-ink/30" strokeWidth={1.75} />
        <p className="font-sans text-[14px] font-bold text-ink">
          {emptyText || 'Nothing here yet.'}
        </p>
      </div>
    );
  }

  return (
    <PanelGrid>
      {listings.map((listing, i) => (
        <div key={listing._id} className={CARD_SPAN}>
          {/* +1 so the grid starts staggering in just after whatever sits
              above it (a Hero panel at index 0); capped at 11 so a long
              feed doesn't push the last card's entrance out by seconds. */}
          <ListingCard listing={listing} index={Math.min(i, 10) + 1} />
        </div>
      ))}
    </PanelGrid>
  );
}
