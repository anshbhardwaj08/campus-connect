// The full listing. A gallery panel on the left, the deal panel on the
// right, description and seller below.
//
// The crimson budget here goes to one thing: the primary action (Message
// the seller, or Edit if it's yours). The price slab stays ink unless the
// item is genuinely free, and the caption boxes stay paper.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, MapPin, Eye, Clock, Heart, Share2, Wallet } from 'lucide-react';

import Panel from '../ui/Panel';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import CaptionBox from '../ui/CaptionBox';
import ReportButton from '../report/ReportButton';
import formatPrice, { formatRate, PERIOD_LABEL } from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';

const CONDITION_LABEL = {
  new: 'New',
  'like-new': 'Like new',
  used: 'Used',
  'for-parts': 'For parts',
};

export default function ListingDetail({
  listing,
  isOwner = false,
  onSave,
  saved = false,
  onRelist,
  relisting = false,
}) {
  const [activeImage, setActiveImage] = useState(0);

  const {
    title,
    description,
    price,
    isFree,
    isNegotiable,
    listingType,
    rentPeriod,
    securityDeposit,
    condition,
    category,
    pickupLocation,
    images = [],
    sellerId: seller,
    viewCount,
    createdAt,
    status,
  } = listing;

  const photo = images[activeImage];
  const isRent = listingType === 'rent';
  // A rented item is out on loan, not gone — the owner gets it back and puts
  // it up again, which is why this is the one status with a way out of it.
  const isOut = status === 'rented';

  return (
    <div className="flex flex-col gap-[9px]">
      <div className="grid gap-[9px] lg:grid-cols-12">
        {/* --- Gallery ------------------------------------------------- */}
        <div className="lg:col-span-7">
          <Panel index={0} flush>
            <div className={`art relative h-[300px] sm:h-[420px] ${photo ? 'photo' : ''}`}>
              {photo ? (
                <img src={photo} alt={title} />
              ) : (
                <Package className="h-16 w-16 text-ink/20" strokeWidth={1.5} />
              )}

              {status && status !== 'active' && (
                <CaptionBox corner="tl" tone="crimson">
                  {status === 'sold'
                    ? 'Sold — this one is gone'
                    : status === 'rented'
                      ? 'Out on hire — back later'
                      : status}
                </CaptionBox>
              )}

              <span className={`slab ${isFree ? 'slab--free' : ''}`}>
                {isFree ? 'FREE' : formatRate(price, isRent ? rentPeriod : null)}
              </span>
            </div>
          </Panel>

          {images.length > 1 && (
            <div className="mt-[9px] grid grid-cols-6 gap-[9px]">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Photo ${i + 1}`}
                  aria-current={i === activeImage}
                  className={`art photo h-[58px] border-2 transition-colors ${
                    i === activeImage ? 'border-crimson' : 'border-ink'
                  }`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- The deal ------------------------------------------------ */}
        <div className="lg:col-span-5">
          <Panel index={1} className="h-full">
            <CaptionBox corner="tl">{isOwner ? 'Your panel' : 'What it costs'}</CaptionBox>

            <div className="flex h-full flex-col pt-7">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-.01em] text-ink">
                {title}
              </h1>

              <p className="mt-2 font-display text-[38px] leading-none tracking-[.02em] text-ink">
                {isFree ? 'FREE' : formatPrice(price)}
                {!isFree && isRent && rentPeriod && (
                  <span className="ml-1 text-[20px] tracking-[.03em] text-steel">
                    / {PERIOD_LABEL[rentPeriod] || rentPeriod}
                  </span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {isRent && <Badge tone="ink">For rent</Badge>}
                {condition && <Badge tone="paper">{CONDITION_LABEL[condition] || condition}</Badge>}
                {category && <Badge tone="outline">{category}</Badge>}
                {isNegotiable && !isFree && <Badge tone="outline">Open to offers</Badge>}
              </div>

              <dl className="mt-4 flex flex-col gap-2 border-t-2 border-ink/10 pt-3">
                {isRent && (
                  <Fact
                    icon={Wallet}
                    label="Deposit"
                    value={securityDeposit ? formatPrice(securityDeposit) : 'None'}
                  />
                )}
                {pickupLocation && (
                  <Fact icon={MapPin} label={isRent ? 'Handover' : 'Pickup'} value={pickupLocation} />
                )}
                <Fact icon={Clock} label="Listed" value={timeAgo(createdAt)} />
                <Fact icon={Eye} label="Views" value={viewCount ?? 0} />
              </dl>

              {/* The old wording here ("the deposit comes back when the
                  owner does") said nothing useful and implied the platform
                  was involved. It is not: every rupee changes hands between
                  the two of you, same as a sale. */}
              {isRent && (
                <p className="meta mt-3 border-l-[3px] border-ink/20 pl-2.5 leading-relaxed">
                  Agree how long you need it for in the chat.
                  {securityDeposit
                    ? ` You hand the owner ${formatPrice(securityDeposit)} at the gate and they give it back when you return it — College OLX never holds it.`
                    : ' The owner is not asking for a deposit.'}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-2.5 pt-5">
                {isOwner ? (
                  <>
                    {isOut && (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={relisting}
                        onClick={onRelist}
                      >
                        Got it back — list it again
                      </Button>
                    )}
                    <Link to={`/listings/${listing._id}/edit`} className="block">
                      <Button variant={isOut ? 'paper' : 'primary'} size="lg" className="w-full">
                        Edit this panel
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to={`/chat?listing=${listing._id}`} className="block">
                    <Button variant="primary" size="lg" className="w-full">
                      {isRent ? 'Message the owner' : 'Message the seller'}
                    </Button>
                  </Link>
                )}

                <div className="flex gap-2.5">
                  <Button
                    variant="paper"
                    size="sm"
                    className="flex-1"
                    onClick={onSave}
                    aria-pressed={saved}
                  >
                    <Heart className="h-4 w-4" strokeWidth={2.5} fill={saved ? 'currentColor' : 'none'} />
                    {saved ? 'Saved' : 'Save'}
                  </Button>
                  <Button
                    variant="paper"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                    }}
                  >
                    <Share2 className="h-4 w-4" strokeWidth={2.5} /> Copy link
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* --- Description + seller --------------------------------------- */}
      <div className="grid gap-[9px] lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel index={2}>
            <CaptionBox corner="tl">In the seller&rsquo;s words</CaptionBox>
            <p className="whitespace-pre-line pt-7 text-[14px] font-medium leading-relaxed text-ink">
              {description}
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel index={3}>
            <CaptionBox corner="tl">Who you are meeting</CaptionBox>

            <div className="flex items-center gap-3 pt-7">
              <Avatar name={seller?.name} src={seller?.avatar} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-ink">{seller?.name}</p>
                <p className="meta">
                  Trust score {seller?.trustScore ?? '—'}
                  {typeof seller?.dealsCompleted === 'number'
                    ? ` · ${seller.dealsCompleted} deals done`
                    : ''}
                </p>
                {seller?.isEmailVerified && (
                  <Badge tone="ink" className="mt-1.5">
                    Verified student
                  </Badge>
                )}
              </div>
            </div>

            <p className="meta mt-4 border-l-[3px] border-crimson pl-3 leading-relaxed">
              Meet at the gate. Look it over. Then pay. Never send money in advance.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {seller?._id && (
                <Link
                  to={`/users/${seller._id}`}
                  className="inline-flex min-h-[46px] items-center text-[13px] font-extrabold uppercase tracking-[.07em] text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-crimson"
                >
                  See their other panels
                </Link>
              )}

              {/* The safety line above tells you what a scam looks like;
                  this is what you do about one. */}
              <ReportButton
                targetType="listing"
                targetId={listing._id}
                targetLabel="this listing"
                ownerId={seller?._id}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-steel" strokeWidth={2.5} />
      <dt className="label-xs">{label}</dt>
      <dd className="ml-auto text-[12.5px] font-bold text-ink">{value}</dd>
    </div>
  );
}
