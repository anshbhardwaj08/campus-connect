// Something lost, or something found. The distinction is the whole point of
// the card, so it is carried by a word, not just a colour — a found item
// says FOUND on it.
import { MapPin, Search, PackageSearch } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import MessageButton from './MessageButton';
import { formatDate } from '../../utils/formatDate';

export default function LostFoundCard({ item, index = 0, currentUserId, onResolve, busy = false }) {
  const { _id, type, title, description, location, images, date, userId: poster, status } = item;

  const photo = images?.[0];
  const isLost = type === 'lost';
  const isMine = String(poster?._id || poster) === String(currentUserId);
  const Icon = isLost ? Search : PackageSearch;

  return (
    <Panel index={index} flush className="h-full">
      <div className="flex h-full flex-col">
        <div className={`art relative h-[132px] shrink-0 ${photo ? 'photo' : ''}`}>
          {photo ? (
            <img src={photo} alt={title} loading="lazy" />
          ) : (
            <Icon className="h-9 w-9 text-ink/25" strokeWidth={1.75} />
          )}

          {/* Lost is the urgent one — someone is missing something. */}
          <Badge
            tone={isLost ? 'crimson' : 'ink'}
            className="absolute left-0 top-0 !border-l-0 !border-t-0"
          >
            {isLost ? 'Lost' : 'Found'}
          </Badge>

          {status === 'resolved' && (
            <Badge tone="paper" className="absolute right-0 top-0 !border-r-0 !border-t-0">
              Back with its owner
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-ink">{title}</h3>

          {description && (
            <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink/75">
              {description}
            </p>
          )}

          <p className="meta flex flex-wrap items-center gap-x-3">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" strokeWidth={2.5} />
                {location}
              </span>
            )}
            <span>{formatDate(date)}</span>
          </p>

          <div className="mt-auto flex items-center gap-2 border-t-2 border-ink/10 pt-2">
            <Avatar name={poster?.name} src={poster?.avatar} size="xs" />
            <span className="truncate text-[11px] font-extrabold text-ink">{poster?.name}</span>

            {isMine ? (
              status !== 'resolved' && (
                <Button
                  variant="paper"
                  size="sm"
                  className="ml-auto !min-h-[34px] !px-2.5 !text-[13px]"
                  onClick={() => onResolve?.(_id)}
                  disabled={busy}
                >
                  Sorted
                </Button>
              )
            ) : (
              status !== 'resolved' && (
                <MessageButton
                  subjectType="lostfound"
                  subjectId={_id}
                  ownerId={poster?._id || poster}
                  // Which side you are on decides what you would say.
                  label={isLost ? 'I have seen it' : 'That is mine'}
                  className="ml-auto"
                />
              )
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
