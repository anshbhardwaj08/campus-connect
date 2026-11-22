// Cropping a photo before it is uploaded.
//
// Why it exists: every art well in the product is `object-fit: cover`, so a
// photo that is the wrong shape gets cropped anyway — by the browser, from
// the centre, with nobody looking. A tall photo of a cycle becomes a close-up
// of its frame on the card. This hands that decision to the person who took
// the photograph.
//
// 4:3 and not adjustable, because that is the shape of the wells it is
// cropping for (148px tall in a card's column, 300-420px on a detail page).
// A free-form crop would let somebody produce a 3:1 letterbox that the card
// then crops a second time, which is worse than not offering it.
//
// Pan and zoom rather than drag-handles on a crop rectangle: the frame stays
// put and the photo moves under it, which is the gesture people already know
// from every phone gallery, and it cannot produce an invalid selection.
//
// The crop is OPTIONAL. Nothing here runs unless the student asks for it, and
// the original file is kept until they press "Use this crop".
//
// **The framing is derived, never stored twice.** `userOffset` is null until
// somebody actually drags, and the offset in use is computed from it (or from
// centre) and clamped on every render. That is what keeps this honest: there
// is no effect reconciling a stored offset against a changed zoom, so there
// is no frame where the photo can sit outside its own crop — which is the bug
// this component had when the offset was state and an effect tidied up after
// it.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

import Modal from '../ui/Modal';
import Button from '../ui/Button';

// The output is capped rather than fixed: upscaling a small photo to hit a
// round number invents detail that was never there, and the server takes
// 5MB files, so there is no reason to go bigger than this.
const MAX_OUT_WIDTH = 1200;
const ASPECT = 4 / 3;

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

const clamp = (v, lo, hi) => (hi < lo ? lo : Math.min(hi, Math.max(lo, v)));

export default function CropModal({ file, isOpen, onCancel, onDone }) {
  const stage = useRef(null);
  const imageRef = useRef(null);
  const drag = useRef(null);

  const [natural, setNatural] = useState(null); // { w, h } of the source file
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [userOffset, setUserOffset] = useState(null); // null = still centred
  const [busy, setBusy] = useState(false);

  // Created during render and revoked on the way out, same as ImagePicker —
  // an object URL leaks for the life of the tab otherwise.
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  // The stage is fluid (it has to fit a phone), so its pixel size is measured
  // rather than assumed — every number below is derived from it.
  useEffect(() => {
    if (!isOpen) return undefined;

    const measure = () => {
      const el = stage.current;
      if (el?.clientWidth) setStageSize({ w: el.clientWidth, h: Math.round(el.clientWidth / ASPECT) });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isOpen, url]);

  // "Cover": the smallest scale at which the photo still fills the frame, so
  // there is never a gap inside the crop. zoom = 1 means exactly covered.
  const baseScale =
    natural && stageSize.w ? Math.max(stageSize.w / natural.w, stageSize.h / natural.h) : 1;
  const scale = baseScale * zoom;
  const drawnWidth = natural ? natural.w * scale : 0;
  const drawnHeight = natural ? natural.h * scale : 0;

  // Derived, and clamped on the way out, so the photo can never be parked
  // outside the frame — not after a zoom, not after a resize.
  const offset = useMemo(() => {
    const centred = {
      x: (stageSize.w - drawnWidth) / 2,
      y: (stageSize.h - drawnHeight) / 2,
    };
    const wanted = userOffset || centred;
    return {
      x: clamp(wanted.x, stageSize.w - drawnWidth, 0),
      y: clamp(wanted.y, stageSize.h - drawnHeight, 0),
    };
  }, [userOffset, stageSize.w, stageSize.h, drawnWidth, drawnHeight]);

  const onPointerDown = (e) => {
    if (!natural) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, from: offset };
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const { startX, startY, from } = drag.current;
    setUserOffset({ x: from.x + (e.clientX - startX), y: from.y + (e.clientY - startY) });
  };

  const endDrag = () => {
    drag.current = null;
  };

  // Zooming keeps the centre of the frame where it was rather than the
  // top-left, or the photo appears to shoot off to one side. Only meaningful
  // once the student has dragged — while it is still centred, staying
  // centred is already the right answer.
  const changeZoom = (delta) => {
    const next = clamp(zoom + delta, ZOOM_MIN, ZOOM_MAX);
    if (next === zoom) return;

    if (userOffset && stageSize.w) {
      const ratio = next / zoom;
      setUserOffset({
        x: stageSize.w / 2 - (stageSize.w / 2 - offset.x) * ratio,
        y: stageSize.h / 2 - (stageSize.h / 2 - offset.y) * ratio,
      });
    }
    setZoom(next);
  };

  const reset = () => {
    setZoom(1);
    setUserOffset(null);
  };

  // Fired on every new src, which is also how the framing resets between
  // photos — an event rather than an effect watching `file`.
  const onImageLoad = (e) => {
    setZoom(1);
    setUserOffset(null);
    setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const apply = async () => {
    const img = imageRef.current;
    if (!img || !natural || !stageSize.w) return;

    setBusy(true);
    try {
      // The frame, mapped back into the source photo's own pixels.
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = stageSize.w / scale;
      const sh = stageSize.h / scale;

      const outW = Math.min(MAX_OUT_WIDTH, Math.round(sw));
      const outH = Math.round(outW / ASPECT);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');

      // A transparent PNG would otherwise come out with black corners once
      // it is encoded as JPEG.
      const keepPng = file.type === 'image/png';
      if (!keepPng) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const type = keepPng ? 'image/png' : 'image/jpeg';
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.9));
      if (!blob) return;

      // Same name, so the picker's list order and the "Lead" badge do not
      // jump around after a crop.
      onDone(new File([blob], file.name, { type, lastModified: Date.now() }));
    } finally {
      setBusy(false);
    }
  };

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Crop photo"
      caption="Frame it the way a buyer should see it"
    >
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        // `touch-none` so dragging the photo on a phone does not scroll the
        // page behind the modal at the same time.
        className="art photo relative w-full touch-none overflow-hidden border-2 border-ink"
        style={{ aspectRatio: '4 / 3' }}
      >
        {url && (
          <img
            ref={imageRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={onImageLoad}
            // Positioned absolutely and sized in pixels: the `.art.photo img`
            // rule is `object-fit: cover` on a 100%-sized box, which is
            // exactly what must NOT happen here — the whole point is that the
            // framing is explicit.
            className="absolute left-0 top-0 max-w-none cursor-grab select-none active:cursor-grabbing"
            style={{
              width: drawnWidth || undefined,
              height: drawnHeight || undefined,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              objectFit: 'fill',
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-[9px]">
        <button
          type="button"
          onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom out"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border-2 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3 disabled:opacity-40 disabled:hover:bg-paper-2 disabled:hover:text-ink"
        >
          <Minus className="h-4 w-4" strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={() => changeZoom(ZOOM_STEP)}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom in"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border-2 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3 disabled:opacity-40 disabled:hover:bg-paper-2 disabled:hover:text-ink"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reset the framing"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border-2 border-ink bg-paper-2 text-ink transition-colors hover:bg-crimson hover:text-paper-3"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={3} />
        </button>

        <p className="meta ml-auto text-right">Drag the photo to move it</p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="link" size="sm" onClick={onCancel} type="button">
          Keep the original
        </Button>
        <Button variant="primary" size="md" onClick={apply} type="button" disabled={busy || !natural}>
          Use this crop
        </Button>
      </div>
    </Modal>
  );
}
