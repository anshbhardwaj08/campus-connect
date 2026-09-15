// Email verification. Two states in one screen:
//
//   no ?token  → the waiting state, straight after registering
//   ?token=... → consume the link from the email and report the result
//
// The copy stays plain and unsoftened. A failed link says what to do next
// rather than apologising.

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');

  // 'waiting' | 'checking' | 'verified' | 'failed'
  const [status, setStatus] = useState(token ? 'checking' : 'waiting');
  const [reason, setReason] = useState('');

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
      body: 'The link lands in a minute or two. If it does not, look in spam before you try again — the college mail server is slow, not broken.',
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
      narration: [
        'The address checks out.',
        'His name goes on the register.',
      ],
      title: 'Email verified',
      body: 'Next you verify a phone number, so buyers have a way to reach you at the gate.',
    },
    failed: {
      caption: 'The link went cold',
      headline: ['That link', <em key="hit">did not hold</em>],
      blurb: 'Verification links expire. Register again or ask for a fresh one.',
      narration: [
        'Links expire. This one did.',
        'He starts the file again.',
      ],
      title: 'Link rejected',
      body: reason,
    },
  }[status];

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

      {status === 'failed' && (
        <Link to="/register" className="js-field block">
          <Button variant="primary" size="lg" className="w-full">
            Start over
          </Button>
        </Link>
      )}

      {status === 'waiting' && (
        <Link to="/login" className="js-field block">
          <Button variant="ink" size="lg" className="w-full">
            I have verified — sign in
          </Button>
        </Link>
      )}

      <p className="js-field meta mt-8 border-l-[3px] border-crimson pl-3 leading-relaxed">
        Only the address the college issued you will work here. That is what keeps the page
        to people you can actually find on campus.
      </p>
    </AuthLayout>
  );
}
