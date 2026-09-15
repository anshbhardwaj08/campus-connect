// Open reports, waiting on a decision. Empty until the client grows a
// "Report this" control — submitReport (POST /reports) exists server-side
// and works, but nothing in /client calls it yet. Built to work correctly
// against the real backend regardless, same as PendingListings.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import AdminNavbar from '../../components/layout/AdminNavbar';
import ReportDetail from '../../components/moderation/ReportDetail';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

export default function ReportQueue() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState(null); // { report, status }
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', 'open'],
    queryFn: () =>
      adminApi.get('/admin/reports', { params: { status: 'open', limit: 60 } }).then((r) => r.data.data.reports),
  });

  const resolve = useMutation({
    mutationFn: ({ id, status, adminNote }) => adminApi.patch(`/admin/reports/${id}/resolve`, { status, adminNote }),
    onSuccess: (_res, vars) => {
      toast.success(vars.status === 'dismissed' ? 'Report dismissed.' : 'Report resolved.');
      setTarget(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports', 'open'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update that report.')),
  });

  const confirm = () => {
    resolve.mutate({ id: target.report._id, status: target.status, adminNote: note.trim() || undefined });
  };

  return (
    <>
      <AdminNavbar title="Reports" blurb={`${data?.length ?? 0} open, waiting on a decision.`} />

      <div className="flex flex-col gap-3 p-6">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[132px]" />)}

        {!isLoading && !data?.length && (
          <div className="border-2 border-dashed border-ink/25 px-4 py-14 text-center">
            <p className="text-[14px] font-extrabold text-ink">No open reports.</p>
            <p className="meta mx-auto mt-1.5 max-w-xs leading-relaxed">
              Nothing waiting on a decision right now.
            </p>
          </div>
        )}

        {data?.map((report) => (
          <ReportDetail
            key={report._id}
            report={report}
            busy={resolve.isPending}
            onResolve={() => {
              setTarget({ report, status: 'resolved' });
              setNote('');
            }}
            onDismiss={() => {
              setTarget({ report, status: 'dismissed' });
              setNote('');
            }}
          />
        ))}
      </div>

      <Modal
        isOpen={Boolean(target)}
        onClose={() => setTarget(null)}
        caption={target?.status === 'dismissed' ? 'Dismiss report' : 'Resolve report'}
        title={target?.report?.reason}
      >
        <div className="flex flex-col gap-3.5">
          <Textarea
            label="Note (optional)"
            rows={3}
            placeholder="What was done about this, if anything."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button variant="primary" size="lg" loading={resolve.isPending} onClick={confirm} className="w-full">
            {target?.status === 'dismissed' ? 'Dismiss report' : 'Mark resolved'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
