// How many seats a rider is asking for. Only ever opened for a carpool
// thread, and only while the ride still has seats.
import { useState } from 'react';

import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function SeatRequestModal({ isOpen, seatsLeft = 1, busy, onClose, onConfirm }) {
  const [seats, setSeats] = useState(1);

  // Back to one seat each time it opens. Done during render rather than in
  // an effect: an effect would paint the previous number for a frame first.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setSeats(1);
  }

  const max = Math.max(1, seatsLeft);

  return (
    <Modal isOpen={isOpen} onClose={onClose} caption="Riding along" title="How many seats?">
      <div className="flex flex-col gap-3.5">
        <p className="meta leading-relaxed">
          {max} seat{max === 1 ? '' : 's'} left on this ride. The driver confirms, and the seats come
          off the ride straight away.
        </p>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: Math.min(max, 8) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={seats === n}
              aria-label={`${n} seat${n === 1 ? '' : 's'}`}
              onClick={() => setSeats(n)}
              className={`h-11 w-11 border-2 border-ink font-display text-[20px] leading-none transition-colors ${
                seats === n ? 'bg-ink text-paper-3' : 'bg-paper-3 text-ink hover:bg-paper-2'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <Button variant="primary" size="lg" loading={busy} className="w-full" onClick={() => onConfirm?.(seats)}>
          Ask for {seats} seat{seats === 1 ? '' : 's'}
        </Button>
      </div>
    </Modal>
  );
}
