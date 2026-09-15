// The marketplace in reverse: people saying what they want, so sellers can
// find them instead of the other way round.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import CommunityShell, { COMMUNITY_SPAN, FilterChip } from '../../components/community/CommunityShell';
import Panel from '../../components/ui/Panel';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import MessageButton from '../../components/community/MessageButton';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import formatPrice from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';
import { useCategories } from '../../hooks/useCategories';

const BLANK = { title: '', description: '', category: '', maxBudget: '' };

export default function LookingFor() {
  const { user, isAuthenticated } = useAuth();
  const categories = useCategories();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['lookingfor', category],
    queryFn: () =>
      api
        .get('/lookingfor', { params: category ? { category } : {} })
        .then((r) => r.data.data.posts),
  });

  const createPost = useMutation({
    mutationFn: (payload) => api.post('/lookingfor', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookingfor'] });
      toast.success('Posted. Sellers can come to you now.');
      setOpen(false);
      setForm(BLANK);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not post that.')),
  });

  const fulfil = useMutation({
    mutationFn: (id) => api.patch(`/lookingfor/${id}/fulfilled`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookingfor'] });
      toast.success('Marked found.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update that.')),
  });

  const submit = () => {
    setError('');
    if (form.title.trim().length < 3) return setError('Say what you are after.');
    createPost.mutate({ ...form, maxBudget: Number(form.maxBudget) || 0 });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <CommunityShell
        title={['WANTED ON', 'CAMPUS']}
        blurb="Nobody is selling what you need? Say so here and let the seller find you."
        actionLabel="Post a want"
        onAction={isAuthenticated ? () => setOpen(true) : undefined}
        filters={
          <>
            <FilterChip active={!category} onClick={() => setCategory('')}>
              Everything
            </FilterChip>
            {categories.slice(0, 6).map((c) => (
              <FilterChip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
                {c.name}
              </FilterChip>
            ))}
          </>
        }
        loading={isLoading}
        isEmpty={!posts?.length}
        emptyTitle="NOBODY WANTING"
        emptyText="No open wants right now. Post what you are after and sellers will see it."
      >
        {posts?.map((post, i) => {
          const isMine = String(post.userId?._id || post.userId) === String(user?._id);

          return (
            <div key={post._id} className={COMMUNITY_SPAN}>
              <Panel index={Math.min(i, 10)} className="h-full">
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-ink">
                      {post.title}
                    </h3>
                    {post.maxBudget > 0 && (
                      <span className="shrink-0 font-display text-[20px] leading-none text-ink">
                        {formatPrice(post.maxBudget)}
                      </span>
                    )}
                  </div>

                  {post.category && <Badge tone="outline">{post.category}</Badge>}

                  {post.description && (
                    <p className="line-clamp-3 text-[12.5px] font-medium leading-snug text-ink/75">
                      {post.description}
                    </p>
                  )}

                  <p className="meta">Asked {timeAgo(post.createdAt)}</p>

                  <div className="mt-auto flex items-center gap-2 border-t-2 border-ink/10 pt-2">
                    <Avatar name={post.userId?.name} src={post.userId?.avatar} size="xs" />
                    <span className="truncate text-[11px] font-extrabold text-ink">
                      {post.userId?.name}
                    </span>

                    {isMine ? (
                      <Button
                        variant="paper"
                        size="sm"
                        className="ml-auto !min-h-[34px] !px-2.5 !text-[13px]"
                        onClick={() => fulfil.mutate(post._id)}
                        disabled={fulfil.isPending}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Found it
                      </Button>
                    ) : (
                      // The whole point of a want is that someone can answer it.
                      <MessageButton
                        subjectType="lookingfor"
                        subjectId={post._id}
                        ownerId={post.userId?._id || post.userId}
                        label="I have one"
                        className="ml-auto"
                      />
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          );
        })}
      </CommunityShell>

      <Modal isOpen={open} onClose={() => setOpen(false)} caption="Let them come to you" title="What are you after?">
        <div className="flex flex-col gap-3.5">
          <Input label="What you need" placeholder="Second-hand drafter, full set" value={form.title} onChange={set('title')} />
          <Textarea
            label="Details"
            rows={3}
            placeholder="Condition you would accept, when you need it by."
            value={form.description}
            onChange={set('description')}
          />

          <div className="grid grid-cols-2 gap-[9px]">
            <Select
              label="Category"
              placeholder="Pick one"
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              value={form.category}
              onChange={set('category')}
            />
            <Input label="Budget (₹)" type="number" min="0" placeholder="600" value={form.maxBudget} onChange={set('maxBudget')} />
          </div>

          {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

          <Button variant="primary" size="lg" loading={createPost.isPending} onClick={submit} className="w-full">
            Post it
          </Button>
        </div>
      </Modal>
    </>
  );
}
