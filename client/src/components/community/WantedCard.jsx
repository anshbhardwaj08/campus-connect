// One request on the wanted board: somebody saying what they are after so
// the seller can find them instead of the other way round.
//
// Lifted out of pages/community/LookingFor.jsx when wants gained a reference
// photo, for the same reason EventCard and LostFoundCard exist — a card with
// an art well, a lightbox and two stamps on it is not a shape to keep inline
// in a page that also holds a form.
//
// **The stamp is not decoration.** A want showing a photograph of the thing
// somebody wants looks exactly like a listing of the thing they have, and the
// two invite opposite actions. So the card says WANTED out loud, top-left,
// the way Lost & Found says LOST or FOUND — and the budget slab says "up to",
// because a number stamped in that corner otherwise reads as an asking price.
import { useState } from 'react';
import { Check, Megaphone } from 'lucide-react';

import Panel from '../ui/Panel';
import PhotoExpand from '../ui/PhotoExpand';
import Lightbox from '../ui/Lightbox';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PriceSlab from '../ui/PriceSlab';
import MessageButton from './MessageButton';
import { timeAgo } from '../../utils/timeAgo';

export default function WantedCard({ post, index = 0, currentUserId, onFulfil, busy = false }) {
  const {
    _id,
    title,
    description,
    category,
    listingType,
    rentPeriod,
    maxBudget,
    images,
    userId: asker,
    createdAt,
  } = post;

  const [zoomed, setZoomed] = useState(false);
  const photo = images?.[0];
  const isRent = listingType === 'rent';
  const isMine = String(asker?._id || asker) === String(currentUserId);

  return (
    <Panel index={index} flush className="group h-full">
      <div className="flex h-full flex-col">
        <div className={`art art--zoom relative h-[132px] shrink-0 ${photo ? 'photo' : ''}`}>
          {photo ? (
            <img src={photo} alt={title} loading="lazy" />
          ) : (
            <Megaphone className="h-9 w-9 text-ink/25" strokeWidth={1.75} />
          )}

          {/* A want's photo is a reference — "a cycle like this one", "this
              edition of the textbook" — and whether yours is the right one
              cannot be told from a 132px thumbnail. */}
          {photo && (
            <PhotoExpand onClick={() => setZoomed(true)} label={`View photo of ${title}`} />
          )}

          {/* The one stamp that must always be there. Ink rather than
              crimson: nothing here is urgent, it is a standing request. */}
          <Badge tone="ink" className="absolute left-0 top-0 !border-l-0 !border-t-0">
            Wanted
          </Badge>

          {/* Same corner as a listing's "For rent", so the two boards read
              the same way round. */}
          {isRent && (
            <Badge tone="paper" className="absolute right-0 top-0 !border-r-0 !border-t-0">
              To rent
            </Badge>
          )}

          {/* No budget stated means no slab — a PriceSlab with nothing in it
              stamps "FREE", which on a want would read as an offer. */}
          {maxBudget > 0 && (
            <PriceSlab
              price={maxBudget}
              period={isRent ? rentPeriod : null}
              prefix="up to"
            />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-ink">{title}</h3>

          {category && <Badge tone="outline">{category}</Badge>}

          {description && (
            <p className="line-clamp-3 text-[12.5px] font-medium leading-snug text-ink/75">
              {description}
            </p>
          )}

          <p className="meta">Asked {timeAgo(createdAt)}</p>

          <div className="mt-auto flex items-center gap-2 border-t-2 border-ink/10 pt-2">
            <Avatar name={asker?.name} src={asker?.avatar} size="xs" />
            <span className="truncate text-[11px] font-extrabold text-ink">{asker?.name}</span>

            {isMine ? (
              <Button
                variant="paper"
                size="sm"
                className="ml-auto !min-h-[34px] !px-2.5 !text-[13px]"
                onClick={() => onFulfil?.(_id)}
                disabled={busy}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Found it
              </Button>
            ) : (
              // The whole point of a want is that someone can answer it —
              // and what they would say depends on which question was asked.
              <MessageButton
                subjectType="lookingfor"
                subjectId={_id}
                ownerId={asker?._id || asker}
                // "Lend mine" rather than "You can borrow mine": the footer
                // holds an avatar and a name before it, and a long label
                // squeezes the name to nothing on a phone.
                label={isRent ? 'Lend mine' : 'I have one'}
                className="ml-auto"
              />
            )}
          </div>
        </div>
      </div>

      {photo && (
        <Lightbox images={images} isOpen={zoomed} onClose={() => setZoomed(false)} alt={title} />
      )}
    </Panel>
  );
}
