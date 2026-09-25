// The nudge that says there is something worth scrolling to.
//
// "Goes with this" sits below the fold on a listing, under the photo, the
// description and the seller panel — so on the page as built, the one thing
// that might sell a second item is the one thing nobody sees. This is a bar
// that rises from the bottom edge naming what is down there, and scrolls to
// it when tapped.
//
// Deliberately NOT a modal. A dialog over a listing somebody just chose to
// open interrupts the thing they came for, and the first instinct of anyone
// who meets one is to find the X. This sits at the edge, says one true
// sentence, and gets out of the way on its own.
//
// It removes itself the moment the section it points at comes into view,
// which is also the moment it has done its job. Nothing to dismiss.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cueIn, cueOut } from '../../lib/motion';

// Long enough for the page's own entrance to finish. Arriving on top of the
// panel wipe reads as a pop-up; arriving after it reads as a prompt.
const APPEAR_AFTER_MS = 1100;

export default function GoesWithCue({ items = [], targetRef }) {
  const [phase, setPhase] = useState('waiting'); // waiting | in | gone
  const bar = useRef(null);

  // Watch the section itself. If it is already on screen — a tall monitor, a
  // short listing — the cue never appears at all, which is correct: there is
  // nothing to point at that is not already visible.
  useEffect(() => {
    const target = targetRef?.current;
    if (!target || !items.length) return undefined;

    let timer = null;
    let seen = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        seen = true;
        clearTimeout(timer);
        setPhase((p) => (p === 'in' ? 'leaving' : 'gone'));
        observer.disconnect();
      },
      // A sliver counts. Somebody who has scrolled the heading into view has
      // found it, and the bar should already be on its way out.
      { threshold: 0.01 }
    );

    observer.observe(target);
    timer = setTimeout(() => {
      if (!seen) setPhase('in');
    }, APPEAR_AFTER_MS);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [items.length, targetRef]);

  useEffect(() => {
    if (phase === 'in') cueIn(bar.current);
    if (phase === 'leaving') cueOut(bar.current, { onComplete: () => setPhase('gone') });
  }, [phase]);

  if (phase === 'waiting' || phase === 'gone' || !items.length) return null;

  const names = items.map((i) => i.listing.title);
  const summary = names.length === 1 ? names[0] : `${names[0]} and ${names.length - 1} more`;

  const scrollToIt = () => {
    targetRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPhase('leaving');
  };

  return (
    // Clear of the phone bottom bar (62px) and of the iOS home indicator.
    <div
      ref={bar}
      className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom,0px))] z-40 flex justify-center px-4 sm:bottom-6"
    >
      <button
        type="button"
        onClick={scrollToIt}
        aria-label={`Show the ${items.length} listings that go with this`}
        className="panel w-full max-w-[520px] text-left transition-transform active:translate-y-[2px]"
      >
        <span className="panel__in panel__in--flush flex items-center gap-3 !p-0">
          {/* The only crimson in this region, and it carries the number —
              the one piece of information that makes the bar worth a tap. */}
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border-r-[3px] border-ink bg-crimson font-display text-[26px] leading-none text-paper-3">
            {items.length}
          </span>

          <span className="flex min-w-0 flex-1 flex-col py-1.5">
            <span className="label-xs">Goes with this</span>
            <span className="truncate font-sans text-[14px] font-extrabold leading-tight">
              {summary}
            </span>
          </span>

          <ChevronDown className="mr-3.5 h-5 w-5 shrink-0 text-ink" strokeWidth={3} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
