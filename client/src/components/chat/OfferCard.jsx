// An offer inside a chat thread. Deliberately a panel rather than a speech
// bubble: an offer is a decision the other person has to act on, and it
// should not read as just another remark in the conversation.
import Button from '../ui/Button';
import formatPrice from '../../utils/formatPrice';

export default function OfferCard({ amount, isMine, onAccept, canAccept }) {
  return (
    <div className="panel">
      <div className={`panel__in gap-2 !p-3 ${isMine ? 'panel__in--cold' : ''}`}>
        <p className="label-xs">{isMine ? 'You offered' : 'They offered'}</p>

        <p className="font-display text-[30px] leading-none tracking-[.02em] text-ink">
          {formatPrice(amount)}
        </p>

        {canAccept && (
          <Button variant="primary" size="sm" onClick={() => onAccept?.(amount)} className="mt-1 w-full">
            Accept offer
          </Button>
        )}
      </div>
    </div>
  );
}
