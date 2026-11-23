// The marketplace in reverse: people saying what they want, so sellers can
// find them instead of the other way round.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import { useAuth } from '../../hooks/useAuth';
import CommunityShell, { COMMUNITY_SPAN, FilterChip } from '../../components/community/CommunityShell';
import WantedCard from '../../components/community/WantedCard';
import ImagePicker from '../../components/listing/ImagePicker';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import { useCategories } from '../../hooks/useCategories';

// `listingType` is sent explicitly rather than left to the server's default,
// because the board now asks two different questions and the answer changes
// which listings can ever match — see server/src/matchers/candidates.js.
const BLANK = {
  title: '',
  description: '',
  category: '',
  listingType: 'sale',
  rentPeriod: 'day',
  maxBudget: '',
};

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export default function LookingFor() {
  const { user, isAuthenticated } = useAuth();
  const categories = useCategories();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  // The board asks two questions now, and a seller with a cycle to hire out
  // wants only one of them. Empty means both.
  const [wantType, setWantType] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['lookingfor', category, wantType],
    queryFn: () =>
      api
        .get('/lookingfor', {
          params: {
            ...(category ? { category } : {}),
            ...(wantType ? { listingType: wantType } : {}),
          },
        })
        .then((r) => r.data.data.posts),
  });

  const createPost = useMutation({
    // Multipart now that a want can carry a reference photo. The route takes
    // both — multer passes a JSON request straight through — but a form with
    // a file in it has to be FormData.
    mutationFn: (payload) => {
      const body = new FormData();
      Object.entries(payload).forEach(([k, v]) => v !== '' && body.append(k, v));
      files.forEach((f) => body.append('images', f));
      return api.post('/lookingfor', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookingfor'] });
      toast.success('Posted. Sellers can come to you now.');
      setOpen(false);
      setForm(BLANK);
      setFiles([]);
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

    // The period only means anything alongside a rental, and the validator
    // strips it from a purchase anyway — dropping it here keeps the two from
    // disagreeing about what was sent.
    const { rentPeriod, ...rest } = form;
    createPost.mutate({
      ...rest,
      ...(form.listingType === 'rent' ? { rentPeriod } : {}),
      maxBudget: Number(form.maxBudget) || 0,
    });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const isRent = form.listingType === 'rent';

  return (
    <>
      <CommunityShell
        title={['WANTED ON', 'CAMPUS']}
        blurb="Nobody is selling what you need? Say so here and let the seller find you."
        actionLabel="Post a want"
        onAction={isAuthenticated ? () => setOpen(true) : undefined}
        filters={
          <>
            {/* Two filters on two different axes in one wrapping row, so the
                words have to carry which is which: "To buy" cannot be read
                as a category and "Books" cannot be read as an intent.

                "Everything" clears BOTH — it is the show-me-the-whole-board
                reset, which is what it already meant. A second "all" chip
                for the type axis would be the ambiguous version of this.

                Four categories rather than six, because the row wraps to
                three lines on a phone otherwise. The type split is the one
                that changes what the board is FOR; a category on a board of
                thirteen posts mostly returns nothing. */}
            <FilterChip
              active={!category && !wantType}
              onClick={() => {
                setCategory('');
                setWantType('');
              }}
            >
              Everything
            </FilterChip>
            <FilterChip active={wantType === 'sale'} onClick={() => setWantType('sale')}>
              To buy
            </FilterChip>
            <FilterChip active={wantType === 'rent'} onClick={() => setWantType('rent')}>
              To rent
            </FilterChip>

            {categories.slice(0, 4).map((c) => (
              <FilterChip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
                {c.name}
              </FilterChip>
            ))}
          </>
        }
        loading={isLoading}
        isEmpty={!posts?.length}
        emptyTitle="NOBODY WANTING"
        emptyText={
          wantType === 'rent'
            ? 'Nobody is asking to borrow anything right now.'
            : wantType === 'sale'
              ? 'Nobody is asking to buy anything right now.'
              : 'No open wants right now. Post what you are after and sellers will see it.'
        }
      >
        {posts?.map((post, i) => (
          <div key={post._id} className={COMMUNITY_SPAN}>
            <WantedCard
              post={post}
              index={Math.min(i, 10)}
              currentUserId={user?._id}
              onFulfil={(id) => fulfil.mutate(id)}
              busy={fulfil.isPending}
            />
          </div>
        ))}

      </CommunityShell>

      <Modal isOpen={open} onClose={() => setOpen(false)} caption="Let them come to you" title="What are you after?">
        <div className="flex flex-col gap-3.5">
          {/* The first question, because it changes every other answer: a
              budget of ₹100 means something different to buy than to borrow,
              and the matcher looks at entirely different listings for each.
              Chips rather than a select, same as Lost & Found's lost/found. */}
          <div className="flex gap-2">
            <FilterChip
              active={!isRent}
              onClick={() => setForm((f) => ({ ...f, listingType: 'sale' }))}
            >
              I want to buy
            </FilterChip>
            <FilterChip
              active={isRent}
              onClick={() => setForm((f) => ({ ...f, listingType: 'rent' }))}
            >
              I want to rent
            </FilterChip>
          </div>

          <Input
            name="title"
            label={isRent ? 'What you need to borrow' : 'What you need'}
            placeholder={isRent ? 'Drafter, for one afternoon' : 'Second-hand drafter, full set'}
            value={form.title}
            onChange={set('title')}
          />
          <Textarea
            name="description"
            label="Details"
            rows={3}
            placeholder={
              isRent
                ? 'How long you need it for, when you would collect it.'
                : 'Condition you would accept, when you need it by.'
            }
            value={form.description}
            onChange={set('description')}
          />

          {/* Optional, and a reference rather than a record: a photo of the
              KIND of thing, so somebody can tell at a glance whether what
              they have is it. Three, not six — the picker and the cropper are
              the same ones the listing form uses. */}
          <ImagePicker
            files={files}
            onChange={setFiles}
            max={3}
            label="Photo of the sort of thing (optional)"
            hint={`${files.length} of 3 · 5MB each · helps people tell if theirs is it`}
          />

          <div className="grid grid-cols-2 gap-[9px]">
            <Select
              name="category"
              label="Category"
              placeholder="Pick one"
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              value={form.category}
              onChange={set('category')}
            />
            <Input
              name="maxBudget"
              label="Budget (₹)"
              type="number"
              min="0"
              placeholder={isRent ? '100' : '600'}
              value={form.maxBudget}
              onChange={set('maxBudget')}
            />
          </div>

          {/* A rate is uninterpretable without its period — ₹150 a day and
              ₹150 a month are not the same request — so renting grows one
              extra field rather than relabelling the budget. Nothing above
              moves when the answer changes, which is why this sits in its own
              row instead of swapping places with the budget.

              Leave it out and the server has a number with no unit: it keeps
              the type filter and drops the budget one rather than guess,
              because a wrong unit is wrong by a factor of thirty. See
              server/src/matchers/candidates.js. */}
          {isRent && (
            <Select
              name="rentPeriod"
              label="Budget is per"
              options={PERIODS}
              value={form.rentPeriod}
              onChange={set('rentPeriod')}
            />
          )}

          {error && <p className="text-[11.5px] font-bold leading-snug text-crimson">{error}</p>}

          <Button variant="primary" size="lg" loading={createPost.isPending} onClick={submit} className="w-full">
            Post it
          </Button>
        </div>
      </Modal>
    </>
  );
}
