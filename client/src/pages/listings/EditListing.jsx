// Edit an existing listing. Loads it first, then hands it to the same form
// the create page uses. Photos are set at creation time only — the server's
// PATCH route carries no upload middleware — so the form hides the picker
// in edit mode.
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import ListingForm from '../../components/listing/ListingForm';
import Skeleton from '../../components/ui/Skeleton';

export default function EditListing() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.get(`/listings/${id}`).then((r) => r.data.data.listing),
  });

  if (isLoading) {
    return (
      <PageWrapper className="max-w-3xl">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mt-[9px] h-64 w-full" />
      </PageWrapper>
    );
  }

  if (isError || !listing) return <Navigate to="/browse" replace />;

  // The server enforces this too (403 on a listing you don't own); this just
  // avoids showing a form that could never save.
  const sellerId = listing.sellerId?._id || listing.sellerId;
  if (user && String(sellerId) !== String(user._id)) {
    return <Navigate to={`/listings/${id}`} replace />;
  }

  return (
    <PageWrapper className="max-w-3xl">
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          EDIT <span className="text-crimson">THIS PANEL</span>
        </h1>
        <p className="meta mt-2">Changes show on the page immediately.</p>
      </header>

      <ListingForm listing={listing} />
    </PageWrapper>
  );
}
