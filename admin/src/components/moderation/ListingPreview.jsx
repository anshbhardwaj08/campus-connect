// One flagged listing, printed like a listing card — but the corner badge
// is the scam score, not the condition, because that is the fact this
// screen exists to show. The card's one crimson element is that badge, so
// Approve/Reject stay off-accent (ink / paper) until a Reject opens its own
// modal, a fresh region that may spend its own crimson on the confirm.
import { Package, Check, X } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import PriceSlab from '../ui/PriceSlab';
import Button from '../ui/Button';
import { timeAgo } from '../../utils/timeAgo';

export default function ListingPreview({ listing, index = 0, onApprove, onReject, busy }) {
  const { title, price, isFree, images, sellerId: seller, scamScore, createdAt } = listing;
  const photo = images?.[0];

  return (
    <Panel index={index} flush className="h-full">
      <div className="flex h-full flex-col">
        <div className={`art relative h-[148px] shrink-0 ${photo ? 'photo' : ''}`}>
          {photo ? (
            <img src={photo} alt={title} loading="lazy" />
          ) : (
            <Package className="h-9 w-9 text-ink/25" strokeWidth={1.75} />
          )}

          <Badge tone="crimson" className="absolute left-0 top-0 !border-t-0 !border-l-0">
            Scam score {scamScore}
          </Badge>

          <PriceSlab price={isFree ? 0 : price} />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-[13.5px] font-bold leading-snug text-ink">{title}</h3>

          <div className="flex items-center gap-1.5">
            <Avatar name={seller?.name} size="xs" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-extrabold leading-tight text-ink">
                {seller?.name}
              </p>
              <p className="truncate text-[10px] font-semibold leading-tight text-steel">
                {seller?.collegeEmail}
              </p>
            </div>
          </div>

          <p className="meta">Posted {timeAgo(createdAt)}</p>

          <div className="mt-auto flex gap-2 border-t-2 border-ink/10 pt-2.5">
            <Button
              variant="ink"
              size="sm"
              className="flex-1 !text-[13px]"
              disabled={busy}
              onClick={onApprove}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Approve
            </Button>
            <Button
              variant="paper"
              size="sm"
              className="flex-1 !text-[13px]"
              disabled={busy}
              onClick={onReject}
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} /> Reject
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
