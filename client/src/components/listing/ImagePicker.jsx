// Picks up to six photos and previews them exactly as they will appear on
// the listing — true colour, no filter — so what a seller sees here is what
// a buyer sees on the card.
//
// Limits mirror the server's multer config exactly (6 files, 5MB each,
// images only). Catching it here means a student finds out before a failed
// upload, not after.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

import { FieldShell } from '../ui/Field';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImagePicker({
  files,
  onChange,
  label = 'Photos',
  error,
  hint,
  max = 6, // events take one image; listings and lost-found take six
}) {
  const MAX_FILES = max;
  const inputRef = useRef(null);
  // Unique per instance — a hardcoded id would collide the moment two
  // pickers share a page, and silently break the label association.
  const inputId = useId();
  const [localError, setLocalError] = useState('');

  // Derived during render rather than pushed into state from an effect —
  // the effect exists only to revoke, since object URLs leak for the life
  // of the tab otherwise.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const addFiles = (incoming) => {
    const picked = Array.from(incoming);
    if (!picked.length) return;

    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    const notImage = picked.filter((f) => !f.type.startsWith('image/'));
    const usable = picked.filter((f) => f.size <= MAX_BYTES && f.type.startsWith('image/'));

    // With a one-image limit, picking again means "use this one instead"
    // rather than "rejected, you already have one".
    const replacing = MAX_FILES === 1 && usable.length > 0;
    const room = replacing ? 1 : MAX_FILES - files.length;
    const accepted = usable.slice(0, room);

    const problems = [];
    if (notImage.length) problems.push(`${notImage.length} file(s) were not images`);
    if (tooBig.length) problems.push(`${tooBig.length} file(s) were over 5MB`);
    if (!replacing && usable.length > room)
      problems.push(`only ${MAX_FILES} photo${MAX_FILES > 1 ? 's' : ''} allowed`);
    setLocalError(problems.join(' · '));

    if (accepted.length) onChange(replacing ? accepted : [...files, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (i) => {
    setLocalError('');
    onChange(files.filter((_, idx) => idx !== i));
  };

  const full = files.length >= MAX_FILES;

  return (
    <FieldShell
      label={label}
      error={error || localError}
      hint={
        hint ||
        (MAX_FILES === 1
          ? `${files.length} of 1 · 5MB max`
          : `${files.length} of ${MAX_FILES} · 5MB each · first photo leads the listing`)
      }
      htmlFor={inputId}
    >
      <div className="grid grid-cols-3 gap-[9px] sm:grid-cols-4">
        {previews.map((src, i) => (
          <div key={src} className="panel">
            <div className="panel__in panel__in--flush relative">
              <div className="art photo h-[86px]">
                <img src={src} alt={`Photo ${i + 1}`} />
              </div>

              {i === 0 && MAX_FILES > 1 && (
                <span className="absolute left-0 top-0 border-2 border-l-0 border-t-0 border-ink bg-paper-2 px-1.5 py-[3px] text-[8.5px] font-extrabold uppercase tracking-[.08em] text-ink">
                  Lead
                </span>
              )}

              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center border-2 border-r-0 border-t-0 border-ink bg-paper-3 text-ink transition-colors hover:bg-crimson hover:text-paper-3"
              >
                <X className="h-3 w-3" strokeWidth={3} />
              </button>
            </div>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="screen-coarse flex h-[92px] flex-col items-center justify-center gap-1 border-2 border-dashed border-ink/40 bg-paper-3 text-steel transition-colors hover:border-ink hover:text-ink"
          >
            <ImagePlus className="h-5 w-5" strokeWidth={2} />
            <span className="text-[9.5px] font-extrabold uppercase tracking-[.06em]">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
    </FieldShell>
  );
}
