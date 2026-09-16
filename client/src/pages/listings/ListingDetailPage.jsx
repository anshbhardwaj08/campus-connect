// Single listing page. Fetches the listing, records a view once, and wires
// up save/unsave against the real saved-items endpoints.
import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import ListingDetail from '../../components/listing/ListingDetail';
import ListingGrid from '../../components/listing/ListingGrid';
import Skeleton from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const viewRecorded = useRef(null);

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.get(`/listings/${id}`).then((r) => r.data.data.listing),
  });

  const { data: similar } = useQuery({
    queryKey: ['listing', id, 'similar'],
    queryFn: () => api.get(`/listings/${id}/similar`).then((r) => r.data.data.listings),
    enabled: Boolean(listing),
  });

  const { data: savedItems } = useQuery({
    queryKey: ['saved', 'items'],
    queryFn: () => api.get('/saved/items').then((r) => r.data.data.savedItems),
    enabled: isAuthenticated,
  });

  // Count the view once per listing per mount — StrictMode double-invokes
  // effects in development, and without the guard every dev page load would
  // inflate the counter by two.
  useEffect(() => {
    if (!id || viewRecorded.current === id) return;
    viewRecorded.current = id;
    api.patch(`/listings/${id}/view`).catch(() => {});
  }, [id]);

  const saved = Boolean(savedItems?.some((s) => (s.listingId?._id || s.listingId) === id));

  const saveMutation = useMutation({
    mutationFn: () =>
      saved ? api.delete(`/saved/items/${id}`) : api.post('/saved/items', { listingId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved', 'items'] });
      toast.success(saved ? 'Removed from saved.' : 'Saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save that.')),
  });

  // The way back from 'rented'. A hire ends with the item in the owner's
  // hands again, so unlike a sale this status has to be reversible.
  const relistMutation = useMutation({
    mutationFn: () => api.patch(`/listings/${id}/relist`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      toast.success('Back on the page.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not list that again.')),
  });

  const onSave = () => {
    if (!isAuthenticated) {
      toast.error('Sign in to save a listing.');
      return;
    }
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="grid gap-[9px] lg:grid-cols-12">
          <Skeleton className="h-[420px] lg:col-span-7" />
          <Skeleton className="h-[420px] lg:col-span-5" />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !listing) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-4 border-2 border-dashed border-ink/25 px-6 py-20 text-center">
          <p className="font-display text-[30px] leading-none text-ink">PANEL NOT FOUND</p>
          <p className="meta max-w-[40ch]">
            This listing was taken down, sold, or expired off the page.
          </p>
          <Link to="/browse">
            <Button variant="primary" size="md">
              Back to the page
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const sellerId = listing.sellerId?._id || listing.sellerId;
  const isOwner = Boolean(user && String(sellerId) === String(user._id));

  return (
    <PageWrapper>
      <ListingDetail
        listing={listing}
        isOwner={isOwner}
        onSave={onSave}
        saved={saved}
        onRelist={() => relistMutation.mutate()}
        relisting={relistMutation.isPending}
      />

      {similar?.length > 0 && (
        <section className="mt-6">
          <h2 className="label-xs mb-2.5">More like this</h2>
          <ListingGrid listings={similar.slice(0, 6)} />
        </section>
      )}
    </PageWrapper>
  );
}
