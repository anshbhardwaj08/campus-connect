// A claim on the community post a thread is about: "I have your wallet",
// "I want two seats". A panel rather than a bubble, for the same reason as
// OfferCard — it is a decision the other person has to act on, and the post
// closes itself once they do.
import { Check, X } from 'lucide-react';

import Button from '../ui/Button';

const ASKED = {
  lostfound: { mine: 'You said you have it', theirs: 'They say they have it' },
  lookingfor: { mine: 'You said you have it', theirs: 'They say they have it' },
  carpool: { mine: 'You asked for a seat', theirs: 'They asked for a seat' },
};

const SETTLED = {
  lostfound: 'Confirmed — the post is closed',
  lookingfor: 'Confirmed — the request is closed',
  carpool: 'Seat confirmed',
};

export default function ClaimCard({ claim, isMine, canDecide, busy, onDecide }) {
  const { kind, seats, status } = claim || {};
  const copy = ASKED[kind] || ASKED.lostfound;
  const decided = status !== 'pending';

  return (
    <div className="panel">
      <div className={`panel__in gap-2 !p-3 ${isMine ? 'panel__in--cold' : ''}`}>
        <p className="label-xs">{isMine ? copy.mine : copy.theirs}</p>

        {kind === 'carpool' && (
          <p className="font-display text-[30px] leading-none tracking-[.02em] text-ink">
            {seats} seat{seats === 1 ? '' : 's'}
          </p>
        )}

        {status === 'confirmed' && (
          <p className="meta flex items-center gap-1.5 leading-snug">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} /> {SETTLED[kind] || 'Confirmed'}
          </p>
        )}

        {status === 'declined' && (
          <p className="meta leading-snug">Turned down. The post stays up.</p>
        )}

        {!decided && canDecide && (
          <div className="mt-1 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => onDecide?.('confirm')}>
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Confirm
            </Button>
            <Button variant="paper" size="sm" disabled={busy} onClick={() => onDecide?.('decline')}>
              <X className="h-3.5 w-3.5" strokeWidth={3} /> Not this one
            </Button>
          </div>
        )}

        {!decided && !canDecide && (
          <p className="meta leading-snug">
            {isMine ? 'Waiting for them to confirm.' : 'Waiting on the person who posted it.'}
          </p>
        )}
      </div>
    </div>
  );
}
