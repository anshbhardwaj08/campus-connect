// Something happening on campus. The date carries the urgency, so it gets
// the slab treatment a price gets on a listing — same shape, different fact.
import { MapPin, Users, Calendar } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import formatPrice from '../../utils/formatPrice';
import { formatDateTime, whenRelative } from '../../utils/formatDate';

export default function EventCard({
  event,
  index = 0,
  currentUserId,
  onRsvp,
  onCancelRsvp,
  onDelete,
  busy = false,
}) {
  const {
    title,
    description,
    date,
    location,
    isFree,
    ticketPrice,
    rsvpCount,
    isGoing,
    spotsLeft,
    imageUrl,
    category,
    organizerId: organizer,
  } = event;

  const soon = whenRelative(date);
  const past = soon === 'Already gone';
  const isMine = String(organizer?._id || organizer) === String(currentUserId);

  return (
    <Panel index={index} flush className="h-full">
      <div className="flex h-full flex-col">
        <div className={`art relative h-[132px] shrink-0 ${imageUrl ? 'photo' : ''}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} loading="lazy" />
          ) : (
            <Calendar className="h-9 w-9 text-ink/25" strokeWidth={1.75} />
          )}

          {category && (
            <Badge tone="paper" className="absolute left-0 top-0 !border-l-0 !border-t-0">
              {category}
            </Badge>
          )}

          <span className={`slab ${isFree ? 'slab--free' : ''}`}>
            {isFree ? 'FREE' : formatPrice(ticketPrice)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <div>
            <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-ink">{title}</h3>
            <p className="meta mt-1 flex flex-wrap items-center gap-x-2">
              <span>{formatDateTime(date)}</span>
              {soon && !past && <Badge tone="outline">{soon}</Badge>}
              {past && <Badge tone="paper">Over</Badge>}
            </p>
          </div>

          {description && (
            <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink/75">
              {description}
            </p>
          )}

          <div className="meta flex flex-wrap items-center gap-x-3">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" strokeWidth={2.5} />
                {location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" strokeWidth={2.5} />
              {rsvpCount || 0} going
            </span>
            {/* Only worth saying when there is a limit, and worth saying
                loudly when it is nearly gone. */}
            {spotsLeft !== null && spotsLeft !== undefined && (
              <span className={spotsLeft === 0 ? 'font-extrabold text-crimson' : ''}>
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 border-t-2 border-ink/10 pt-2">
            <Avatar name={organizer?.name} src={organizer?.avatar} size="xs" />
            <span className="truncate text-[11px] font-extrabold text-ink">{organizer?.name}</span>

            {/* Your own event offers withdrawal, not an RSVP — you are
                already going, and calling it off is the thing you might
                actually need. */}
            {isMine ? (
              <Button
                variant="link"
                className="ml-auto !min-h-[34px]"
                onClick={() => onDelete?.(event)}
                disabled={busy}
              >
                Call it off
              </Button>
            ) : (
              !past && (
                <Button
                  // Going reads as a state you can undo, not a second
                  // invitation, so it drops out of crimson once you are on
                  // the list — the card spends its accent once.
                  variant={isGoing ? 'paper' : 'primary'}
                  size="sm"
                  className="ml-auto !min-h-[34px] !px-2.5 !text-[13px]"
                  onClick={() => (isGoing ? onCancelRsvp?.(event) : onRsvp?.(event))}
                  disabled={busy || (!isGoing && spotsLeft === 0)}
                  aria-pressed={Boolean(isGoing)}
                >
                  {isGoing ? "You're going" : spotsLeft === 0 ? 'Full' : "I'm going"}
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
