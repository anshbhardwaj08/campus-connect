// Asked of the owner at the moment they accept an offer on a rental.
//
// It is the one point in the flow where the length can be captured: the deal
// is what carries the due date, and it is opened by this action. Without an
// answer here nothing downstream can say whether an item is late, which was
// the whole gap renting opened up.
//
// Counted in the listing's own period — "2" on a per-week listing is a
// fortnight — so the owner never does the arithmetic themselves.

import { useState } from 'react';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import formatPrice, { PERIOD_LABEL } from '../../utils/formatPrice';

const PERIOD_DAYS = { day: 1, week: 7, month: 30 };

export default function RentalLengthModal({ isOpen, amount, listing, busy, onClose, onConfirm }) {
  const [count, setCount] = useState('1');
  // Snapshot at mount — the preview must not drift between renders.
  const [now] = useState(() => Date.now());

  const period = listing?.rentPeriod || 'day';
  const periods = Number(count);
  const valid = Number.isInteger(periods) && periods >= 1 && periods <= 52;
  const days = valid ? periods * (PERIOD_DAYS[period] || 1) : 0;

  // Shown as a real date because "14 days" and "back on the 30th" are not
  // the same thought, and the second is the one people act on.
  const dueLabel = valid
    ? new Date(now + days * 86400000).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  const label = PERIOD_LABEL[period] || period;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How long for?" caption="Opening the hire">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] font-semibold leading-relaxed text-ink/80">
          {listing?.title ? `${listing.title} — ` : ''}
          {formatPrice(amount)} agreed. Say how many {label}s they are taking it for.
        </p>

        <Input
          label={`Number of ${label}s`}
          type="number"
          min="1"
          max="52"
          step="1"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          error={!valid && count !== '' ? `Between 1 and 52 ${label}s` : undefined}
        />

        {dueLabel && (
          <div className="border-l-[3px] border-crimson bg-paper-2 p-3">
            <p className="label-xs mb-1">Due back</p>
            <p className="text-[14px] font-extrabold leading-tight text-ink">{dueLabel}</p>
            <p className="meta mt-1 leading-relaxed">
              The clock starts when you hand it over, not now. Both of you get a reminder the
              day before.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            loading={busy}
            disabled={!valid}
            onClick={() => onConfirm(periods)}
          >
            Accept and open the deal
          </Button>
          <Button variant="link" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
