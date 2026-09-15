// Rides out of campus, and seats going spare in them.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import CommunityShell, { COMMUNITY_SPAN } from '../../components/community/CommunityShell';
import CarpoolCard from '../../components/community/CarpoolCard';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const BLANK = { from: '', to: '', departureDate: '', seatsAvailable: '', contactInfo: '' };

export default function Carpool() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState({ from: '', to: '' });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const { data: rides, isLoading } = useQuery({
    queryKey: ['carpool', search],
    queryFn: () =>
      api
        .get('/carpool', {
          params: Object.fromEntries(Object.entries(search).filter(([, v]) => v)),
        })
        .then((r) => r.data.data.rides),
  });

  const createRide = useMutation({
    mutationFn: (payload) => api.post('/carpool', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carpool'] });
      toast.success('Ride posted.');
      setOpen(false);
      setForm(BLANK);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not post that ride.')),
  });

  const removeRide = useMutation({
    mutationFn: (id) => api.delete(`/carpool/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carpool'] });
      toast.success('Taken down.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not take that down.')),
  });

  const submit = () => {
    setError('');
    if (!form.from.trim() || !form.to.trim()) return setError('Where from, and where to?');
    if (!form.departureDate) return setError('When are you leaving?');
    if (!form.contactInfo.trim()) return setError('Leave a number people can reach you on.');

    createRide.mutate({ ...form, seatsAvailable: Number(form.seatsAvailable) || 0 });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <CommunityShell
        title={['SHARE A', 'RIDE']}
        blurb="Going to the station, the airport, home for the break? Split it with somebody heading the same way."
        actionLabel="Post a ride"
        onAction={isAuthenticated ? () => setOpen(true) : undefined}
        filters={
          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <Input
              containerClassName="w-full sm:w-[180px]"
              label="From"
              placeholder="Campus"
              value={search.from}
              onChange={(e) => setSearch((s) => ({ ...s, from: e.target.value }))}
            />
            <Input
              containerClassName="w-full sm:w-[180px]"
              label="To"
              placeholder="Station"
              value={search.to}
              onChange={(e) => setSearch((s) => ({ ...s, to: e.target.value }))}
            />
            {(search.from || search.to) && (
              <Button variant="link" onClick={() => setSearch({ from: '', to: '' })}>
                Clear
              </Button>
            )}
          </div>
        }
        loading={isLoading}
        isEmpty={!rides?.length}
        emptyTitle="NO RIDES UP"
        emptyText={
          search.from || search.to
            ? 'Nothing on that route yet. Post yours and let someone find you.'
            : 'Nobody has posted a ride. Be the first.'
        }
      >
        {rides?.map((ride, i) => (
          <div key={ride._id} className={COMMUNITY_SPAN}>
            <CarpoolCard
              ride={ride}
              index={Math.min(i, 10)}
              currentUserId={user?._id}
              onDelete={(id) => removeRide.mutate(id)}
              busy={removeRide.isPending}
            />
          </div>
        ))}
      </CommunityShell>

      <Modal isOpen={open} onClose={() => setOpen(false)} caption="Somebody is going your way" title="Post a ride">
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-[9px]">
            <Input label="From" placeholder="Main gate" value={form.from} onChange={set('from')} />
            <Input label="To" placeholder="Railway station" value={form.to} onChange={set('to')} />
          </div>

          <Input label="Leaving" type="datetime-local" value={form.departureDate} onChange={set('departureDate')} />

          <div className="grid grid-cols-2 gap-[9px]">
            <Input label="Seats spare" type="number" min="0" placeholder="3" value={form.seatsAvailable} onChange={set('seatsAvailable')} />
            <Input label="Contact" placeholder="9876543210" value={form.contactInfo} onChange={set('contactInfo')} />
          </div>

          <p className="meta border-l-[3px] border-crimson pl-3 leading-relaxed">
            Your contact shows on the card so people can reach you. Split the fare, agree it before
            you set off.
          </p>

          {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

          <Button variant="primary" size="lg" loading={createRide.isPending} onClick={submit} className="w-full">
            Post the ride
          </Button>
        </div>
      </Modal>
    </>
  );
}
