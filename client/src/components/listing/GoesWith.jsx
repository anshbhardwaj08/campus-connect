// "Goes with this" — the cross-sell strip under a listing.
//
// What is on screen was worked out hours ago by the hourly job and stored on
// the listing, so this component is an ordinary fetch of an ordinary list.
// Nothing here waits on a model, and nothing should: a student opening a
// listing should never be held up by one.
//
// The empty state is the point of the component, not a failure of it. This
// board has a few dozen listings, so most of the time nobody is selling the
// case that goes with the phone — and "nobody is selling one, shall we ask?"
// is a more useful screen than a hidden section. The ask writes a wanted
// post, which the matcher then answers when somebody lists one.

import { Link } from 'react-router-dom';

import Panel from '../ui/Panel';
import Button from '../ui/Button';

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function GoesWith({ items = [], missing = [], onAskFor }) {
  if (!items.length && !missing.length) return null;

  return (
    <section className="mt-6">
      <h2 className="label-xs mb-2.5">Goes with this</h2>

      {items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map(({ listing, reason }) => (
            <li key={listing._id}>
              <Link to={`/listings/${listing._id}`} className="block h-full">
                <Panel>
                  <div className="flex h-full flex-col gap-1.5 p-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-sans text-[15px] font-extrabold leading-tight">
                        {listing.title}
                      </span>
                      <span className="slab shrink-0 !text-[15px]">{rupees(listing.price)}</span>
                    </div>
                    {reason && <p className="meta leading-relaxed">{reason}</p>}
                  </div>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {missing.length > 0 && (
        <div className={items.length ? 'mt-3' : ''}>
          <Panel tone="paper">
            <div className="flex flex-col gap-2.5 p-3.5">
              <p className="meta leading-relaxed">
                Nobody is selling {missing.length === 1 ? 'a' : ''}{' '}
                <strong className="text-ink">{missing.map((m) => m.label).join(' or ')}</strong>{' '}
                on the page right now.
              </p>
              <div className="flex flex-wrap gap-2">
                {missing.map((m) => (
                  <Button
                    key={m.label}
                    variant="ink"
                    size="sm"
                    onClick={() => onAskFor?.(m)}
                  >
                    Ask for {m.label}
                  </Button>
                ))}
              </div>
              <p className="meta text-[11.5px] leading-relaxed">
                Your request goes on the wanted board. You get a notification the moment somebody
                lists one.
              </p>
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}
