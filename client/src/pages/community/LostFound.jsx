// Things that went missing, and things somebody picked up.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import CommunityShell, { COMMUNITY_SPAN, FilterChip } from '../../components/community/CommunityShell';
import LostFoundCard from '../../components/community/LostFoundCard';
import ImagePicker from '../../components/listing/ImagePicker';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

const BLANK = { type: 'lost', title: '', description: '', location: '' };

export default function LostFound() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['lostfound', filter],
    queryFn: () =>
      api.get('/lostfound', { params: filter ? { type: filter } : {} }).then((r) => r.data.data.items),
  });

  const createItem = useMutation({
    mutationFn: (payload) => {
      const body = new FormData();
      Object.entries(payload).forEach(([k, v]) => v !== '' && body.append(k, v));
      files.forEach((f) => body.append('images', f));
      return api.post('/lostfound', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lostfound'] });
      toast.success('Posted. Someone on the page may have seen it.');
      setOpen(false);
      setForm(BLANK);
      setFiles([]);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not post that.')),
  });

  const resolve = useMutation({
    mutationFn: (id) => api.patch(`/lostfound/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lostfound'] });
      toast.success('Marked sorted. Good.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update that.')),
  });

  const submit = () => {
    setError('');
    if (form.title.trim().length < 3) return setError('Say what it is.');
    createItem.mutate(form);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <CommunityShell
        title={['LOST &', 'FOUND']}
        blurb="A calculator on a bench, a key in the mess. Say what you lost, or what you picked up."
        actionLabel="Post one"
        onAction={isAuthenticated ? () => setOpen(true) : undefined}
        filters={
          <>
            <FilterChip active={!filter} onClick={() => setFilter('')}>
              Everything
            </FilterChip>
            <FilterChip active={filter === 'lost'} onClick={() => setFilter('lost')}>
              Lost
            </FilterChip>
            <FilterChip active={filter === 'found'} onClick={() => setFilter('found')}>
              Found
            </FilterChip>
          </>
        }
        loading={isLoading}
        isEmpty={!items?.length}
        emptyTitle="NOTHING REPORTED"
        emptyText={
          filter
            ? `No ${filter} items right now.`
            : 'Nothing lost, nothing found. Long may it last.'
        }
      >
        {items?.map((item, i) => (
          <div key={item._id} className={COMMUNITY_SPAN}>
            <LostFoundCard
              item={item}
              index={Math.min(i, 10)}
              currentUserId={user?._id}
              onResolve={(id) => resolve.mutate(id)}
              busy={resolve.isPending}
            />
          </div>
        ))}
      </CommunityShell>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        caption="Somebody may have seen it"
        title="Lost or found something?"
      >
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-2">
            <FilterChip active={form.type === 'lost'} onClick={() => setForm((f) => ({ ...f, type: 'lost' }))}>
              I lost it
            </FilterChip>
            <FilterChip active={form.type === 'found'} onClick={() => setForm((f) => ({ ...f, type: 'found' }))}>
              I found it
            </FilterChip>
          </div>

          <Input label="What is it" placeholder="Casio scientific calculator" value={form.title} onChange={set('title')} />
          <Textarea
            label="Details"
            rows={3}
            placeholder="Any marking that proves it is theirs — a name, a scratch, a sticker."
            value={form.description}
            onChange={set('description')}
          />
          <Input
            label="Where"
            placeholder={form.type === 'lost' ? 'Last seen in the library' : 'Found near the mess'}
            value={form.location}
            onChange={set('location')}
          />

          <ImagePicker files={files} onChange={setFiles} label="Photos" hint="A photo is what makes it recognisable." />

          {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

          <Button variant="primary" size="lg" loading={createItem.isPending} onClick={submit} className="w-full">
            Post it
          </Button>
        </div>
      </Modal>
    </>
  );
}
