// Edit your own file. Only the fields the server actually accepts on
// PATCH /users/me — name, dept, batch, hostel, avatar. College email and
// phone are identity, not preferences, so they are shown but not editable.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import useSignOut from '../../hooks/useSignOut';
import { updateUser } from '../../store/slices/authSlice';
import PageWrapper from '../../components/layout/PageWrapper';
import Panel from '../../components/ui/Panel';
import CaptionBox from '../../components/ui/CaptionBox';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';

const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(100, 'That is too long'),
  dept: z.string().trim().optional(),
  batch: z.string().trim().optional(),
  hostel: z.string().trim().optional(),
  avatar: z.string().trim().url('That is not a valid link').or(z.literal('')).optional(),
});

export default function Settings() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    mode: 'onBlur',
    defaultValues: {
      name: user?.name || '',
      dept: user?.dept || '',
      batch: user?.batch || '',
      hostel: user?.hostel || '',
      avatar: user?.avatar || '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.patch('/users/me', data);
      dispatch(updateUser(res.data.data.user));
      toast.success('File updated.');
      navigate('/profile');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save those changes.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="max-w-2xl">
      <header className="mb-[9px]">
        <h1 className="font-display text-[40px] leading-none tracking-[.02em] text-ink sm:text-[52px]">
          YOUR <span className="text-crimson">FILE</span>
        </h1>
        <p className="meta mt-2">Branch, year and hostel are what make a seller legible to a buyer.</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[9px]" noValidate>
        <Panel index={0}>
          <CaptionBox corner="tl">The details</CaptionBox>

          <div className="flex flex-col gap-4 pt-8">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name} src={user?.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <Input
                  label="Avatar link"
                  placeholder="https://…"
                  error={errors.avatar?.message}
                  hint="Paste a link to a photo. Leave blank for your initials."
                  {...register('avatar')}
                />
              </div>
            </div>

            <Input label="Full name" error={errors.name?.message} {...register('name')} />

            <div className="grid grid-cols-3 gap-[9px]">
              <Input label="Branch" placeholder="CSE" {...register('dept')} />
              <Input label="Year" placeholder="2027" {...register('batch')} />
              <Input label="Hostel" placeholder="H7" {...register('hostel')} />
            </div>
          </div>
        </Panel>

        <Panel index={1}>
          <CaptionBox corner="tl">Fixed on the register</CaptionBox>

          <div className="flex flex-col gap-3 pt-8">
            <Field label="College email" value={user?.collegeEmail} />
            <Field label="Phone" value={user?.phone} />
            <p className="meta border-l-[3px] border-crimson pl-3 leading-relaxed">
              These identify you on the page and cannot be changed here. That is what makes the
              name on a listing mean something.
            </p>
          </div>
        </Panel>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" size="lg" loading={loading}>
            Save changes
          </Button>
          <Button type="button" variant="link" onClick={() => navigate('/profile')}>
            Cancel
          </Button>
          <Button type="button" variant="link" onClick={signOut} className="ml-auto">
            Sign out
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="label-xs mb-1.5 block">{label}</span>
      <p className="border-2 border-ink/25 bg-paper-2 px-3 py-2.5 text-[14px] font-semibold text-steel">
        {value || '—'}
      </p>
    </div>
  );
}
