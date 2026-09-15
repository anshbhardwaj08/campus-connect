// One notification, sent to every registered user (`POST
// /admin/notifications/broadcast` inserts one Notification document per
// user — see admin.controller.js). There is no undo, so it asks for
// confirmation naming the exact recipient count before sending.
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';

import adminApi from '../../services/adminApi';
import apiErrorMessage from '../../utils/apiError';
import AdminNavbar from '../../components/layout/AdminNavbar';
import Panel from '../../components/ui/Panel';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

const BLANK = { title: '', message: '', link: '' };

export default function Broadcaster() {
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.get('/admin/stats').then((r) => r.data.data),
  });

  const send = useMutation({
    mutationFn: (payload) => adminApi.post('/admin/notifications/broadcast', payload),
    onSuccess: (res) => {
      toast.success(`Sent to ${res.data.data.count} users.`);
      setForm(BLANK);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not send that.')),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (form.title.trim().length < 3) return setError('Give it a title.');
    if (form.message.trim().length < 3) return setError('Say something.');

    if (!window.confirm(`Send to all ${stats?.totalUsers ?? 'registered'} users? This cannot be undone.`)) return;

    send.mutate({
      title: form.title.trim(),
      message: form.message.trim(),
      link: form.link.trim() || undefined,
    });
  };

  return (
    <>
      <AdminNavbar title="Broadcast" blurb="One notification, sent to every registered user." />

      <div className="p-6">
        <Panel className="max-w-lg">
          <span className="caption caption--tl">Reaches {stats?.totalUsers ?? '…'} users</span>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3.5">
            <Input
              label="Title"
              placeholder="Campus is closing early Friday"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              label="Message"
              rows={4}
              placeholder="Details students need to know."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
            <Input
              label="Link (optional)"
              placeholder="/events"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            />

            {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

            <Button variant="primary" size="lg" loading={send.isPending} className="mt-1 w-full">
              <Megaphone className="h-4 w-4" strokeWidth={3} /> Send broadcast
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
