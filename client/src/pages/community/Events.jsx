// What is on around campus.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import CommunityShell, { COMMUNITY_SPAN } from '../../components/community/CommunityShell';
import EventCard from '../../components/community/EventCard';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import ImagePicker from '../../components/listing/ImagePicker';

const BLANK = {
  title: '',
  description: '',
  date: '',
  location: '',
  category: '',
  ticketPrice: '',
  capacity: '',
};

export default function Events() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [image, setImage] = useState([]);
  const [error, setError] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get('/events').then((r) => r.data.data.events),
  });

  const createEvent = useMutation({
    mutationFn: (payload) => {
      // The route runs multer for an optional image, so it expects multipart
      // even when no file is attached. The field is `image` (single) —
      // listings use `images` (array); they are not interchangeable.
      const body = new FormData();
      Object.entries(payload).forEach(([k, v]) => v !== '' && body.append(k, v));
      if (image[0]) body.append('image', image[0]);
      return api.post('/events', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Posted. It is on the page.');
      setOpen(false);
      setForm(BLANK);
      setImage([]);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not post that event.')),
  });

  // Calling off an event is destructive and irreversible, so it asks first.
  const removeEvent = useMutation({
    mutationFn: (event) => api.delete(`/events/${event._id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Called off. It is off the page.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not call that off.')),
  });

  const confirmRemove = (event) => {
    const ok = window.confirm(
      `Call off "${event.title}"? Anyone who said they were going will not be told.`
    );
    if (ok) removeEvent.mutate(event);
  };

  // The server answers with the event as it now stands, so the message says
  // what actually happened — "already going" is not a failure.
  const rsvp = useMutation({
    mutationFn: (event) => api.patch(`/events/${event._id}/rsvp`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(res.data.message);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not put you down for that.')),
  });

  const cancelRsvp = useMutation({
    mutationFn: (event) => api.delete(`/events/${event._id}/rsvp`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Taken off the list.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not take you off the list.')),
  });

  const submit = () => {
    setError('');
    if (form.title.trim().length < 3) return setError('Give it a name.');
    if (!form.date) return setError('When is it?');

    createEvent.mutate({
      ...form,
      isFree: !form.ticketPrice || Number(form.ticketPrice) === 0,
      ticketPrice: Number(form.ticketPrice) || 0,
    });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <CommunityShell
        title={['WHAT IS', 'ON']}
        blurb="Fests, talks, matches, screenings. If it is happening on campus, it belongs here."
        actionLabel="Post an event"
        onAction={isAuthenticated ? () => setOpen(true) : undefined}
        loading={isLoading}
        isEmpty={!events?.length}
        emptyTitle="NOTHING ON"
        emptyText="No events posted yet. Put the first one up."
      >
        {events?.map((event, i) => (
          <div key={event._id} className={COMMUNITY_SPAN}>
            <EventCard
              event={event}
              index={Math.min(i, 10)}
              currentUserId={user?._id}
              onRsvp={(e) => rsvp.mutate(e)}
              onCancelRsvp={(e) => cancelRsvp.mutate(e)}
              onDelete={confirmRemove}
              busy={rsvp.isPending || cancelRsvp.isPending || removeEvent.isPending}
            />
          </div>
        ))}
      </CommunityShell>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        caption="Tell the page about it"
        title="Post an event"
      >
        <div className="flex flex-col gap-3.5">
          <Input label="What is it" placeholder="Inter-hostel football final" value={form.title} onChange={set('title')} />
          <Textarea label="Details" rows={3} placeholder="What happens, who it is for, anything people should bring." value={form.description} onChange={set('description')} />
          <Input label="When" type="datetime-local" value={form.date} onChange={set('date')} />
          <Input label="Where" placeholder="Main ground" value={form.location} onChange={set('location')} />

          <div className="grid grid-cols-2 gap-[9px]">
            <Input label="Category" placeholder="Sport" value={form.category} onChange={set('category')} />
            <Input
              label="Ticket (₹)"
              type="number"
              min="0"
              placeholder="0 for free"
              value={form.ticketPrice}
              onChange={set('ticketPrice')}
            />
          </div>

          <Input
            label="Room for how many"
            type="number"
            min="1"
            placeholder="Leave empty for no limit"
            hint="Once this many are going, the event shows as full."
            value={form.capacity}
            onChange={set('capacity')}
          />

          <ImagePicker
            files={image}
            onChange={setImage}
            max={1}
            label="Poster"
            hint="One image. A poster or a photo of the venue — optional, but it is what makes people look."
          />

          {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

          <Button variant="primary" size="lg" loading={createEvent.isPending} onClick={submit} className="w-full">
            Post it
          </Button>
        </div>
      </Modal>
    </>
  );
}
