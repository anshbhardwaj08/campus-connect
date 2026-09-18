// A URL that is not a page.
//
// This was a bare `<div>Page not found</div>` in the route table — the one
// screen in the product with no theme on it at all, reached by every typo
// and every stale link. The masthead stays, because it is the way out.
//
// The panel's single crimson hit goes to the word MISSING, so the button
// is ink — same call as Suspended and the deal card's return button. With
// nothing else on the screen competing for attention, an ink button still
// reads as the action.
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import PageWrapper from '../components/layout/PageWrapper';
import Panel from '../components/ui/Panel';
import CaptionBox from '../components/ui/CaptionBox';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <PageWrapper>
      <div className="mx-auto max-w-2xl pt-6 sm:pt-16">
        <Panel screen="coarse">
          <CaptionBox corner="tl">Nothing on this page</CaptionBox>

          <div className="flex flex-col gap-4 pt-8">
            <h1 className="font-display text-[44px] leading-none tracking-[.02em] text-ink sm:text-[64px]">
              THIS PAGE IS <span className="text-crimson">MISSING</span>
            </h1>

            {/* Says which of the two it is, because they need different
                things from the reader — and rules out the third thing
                anyone fears, which is that their account is broken. */}
            <p className="text-[14px] font-semibold leading-relaxed text-ink/80">
              Either the link was wrong, or whatever was here has been taken down — a
              listing that sold, a post its owner removed. Nothing has gone wrong with
              your account.
            </p>

            <div className="flex flex-wrap items-center gap-4 border-t-2 border-ink/10 pt-4">
              <Link to="/browse">
                <Button variant="ink" size="lg">
                  <Search className="h-4 w-4" strokeWidth={3} /> Browse what is up
                </Button>
              </Link>
              <Link
                to="/"
                className="font-sans text-[13px] font-extrabold uppercase tracking-[.07em] text-ink underline decoration-2 underline-offset-4 hover:text-crimson"
              >
                Back to the front page
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </PageWrapper>
  );
}
