// A URL that is not an admin page.
//
// Was a bare `<div>Page not found</div>` in the route table — the one screen
// here with no theme on it. It sits outside AdminProtectedRoute, so it
// renders standalone rather than inside the sidebar shell: somebody who is
// not signed in must not be shown the panel's chrome.
//
// Crimson is spent twice on this screen and no more: the Wordmark, which is
// identity, and the word PAGE. The button is therefore ink — the same call
// the client's 404 and the Suspended screen make.
import { Link } from 'react-router-dom';

import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Wordmark from '../components/ui/Wordmark';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Wordmark />
        </div>

        <Panel screen="coarse">
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-[38px] leading-none tracking-[.02em] text-ink sm:text-[48px]">
              NO SUCH <span className="text-crimson">PAGE</span>
            </h1>

            <p className="text-[14px] font-semibold leading-relaxed text-ink/80">
              This address is not part of the panel. If you followed a link from
              somewhere, it is out of date.
            </p>

            <div className="border-t-2 border-ink/10 pt-4">
              <Link to="/">
                <Button variant="ink" size="lg">
                  Back to the dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
