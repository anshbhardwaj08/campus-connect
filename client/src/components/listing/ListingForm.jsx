// The post / edit listing form. One component serves both: `listing` being
// present switches it to edit mode, which sends JSON to PATCH instead of
// multipart to POST (the server's update route has no upload middleware, so
// photos are set at creation time only).
//
// Field rules mirror the server's Joi schema exactly — title 3-150,
// description 10-3000, price >= 0 — so validation fails here with a readable
// message instead of coming back as a 400.
import { useEffect, useState } from 'react';
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
import { useCategories } from '../../hooks/useCategories';
import { conditions } from '../../constants/conditions';

const CONDITION_LABEL = {
  new: 'New — never used',
  'like-new': 'Like new — barely used',
  used: 'Used — works fine',
  'for-parts': 'For parts — not working',
};

const PERIOD_OPTIONS = [
  { value: 'day', label: 'per day' },
  { value: 'week', label: 'per week' },
  { value: 'month', label: 'per month' },
];

const listingSchema = z
  .object({
    title: z.string().trim().min(3, 'At least 3 characters').max(150, 'Keep it under 150'),
    description: z
      .string()
      .trim()
      .min(10, 'Say a bit more — at least 10 characters')
      .max(3000, 'Keep it under 3000'),
    listingType: z.enum(['sale', 'rent']),
    price: z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, 'Price cannot be negative'),
    rentPeriod: z.string().optional(),
    securityDeposit: z.coerce
      .number({ invalid_type_error: 'Enter a number' })
      .min(0, 'A deposit cannot be negative')
      .optional(),
    category: z.string().min(1, 'Pick a category'),
    condition: z.string().min(1, 'Pick a condition'),
    pickupLocation: z.string().trim().optional(),
    isNegotiable: z.boolean().optional(),
    isFree: z.boolean().optional(),
  })
  // A rate with no period is meaningless, and the server refuses it anyway —
  // catching it here turns a 400 into a message under the right field.
  .refine((d) => d.listingType !== 'rent' || Boolean(d.rentPeriod), {
    message: 'Say how long a hire lasts',
    path: ['rentPeriod'],
  });

export default function ListingForm({ listing = null, onTypeChange }) {
  const navigate = useNavigate();
  const isEdit = Boolean(listing);
  const categories = useCategories();
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
      listingType: listing?.listingType || 'sale',
      price: listing?.price ?? '',
      rentPeriod: listing?.rentPeriod || '',
      securityDeposit: listing?.securityDeposit ?? '',
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
  const listingType = useWatch({ control, name: 'listingType' });
  const isRent = listingType === 'rent';

  // The page around this form titles itself off the same choice.
  useEffect(() => {
    onTypeChange?.(listingType);
  }, [listingType, onTypeChange]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, price: data.isFree ? 0 : Number(data.price) };

      // The server forbids rent fields on a sale outright, so they have to
      // be dropped rather than sent empty — switching rent → sale mid-form
      // would otherwise fail validation on leftovers.
      if (isRent) {
        payload.securityDeposit = Number(payload.securityDeposit) || 0;
      } else {
        delete payload.rentPeriod;
        delete payload.securityDeposit;
      }

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
        <CaptionBox corner="tl">
          {isEdit ? 'Changing the details' : isRent ? 'What are you lending out?' : 'What are you selling?'}
        </CaptionBox>

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
        <CaptionBox corner="tl">{isRent ? 'The rate' : 'The price'}</CaptionBox>

        <div className="flex flex-col gap-4 pt-7">
          <div>
            <p className="label-xs mb-1.5">Are you selling it or lending it out?</p>
            <div className="flex border-2 border-ink">
              <TypeTab
                active={!isRent}
                label="For sale"
                sub="They keep it"
                onClick={() => setValue('listingType', 'sale', { shouldValidate: true })}
              />
              <TypeTab
                active={isRent}
                label="For rent"
                sub="You get it back"
                onClick={() => setValue('listingType', 'rent', { shouldValidate: true })}
              />
            </div>
          </div>

          <div className={isRent ? 'grid gap-4 sm:grid-cols-2' : ''}>
            <Input
              label={isRent ? 'Rate (₹)' : 'Price (₹)'}
              type="number"
              min="0"
              step="1"
              placeholder={isRent ? '150' : '2100'}
              disabled={isFree}
              error={errors.price?.message}
              hint={
                isFree
                  ? isRent
                    ? 'Lending it for nothing — the rate is zero.'
                    : 'Giving it away — price is fixed at zero.'
                  : undefined
              }
              {...register('price')}
            />

            {isRent && (
              <Select
                label="For how long"
                placeholder="Pick a period"
                options={PERIOD_OPTIONS}
                error={errors.rentPeriod?.message}
                {...register('rentPeriod')}
              />
            )}
          </div>

          {isRent && (
            <Input
              label="Security deposit (₹)"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              error={errors.securityDeposit?.message}
              // "Held" on its own reads as "held by College OLX". It is not:
              // this is cash the renter puts in the owner's hand, and the
              // owner gives back. Nothing here touches money.
              hint="They hand this to you at the gate and you give it back when you get the item back. College OLX never holds it. Leave at zero if you are not asking for one."
              {...register('securityDeposit')}
            />
          )}

          <div className="flex flex-col gap-2.5">
            <Checkbox
              label={isRent ? 'Lending it out for free' : 'Giving it away free'}
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

// Sale or rent, as two halves of one inked switch. Not a checkbox: these are
// two different kinds of listing, not a setting on one kind, and the pair
// has to read as a choice already made rather than a box left unticked.
function TypeTab({ active, label, sub, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-[46px] flex-1 flex-col justify-center px-3 py-2 text-left transition-colors ${
        active ? 'bg-ink text-paper-3' : 'bg-paper-3 text-ink hover:bg-paper-2'
      }`}
    >
      <span className="text-[13px] font-extrabold leading-none">{label}</span>
      <span className={`mt-1 text-[11px] font-semibold leading-none ${active ? 'text-ice' : 'text-steel'}`}>
        {sub}
      </span>
    </button>
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
