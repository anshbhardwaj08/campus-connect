// Reporting a listing or a person. One modal serves both — only the list
// of reasons changes.
//
// The reasons are a fixed set rather than a free text box because a
// moderator reading the queue needs to triage at a glance, and "scam" typed
// eleven different ways does not sort. The free text is the second field,
// for the part only this student knows.
//
// Submitting is idempotent server-side: reporting the same thing twice
// while the first report is still open returns the original rather than
// putting a duplicate in front of a moderator.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';

const REASONS = {
  listing: [
    'Looks like a scam',
    'Item is not allowed on campus',
    'Details or photos are misleading',
    'Already sold or unavailable',
    'Something else',
  ],
  user: [
    'Scam or fraud',
    'Harassment or abuse',
    'Pretending to be someone else',
    'Spam',
    'Something else',
  ],
  message: ['Harassment or abuse', 'Scam or fraud', 'Spam', 'Something else'],
};

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetLabel }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const options = (REASONS[targetType] || REASONS.listing).map((r) => ({ value: r, label: r }));

  const submit = useMutation({
    mutationFn: () =>
      api.post('/reports', {
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      }),
    onSuccess: (res) => {
      // 200 rather than 201 means there was already an open report from
      // this student about this thing — say so instead of implying a
      // second one was filed.
      toast.success(
        res.status === 200
          ? 'You have already reported this. A moderator will look at it.'
          : 'Reported. A moderator will take it from here.'
      );
      close();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not send that report.')),
  });

  const close = () => {
    setReason('');
    setDescription('');
    setError('');
    onClose?.();
  };

  const send = () => {
    setError('');
    if (!reason) return setError('Pick a reason.');
    submit.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} caption="Tell a moderator" title={`Report ${targetLabel}`}>
      <div className="flex flex-col gap-3.5">
        <p className="text-[12.5px] font-medium leading-relaxed text-ink/75">
          Reports go to the moderators, not to the other person. They will not know who
          reported them.
        </p>

        <Select
          label="What is wrong?"
          placeholder="Pick a reason"
          options={options}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Textarea
          label="Anything else they should know? (optional)"
          rows={3}
          placeholder="What happened, in your words."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

        <Button variant="primary" size="lg" loading={submit.isPending} onClick={send} className="w-full">
          <Flag className="h-4 w-4" strokeWidth={3} /> Send report
        </Button>
      </div>
    </Modal>
  );
}
