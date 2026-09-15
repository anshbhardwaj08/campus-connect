// A ride out of campus. From and to are the headline — everything else is
// detail — so they get the display face and an arrow between them.
import { ArrowRight, Users, Phone, Calendar } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import MessageButton from './MessageButton';
import { formatDateTime, whenRelative } from '../../utils/formatDate';

export default function CarpoolCard({ ride, index = 0, currentUserId, onDelete, busy = false }) {
  const { _id, from, to, departureDate, seatsAvailable, contactInfo, status, userId: driver } = ride;

  const isMine = String(driver?._id || driver) === String(currentUserId);
  const soon = whenRelative(departureDate);
  const gone = soon === 'Already gone';
  const full = seatsAvailable === 0;

  return (
    <Panel index={index} className="h-full">
      <div className="flex h-full flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[22px] leading-none tracking-[.02em] text-ink">
          <span>{from}</span>
          <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={3} />
          <span>{to}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {gone ? (
            <Badge tone="paper">Already gone</Badge>
          ) : (
            soon && <Badge tone="outline">{soon}</Badge>
          )}
          {status === 'closed' && <Badge tone="ink">Closed</Badge>}
          {/* Seat count reads as a number, not as a colour. */}
          <Badge tone={full ? 'paper' : 'outline'}>
            {full ? 'No seats left' : `${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'}`}
          </Badge>
        </div>

        <dl className="meta flex flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            {formatDateTime(departureDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3 w-3 shrink-0" strokeWidth={2.5} />
            {seatsAvailable} going spare
          </span>
          {contactInfo && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" strokeWidth={2.5} />
              <span className="select-all font-bold text-ink">{contactInfo}</span>
            </span>
          )}
        </dl>

        <div className="mt-auto flex items-center gap-2 border-t-2 border-ink/10 pt-2">
          <Avatar name={driver?.name} src={driver?.avatar} size="xs" />
          <span className="truncate text-[11px] font-extrabold text-ink">{driver?.name}</span>

          {isMine ? (
            <Button
              variant="link"
              className="ml-auto !min-h-[34px]"
              onClick={() => onDelete?.(_id)}
              disabled={busy}
            >
              Take it down
            </Button>
          ) : (
            !gone &&
            status !== 'closed' && (
              <MessageButton
                subjectType="carpool"
                subjectId={_id}
                ownerId={driver?._id || driver}
                label={full ? 'Ask anyway' : 'Got a seat?'}
                className="ml-auto"
              />
            )
          )}
        </div>
      </div>
    </Panel>
  );
}
