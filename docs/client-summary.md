# Client (`/client`, port 5173) — what exists

Student-facing PWA. Comic Noir throughout. Every screen below is built and
verified against the live API.

## Screens

- **Auth** — Login, Register, VerifyEmail, VerifyPhone (OTP mocked, no Twilio),
  ForgotPassword / ResetPassword (single-use emailed link, one hour; resetting
  signs you out everywhere else)
- **Home** — hero panel, category rail with real counts, listing feed
- **Browse** — search, a buying/renting switch, category/condition/price
  filters, 3 sort orders, pagination. All filter state in the URL. Search is
  two tiers: a keyword regex as you type, and — only when you press Enter or
  GO *and* the keywords came up short — a retrieval pass, so "something to
  keep food cold" finds a mini fridge. A one-word synonym ("bike") still
  misses; a phrase ("a bike to ride around campus") does not. The masthead
  box is the only one at desktop width and submits the same way
- **Photos** — any photograph on a card or a listing page opens full size
  (`ui/Lightbox`, arrow keys, a counter), and every upload form can crop to
  4:3 before sending (`listing/CropModal`). Cards zoom under the cursor
- **Listings** — detail page, post, edit. Photos via Cloudinary. The detail
  page carries two rows that answer opposite questions: "Goes with this"
  (complements, written by the hourly job) and "More like this, under ₹X"
  (substitutes, ranked by meaning and capped at the listing's own price)
- **Renting** — a listing is either **for sale or for rent**, never both. A
  rental carries a rate (`price`) per `rentPeriod` (day/week/month) and an
  optional `securityDeposit`. The sell form switches between the two; the
  card and detail page print `₹120 / day`. A closed hire marks the item
  **`rented`**, not sold
- **The hire clock** — the owner says how long when they accept, the clock
  starts at handover (`dueAt`), and the deal card shows the due date or how
  overdue it is. A daily job nudges the renter the day before and both sides
  once it is late. "They returned it" ends the hire and puts the listing
  back on the page in one action
- **The deposit** — copied onto the deal at accept so a later edit to the
  listing cannot rewrite what was agreed, then named at every point money
  moves, from that person's side. **Nothing on the platform holds it** — it
  is cash between two students, and the UI says so rather than letting
  anyone assume otherwise
- **Chat** — inbox, live messages over Socket.io, offers, accept-offer.
  Threads attach to a listing **or** a community post (`subject`)
- **Deals** — verify-code handshake, confirmations, review after closing.
  **Every step notifies whoever has to act next** — the offer being
  accepted, the code being verified, one side confirming, and the close —
  so a deal cannot sit waiting on someone who never found out
- **Profile** — own (panels / notifications / reviews tabs), public, settings
- **Account menu** — avatar in the masthead: profile, panels, settings, sign out
- **Saved** — saved listings
- **Community** — Events (poster, organiser can call off), Lost & Found
  (photos, resolve), Carpool (post/remove), Wanted (post/fulfil)
- **The wanted board** — a want says whether it wants to **buy or to rent**,
  and a rental want says what its budget is *per*; the matcher filters on
  both, because a hire is a different question and not a cheaper answer. The
  board filters by the same split ("To buy" / "To rent"), so somebody with a
  cycle to hire out can find the people asking to borrow one. Up to three
  reference photos ("a cycle like this one"), cropped by the same picker the
  sell form uses — and **the matcher reads them**: the hourly job has the
  model describe the lead photo and embeds that description with the post's
  own words, which is what lets "need one of these" find anything at all.
  Every card is stamped WANTED and its budget reads "up to ₹600" — a want
  with a photo on it would otherwise look like a listing, which invites the
  opposite action
- **Report** — `report/ReportButton` on a listing (seller panel) and on a
  public profile. Fixed reason list + optional detail; hidden when signed
  out or on your own listing. Idempotent: reporting twice while the first
  is open does not duplicate. Goes to the admin queue, anonymously.

## Design system

- Categories come from the database via `hooks/useCategories`
  (`GET /categories`), not a hardcoded list — what an admin adds, students see
- Spec: `docs/design-system.md`. Read it before writing any UI
- Tokens in `index.css` + `tailwind.config.js`. Crimson is the only accent
- `Panel` is the only container. `Field`/`fieldStyles` back every form control
- `CommunityShell` frames the four community pages
- All motion via `lib/motion.js` (GSAP)
- **Photos are never filtered** — trust outranks the print look

## Tooling

- `npm run check:ui` — renders real pages in headless Chrome, flags invisible
  panels, console errors, failed requests. Build and lint cannot see runtime
  CSS; this can

## Image uploads — field names differ

| Surface | Field | Count |
|---|---|---|
| Listings | `images` | up to 6 |
| Lost & Found | `images` | up to 6 |
| Events | `image` | 1 |

`ImagePicker` takes a `max` prop; with `max={1}` picking again replaces
rather than refusing. **The field names are not interchangeable** — the
event route is `upload.single('image')`.

## Notifications

- New message → toast naming the sender (suppressed if you are already in
  that thread) + masthead bell and chat badges
- **Both badges come from the server** (`useUnreadCounts`), not Redux — the
  slices only hold what arrived live, so they read zero after a refresh

## Gotcha: toasts and the masthead

`Toaster` has `offset={{ top: 80 }}` to clear the 67px masthead. **Do not
remove it.** Without it, toasts render on top of the chat, bell and avatar
controls and swallow clicks aimed at them for as long as the toast is up —
the buttons look fine and simply do not respond. Found by a click landing on
an `LI` (the toast) instead of the account button.

## Bundle

Every route in `routes/AppRoutes.jsx` is a lazy import, so a page is fetched
the first time somebody goes there. A cold visit to `/` downloads 552.7 kB
(183.0 gzipped); it used to be 773.7 kB / 238.1 for every route.

- **Do not lazy-load shared components.** Panel, Button, the masthead and
  `lib/motion.js` are imported normally and the bundler hoists them into one
  shared chunk. Behind a lazy import they would cost a round trip on every
  page instead of one download.
- `<Suspense>` wraps the whole route tree and falls back to
  `layout/RouteFallback`.
- `vite.config.js` splits `react-vendor` out so a deploy does not invalidate
  React in everybody's cache. **Keep it scoped to react/react-dom/scheduler**
  — a catch-all on `node_modules` undoes the per-route split.
- `/login` is heavier than `/` (627.9 kB): the form pulls `react-hook-form`
  and `zod`, which nothing else on a first visit needs.
- `socket.io-client` is still in the entry chunk, so a signed-out visitor
  downloads it to browse — see CONTEXT.md for why it was left there.

## Known gaps

- **Listing photos are set at creation only** — the server's PATCH route has
  no upload middleware, so the edit form hides the picker
- **Nothing here is covered by automated tests.** The server suite
  (`server && npm test`) stops at the API; this app is still checked by
  `npm run check:ui` and reading the screenshot
