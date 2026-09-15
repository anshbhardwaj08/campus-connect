// Student login — college email + password.
//
// This is the one screen the theme runs at full strength, because it is the
// first thing a new student sees and it has to carry the product's core
// promise in one screen: this place is not anonymous, and that is the point.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';
import {
  validateCollegeEmail,
  EMAIL_PLACEHOLDER,
  DOMAIN_ERROR,
} from '../../utils/validateCollegeEmail';

const loginSchema = z.object({
  collegeEmail: z
    .string()
    .min(1, 'Enter your college email')
    .email('That is not a valid email address')
    .refine((v) => validateCollegeEmail(v), { message: DOMAIN_ERROR }),
  password: z.string().min(1, 'Enter your password'),
});

// Narration advances along the bottom of the splash, four seconds a beat.
// Third person, present tense, no jokes.
const NARRATION = [
  'He has twelve days left.',
  'The final-year hostels clear on Friday.',
  'Everything he owns has to fit in one suitcase.',
  'Everything else lands on this page.',
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), mode: 'onBlur' });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { user } = res.data.data;
      login(user, null);
      toast.success(`Back on the page, ${user.name.split(' ')[0]}.`);
      navigate('/');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'That did not work. Check the address and the password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      caption="He has been here before"
      headline={['Prove you’re', <em key="hit">one of us</em>]}
      blurb="Use the address the college gave you. Personal Gmail will bounce."
      narration={NARRATION}
      footer={
        <p className="meta border-l-[3px] border-crimson pl-3 leading-relaxed">
          Your first sign-in creates a handler file with your name, branch and year on it.
          Nothing on this page is anonymous, by design.
        </p>
      }
    >
      <div className="js-head">
        <h2 className="mb-1 font-sans text-[24px] font-extrabold leading-tight tracking-[-.01em]">
          Sign in
        </h2>
        <p className="meta mb-7">Twelve days until the final-year hostels clear.</p>
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

        <Input
          containerClassName="js-field"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="js-field !mt-7 w-full"
        >
          Sign in
        </Button>
      </form>

      {/* Secondary actions are underlined text buttons, never outlined
          buttons — there is only ever one crimson element on screen. */}
      <div className="js-field mt-5">
        <Link
          to="/register"
          className="inline-flex min-h-[46px] items-center text-[13px] font-extrabold uppercase tracking-[.07em] text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-crimson"
        >
          No account yet? Start your file
        </Link>
      </div>
    </AuthLayout>
  );
}
