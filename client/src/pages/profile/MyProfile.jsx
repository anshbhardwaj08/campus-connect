// Your own profile: your file, your listings, and what people said about you.
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ReviewList from '../../components/profile/ReviewList';
import ListingGrid from '../../components/listing/ListingGrid';
import Panel from '../../components/ui/Panel';
import CaptionBox from '../../components/ui/CaptionBox';
import NotificationList from '../../components/profile/NotificationList';

const TABS = [
  { id: 'listings', label: 'Your panels' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'reviews', label: 'Reviews' },
];

export default function MyProfile() {
  const { user } = useAuth();

  // In the URL rather than in state, so the masthead bell can link straight
  // to the notifications tab and a refresh keeps you where you were.
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'listings';
  const setTab = (id) => setParams(id === 'listings' ? {} : { tab: id }, { replace: true });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'mine'],
    queryFn: () => api.get('/users/me/listings').then((r) => r.data.data.listings),
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', 'mine', user?._id],
    queryFn: () => api.get(`/users/${user._id}/reviews`).then((r) => r.data.data.reviews),
    enabled: Boolean(user?._id),
  });

  return (
    <PageWrapper className="max-w-5xl">
      <ProfileHeader user={user} isMe listingCount={listings?.length} index={0} />

      <div className="mt-[9px] flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={`border-2 border-ink px-3 py-2 text-[11.5px] font-extrabold uppercase tracking-[.06em] transition-colors ${
              tab === t.id ? 'bg-ink text-paper-3' : 'bg-paper-3 text-ink hover:bg-paper-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-[9px]">
        {tab === 'listings' && (
          <ListingGrid
            listings={listings || []}
            loading={listingsLoading}
            emptyText="You have not put anything on the page yet."
          />
        )}

        {tab === 'notifications' && (
          <Panel index={1}>
            <CaptionBox corner="tl">What you missed</CaptionBox>
            <div className="pt-8">
              <NotificationList />
            </div>
          </Panel>
        )}

        {tab === 'reviews' && (
          <Panel index={1}>
            <CaptionBox corner="tl">What they said afterwards</CaptionBox>
            <div className="pt-8">
              <ReviewList
                reviews={reviews || []}
                loading={reviewsLoading}
                emptyText="Nobody has reviewed you yet. Close a deal and they will."
              />
            </div>
          </Panel>
        )}
      </div>
    </PageWrapper>
  );
}
