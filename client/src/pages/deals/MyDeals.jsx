// Every deal you are part of, buying or selling.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import PageWrapper from '../../components/layout/PageWrapper';
import DealCard from '../../components/deal/DealCard';
import VerifyCodeModal from '../../components/deal/VerifyCodeModal';
import ReviewModal from '../../components/deal/ReviewModal';
import Skeleton from '../../components/ui/Skeleton';

export default function MyDeals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState({ open: false, deal: null, mode: 'enter' });
  const [review, setReview] = useState({ open: false, deal: null, name: '' });

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals', 'mine'],
    queryFn: () => api.get('/users/me/deals').then((r) => r.data.data.deals),
  });

  // Which deals this user has already reviewed, so a closed deal shows
  // "you reviewed this" rather than offering the form again. The server
  // refuses duplicates either way, but finding out only after writing one
  // is a poor way to be told.
  const { data: myReviews } = useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: () => api.get('/reviews/mine').then((r) => r.data.data.reviews),
  });

  const reviewedDealIds = new Set((myReviews || []).map((r) => String(r.dealId)));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['deals', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
  };

  const confirmMutation = useMutation({
    mutationFn: ({ deal, isSeller }) =>
      api.patch(`/deals/${deal._id}/${isSeller ? 'seller-confirm' : 'buyer-confirm'}`),
    onSuccess: (res) => {
      const deal = res.data.data.deal;
      refresh();
      toast.success(
        deal.status === 'completed'
          ? deal.dueAt
            ? 'Both sides confirmed. The hire has started.'
            : 'Both sides confirmed. The listing is marked sold.'
          : 'Confirmed. Waiting on the other side.'
      );
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not confirm that.')),
  });

  // Ends a hire: stops the clock, puts the listing back on the page and
  // tells the renter. One action, because doing those separately left the
  // deal reading "out" after the owner had already relisted the item.
  const returnedMutation = useMutation({
    mutationFn: (deal) => api.patch(`/deals/${deal._id}/returned`),
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['listing'] });
      toast.success('Marked returned. The listing is live again.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not mark that returned.')),
  });

  const disputeMutation = useMutation({
    mutationFn: (deal) => api.patch(`/deals/${deal._id}/dispute`),
    onSuccess: () => {
      refresh();
      toast.success('Flagged. A moderator will pick it up.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not flag that deal.')),
  });

  const busy =
    confirmMutation.isPending || disputeMutation.isPending || returnedMutation.isPending;

  return (
    <PageWrapper className="max-w-4xl">
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          YOUR <span className="text-crimson">DEALS</span>
        </h1>
        <p className="meta mt-2 max-w-[54ch] leading-relaxed">
          A deal closes at the gate, not on this page. Meet, look it over, check the code, then
          both of you confirm.
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-[9px]">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : !deals?.length ? (
        <div className="border-2 border-dashed border-ink/25 px-6 py-16 text-center">
          <p className="font-display text-[26px] leading-none text-ink">NO DEALS YET</p>
          <p className="meta mx-auto mt-2 max-w-[44ch] leading-relaxed">
            Agree a price in a chat and a deal opens here, with a code to check when you meet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {deals.map((deal, i) => (
            <DealCard
              key={deal._id}
              deal={deal}
              index={Math.min(i, 10)}
              currentUserId={user?._id}
              busy={busy}
              onShowCode={(d) => setModal({ open: true, deal: d, mode: 'show' })}
              onEnterCode={(d) => setModal({ open: true, deal: d, mode: 'enter' })}
              onConfirm={(d, isSeller) => confirmMutation.mutate({ deal: d, isSeller })}
              onDispute={(d) => disputeMutation.mutate(d)}
              onReturned={(d) => returnedMutation.mutate(d)}
              onReview={(d, other) => setReview({ open: true, deal: d, name: other?.name })}
              reviewed={reviewedDealIds.has(String(deal._id))}
            />
          ))}
        </div>
      )}

      <VerifyCodeModal
        isOpen={modal.open}
        deal={modal.deal}
        mode={modal.mode}
        onClose={() => setModal({ open: false, deal: null, mode: 'enter' })}
        onVerified={refresh}
      />

      <ReviewModal
        isOpen={review.open}
        deal={review.deal}
        otherName={review.name}
        onClose={() => setReview({ open: false, deal: null, name: '' })}
        onDone={refresh}
      />
    </PageWrapper>
  );
}
