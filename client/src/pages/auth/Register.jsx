// Student registration. Same split as Login — only the headline and the
// form change.
//
// The department / batch / hostel fields are optional on the server, but
// they are the fields that make a seller legible to a buyer, so they are
// asked for here rather than buried in Settings.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/layout/AuthLayout';
import {
  validateCollegeEmail,
  EMAIL_PLACEHOLDER,
  DOMAIN_ERROR,
} from '../../utils/validateCollegeEmail';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    collegeEmail: z
      .string()
      .min(1, 'Enter your college email')
      .email('That is not a valid email address')
      .refine((v) => validateCollegeEmail(v), { message: DOMAIN_ERROR }),
    phone: z.string().min(8, 'Enter a phone number we can reach you on'),
    password: z.string().min(8, 'Eight characters, minimum'),
    confirmPassword: z.string().min(1, 'Type it once more'),
    dept: z.string().optional(),
    batch: z.string().optional(),
    hostel: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'These two do not match',
    path: ['confirmPassword'],
  });

// Narration advances along the bottom of the splash, four seconds a beat.
const NARRATION = [
  'She signs the register on a Tuesday.',
  'Name, branch, year. Nothing more than that.',
  'By Thursday the drafter has a new owner.',
  'Nobody on this page is a stranger.',
];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema), mode: 'onBlur' });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.collegeEmail,
        collegeEmail: data.collegeEmail,
        phone: data.phone,
        password: data.password,
        dept: data.dept,
        batch: data.batch,
        hostel: data.hostel,
      });
      toast.success('File opened. Check your college inbox.');
      navigate('/verify-email');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'That did not go through. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      caption="Nobody here is a stranger"
      headline={['Your first panel', <em key="hit">starts here</em>]}
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
          Create your account
        </h2>
        <p className="meta mb-7">Four fields to trade. Three more to be trusted.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          containerClassName="js-field"
          label="Full name"
          autoComplete="name"
          placeholder="As it appears on your ID card"
          error={errors.name?.message}
          {...register('name')}
        />

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
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="9876543210"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="grid grid-cols-3 gap-[9px]">
          <Input containerClassName="js-field" label="Branch" placeholder="CSE" {...register('dept')} />
          <Input containerClassName="js-field" label="Year" placeholder="2027" {...register('batch')} />
          <Input containerClassName="js-field" label="Hostel" placeholder="H7" {...register('hostel')} />
        </div>

        <Input
          containerClassName="js-field"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Eight characters, minimum"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          containerClassName="js-field"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Type it once more"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" variant="primary" size="lg" loading={loading} className="js-field !mt-7 w-full">
          Open my file
        </Button>
      </form>

      <div className="js-field mt-5">
        <Link
          to="/login"
          className="inline-flex min-h-[46px] items-center text-[13px] font-extrabold uppercase tracking-[.07em] text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-crimson"
        >
          Already on the register? Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
