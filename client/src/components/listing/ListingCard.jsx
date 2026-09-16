// One listing, printed. A Panel with an art well (photo or a placeholder
// icon, both on the coarse screen), a price slab pinned into its corner,
// and a title block below with the seller strip.
//
// No caption box here — a caption is narration, and there's no real
// narration to attach per card in a grid; a condition Badge does the one
// piece of real, factual emphasis this card needs instead.
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import PriceSlab from '../ui/PriceSlab';
import { timeAgo } from '../../utils/timeAgo';

const CONDITION_LABEL = {
  new: 'New',
  'like-new': 'Like new',
  used: 'Used',
  'for-parts': 'For parts',
};

export default function ListingCard({ listing, index = 0 }) {
  if (!listing) return null;

  const {
    _id,
    title,
    price,
    isFree,
    listingType,
    rentPeriod,
    condition,
    pickupLocation,
    images,
    sellerId: seller,
    createdAt,
  } = listing;

  const photo = images?.[0];

  return (
    <Panel as={Link} to={`/listings/${_id}`} index={index} flush className="group h-full">
      <div className="flex h-full flex-col">
        <div className={`art relative h-[148px] shrink-0 ${photo ? 'photo' : ''}`}>
          {photo ? (
            <img src={photo} alt={title} loading="lazy" />
          ) : (
            <Package className="h-9 w-9 text-ink/25" strokeWidth={1.75} />
          )}

          {condition && (
            <Badge tone="paper" className="absolute left-0 top-0 !border-t-0 !border-l-0">
              {CONDITION_LABEL[condition] || condition}
            </Badge>
          )}

          {listingType === 'rent' && (
            <Badge tone="ink" className="absolute right-0 top-0 !border-t-0 !border-r-0">
              For rent
            </Badge>
          )}

          <PriceSlab price={isFree ? 0 : price} period={listingType === 'rent' ? rentPeriod : null} />
        </div>

        <div className="flex flex-1 flex-col gap-2 pt-2.5">
          <h3 className="line-clamp-2 text-[13.5px] font-bold leading-snug text-ink">{title}</h3>

          <p className="meta mt-auto">
            {pickupLocation ? `${pickupLocation} · ` : ''}
            {timeAgo(createdAt)}
          </p>

          <div className="flex items-center gap-1.5 border-t-2 border-ink/10 pt-2">
            <Avatar name={seller?.name} src={seller?.avatar} size="xs" />
            <span className="truncate text-[11px] font-extrabold text-ink">{seller?.name}</span>
            {seller?.isEmailVerified && (
              <Badge tone="ink" className="ml-auto shrink-0">
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
