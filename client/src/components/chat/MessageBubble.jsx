// One message. This is the first thing in the product to use the speech
// bubbles from the design system — the one place a radius over 4px is
// allowed, with the tail built from two stacked CSS triangles.
//
// Incoming bubbles are paper, your own are ice.
import { Check, CheckCheck } from 'lucide-react';

import OfferCard from './OfferCard';

const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MessageBubble({ message, isMine, onAcceptOffer, canAcceptOffer }) {
  const { text, imageUrl, type, offerAmount, createdAt, readAt } = message;

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
          <Timestamp at={createdAt} readAt={readAt} isMine={isMine} />
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
        <Timestamp at={createdAt} readAt={readAt} isMine={isMine} />
      </div>
    </div>
  );
}

function Timestamp({ at, readAt, isMine }) {
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
    </span>
  );
}
