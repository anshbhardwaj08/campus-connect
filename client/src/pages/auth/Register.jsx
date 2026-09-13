// Student registration, over the animated tech background
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../services/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import TechBackground from '../../components/ui/TechBackground';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    collegeEmail: z.string().email('Enter a valid college email'),
    phone: z.string().min(8, 'Enter a valid phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    dept: z.string().optional(),
    batch: z.string().optional(),
    hostel: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });

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
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <TechBackground />

      <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
        {/* Logo */}
        <Link to="/" className="mb-7 flex items-center justify-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg font-black text-white">
            C
            <span className="absolute inset-0 animate-pulse-glow rounded-xl bg-violet-500/40 blur-md" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white">
            Campus<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Connect</span>
          </span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Create your account</h1>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
              Verified with your college email
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                tone="glass"
                label="Full name"
                icon={User}
                placeholder="Ansh Bhardwaj"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                tone="glass"
                label="Phone number"
                icon={Phone}
                placeholder="9876543210"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <Input
              tone="glass"
              label="College email"
              type="email"
              icon={Mail}
              placeholder="you@pec.edu.in"
              error={errors.collegeEmail?.message}
              {...register('collegeEmail')}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input tone="glass" label="Department" placeholder="CSE" {...register('dept')} />
              <Input tone="glass" label="Batch" placeholder="2024" {...register('batch')} />
              <Input tone="glass" label="Hostel" placeholder="H1" {...register('hostel')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                tone="glass"
                label="Password"
                type="password"
                icon={Lock}
                placeholder="8+ characters"
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                tone="glass"
                label="Confirm password"
                type="password"
                icon={Lock}
                placeholder="Re-enter"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full !mt-6">
              Create account <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-violet-400 transition hover:text-violet-300">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
