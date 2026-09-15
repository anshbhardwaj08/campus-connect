// The post / edit listing form. One component serves both: `listing` being
// present switches it to edit mode, which sends JSON to PATCH instead of
// multipart to POST (the server's update route has no upload middleware, so
// photos are set at creation time only).
//
// Field rules mirror the server's Joi schema exactly — title 3-150,
// description 10-3000, price >= 0 — so validation fails here with a readable
// message instead of coming back as a 400.
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import api from '../../services/api';
import apiErrorMessage from '../../utils/apiError';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import CaptionBox from '../ui/CaptionBox';
import ImagePicker from './ImagePicker';
import { categories } from '../../constants/categories';
import { conditions } from '../../constants/conditions';

const CONDITION_LABEL = {
  new: 'New — never used',
  'like-new': 'Like new — barely used',
  used: 'Used — works fine',
  'for-parts': 'For parts — not working',
};

const listingSchema = z.object({
  title: z.string().trim().min(3, 'At least 3 characters').max(150, 'Keep it under 150'),
  description: z
    .string()
    .trim()
    .min(10, 'Say a bit more — at least 10 characters')
    .max(3000, 'Keep it under 3000'),
  price: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Price cannot be negative'),
  category: z.string().min(1, 'Pick a category'),
  condition: z.string().min(1, 'Pick a condition'),
  pickupLocation: z.string().trim().optional(),
  isNegotiable: z.boolean().optional(),
  isFree: z.boolean().optional(),
});

export default function ListingForm({ listing = null }) {
  const navigate = useNavigate();
  const isEdit = Boolean(listing);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(listingSchema),
    mode: 'onBlur',
    defaultValues: {
      title: listing?.title || '',
      description: listing?.description || '',
      price: listing?.price ?? '',
      category: listing?.category || '',
      condition: listing?.condition || '',
      pickupLocation: listing?.pickupLocation || '',
      isNegotiable: listing?.isNegotiable || false,
      isFree: listing?.isFree || false,
    },
  });

  // useWatch rather than watch() — watch() returns a fresh function each
  // render, which the React Compiler refuses to memoize around.
  const isFree = useWatch({ control, name: 'isFree' });
  const isNegotiable = useWatch({ control, name: 'isNegotiable' });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, price: data.isFree ? 0 : Number(data.price) };

      if (isEdit) {
        await api.patch(`/listings/${listing._id}`, payload);
        toast.success('Listing updated.');
        navigate(`/listings/${listing._id}`);
        return;
      }

      // Multipart, because photos ride along with the create request.
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== '') form.append(k, v);
      });
      files.forEach((file) => form.append('images', file));

      const res = await api.post('/listings', form);
      toast.success('Published. It is on the page.');
      navigate(`/listings/${res.data.data.listing._id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, isEdit ? 'Could not save those changes.' : 'Could not publish that.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[9px]" noValidate>
      <Panel index={0}>
        <CaptionBox corner="tl">{isEdit ? 'Changing the details' : 'What are you selling?'}</CaptionBox>

        <div className="flex flex-col gap-4 pt-7">
          <Input
            label="Title"
            placeholder="Hercules cycle, gears clean"
            error={errors.title?.message}
            hint="Say what it is in a few plain words. No shouting."
            {...register('title')}
          />

          <Textarea
            label="Description"
            rows={5}
            placeholder="What it is, how long you used it, anything wrong with it. Say the flaws — they come out at the gate anyway."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              placeholder="Pick one"
              options={categories.map((c) => ({ value: c.slug, label: c.name }))}
              error={errors.category?.message}
              {...register('category')}
            />
            <Select
              label="Condition"
              placeholder="Pick one"
              options={conditions.map((c) => ({ value: c, label: CONDITION_LABEL[c] || c }))}
              error={errors.condition?.message}
              {...register('condition')}
            />
          </div>
        </div>
      </Panel>

      <Panel index={1}>
        <CaptionBox corner="tl">The price</CaptionBox>

        <div className="flex flex-col gap-4 pt-7">
          <Input
            label="Price (₹)"
            type="number"
            min="0"
            step="1"
            placeholder="2100"
            disabled={isFree}
            error={errors.price?.message}
            hint={isFree ? 'Giving it away — price is fixed at zero.' : undefined}
            {...register('price')}
          />

          <div className="flex flex-col gap-2.5">
            <Checkbox
              label="Giving it away free"
              checked={Boolean(isFree)}
              onChange={(v) => {
                setValue('isFree', v);
                if (v) setValue('price', 0, { shouldValidate: true });
              }}
            />
            <Checkbox
              label="Open to offers"
              checked={Boolean(isNegotiable)}
              onChange={(v) => setValue('isNegotiable', v)}
            />
          </div>
        </div>
      </Panel>

      {!isEdit && (
        <Panel index={2}>
          <CaptionBox corner="tl">Show it as it is</CaptionBox>
          <div className="pt-7">
            <ImagePicker files={files} onChange={setFiles} />
          </div>
        </Panel>
      )}

      <Panel index={3}>
        <CaptionBox corner="tl">Where it changes hands</CaptionBox>

        <div className="flex flex-col gap-4 pt-7">
          <Input
            label="Pickup spot"
            placeholder="Hostel 7 gate"
            error={errors.pickupLocation?.message}
            hint="Somewhere public on campus. Meet at the gate. Look it over. Then pay."
            {...register('pickupLocation')}
          />
        </div>
      </Panel>

      <div className="mt-2 flex items-center gap-4">
        <Button type="submit" variant="primary" size="lg" loading={loading} className="flex-1 sm:flex-none">
          {isEdit ? 'Save changes' : 'Publish'}
        </Button>
        <Button type="button" variant="link" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// A square ink checkbox — no rounded native control, no accent colour.
// Checked state is an ink fill plus the label going bold, so it never leans
// on colour alone.
function Checkbox({ label, checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[46px] items-center gap-2.5 text-left"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink transition-colors ${
          checked ? 'bg-ink' : 'bg-paper-3'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-paper-3" aria-hidden="true">
            <path d="M1.5 6.5l3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        )}
      </span>
      <span className={`text-[13px] ${checked ? 'font-extrabold text-ink' : 'font-semibold text-steel'}`}>
        {label}
      </span>
    </button>
  );
}
