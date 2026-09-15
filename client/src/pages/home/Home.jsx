// The front page. A splash panel, a category rail, and the listing feed —
// this is a feed, not the full search experience: picking a category here
// filters what's already loaded. Browse (not built yet) is where real
// pagination, sort and price filters live.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import Panel from '../../components/ui/Panel';
import CaptionBox from '../../components/ui/CaptionBox';
import Button from '../../components/ui/Button';
import ListingGrid from '../../components/listing/ListingGrid';
import { categories } from '../../constants/categories';

// Stable empty-array reference so `listings` doesn't get a new [] identity
// every render while the query is still loading — that was invalidating
// the useMemo tallies below on every render.
const EMPTY = [];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null);

  // One decent-sized page powers both the feed and the sidebar counts —
  // there's no aggregate endpoint yet, so counts are a tally of what's
  // loaded here, not a true site-wide total. Fine while listing volume is
  // small; worth a real /categories count endpoint once it isn't.
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'feed'],
    queryFn: () => api.get('/listings', { params: { limit: 100 } }).then((r) => r.data.data.listings),
  });
  const listings = listingsData || EMPTY;

  const { data: conversations } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data.data.conversations),
    enabled: isAuthenticated,
  });

  const { data: savedItems } = useQuery({
    queryKey: ['saved', 'items'],
    queryFn: () => api.get('/saved/items').then((r) => r.data.data.savedItems),
    enabled: isAuthenticated,
  });

  const categoryCounts = useMemo(() => {
    const counts = {};
    listings.forEach((l) => {
      counts[l.category] = (counts[l.category] || 0) + 1;
    });
    return counts;
  }, [listings]);

  const myListingCount = useMemo(
    () => (user ? listings.filter((l) => l.sellerId?._id === user._id).length : 0),
    [listings, user]
  );

  const visibleListings = activeCategory
    ? listings.filter((l) => l.category === activeCategory)
    : listings;

  return (
    <PageWrapper>
      <div className="lg:flex lg:items-start lg:gap-[9px]">
        <Sidebar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          totalCount={listings.length}
          categoryCounts={categoryCounts}
          isAuthenticated={isAuthenticated}
          chatCount={conversations?.length ?? 0}
          savedCount={savedItems?.length ?? 0}
          myListingCount={myListingCount}
        />

        <div className="min-w-0 flex-1">
          <Hero />

          <div className="mt-[9px]">
            <ListingGrid
              listings={visibleListings}
              loading={listingsLoading}
              emptyText={
                activeCategory
                  ? 'Nothing in this category yet. Be the first to list one.'
                  : 'No listings yet. This page opens the moment someone posts.'
              }
            />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function Hero() {
  return (
    <Panel index={0} tone="night" screen="night" className="min-h-[220px]">
      <CaptionBox corner="tl" tone="paper">
        Verified students only
      </CaptionBox>

      <div className="flex h-full flex-col justify-end pt-10">
        <h1 className="font-display text-[38px] leading-[0.94] tracking-[.015em] text-paper-3 sm:text-[48px]">
          EVERYTHING ON CAMPUS
          <br />
          <em className="not-italic text-crimson">CHANGES HANDS HERE</em>
        </h1>
        <p className="mt-3 max-w-[46ch] text-[13px] font-medium leading-relaxed text-ice/85">
          Meet at the gate. Look it over. Then pay.
        </p>
      </div>
    </Panel>
  );
}

function Sidebar({
  activeCategory,
  onSelectCategory,
  totalCount,
  categoryCounts,
  isAuthenticated,
  chatCount,
  savedCount,
  myListingCount,
}) {
  return (
    <aside className="mb-[9px] shrink-0 lg:sticky lg:top-[76px] lg:mb-0 lg:w-[220px]">
      <div className="border-2 border-ink bg-paper-3 p-3.5">
        <p className="label-xs mb-2">The page</p>
        <nav className="flex flex-col">
          <SidebarLink
            label="Everything"
            count={totalCount}
            active={!activeCategory}
            onClick={() => onSelectCategory(null)}
          />
          {categories.map((cat) => (
            <SidebarLink
              key={cat.id}
              label={cat.name}
              count={categoryCounts[cat.slug] || 0}
              active={activeCategory === cat.slug}
              onClick={() => onSelectCategory(cat.slug)}
            />
          ))}
        </nav>

        {isAuthenticated && (
          <>
            <p className="label-xs mb-2 mt-4 border-t-2 border-ink/10 pt-3">Yours</p>
            <nav className="flex flex-col">
              <SidebarLink as={Link} to="/chat" label="Chats" count={chatCount} />
              <SidebarLink as={Link} to="/saved" label="Saved" count={savedCount} />
              <SidebarLink as={Link} to="/profile" label="Your panels" count={myListingCount} />
            </nav>
          </>
        )}

        <Link to="/listings/new" className="mt-4 block">
          <Button variant="primary" size="sm" className="w-full">
            <Plus className="h-4 w-4" strokeWidth={3} /> Sell something
          </Button>
        </Link>

        <p className="meta mt-3 border-l-[3px] border-ink/20 pl-2.5 leading-relaxed">
          Meet at the gate. Look it over. Then pay.
        </p>
      </div>
    </aside>
  );
}

function SidebarLink({ as: Tag = 'button', label, count, active = false, onClick, to }) {
  const extra = Tag === 'button' ? { type: 'button', onClick } : { to };

  return (
    <Tag
      {...extra}
      className={`flex items-center justify-between gap-2 border-b border-ink/8 py-2 text-left text-[13px] transition-colors last:border-b-0 ${
        active ? 'font-extrabold text-ink' : 'font-semibold text-steel hover:text-ink'
      }`}
    >
      <span className="truncate">{label}</span>
      {/* Weight carries "active" here, not colour — the sidebar's one
          crimson element is the Sell button below. */}
      <span className={`text-[11px] font-bold ${active ? 'text-ink' : 'text-steel/70'}`}>
        {count}
      </span>
    </Tag>
  );
}
