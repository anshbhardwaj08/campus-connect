// Where a blocked account lands. Reached two ways: trying to sign in, and
// being blocked mid-session (the API interceptor sends you here on any
// ACCOUNT_BLOCKED response).
//
// The copy does not apologise and does not pretend there is an appeals
// process — there is no reason recorded against a ban and no route to
// contest one, so telling someone to "contact support" would be sending
// them nowhere. It says what happened, what still holds, and who can undo
// it.

import { Link, useLocation } from 'react-router-dom';

import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';

export default function Suspended() {
  // Set when you arrive by trying to sign in. Someone blocked mid-session
  // is redirected by the API interceptor with a hard navigation, which
  // cannot carry state — so the reason is shown when known, never faked.
  const reason = useLocation().state?.reason;

  return (
    <AuthLayout
      caption="The page is closed to you"
      headline={['You are', <em key="hit">off the page</em>, 'for now']}
      blurb="A moderator has suspended this account. You cannot post, message or deal while that stands."
      narration={[
        'The register is closed to him.',
        'Somebody upstairs made that call.',
        'It holds until they say otherwise.',
      ]}
      splashTone="crimson"
    >
      <div className="js-head">
        <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
          Account suspended
        </h2>
        <p className="meta mb-7 max-w-[42ch] leading-relaxed">
          Suspensions come from the moderators who run this marketplace on campus. Only they
          can lift one — speak to them directly if you think it is a mistake.
        </p>
      </div>

      {reason && (
        <div className="js-field mb-4 border-l-[3px] border-crimson bg-paper-2 p-3.5">
          <p className="label-xs mb-1.5">The reason given</p>
          <p className="text-[13px] font-semibold leading-relaxed text-ink">{reason}</p>
        </div>
      )}

      {/* Every line here is what the server actually does. Keep it that way:
          the content really is withheld (utils/blockedUsers.js), and the
          records really are untouched — unbanning restores all of it. */}
      <div className="js-field border-2 border-ink bg-paper-3 p-3.5">
        <p className="label-xs mb-2">While it stands</p>
        <ul className="flex flex-col gap-1.5 text-[12.5px] font-semibold leading-snug text-ink/80">
          <li>You cannot post, message, make an offer or close a deal.</li>
          <li>Your listings and community posts are hidden from everyone else.</li>
          <li>Nobody can start a new conversation with you.</li>
          <li>Nothing is deleted. It all comes back if the suspension is lifted.</li>
        </ul>
      </div>

      <Link to="/login" className="js-field mt-5 block">
        <Button variant="ink" size="lg" className="w-full">
          Back to sign in
        </Button>
      </Link>
    </AuthLayout>
  );
}
