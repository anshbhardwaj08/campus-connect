// Common frame for the four community pages. They are the same shape —
// a display headline, a line of narration, one crimson "post" action, an
// optional filter row, then a grid — so the frame lives here and each page
// supplies only its own filters, form and cards.
//
// Keeping this shared is what stops Events, Lost & Found, Carpool and
// Looking For from slowly drifting into four slightly different layouts.
import { Plus } from 'lucide-react';

import PageWrapper from '../layout/PageWrapper';
import PanelGrid from '../layout/PanelGrid';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';

export const COMMUNITY_SPAN = 'col-span-4 md:col-span-4 xl:col-span-4';

export default function CommunityShell({
  title, // e.g. ['WHAT IS', 'ON'] — second half takes the crimson
  blurb,
  actionLabel,
  onAction,
  filters,
  loading,
  isEmpty,
  emptyTitle,
  emptyText,
  children,
}) {
  return (
    <PageWrapper>
      <header className="mb-[9px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
            {title[0]} <span className="text-crimson">{title[1]}</span>
          </h1>
          {blurb && <p className="meta mt-2 max-w-[56ch] leading-relaxed">{blurb}</p>}
        </div>

        {onAction && (
          <Button variant="ink" size="sm" onClick={onAction}>
            <Plus className="h-4 w-4" strokeWidth={3} /> {actionLabel}
          </Button>
        )}
      </header>

      {filters && <div className="mb-[9px] flex flex-wrap items-center gap-2">{filters}</div>}

      {loading ? (
        <PanelGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={COMMUNITY_SPAN}>
              <Skeleton className="h-[220px] w-full" />
            </div>
          ))}
        </PanelGrid>
      ) : isEmpty ? (
        <div className="border-2 border-dashed border-ink/25 px-6 py-16 text-center">
          <p className="font-display text-[26px] leading-none text-ink">{emptyTitle}</p>
          <p className="meta mx-auto mt-2 max-w-[46ch] leading-relaxed">{emptyText}</p>
        </div>
      ) : (
        <PanelGrid>{children}</PanelGrid>
      )}
    </PageWrapper>
  );
}

// A filter chip row that matches the rest of the system: ink when on,
// paper when off, weight doing the work rather than colour.
export function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border-2 border-ink px-3 py-2 text-[11.5px] font-extrabold uppercase tracking-[.06em] transition-colors ${
        active ? 'bg-ink text-paper-3' : 'bg-paper-3 text-ink hover:bg-paper-2'
      }`}
    >
      {children}
    </button>
  );
}
