// Admin sign-in. Deliberately plain next to the student-facing auth splash
// (see client/src/components/auth/AuthSplash.jsx) — this is a utility tool
// for a handful of people, not a moment worth a "the page is being printed"
// sequence. One centred panel on the halftone ground is enough.
//
// Signs in through the SAME /auth/login endpoint the client uses (there is
// no separate admin login route) and the same httpOnly cookie — the only
// admin-specific step is refusing to treat a non-admin session as signed in.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import Wordmark from '../../components/ui/Wordmark';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ collegeEmail: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.collegeEmail.trim() || !form.password) {
      setError('Enter your college email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.post('/auth/login', form);
      const user = res.data.data.user;

      if (!['admin', 'moderator'].includes(user.role)) {
        // The cookie is set, but this account has no business here — do not
        // dispatch credentials, so adminAuth stays signed out and the route
        // guard never lets them past /login.
        setError('This account does not have admin access.');
        return;
      }

      login(user);
      toast.success(`Signed in as ${user.name}.`);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-coarse flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <Wordmark size="md" to={null} />
          <Badge tone="ink">Admin panel</Badge>
        </div>

        <div className="panel">
          <div className="panel__in gap-4 !p-6">
            <span className="caption caption--tl">Staff only</span>

            <form onSubmit={submit} className="mt-5 flex flex-col gap-3.5">
              <Input
                label="College email"
                type="email"
                autoComplete="username"
                placeholder="you@pec.edu.in"
                value={form.collegeEmail}
                onChange={set('collegeEmail')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
              />

              {error && (
                <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>
              )}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1.5 w-full">
                Sign in
              </Button>
            </form>
          </div>
        </div>

        <p className="meta mt-4 text-center leading-relaxed">
          Roles: admin or moderator only. Everyone else belongs on the
          student site.
        </p>
      </div>
    </div>
  );
}
