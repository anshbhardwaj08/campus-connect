// Leave a review after a deal closes. This is the only thing that moves a
// trust score, so it is deliberately only reachable from a completed deal.
//
// The server works out who is being reviewed from the deal itself — this
// form sends nothing but a rating and a comment.
import { useState } from 'react';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import StarRating from '../ui/StarRating';

const RATING_WORD = {
  1: 'Went badly',
  2: 'Not great',
  3: 'Fine',
  4: 'Good',
  5: 'No complaints at all',
};

export default function ReviewModal({ isOpen, onClose, deal, otherName, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setRating(0);
    setComment('');
    setError('');
    onClose?.();
  };

  const submit = async () => {
    if (!rating) {
      setError('Pick a rating first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/reviews', { dealId: deal._id, rating, comment: comment.trim() });
      toast.success('Review posted. It shows on their profile.');
      onDone?.();
      close();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not post that review.'));
    } finally {
      setLoading(false);
    }
  };

  if (!deal) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} caption="How did it go?" title={`Review ${otherName || 'them'}`}>
      <div className="flex flex-col gap-3.5">
        <div>
          <span className="label-xs mb-1.5 block">Your rating</span>
          <div className="flex items-center gap-3">
            <StarRating rating={rating} onChange={setRating} size="lg" />
            {rating > 0 && (
              <span className="text-[12.5px] font-extrabold text-ink">{RATING_WORD[rating]}</span>
            )}
          </div>
        </div>

        <Textarea
          label="Anything worth saying"
          rows={4}
          placeholder="Did they turn up on time? Was the item as described?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          hint="Optional, but it is what makes the next buyer trust them."
        />

        {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

        <Button variant="primary" size="lg" loading={loading} onClick={submit} className="w-full">
          Post the review
        </Button>

        <p className="meta leading-relaxed">
          You can only review a deal once, and only after it has closed.
        </p>
      </div>
    </Modal>
  );
}
