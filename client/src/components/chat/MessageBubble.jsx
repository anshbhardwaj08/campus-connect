// One message. This is the first thing in the product to use the speech
// bubbles from the design system — the one place a radius over 4px is
// allowed, with the tail built from two stacked CSS triangles.
//
// Incoming bubbles are paper, your own are ice.
import { Check, CheckCheck, Flag } from 'lucide-react';

import OfferCard from './OfferCard';
import ClaimCard from './ClaimCard';

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MessageBubble({
  message,
  isMine,
  onAcceptOffer,
  canAcceptOffer,
  onDecideClaim,
  canDecideClaim,
  claimBusy,
  onReport,
}) {
  const { text, imageUrl, type, offerAmount, claim, createdAt, readAt } = message;

  // A claim on a community post: "I have your wallet", "I want a seat".
  if (type === 'claim') {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[78%]">
          <ClaimCard
            claim={claim}
            isMine={isMine}
            canDecide={canDecideClaim && !isMine}
            busy={claimBusy}
            onDecide={(action) => onDecideClaim?.(message, action)}
          />
          <MetaRow at={createdAt} readAt={readAt} isMine={isMine} />
        </div>
      </div>
    );
  }

  // Offers are a decision, not a remark — they get a panel, not a bubble.
  if (type === 'offer') {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[78%]">
          <OfferCard
            amount={offerAmount}
            isMine={isMine}
            onAccept={onAcceptOffer}
            canAccept={canAcceptOffer && !isMine}
          />
          <MetaRow
            at={createdAt}
            readAt={readAt}
            isMine={isMine}
            onReport={onReport && (() => onReport(message))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`bubble ${isMine ? 'bubble--out' : 'bubble--in'}`}>
          {type === 'image' && imageUrl ? (
            <span className="art photo -m-1 block h-[160px] w-[200px] border-2 border-ink">
              <img src={imageUrl} alt="Shared photo" />
            </span>
          ) : (
            <span className="whitespace-pre-wrap break-words">{text}</span>
          )}
        </div>
        <MetaRow
          at={createdAt}
          readAt={readAt}
          isMine={isMine}
          onReport={onReport && (() => onReport(message))}
        />
      </div>
    </div>
  );
}

function MetaRow({ at, readAt, isMine, onReport }) {
  return (
    <span
      className={`mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.05em] text-steel ${
        isMine ? 'justify-end' : 'justify-start'
      }`}
    >
      {timeOf(at)}
      {/* Read state uses a second tick, not a colour — colour alone never
          carries meaning in this system. */}
      {isMine &&
        (readAt ? (
          <CheckCheck className="h-3 w-3" strokeWidth={3} />
        ) : (
          <Check className="h-3 w-3" strokeWidth={3} />
        ))}

      {/* Only ever on someone else's message. It is rendered at low
          contrast rather than hidden until hover: a control that only
          exists on hover cannot be found on a touch screen, which is where
          most of this app is read. Smaller than the 46px button floor on
          purpose — one per message in a dense list, and at full size it
          would shout louder than the messages. */}
      {onReport && (
        <button
          type="button"
          onClick={onReport}
          aria-label="Report this message"
          title="Report this message"
          className="ml-1 flex h-[26px] w-[26px] items-center justify-center text-steel/60 transition-colors hover:text-crimson focus-visible:text-crimson"
        >
          <Flag className="h-3 w-3" strokeWidth={2.75} />
        </button>
      )}
    </span>
  );
}
