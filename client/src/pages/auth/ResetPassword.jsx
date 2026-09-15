// Setting the new password, from the link in the email.
//
// No ?token at all is its own state — arriving here directly is a dead end,
// and saying so beats showing a form that cannot work. A rejected token
// (used, expired, tampered) says the same thing the server does and points
// back at asking for a fresh one.

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';

// Mirrors the server's Joi rule (min 8) so a password it would reject fails
// here, readably, instead of coming back as a 400.
const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Type it again'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Those two do not match',
  });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      toast.success('Password changed. Sign in with the new one.');
      navigate('/login');
    } catch (err) {
      setError(apiErrorMessage(err, 'That link did not work.'));
    }
  };

  if (!token) {
    return (
      <AuthLayout
        caption="Nothing to go on"
        headline={['This page needs', <em key="hit">a link</em>]}
        blurb="Reset links come by email. There is no token in this one."
        narration={['No token, no file.', 'He sends the letter again.']}
        splashTone="crimson"
      >
        <div className="js-head">
          <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
            No reset link
          </h2>
          <p className="meta mb-7 max-w-[40ch] leading-relaxed">
            Open the link from the email instead, or ask for a new one.
          </p>
        </div>

        <Link to="/forgot-password" className="js-field block">
          <Button variant="primary" size="lg" className="w-full">
            Send me a link
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      caption="Back in you go"
      headline={['Set a', <em key="hit">new password</em>]}
      blurb="Pick something you have not used here before. Everything else stays as it was."
      narration={[
        'A new key, cut on the spot.',
        'The old one stops working the moment this does.',
      ]}
    >
      <div className="js-head">
        <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
          New password
        </h2>
        <p className="meta mb-7">Eight characters or more.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          containerClassName="js-field"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          containerClassName="js-field"
          label="Type it again"
          type="password"
          autoComplete="new-password"
          placeholder="The same one"
          error={errors.confirm?.message}
          {...register('confirm')}
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
          Change it
        </Button>
      </form>

      <p className="js-field meta mt-8 border-l-[3px] border-crimson pl-3 leading-relaxed">
        Changing your password signs you out everywhere else. If someone else had got in,
        this is what puts them out.
      </p>
    </AuthLayout>
  );
}
