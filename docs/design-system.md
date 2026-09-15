# College OLX — Comic Noir design system

The visual theme is a graphic-novel page rendered as a UI. This file is the
reference for building **any** new screen. Follow it exactly; do not
substitute your own aesthetic preferences.

Tokens live in exactly two places: `client/src/index.css` (`:root`) and
`client/tailwind.config.js`. Changing the theme means editing those.

---

## 1. Tokens

| Token | Tailwind class | Value | Use |
|---|---|---|---|
| `--ink` | `ink` | `#0B0D11` | Borders, text, gutters. True black, never tinted grey |
| `--paper` | `paper` | `#E7E3D8` | Page background. Cool newsprint, **not** cream or beige |
| `--paper-2` | `paper-2` | `#D3CEC1` | Caption boxes |
| `--paper-3` | `paper-3` | `#F2EFE7` | Panel interiors, input fields |
| `--crimson` | `crimson` | `#C0353A` | **The only accent.** Primary actions, urgency, free items |
| `--slate` | `slate` | `#1B2536` | Night panels, dark splash areas |
| `--ice` | `ice` | `#AFC4D8` | Cold panels, outgoing message bubbles, avatars |
| `--steel` | `steel` | `#5A6B80` | Secondary and meta text |

There is **no second accent colour**. No orange, no gold, no gradient of any
kind. If something needs emphasis and crimson is already used nearby, use
weight or size instead of a new colour.

Success, warning and info states all use ink, steel and crimson at different
weights and fills. Never add a colour for a state.

---

## 2. Typography

Exactly two families, loaded in `client/index.html`.

- **`Bangers`** → `font-display`. Wordmark, splash headlines, price slabs and
  button labels **only**. Never body text. Never a full sentence. Six words is
  roughly the ceiling.
- **`Work Sans`** at 500/600/700/800 → `font-sans`. Everything else.

Caption boxes and small labels are uppercase with `letter-spacing: .05em–.09em`.
Body copy is sentence case.

Helpers: `.label-xs` (uppercase 10.5px steel field label), `.meta`
(11.5px steel secondary text).

---

## 3. The panel — the only container

Every block of content is a comic panel: a two-layer sandwich that produces a
jagged inked border.

```jsx
import Panel from '@/components/ui/Panel';

<Panel tone="paper" index={0}>…</Panel>
```

Renders:

```html
<div>                       <!-- GSAP wipes this wrapper -->
  <div class="panel">       <!-- ink layer, 3px padding, clipped -->
    <div class="panel__in">…</div>   <!-- paper layer, clipped -->
  </div>
</div>
```

`Panel` props:

| Prop | Values | Notes |
|---|---|---|
| `tone` | `paper` `night` `cold` `crimson` | Interior fill |
| `flush` | boolean | Drops the 11px interior padding |
| `screen` | `coarse` `fine` `night` | Halftone screen on the interior |
| `index` | number 0–11 | Position in the wipe sequence; drives the `.06s` stagger |
| `animate` | boolean | Set `false` to opt out of the page-load wipe |

Panels sit in a 12-column CSS grid with a **9px gap**. The page background
shows through the gaps as the gutter.

Never use a rounded card, a drop shadow with blur, or any Material/Bootstrap
component. Anything that was a card, a section, or a modal is a Panel.

The jagged edge is deliberately subtle — the polygon insets are under 1%.
Pushing them further makes the page look like a torn-paper template.

---

## 4. Components

All in `client/src/components/ui/` unless noted.

### `CaptionBox`
Small uppercase narration pinned to a panel corner. `--paper-2` ground, 2px ink
border with the outer edges removed so it sits flush.

```jsx
<CaptionBox corner="tl" tone="crimson">He has twelve days left</CaptionBox>
```

`corner`: `tl` `tr` `bl` `br`. `tone`: `paper` `crimson`.

A caption is **narration, not a label**. "Meanwhile, two floors up" is a
caption. "Product details" is a heading and belongs in Work Sans.
**One per panel, maximum.**

### `PriceSlab`
`Bangers` on ink, paper text, pinned bottom-right of the art well. Crimson
ground when the item is free. Scales in on the x-axis after the panel wipe.

```jsx
<PriceSlab price={2100} was={5500} />
```

### `Button`
`Bangers`, crimson fill, 3px ink border, `box-shadow: 4px 4px 0 ink`. On
`:active` it translates 4px and the shadow collapses to zero. Minimum height
46px.

`variant`: `primary` (crimson) · `ink` · `paper` · `cold` · `link`
(underlined text button). `size`: `sm` `md` `lg`.

Only ever one crimson element per screen region — secondary actions use
`variant="link"`, never an outlined button next to a filled one.

### `Input`
`--paper-3` fill, 2px ink border, no radius. On `:focus` the default outline is
removed and replaced with `box-shadow: 3px 3px 0 var(--crimson)`. Label above,
uppercase, 10.5px, steel. Errors print **inline in crimson under the field** —
never a toast, never a modal, never a coloured border alone.

### `Badge`
A printed stamp, not a pill. Flat fill, 2px ink border, no radius.
`tone`: `ink` `paper` `crimson` `cold` `outline`.

### `Avatar`
Square ink chip with initials. Photos are printed through the fine halftone
screen with `multiply`, same as listing images. `size`: `xs` `sm` `md` `lg` `xl`.

### `Wordmark`
COLLEGE OLX in Bangers, with OLX in crimson. Masthead and auth screens only —
it is a logo, not a heading.

### `Modal`
A panel that lands on top of the page. Flat ink scrim with a halftone screen,
**no backdrop blur**. Wipes in like any other panel.

### `Skeleton`
Flat halftone block that breathes between 55% and 85% opacity. No shimmer
sweep — that needs a gradient.

### `AuthLayout` + `AuthSplash` (`components/layout/`, `components/auth/`)
The split every auth screen uses: ~58% printed splash, ~42% paper form column,
stacking below 1280px. Only the headline, narration and form change between
screens — add new auth screens here rather than inventing a second layout.

```jsx
<AuthLayout
  caption="He has been here before"
  headline={['Prove you’re', <em key="hit">one of us</em>]}
  blurb="Use the address the college gave you. Personal Gmail will bounce."
  narration={['He has twelve days left.', '…']}
  splashTone="night"        // 'crimson' for suspended / locked-out screens
  footer={<p className="meta …">…</p>}
>
  …form…
</AuthLayout>
```

`headline` is an **array of lines** so each can be tweened separately; wrap the
emphasised phrase in `<em>` and it picks up crimson (or ink on a crimson
splash). Add `js-head` to the heading block and `js-field` to each field —
`containerClassName="js-field"` on an `Input` — to join the form column's
entrance stagger. See §6 for the splash motion.

### Speech bubbles (CSS classes, no component yet)
For any conversational UI. 2px ink border, 18px radius — the one place a
radius over 4px is allowed — and a tail built from two stacked CSS triangles.

```html
<div class="bubble bubble--in">…</div>   <!-- incoming, paper-3 -->
<div class="bubble bubble--out">…</div>  <!-- yours, ice -->
```

---

## 5. Halftone

Halftone is the texture of the whole system. **Dots scale with the content** —
a single dot size across the page reads as wallpaper rather than printing.

| Class | Screen | Use |
|---|---|---|
| *(on `body`)* | `4px 4px` | The page background |
| `.screen-coarse` / `.art` | `7px 7px` | Flat colour, art wells |
| `.screen-fine` / `.art.photo` | `3.6px 3.6px` | Photographs |
| `.screen-night` | `7px 7px`, ice dots | Slate panels |

### Photographs are the exception — never filtered

```html
<div class="art photo"><img src="…" alt="…" /></div>
```

User photos are shown **true to life: no grayscale, no filter, no blend
mode.** This is the one place the theme gives way, and it is a product
decision, not a stylistic one.

The original treatment printed photos onto the screen with
`grayscale(1)` + `mix-blend-mode: multiply`. It looked right — but a buyer
cannot judge an item's real colour or condition through it, and a marketplace
photo that misrepresents the goods is a trust problem. **Trust outranks the
aesthetic.**

The theme still does its work *around* the photo: the inked panel edge, the
price slab, the condition badge, the caption. The halftone screen underneath
still shows for placeholders and while an image loads.

**Do not reintroduce a filter on `.art.photo img`** — not a subtle one, not a
"just a little contrast" one. The same applies to avatars: people should be
recognisable.

---

## 6. Motion

**GSAP drives everything.** The vocabulary lives in `client/src/lib/motion.js`
and nothing animates outside it. Never call `gsap.from()` straight from a
component — go through a helper, or the reduced-motion guard leaks.

| Helper | What it does |
|---|---|
| `panelWipe(t)` | Panels wipe in left to right — `clipPath` `inset(0 100% 0 0)` → `inset(0 0% 0 0)`, `.4s`, `power3.out`, `.06s` stagger |
| `slabIn(t)` | Price slabs scale in on the x-axis from the right, delayed until after the wipe |
| `stampIn(t)` | Caption boxes land like a rubber stamp — `back.out(2.2)` overshoot |
| `lineIn(t)` | Bangers headline lines snap in off the left with a slight skew |

Shared constants: `EASE` (`power3.out`), `WIPE_DURATION` (`.4`), `STAGGER`
(`.06`), `HIDDEN` / `SHOWN` clip paths.

`Panel` and `PriceSlab` animate themselves — set `index` on a Panel to place it
in the stagger, or pass `animate={false}` to opt out. Both run inside a
`gsap.context()` in a **layout** effect, so the "from" state is applied before
paint (no flash) and everything reverts cleanly on unmount. With JS off, panels
simply render visible.

Buttons still press physically on `:active` via the CSS shadow collapse — that
is a state, not an animation.

**Nothing animates on scroll.** Nothing animates without a user action except
the single page-load sequence and the auth splash's ambient loops.

### The auth splash

`components/auth/AuthSplash.jsx` is the one place the motion runs richer, and
it is built on a single idea: **the page is being printed.** Every moving part
is something a printing press does badly — nothing floats for decoration.

- Two halftone plates drift out of register against each other (13s / 17s,
  opposite directions)
- The press light rakes across the sheet every ~13s
- Crimson impact lines strike in from the right on load
- The lettering is dragged onto the sheet line by line
- The caption box is stamped on last
- The montage panels wipe in, then breathe, each on its own clock
- Pointer parallax by depth: dots barely move, the montage moves most
  (pointer-fine devices only)
- Narration along the bottom advances one beat every 4.6s

Under `prefers-reduced-motion: reduce` the whole thing lands on its final frame,
the ambient loops never start, and the narration stops rotating — it shows the
first beat and stays there.

> GSAP checks that preference itself in `lib/motion.js`; the CSS guard at the
> bottom of `index.css` only covers the two remaining CSS loops (the button's
> loading dots and the skeleton's breath).

## 7. Voice

Terse, concrete and slightly hardboiled. Never jokey, never purple.

- Caption boxes carry narration in **third person, present tense** —
  "He has twelve days left."
- Buttons say exactly what happens — "Publish", not "Submit".
- Safety and trust copy is plain and unsoftened — "Meet at the gate. Look it
  over. Then pay."

---

## 8. Accessibility floor

- Tap targets at least **46px**.
- Visible focus rings in crimson, **3px, 2px offset** (set globally on
  `:focus-visible`).
- All interactive elements are real `<button>` or `<a>`.
- Never rely on colour alone to carry meaning — every Badge tone differs in
  fill and weight as well as colour, and form errors print words.

---

## 9. Converting an existing page

Work in this order. A different order produces a page that looks
half-converted.

1. **Replace the palette first.** Swap every colour for a token. Delete every
   gradient, every `border-radius` over 4px, and every `box-shadow` with a blur
   value.
2. **Convert containers to panels.** Every card, section and modal becomes the
   two-layer sandwich.
3. **Set the page background** to `--paper` with the 4px halftone screen
   (already global on `body`).
4. **Convert type.** Two families only. Audit for a third font creeping in
   through a component library.
5. **Add caption boxes last.** One per panel, maximum, and only where real
   narration belongs.

---

## 10. Easy to break by accident

- **One crimson element per screen region.** If a panel has a crimson button,
  its caption box must not also be crimson.
- **Captions are narration, not labels.**
- **Bangers has no lowercase personality.** Never set a full sentence in it.
- **Halftone dots must scale with the content.**
- **Never filter a user photo.** See §5 — trust outranks the print look.
- **The jagged edge is subtle on purpose.**
- **Do not add a second accent when a state needs a colour.**
- **There is no dark mode.** The paper ground *is* the theme. `darkMode` was
  removed from the Tailwind config; do not reintroduce `dark:` variants.
