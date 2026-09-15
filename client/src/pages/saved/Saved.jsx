// Things you put aside. Saved items store a reference to the listing, so a
// listing that has since been taken down comes back as a null populate —
// those are filtered out rather than rendered as broken cards.
import { useQuery } from '@tanstack/react-query';

import api from '../../services/api';
import PageWrapper from '../../components/layout/PageWrapper';
import ListingGrid from '../../components/listing/ListingGrid';

export default function Saved() {
  const { data: savedItems, isLoading } = useQuery({
    queryKey: ['saved', 'items'],
    queryFn: () => api.get('/saved/items').then((r) => r.data.data.savedItems),
  });

  const listings = (savedItems || []).map((s) => s.listingId).filter(Boolean);
  const removed = (savedItems || []).length - listings.length;

  return (
    <PageWrapper>
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          PUT <span className="text-crimson">ASIDE</span>
        </h1>
        <p className="meta mt-2">
          {removed > 0
            ? `${removed} saved ${removed === 1 ? 'item is' : 'items are'} no longer on the page.`
            : 'Nothing here is yours until you meet and pay.'}
        </p>
      </header>

      <ListingGrid
        listings={listings}
        loading={isLoading}
        emptyText="Nothing saved yet. Hit Save on a listing and it waits here."
      />
    </PageWrapper>
  );
}
