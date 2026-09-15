// A modal is just a panel that lands on top of the page.
//
// The scrim is flat ink with a halftone screen over it — no backdrop blur,
// because nothing in this system blurs. The panel wipes in left to right
// like every other panel, and the close control is a real button.
//
// GSAP drives both directions, so the exit has to finish before the portal
// unmounts — that is what `mounted` tracks. Under reduced motion there is no
// exit to wait for, so it unmounts straight away.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { gsap, prefersReducedMotion, EASE, HIDDEN, SHOWN } from '../../lib/motion';

export default function Modal({ isOpen, onClose, title, caption, children }) {
  const reduced = prefersReducedMotion();
  const [mounted, setMounted] = useState(isOpen);
  const scrim = useRef(null);
  const sheet = useRef(null);

  // Derived during render, not in an effect: opening mounts immediately, and
  // with no exit animation to play, closing unmounts immediately too.
  if (isOpen && !mounted) setMounted(true);
  if (!isOpen && mounted && reduced) setMounted(false);

  useLayoutEffect(() => {
    if (!mounted || reduced || !scrim.current || !sheet.current) return;

    const tl = gsap.timeline(
      isOpen ? {} : { onComplete: () => setMounted(false) }
    );

    if (isOpen) {
      tl.fromTo(scrim.current, { opacity: 0 }, { opacity: 1, duration: 0.18 });
      tl.fromTo(
        sheet.current,
        { clipPath: HIDDEN },
        { clipPath: SHOWN, duration: 0.4, ease: EASE },
        '-=0.08'
      );
    } else {
      tl.to(sheet.current, { clipPath: HIDDEN, duration: 0.28, ease: 'power3.in' });
      tl.to(scrim.current, { opacity: 0, duration: 0.16 }, '-=0.14');
    }

    return () => tl.kill();
  }, [isOpen, mounted, reduced]);

  const close = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={scrim}
      className="screen-coarse fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={close}
    >
      <div ref={sheet} className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="panel">
          <div className="panel__in gap-4 !p-5" role="dialog" aria-modal="true">
            {caption && <span className="caption caption--tl">{caption}</span>}

            {title && (
              <div className={`flex items-start justify-between gap-4 ${caption ? 'pt-4' : ''}`}>
                <h3 className="font-sans text-[19px] font-extrabold leading-tight tracking-[-.01em]">
                  {title}
                </h3>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3"
                >
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
