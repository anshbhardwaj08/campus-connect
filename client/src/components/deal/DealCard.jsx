// One deal, from agreement to handover.
//
// The flow it renders: a price is agreed, the seller shows a six-character
// code at the meetup, the buyer enters it, then both sides confirm and the
// listing is marked sold.
//
// Status is carried by a Badge plus explicit wording, never by colour alone.
import { Link } from 'react-router-dom';
import { MapPin, KeyRound, Check, Star } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import CaptionBox from '../ui/CaptionBox';
import formatPrice from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';

const STATUS_COPY = {
  pending: 'Agreed — not met yet',
  verified: 'Code checked at the gate',
  completed: 'Done and dusted',
  disputed: 'Disputed',
};

export default function DealCard({
  deal,
  currentUserId,
  index = 0,
  onShowCode,
  onEnterCode,
  onConfirm,
  onDispute,
  onReview,
  reviewed = false,
  busy = false,
}) {
  const { listingId: listing, buyerId, sellerId, finalPrice, meetupLocation, status, buyerConfirmed, sellerConfirmed, createdAt } = deal;

  const isSeller = String(sellerId?._id || sellerId) === String(currentUserId);
  const other = isSeller ? buyerId : sellerId;
  const myConfirm = isSeller ? sellerConfirmed : buyerConfirmed;
  const theirConfirm = isSeller ? buyerConfirmed : sellerConfirmed;

  const done = status === 'completed';
  const disputed = status === 'disputed';

  return (
    <Panel index={index}>
      <CaptionBox corner="tl" tone={disputed ? 'crimson' : 'paper'}>
        {isSeller ? 'You are selling' : 'You are buying'}
      </CaptionBox>

      <div className="flex flex-col gap-3 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {listing?._id ? (
              <Link
                to={`/listings/${listing._id}`}
                className="text-[15px] font-extrabold leading-tight text-ink underline decoration-2 underline-offset-2 hover:text-crimson"
              >
                {listing.title}
              </Link>
            ) : (
              <span className="text-[15px] font-extrabold text-ink">Listing removed</span>
            )}
            <p className="meta mt-0.5">Agreed {timeAgo(createdAt)}</p>
          </div>

          <span className="shrink-0 font-display text-[26px] leading-none text-ink">
            {formatPrice(finalPrice)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={done ? 'ink' : disputed ? 'crimson' : 'paper'}>
            {STATUS_COPY[status] || status}
          </Badge>
          {meetupLocation && (
            <span className="meta flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={2.5} />
              {meetupLocation}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 border-t-2 border-ink/10 pt-2.5">
          <Avatar name={other?.name} src={other?.avatar} size="xs" />
          <span className="text-[12px] font-bold text-ink">{other?.name || 'The other side'}</span>

          <span className="meta ml-auto">
            {myConfirm && theirConfirm
              ? 'Both confirmed'
              : myConfirm
                ? 'Waiting on them'
                : theirConfirm
                  ? 'They confirmed — your turn'
                  : 'Neither confirmed'}
          </span>
        </div>

        {!done && !disputed && (
          <div className="flex flex-wrap gap-2">
            {/* The seller holds the code; the buyer enters it. Two sides of
                the same handshake, so each only ever sees their own half. */}
            {isSeller ? (
              <Button variant="primary" size="sm" onClick={() => onShowCode?.(deal)} disabled={busy}>
                <KeyRound className="h-3.5 w-3.5" strokeWidth={3} /> Show code
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => onEnterCode?.(deal)} disabled={busy}>
                <KeyRound className="h-3.5 w-3.5" strokeWidth={3} /> Enter code
              </Button>
            )}

            {!myConfirm && (
              <Button variant="paper" size="sm" onClick={() => onConfirm?.(deal, isSeller)} disabled={busy}>
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Confirm handover
              </Button>
            )}

            <Button variant="link" onClick={() => onDispute?.(deal)} disabled={busy}>
              Something went wrong
            </Button>
          </div>
        )}

        {done && (
          <div className="flex flex-col gap-2.5">
            <p className="meta border-l-[3px] border-ink pl-3 leading-relaxed">
              Closed. A review is the only thing that moves their trust score.
            </p>

            {reviewed ? (
              <p className="meta flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> You reviewed this one.
              </p>
            ) : (
              <Button variant="primary" size="sm" onClick={() => onReview?.(deal, other)} disabled={busy}>
                <Star className="h-3.5 w-3.5" strokeWidth={3} /> Review {other?.name?.split(' ')[0] || 'them'}
              </Button>
            )}
          </div>
        )}

        {disputed && (
          <p className="meta border-l-[3px] border-crimson pl-3 leading-relaxed">
            Flagged for review. A moderator will pick this up.
          </p>
        )}
      </div>
    </Panel>
  );
}

export { STATUS_COPY };
