// A photo opened full size.
//
// Same construction as ui/Modal — portal, flat ink scrim with a halftone
// screen, no backdrop blur, a Panel landing on top of the page — but a
// lightbox is not a dialog with a photo in it, so it is its own component
// rather than a Modal with an <img> inside:
//
//   - it is as big as the viewport allows, where a Modal is max-w-md
//   - the photo is shown WHOLE (`photo--full` → object-contain), not cropped
//     to a well
//   - it steps between photos with the arrow keys, and says which one you
//     are on
//   - there is no title row, so the close control cannot live in one — a
//     Modal without a `title` renders no close button at all, which would
//     leave Escape and the scrim as the only ways out
//
// The photograph itself is never filtered, same rule as everywhere else:
// trust outranks the print look. See docs/design-system.md §5.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import { lightboxIn, lightboxOut, photoSwap } from '../../lib/motion';

export default function Lightbox({ images = [], index = 0, isOpen, onClose, alt = '' }) {
  const photos = Array.isArray(images) ? images.filter(Boolean) : [];
  const [mounted, setMounted] = useState(isOpen);
  const [current, setCurrent] = useState(index);

  const scrim = useRef(null);
  const sheet = useRef(null);
  const frame = useRef(null);
  const closeButton = useRef(null);
  // Where focus was before this opened, so it can be put back. Without it,
  // closing drops focus to the top of the document and a keyboard user has
  // to tab all the way back to the card they were on.
  const returnFocusTo = useRef(null);

  // Both adjustments are made during render rather than in an effect. That
  // is the supported way to derive state from a prop change: an effect would
  // paint one frame of the previous photo first, and React warns about it.
  if (isOpen && !mounted) setMounted(true);

  // Start on whatever the caller was looking at, every time it opens. Only
  // on the open transition — while it is open the thumbnails are behind the
  // scrim and cannot be reached, so following `index` live would only mean
  // fighting the arrow keys.
  // Tracked in state rather than a ref on purpose: a ref read during render
  // is not reactive, and React's own "adjusting state when a prop changes"
  // pattern keeps the previous value in state for exactly this reason.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setCurrent(index);
  }

  useLayoutEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      const tl = lightboxIn(scrim.current, sheet.current);
      return () => tl?.kill();
    }

    const tl = lightboxOut(scrim.current, sheet.current, {
      onComplete: () => setMounted(false),
    });
    return () => tl?.kill();
  }, [isOpen, mounted]);

  const close = useCallback(() => onClose?.(), [onClose]);

  const step = useCallback(
    (delta) => {
      if (photos.length < 2) return;
      // Wraps on purpose: at the last photo, "next" going nowhere feels
      // broken, and there are at most six of them.
      setCurrent((c) => (c + delta + photos.length) % photos.length);
      photoSwap(frame.current);
    },
    [photos.length]
  );

  // Open-only: a listener that outlives the lightbox would steal Escape and
  // the arrow keys from the page underneath.
  useEffect(() => {
    if (!isOpen) return;

    returnFocusTo.current = document.activeElement;
    closeButton.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else return;
      // Only for keys actually handled — swallowing everything would break
      // tabbing out of the close button.
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      returnFocusTo.current?.focus?.();
    };
  }, [isOpen, close, step]);

  if (!mounted || photos.length === 0) return null;

  const many = photos.length > 1;

  return createPortal(
    <div
      ref={scrim}
      className="screen-coarse fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-3 sm:p-6"
      onClick={close}
    >
      <div
        ref={sheet}
        className="w-full max-w-5xl"
        // The scrim closes on click; the sheet must not pass its own clicks
        // up to it, or looking at the photo closes the photo.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel">
          <div
            className="panel__in gap-[9px] !p-[9px]"
            role="dialog"
            aria-modal="true"
            aria-label={alt ? `Photo: ${alt}` : 'Photo'}
          >
            <div
              ref={frame}
              className="art photo photo--full h-[58vh] w-full border-2 border-ink sm:h-[66vh]"
            >
              <img src={photos[current]} alt={alt} />
            </div>

            <div className="flex items-center gap-[9px]">
              {many && (
                <>
                  {/* 46px minimum tap target, per the accessibility floor. */}
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                    className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border-2 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                    className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border-2 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={3} />
                  </button>

                  {/* aria-live so a screen reader is told the photo changed —
                      the image's alt text does not change between photos. */}
                  <span className="label-xs" aria-live="polite">
                    {current + 1} / {photos.length}
                  </span>
                </>
              )}

              <button
                ref={closeButton}
                type="button"
                onClick={close}
                aria-label="Close"
                className="ml-auto flex h-[46px] items-center gap-2 border-2 border-ink bg-paper-2 px-4 font-display text-[16px] uppercase leading-none tracking-[.04em] text-ink transition-colors hover:bg-crimson hover:text-paper-3"
              >
                <X className="h-4 w-4" strokeWidth={3} />
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
