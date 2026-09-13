// Student login: college email + password, over the animated tech background
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';

import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import TechBackground from '../../components/ui/TechBackground';

const loginSchema = z.object({
  collegeEmail: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { user } = res.data.data;
      login(user, null);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <TechBackground />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
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
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Log in with your college email to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              tone="glass"
              label="College email"
              type="email"
              icon={Mail}
              placeholder="you@pec.edu.in"
              error={errors.collegeEmail?.message}
              {...register('collegeEmail')}
            />
            <Input
              tone="glass"
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full !mt-6">
              Log in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-violet-400 transition hover:text-violet-300">
              Create an account
            </Link>
          </p>
        </div>

        {/* Trust strip */}
        <div className="mt-7 flex items-center justify-center gap-5 text-[11px] font-medium text-zinc-500">
          <Trust icon={ShieldCheck} text="Verified students only" />
          <Trust icon={Zap} text="AI fair pricing" />
          <Trust icon={Users} text="Safe meetups" />
        </div>
      </div>
    </div>
  );
}

function Trust({ icon: Icon, text }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-violet-400" />
      {text}
    </span>
  );
}
