// Someone else's profile — what a buyer reads before agreeing to meet.
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ReviewList from '../../components/profile/ReviewList';
import ListingGrid from '../../components/listing/ListingGrid';
import Panel from '../../components/ui/Panel';
import CaptionBox from '../../components/ui/CaptionBox';
import Skeleton from '../../components/ui/Skeleton';

export default function PublicProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data.data.user),
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'by-user', id],
    queryFn: () => api.get(`/users/${id}/listings`).then((r) => r.data.data.listings),
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', 'user', id],
    queryFn: () => api.get(`/users/${id}/reviews`).then((r) => r.data.data.reviews),
  });

  // Your own profile has actions a public one does not, so send yourself there.
  if (me && String(me._id) === String(id)) return <Navigate to="/profile" replace />;

  if (isLoading) {
    return (
      <PageWrapper className="max-w-5xl">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="mt-[9px] h-64 w-full" />
      </PageWrapper>
    );
  }

  if (isError || !user) {
    return (
      <PageWrapper className="max-w-5xl">
        <div className="border-2 border-dashed border-ink/25 px-6 py-20 text-center">
          <p className="font-display text-[30px] leading-none text-ink">NO SUCH FILE</p>
          <p className="meta mt-2">That student is not on the register.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-5xl">
      <ProfileHeader user={user} listingCount={listings?.length} index={0} />

      <div className="mt-[9px]">
        <h2 className="label-xs mb-2.5">Their panels</h2>
        <ListingGrid
          listings={listings || []}
          loading={listingsLoading}
          emptyText="Nothing on the page from them right now."
        />
      </div>

      <div className="mt-[9px]">
        <Panel index={1}>
          <CaptionBox corner="tl">Before you meet them</CaptionBox>
          <div className="pt-8">
            <ReviewList reviews={reviews || []} loading={reviewsLoading} />
          </div>
        </Panel>
      </div>
    </PageWrapper>
  );
}
