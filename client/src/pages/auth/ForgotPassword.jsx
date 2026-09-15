// "I cannot get in." Two states: the form, and the confirmation.
//
// The confirmation deliberately does NOT say whether that address had an
// account. The server answers the same way either way (see
// auth.controller.js `forgotPassword`) — otherwise this screen becomes a
// way to find out who is registered, one address at a time. So the copy
// says "if that account exists", and means it.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';
import { EMAIL_PLACEHOLDER } from '../../utils/validateCollegeEmail';

const schema = z.object({
  collegeEmail: z.string().min(1, 'Enter your college email').email('That is not an email address'),
});

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setError('');
    try {
      await api.post('/auth/forgot-password', values);
      setSent(true);
    } catch (err) {
      // A 429 from the reset limiter is the one real failure worth showing.
      setError(apiErrorMessage(err, 'Could not send that. Try again in a minute.'));
    }
  };

  if (sent) {
    return (
      <AuthLayout
        caption="The letter is in the post"
        headline={['Check your', <em key="hit">college inbox</em>]}
        blurb="If that account exists, a link is on its way."
        narration={[
          'He writes the address from memory.',
          'The letter goes out the same hour.',
          'One link. One hour. Then it is cold.',
        ]}
      >
        <div className="js-head">
          <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
            Sent
          </h2>
          <p className="meta mb-7 max-w-[40ch] leading-relaxed">
            If that address has an account, the reset link is in it now. It works once and
            expires in an hour. Look in spam before asking for another.
          </p>
        </div>

        <Link to="/login" className="js-field block">
          <Button variant="primary" size="lg" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      caption="Happens to everyone"
      headline={['Locked out of', <em key="hit">your own file</em>]}
      blurb="Give us the college address on the account and we will send a way back in."
      narration={[
        'Everybody forgets one eventually.',
        'The clerk does not judge. He just checks the register.',
      ]}
    >
      <div className="js-head">
        <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
          Forgot your password
        </h2>
        <p className="meta mb-7">We will email you a link to set a new one.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          containerClassName="js-field"
          label="College email"
          type="email"
          autoComplete="username"
          placeholder={EMAIL_PLACEHOLDER}
          error={errors.collegeEmail?.message}
          {...register('collegeEmail')}
        />

        {error && (
          <p className="js-field text-[11.5px] font-bold leading-snug text-crimson">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          className="js-field !mt-7 w-full"
        >
          Send me a link
        </Button>
      </form>

      <div className="js-field mt-5">
        <Link
          to="/login"
          className="inline-flex min-h-[46px] items-center text-[13px] font-extrabold uppercase tracking-[.07em] text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-crimson"
        >
          I remembered it — sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
