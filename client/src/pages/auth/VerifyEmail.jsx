// Email verification. Two states in one screen:
//
//   no ?token  → the waiting state, straight after registering
//   ?token=... → consume the link from the email and report the result
//
// This screen used to be optional. It said "check your inbox" and offered a
// button straight to the sign-in form, which worked whether or not anybody
// had opened the email — login never looked at the flag. It is now the only
// way in, so it also has to be the way OUT of every corner a student can get
// stuck in: a link that never arrived, one that went to spam, one that
// expired. Hence the resend form, on both the waiting and the failed state.
// Registering again is not an escape — that address is taken, and answers 409.
//
// The copy stays plain and unsoftened. A failed link says what to do next
// rather than apologising.

import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';
import { EMAIL_PLACEHOLDER } from '../../utils/validateCollegeEmail';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const token = params.get('token');

  // 'waiting' | 'checking' | 'verified' | 'failed'
  const [status, setStatus] = useState(token ? 'checking' : 'waiting');
  const [reason, setReason] = useState('');

  // Register and Login both hand the address over in router state. Somebody
  // arriving here cold — a bookmark, a second device — types it instead.
  const [email, setEmail] = useState(state?.email || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        await api.get('/auth/verify-email', { params: { token } });
        if (!cancelled) setStatus('verified');
      } catch (err) {
        if (cancelled) return;
        setReason(apiErrorMessage(err, 'That link is spent or expired.'));
        setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const resend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      // The server answers the same way whatever it finds, so that this is
      // not a way to test which addresses are registered. Nothing here can
      // report more than it was told.
      const res = await api.post('/auth/resend-verification', { collegeEmail: email.trim() });
      setSent(true);
      toast.success(res.data?.message || 'On its way.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not send it just now. Try again in a minute.'));
    } finally {
      setSending(false);
    }
  };

  const copy = {
    waiting: {
      caption: 'The letter is in the post',
      headline: ['Check your', <em key="hit">college inbox</em>],
      blurb: 'We sent a link to the address you registered with. Open it and you are on the page.',
      narration: [
        'The letter goes out the moment he signs.',
        'College mail is slow, not broken.',
        'It lands. It always lands.',
      ],
      title: 'One link away',
      body: 'Open the link and your account is live. Until then you cannot sign in — that link is what proves the address is yours. It lands in a minute or two; look in spam before you ask for another.',
    },
    checking: {
      caption: 'Reading the file',
      headline: ['Checking', <em key="hit">your link</em>],
      blurb: 'This takes a second.',
      title: 'Verifying',
      body: 'Hold on.',
    },
    verified: {
      caption: 'That settles it',
      headline: ['You’re', <em key="hit">on the register</em>],
      blurb: 'Your address checks out. Sign in and the page opens.',
      narration: ['The address checks out.', 'His name goes on the register.'],
      title: 'Email verified',
      body: 'That is the whole check. Sign in and the page opens.',
    },
    failed: {
      caption: 'The link went cold',
      headline: ['That link', <em key="hit">did not hold</em>],
      blurb: 'Verification links last a day. Ask for a fresh one below.',
      narration: ['Links expire. This one did.', 'He asks for another.'],
      title: 'Link rejected',
      body: reason,
    },
  }[status];

  const canResend = status === 'waiting' || status === 'failed';

  return (
    <AuthLayout
      caption={copy.caption}
      headline={copy.headline}
      blurb={copy.blurb}
      narration={copy.narration || []}
      splashTone={status === 'failed' ? 'crimson' : 'night'}
    >
      <div className="js-head">
        <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
          {copy.title}
        </h2>
        <p className="meta mb-7 max-w-[40ch] leading-relaxed">{copy.body}</p>
      </div>

      {status === 'verified' && (
        <Link to="/login" className="js-field block">
          <Button variant="primary" size="lg" className="w-full">
            Sign in
          </Button>
        </Link>
      )}

      {canResend && (
        <form onSubmit={resend} className="space-y-4" noValidate>
          <Input
            containerClassName="js-field"
            label="Send the link again to"
            type="email"
            name="collegeEmail"
            autoComplete="username"
            placeholder={EMAIL_PLACEHOLDER}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
          />

          <Button
            type="submit"
            variant={status === 'failed' ? 'primary' : 'ink'}
            size="lg"
            loading={sending}
            disabled={!email.trim()}
            className="js-field w-full"
          >
            {sent ? 'Sent — check again' : 'Send it again'}
          </Button>
        </form>
      )}

      {canResend && (
        <div className="js-field mt-5">
          <Link
            to="/login"
            className="inline-flex min-h-[46px] items-center text-[13px] font-extrabold uppercase tracking-[.07em] text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-crimson"
          >
            Already verified? Sign in
          </Link>
        </div>
      )}

      <p className="js-field meta mt-8 border-l-[3px] border-crimson pl-3 leading-relaxed">
        Only the address the college issued you will work here. That is what keeps the page
        to people you can actually find on campus.
      </p>
    </AuthLayout>
  );
}
