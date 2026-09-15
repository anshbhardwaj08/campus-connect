// The reason the admin panel exists first. Every listing here has
// scamScore >= 70 (the only way a listing lands in `pending` — see
// server/src/utils/scamScore.js and listing.controller.js `create`) and is
// invisible to everyone, including its own seller, until approved or
// rejected here.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import AdminNavbar from '../../components/layout/AdminNavbar';
import PendingQueue from '../../components/moderation/PendingQueue';
import ListingPreview from '../../components/moderation/ListingPreview';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

export default function PendingListings() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', 'pending'],
    queryFn: () =>
      adminApi.get('/admin/listings', { params: { status: 'pending', limit: 60 } }).then((r) => r.data.data.listings),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'listings', 'pending'] });

  const approve = useMutation({
    mutationFn: (id) => adminApi.patch(`/admin/listings/${id}/approve`),
    onSuccess: () => {
      toast.success('Listing approved. It is now live.');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not approve that.')),
  });

  const reject = useMutation({
    mutationFn: ({ id, rejectionReason }) =>
      adminApi.patch(`/admin/listings/${id}/reject`, { rejectionReason }),
    onSuccess: () => {
      toast.success('Listing rejected.');
      setRejectTarget(null);
      setReason('');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not reject that.')),
  });

  const confirmReject = () => {
    if (!reason.trim()) return;
    reject.mutate({ id: rejectTarget._id, rejectionReason: reason.trim() });
  };

  return (
    <>
      <AdminNavbar
        title="Pending listings"
        blurb={`${data?.length ?? 0} flagged by the scam-score check, waiting on a decision.`}
      />

      <div className="p-6">
        <PendingQueue isLoading={isLoading} isEmpty={!isLoading && !data?.length}>
          {data?.map((listing, i) => (
            <ListingPreview
              key={listing._id}
              listing={listing}
              index={Math.min(i, 8)}
              busy={approve.isPending || reject.isPending}
              onApprove={() => approve.mutate(listing._id)}
              onReject={() => {
                setRejectTarget(listing);
                setReason('');
              }}
            />
          ))}
        </PendingQueue>
      </div>

      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        caption="Reject listing"
        title={rejectTarget?.title}
      >
        <div className="flex flex-col gap-3.5">
          <Textarea
            label="Reason (shown to the seller)"
            rows={3}
            placeholder="Why this listing is being rejected."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            variant="primary"
            size="lg"
            loading={reject.isPending}
            disabled={!reason.trim()}
            onClick={confirmReject}
            className="w-full"
          >
            Reject listing
          </Button>
        </div>
      </Modal>
    </>
  );
}
