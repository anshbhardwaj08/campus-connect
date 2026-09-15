# Working context — College OLX

A running handoff file. **Read this first when starting a new session**, then
`docs/design-system.md` before touching any UI.

Keep it current: when a chunk of work lands, move it from "Next up" to "Done"
and add anything a cold reader could not infer from the code.

Last updated: 2026-09-16 (client complete; admin panel complete bar the dashboard chart)

---

## Where the project stands

The backend auth flow (register → verify email → OTP → login → refresh) is
wired end to end, and the whole product loop closes: post → find → chat →
offer → accept → meet and verify → confirm → review → trust score. The
moderation loop closes too: a student reports a listing, a person or a
message, and it lands in a moderator's queue. Both frontends run on the same
Comic Noir system.

| App | Port | State |
|---|---|---|
| `/server` | 5000 | Complete — every route the two frontends use is built and role-gated |
| `/client` | 5173 | Comic Noir throughout — every student-facing screen is built |
| `/admin` | 5174 | Every sidebar page is built. Only the dashboard chart/ticker (`RevenueChart`, `CategoryDonut`, `LiveStatsTicker`) is still a stub |

The database holds **real accounts and real content alongside demo data** —
see "Demo content lives in the database on purpose" below before writing any
script that touches it.

---

## The theme

**Comic Noir** — a graphic-novel page rendered as a UI. Newsprint paper ground,
true-black ink borders, one crimson accent, halftone dots everywhere, panels
instead of cards, Bangers + Work Sans.

The full spec is `docs/design-system.md`. Do not design from memory — the rules
that get broken by accident (one crimson element per region, captions are
narration not labels, no second accent for states) are listed in §10 there.

Three non-obvious decisions:

- **No dark mode.** The paper ground *is* the theme. `darkMode` was removed
  from the Tailwind config and `DarkModeSync` was deleted from `App.jsx`. The
  `darkMode` flag still sits unused in `uiSlice` — remove it when the Navbar
  gets converted.
- **GSAP is the single motion engine.** `src/lib/motion.js` holds the whole
  vocabulary (`panelWipe`, `slabIn`, `stampIn`, `lineIn`) and every component
  goes through it, so `prefers-reduced-motion` is handled in one place. Never
  call `gsap.from()` directly in a component. `framer-motion` has been removed
  — Modal was its only user and now runs on GSAP too.
- **Sonner `richColors` is off** — it ships green/red, a second and third
  accent. Errors go crimson, success stays on paper.
- **Never pass `unstyled: true` to the Toaster.** It drops sonner's
  `[data-styled]` rule, which is what supplies width, display and padding —
  the toast collapses to a zero-size box and nothing appears on screen. This
  bit us once. Sonner keeps its layout and mount animation; the Comic Noir
  paint is applied in the "Toasts" block at the bottom of `index.css`, outside
  `@layer` and with `!important`, because sonner injects its stylesheet at
  runtime after Tailwind's utilities.

---

## Done

### Foundation
- `client/index.html` — Bangers + Work Sans, title/theme-color
- `client/tailwind.config.js` — replaced entirely with Comic Noir tokens
- `client/src/index.css` — panels, halftone screens, caption boxes, price
  slabs, speech bubbles, motion, reduced-motion guard

### Components
- **New:** `ui/Panel`, `ui/CaptionBox`, `ui/PriceSlab`, `ui/Wordmark`,
  `layout/AuthLayout`, `auth/AuthSplash`, `lib/motion.js`
- **Converted:** `ui/Button`, `ui/Input`, `ui/Badge`, `ui/Avatar`, `ui/Modal`,
  `ui/Skeleton`
- **Deleted:** `ui/Card`, `ui/WebPattern`, `ui/WebBackground`,
  `ui/TechBackground` (abandoned earlier direction — `Panel` replaces `Card`),
  and `src/App.css` (dead Vite scaffold)

### Screens
- `pages/auth/Login` — full-strength theme, 58/42 splash split
- `pages/auth/Register` — same split, adds branch/year/hostel
- `pages/auth/VerifyEmail` — was a stub; now waiting / checking / verified /
  failed states off `?token=`
- `pages/auth/VerifyPhone` — was a stub; now send-OTP then six-box code entry
  with paste, arrow keys and a 30s resend cooldown

### App shell (Navbar, BottomNav, PageWrapper, PanelGrid)
The masthead is flat ink, full-bleed, sticky — deliberately **not** a Panel.
Persistent chrome reads as a fixture; giving it the jagged clip-path made it
look like content instead of structure, so it's a plain bar with a hard 3px
ink border underneath.

Crimson budget for the masthead is spent on exactly two things: the Wordmark
(identity) and the search bar's GO button (the one action anyone might take).
Sell / Sign up use `variant="ink"` — a third crimson hit in one 64px strip
stopped reading as emphasis and started reading as wallpaper. `Button`'s
`link` variant gained a `tone` prop (`"ink"` default, `"paper"` for text on
dark grounds) to make that work.

`BottomNav`'s Sell tab is a raised **square**, not a circle — the spec allows
radius over 4px only on speech bubbles. It's this bar's one crimson element,
so the other tabs signal active state through paper-3 vs. steel brightness
and weight instead of colour.

New `layout/PanelGrid` wraps the 12-col / 9px-gap grid the spec calls for
(`grid-cols-4 md:grid-cols-8 xl:grid-cols-12 gap-[9px]`) — children size
themselves with Tailwind's own `col-span-*`. Nothing consumes it yet; Home is
first.

The notification bell has nowhere real to link yet — no notifications route
exists — so it points at `/profile` for now (see gaps below).

### Home page + ListingCard/Grid (built, real data — not a mock)
`pages/home/Home.jsx`: a Hero panel (night tone, one crimson phrase in the
headline, paper caption) + a sidebar (category list with real counts, a
"Yours" section when signed in, the one crimson "Sell something" button) +
the listing feed. All three `useQuery` calls hit the real API —
`GET /listings`, `GET /chat/conversations`, `GET /saved/items` — there is no
mock data anywhere in this page.

**Sidebar counts are a tally of one fetched page (`limit: 100`), not a true
aggregate** — there's no `/categories` count endpoint yet. Fine at current
listing volume; said explicitly in a code comment so nobody mistakes it for
exact once the catalogue grows. Selecting a category filters client-side
from that same fetched set — Home is a feed, not the search experience;
that's what Browse (next) is for.

`ListingCard` (`components/listing/ListingCard.jsx`) is the pattern every
future listing surface should copy: `Panel` with an `.art` well (photo
printed through the halftone screen, or a `Package` icon placeholder), a
condition `Badge` in the flush top-left corner, a `PriceSlab` bottom-right,
then title/meta/seller. **No `CaptionBox` on the card** — deliberately: a
caption is narration and there's no real narration to attach per card in a
grid, so the condition tag uses `Badge` (a factual tag) instead. `Verified`
only shows when `seller.isEmailVerified` is actually true — the listing
controller's `populate()` was extended (both `getAll` and `getById`) to
include that field, since the card must never claim a badge it can't back
with real da/:Llta.

`ListingGrid` (`components/listing/ListingGrid.jsx`) wraps `PanelGrid`, a
skeleton state, and an empty state. Card entrance index is offset `+1` and
capped at 11 so it staggers in after the Hero (index 0) without a long
feed's last card landing seconds late.

Verified against the real backend — `GET /listings` returns the one seeded
listing already in Atlas (`Used Physics Textbook`, seller `Ansh Bhardwaj`,
`isEmailVerified: false`) with the new field present.

### Post / edit / view listing (the core loop, closed)
`ListingForm` serves both create and edit — passing a `listing` switches it
to edit mode. **Create sends multipart** (photos ride along), **edit sends
JSON**: the server's PATCH route carries no upload middleware, so photos are
set at creation time only and the form hides the picker when editing. The
zod schema mirrors the server's Joi rules exactly (title 3-150, description
10-3000, price >= 0) so bad input fails readably instead of returning a 400.

`ImagePicker` previews through `.art.photo`, so what you see while picking
is what prints on the card. Limits mirror multer exactly (6 files, 5MB,
images only) and are enforced client-side so a student finds out before the
upload fails, not after. Object URLs are derived in a `useMemo` and revoked
in an effect cleanup — pushing them into state from an effect leaked.

`ListingDetail` + `ListingDetailPage`: gallery, deal panel, description,
seller. Save/unsave hits the real `/saved/items` endpoints; the view counter
is guarded by a ref because StrictMode double-invokes effects and would
otherwise double-count every dev page load.

**Form primitives were consolidated while building this.** `Input`,
`Textarea` and `Select` now share `ui/Field.jsx` (label + error chrome) and
`ui/fieldStyles.js` (the one class string). Three copies of that string is
exactly how the system drifts out of uniformity — add new controls on top of
these two, never by copying a class list. `fieldClass` lives in its own
`.js` module so `Field.jsx` exports only components and fast refresh works.

Verified end to end against the live backend: multipart create with a photo
(landed on Cloudinary), detail fetch, view increment, JSON edit, save and
unsave — all green. Test data removed afterwards.

### Browse + listing search/sort (built)
`pages/listings/Browse.jsx` — **all filter state lives in the URL**, not in
component state, so a filtered view is shareable, survives a refresh, and
the back button steps through filter changes instead of leaving the page.
Any filter change resets to page 1 (staying on page 5 of a result set that
just shrank shows an empty grid for no visible reason).
`placeholderData: keepPreviousData` keeps the current results on screen
while the next query runs, so tweaking a filter dims the grid rather than
collapsing it to skeletons.

`FilterPanel` is stateless — it renders `filters` and calls back. Paired
with `ActiveFilterChips` above the grid, because a filter you cannot see is
a filter you forget you set.

**Backend: `GET /listings` gained `q` and `sort`.** `sort` is one of
`recent` (default) / `price-asc` / `price-desc`.

`q` is a **case-insensitive regex on title + description, deliberately not
the model's `$text` index.** The UI searches as you type, and `$text` matches
whole words only — `"phys"` would return nothing for "Physics" and search
would feel broken mid-word. Verified: `q=phys` does match "Used Physics
Textbook". The tradeoff is that this does not use an index; move to `$text`
or Atlas Search if volume grows. Input goes through `escapeRegex` first, so
a stray `*` or `(` in the search box is matched literally instead of
throwing an invalid-regex error — verified with `q=*(`.

`SearchBar` gained `initialValue` (Browse seeds it from the URL) and now
holds `onSearch` in a ref, so the debounce effect neither goes stale nor
re-fires on every render, and does not fire at all until the field is
actually typed in.

### Messaging community posts + notification delivery (2026-09-15)

**`Conversation.listingId` was `required`**, so a want, a ride or a found
item had no way to be replied to at all. It is now optional, with a
`subject: { kind, refId, title }` subdocument alongside it. Listings keep
setting `listingId` exactly as before, so every existing thread, populate and
query is untouched; the other three kinds set `subject`. The title is
**denormalised on purpose** — otherwise the inbox needs a different populate
per kind just to render one line.

`POST /chat/conversations` now accepts either `{ listingId }` (unchanged) or
`{ subjectType, subjectId }`, resolves the owner from a `SUBJECTS` map, and
stays idempotent per subject. `MessageButton` drops onto any community card
and hides itself on your own post; labels are contextual ("I have one",
"Got a seat?", "I have seen it" / "That is mine").

**Nobody was being told about new messages.** Three separate causes:

1. **No popup.** `useNotifications` only pushed into Redux. It now raises a
   toast naming the sender, with an Open action — and stays quiet if you are
   already looking at that thread.
2. **Chat badge was permanently zero.** `chatSlice.setUnreadCount` existed
   since the scaffold and **nothing ever dispatched it**. `getConversations`
   now returns a real per-conversation `unreadCount` (one aggregate).
3. **Bell badge emptied on refresh.** It read from the `notif` slice, which
   only holds what arrived live on the current socket connection — so a
   reload showed zero with unread notifications waiting.

Both badges now come from the server via `useUnreadCounts`, sharing query
keys with the pages that render the same data, so a live `notification:new`
invalidates and updates them. **Do not move these back to Redux** — the
slices cannot be right on a cold load.

Socket notifications also name the sender now ("Hari Menon messaged you")
rather than "New message".

Verified with two real users: threads open on all three community kinds,
own-post blocked, idempotent, toast fires on the recipient naming the
sender, and **both badges survive a reload**.

### Sign out + event withdrawal (2026-09-15)
`hooks/useSignOut.js` is the single sign-out path — masthead menu and
Settings both use it. It clears the server cookies, disconnects the socket,
clears Redux **and `queryClient.clear()`**: without that last one the next
person to sign in on the same browser sees the previous user's cached
conversations, saved items and deals until each refetches.

The masthead avatar now opens an account menu (profile, panels, settings,
sign out) instead of linking straight to the profile — sign out has to be
where people look for it. The mobile menu got the same entries.

`EventCard` shows "Call it off" to the organiser instead of an RSVP (you are
already going). It confirms first, since `DELETE /events/:id` is
irreversible. The server was already organiser-scoped — a non-organiser gets
404.

**Found while testing: toasts were swallowing masthead clicks.** Sonner
renders top-right, directly over the chat, bell and avatar controls, so for
the 4 seconds a toast was up those buttons silently did nothing. The
symptom in the test was a click landing on an `LI`. Fixed with
`offset={{ top: 80 }}` on the Toaster — noted in `docs/client-summary.md`
so it does not get removed.

### Community input is validated (2026-09-15)
The four community `create` handlers spread `req.body` into the model
(`{ ...req.body, userId }`). Mongoose drops unknown keys, but every field
the schema *did* know was reachable — a client could post an event already
claiming 400 RSVPs, a lost-item report pre-marked `resolved`, or a want that
never expires.

`validators/community.validator.js` is now the allow-list, applied on all
four POST routes. Server-owned fields (`status`, `rsvpCount`, `expiresAt`,
`userId`, `organizerId`) are deliberately absent, and `validate()` runs with
`stripUnknown`, so they are discarded before reaching the model.

Verified: injected `rsvpCount`, `status` and `expiresAt` are all ignored,
and bad input is now refused (event with no date, carpool with no contact,
lost-found with a bogus type, carpool asking for 99 seats) — 11 checks.

`ui/Toast.jsx` deleted — a one-line re-export of `sonner`'s toast that
nothing imported. Sonner is themed in `index.css`.

### Deal + review loop closed (2026-09-15)
Accepting an offer in a chat now opens a real Deal, and a closed deal can
be reviewed. These were the two dangling backends.

**`POST /deals/from-conversation` is a separate endpoint on purpose.**
`POST /deals` makes the *caller* the buyer — but the person accepting an
offer is the **seller**, so reusing it would have recorded the seller as the
buyer. The new endpoint derives both sides from the conversation (seller
from `listing.sellerId`, buyer from the other participant), so neither can
be spoofed, and only the seller may accept. It is **idempotent**: accepting
twice returns the same deal rather than opening a second one.

**`POST /reviews` was wide open.** It took `revieweeId`, `listingId` and
`type` straight off the request body, so anyone could post a review of
anyone, attached to a deal they had nothing to do with — on the one
mechanism the trust score is built from. Now: the caller must be a
participant, the deal must be `completed`, and reviewee/listing/type are all
**derived from the deal**. The validator no longer accepts those fields at
all. Duplicates return a clean 409 instead of hitting the unique index.

**`GET /reviews/mine`** added — reviews *written by* the caller.
`/users/:id/reviews` is the opposite direction (written *about* them), and
`MyDeals` needs this one to show "you reviewed this" instead of offering
the form a second time.

Verified end to end with three users (seller, buyer, uninvolved outsider):
18 checks covering listing → conversation → accept → code → confirmations →
review, plus every guard — buyer and outsider blocked from accepting,
review refused before the deal closed, outsider blocked from reviewing,
reviewee and type correctly derived, duplicate and spoofed-reviewee
attempts both refused, review landing on the seller's profile and in
`/reviews/mine`, and `dealsCompleted` incrementing.

### Community (built — Events, Lost & Found, Carpool, Wanted)
All four pages plus `EventCard`, `LostFoundCard` and `CarpoolCard`.

`CommunityShell` holds the frame they share — display headline with the
second half in crimson, narration line, one crimson post action, optional
filter row, grid, loading and empty states. **Use it for any new community
page**; four near-identical layouts maintained separately is exactly how
they drift apart.

Details worth keeping: the event date gets the slab treatment a price gets
on a listing (same shape, different fact); Lost vs Found is carried by the
word on the badge, not by colour alone; carpool seat counts read as a
number rather than a colour.

`/looking-for` existed as a route but **was not in the masthead** — added as
"Wanted", so there are no unreachable pages left.

`utils/formatDate.js` added: `formatDate`, `formatDateTime`, and
`whenRelative` ("Tomorrow", "In 3 days", "Already gone") — a date that has
passed must say so rather than looking upcoming.

Backends here were already properly scoped (ownership checks on delete and
resolve, populate in place), so no security fixes were needed. Verified all
four create paths, all four list/filter endpoints and event RSVP against the
live API — 9 checks, all passing. Events and Lost & Found post as multipart
because their routes run multer for optional images.

### `npm run check:ui` takes route arguments
`npm run check:ui -- events browse` — **leading slashes optional on
purpose**: Git Bash on Windows rewrites a bare `/browse` argument into
`C:/Program Files/browse` before the script sees it, so routes are
normalised.

### Profile, deals, saved, notifications (built)
`MyProfile` (tabbed: panels / notifications / reviews — **tab lives in the
URL** so the masthead bell can deep-link to it), `PublicProfile`,
`Settings`, `MyDeals`, `Saved`, and `NotificationList`.

`DealCard` renders the handshake: price agreed → seller shows a code →
buyer types it → both confirm → listing marked sold. The seller and buyer
each only ever see their own half of `VerifyCodeModal`.

`NotificationList` reads from the **server**, not the Redux slice — the
slice only holds what arrived live on this socket connection, so anything
from before the tab opened exists only server-side.

`StarRating` was using `amber-400` and `zinc`, a second accent the system
does not have. Filled stars are now ink; a rating is information, not an
action. Trust score is likewise a number plus an ink bar, never a
green/amber/red meter.

**Backend gaps closed while building this:**
- `GET /users/:id` and `GET /users/:id/listings` **did not exist**, so
  `ListingDetail`'s "See their other panels" link had nothing to load.
  Added, both public (a listing is viewable signed-out, so its author must
  be too), returning a narrow projection — never the whole user document,
  which carries phone, email, refreshToken and passwordHash.
- **Route order matters in `user.routes.js`:** every `/me` route must be
  declared before the `/:id` routes, or Express matches
  `/users/me/listings` against `/:id/listings` with `id === "me"` and the
  handler dies casting it to an ObjectId. Auth is applied per-route rather
  than with `router.use()` so the public routes can sit below. There is a
  regression test for this in the deal test script.
- `POST /users/:id/block` required **only a valid login**, so any student
  could block any other student. Now `requireRole('admin', 'moderator')`.
- **Deal endpoints had no ownership checks at all.** Any signed-in user
  could regenerate a stranger's verify code, mark their deal verified, or
  open a dispute on it. All now go through `findDealForParticipant`, and
  `generate-code` is seller-only. `POST /deals` also took `buyerId` from the
  request body, letting a caller open a deal in someone else's name — it is
  now `req.user._id`, and you cannot buy your own listing.
- `getMyDeals` and `getUserReviews` did not populate, so the UI would have
  rendered raw ObjectIds.

Verified end to end with three users (seller, buyer, uninvolved outsider):
17 checks covering the full handshake and every guard above, all passing —
outsider blocked from all three deal endpoints, buyer blocked from
generating the code, wrong code rejected, right code accepted, both
confirmations closing the deal and flipping the listing to sold.

### Chat (built — the core loop is complete)
`ChatPage` handles three entry points: `/chat`, `/chat?conversation=<id>`
(notification links) and `/chat?listing=<id>` ("Message the seller", which
finds-or-creates the thread then rewrites the URL so a refresh does not
create another).

`ChatWindow` is where the design system's **speech bubbles finally get
used** — first thing in the product to use them. Messages arrive two ways:
history over REST, live ones over the socket. **Sending also goes through
the socket**, so your own message comes back via `chat:message` rather than
being appended locally — one source of truth and no duplicate on echo. The
combined list is derived with `useMemo`, and `ChatPage` keys `ChatWindow` by
conversation id so switching threads remounts with clean state instead of
needing a reset effect.

Offers render as a **panel, not a bubble** — an offer is a decision the
other person must act on, not another remark in the thread.

**Backend gaps closed while building this:**
- `POST /chat/conversations` did not exist, so "Message the seller" had
  nothing to call. Added, and idempotent — clicking twice lands in the same
  thread.
- `sendMessage` and `markRead` **never checked participant membership**;
  anyone with a conversation id could post into a stranger's thread. Both
  now 403.
- The socket emitted to the conversation room only, so a participant who was
  not looking at the thread heard nothing. Now also creates a notification
  for the other participants.
- Conversation `listingId` populate gained `sellerId`, so "Accept offer"
  can tell who the seller is.

`useSocket` and `useNotifications` are now actually called (in `AppSession`
in `App.jsx`) — they existed but nothing invoked them.
**`useNotifications` is keyed on `isAuthenticated` deliberately:** the socket
does not exist on first mount (the session restores asynchronously), so an
effect keyed on `[dispatch]` alone subscribed to a null socket and never
fired.

Verified with two real browsers, two real users, isolated cookie jars: buyer
opened a listing, messaged the seller, and **the seller received the next
message live without reloading**. The masthead bell showed the count.

### Rate limits (raised 2026-09-14)
The global limiter was **100 requests per 15 minutes across every endpoint**,
and one page load fires roughly four (session check, listings, conversations,
saved). Real browsing hit 429s — seen during the chat test.

Now 600/15min general, plus a separate **20/15min bucket on the credential
endpoints** (`login`, `register`, `send-otp`, `verify-otp`) with
`skipSuccessfulRequests`, so failed guesses are what count and a normal
sign-in is never affected. Previously login shared the general bucket, which
meant 100 password guesses per window.

Note it is per IP — a hostel behind one NAT shares a bucket.

### Server: port-in-use message
`server.listen()` reports failure by emitting `'error'`, not by rejecting, so
`start().catch()` never saw it and a busy port crashed with a raw EADDRINUSE
stack trace. Now prints which port is taken and what to do.

### Session survives a refresh (fixed 2026-09-14)
The access token lives in an httpOnly cookie, which JS cannot read, and
Redux is memory-only — so **every page refresh made a signed-in user look
signed out**: masthead showed "Sign in", the sidebar's YOURS section
vanished, and protected routes bounced to /login even though the session
cookie was still valid.

Fix: `hooks/useSessionRestore.js` asks `GET /users/me` on boot and restores
the user. `authSlice` gained a `ready` flag (set by `setCredentials`,
`sessionChecked` or `logout`), and **`ProtectedRoute` waits for `ready`
before redirecting** — without that, refreshing a protected page throws you
to /login in the instant before the session is restored.

Two 401s on an anonymous page load (`/users/me`, then the interceptor's
`refresh-token`) are expected and harmless — that is just "nobody is signed
in". The refresh attempt is wanted, because it restores a session whose
access token expired but whose refresh token is still good.

### Photos are never filtered (decided 2026-09-14)
`.art.photo img` had `grayscale(1) contrast(1.22) brightness(1.02)` and
`mix-blend-mode: multiply`, printing user photos onto the halftone screen.
Removed at Ansh's call: **a buyer cannot judge an item's real colour or
condition through it, and a photo that misrepresents the goods is a trust
problem.** Trust outranks the aesthetic.

Photos, avatars and ImagePicker previews now show true to life. The theme
still frames them — inked panel edge, price slab, condition badge — and the
halftone screen shows for placeholders. **Do not reintroduce a filter**, not
even a subtle contrast bump. Recorded in `docs/design-system.md` §5 and §10.

### Bug: invisible panels (fixed 2026-09-14) — read this before touching Panel
Home and Browse rendered the masthead, sidebar and hero but **no listing
cards**, despite the cards being in the DOM with correct size, opacity and
text. `npm run build` and `npm run lint` both passed.

Cause: `ListingCard` renders `<Panel as={Link}>`, which produces an `<a>` —
**`display: inline` by default**. GSAP clips that wrapper with `clip-path`,
and clip-path on an inline element clips against the inline box rather than
the block children, erasing the whole card. The hero survived because its
wrapper is a plain `<div>`.

Fix: `Panel` now always puts `block` on its wrapper. Do not remove it, and
be wary of any `as=` that is inline by default.

### UI checking — `npm run check:ui`
`client/scripts/check-ui.cjs` drives the app in headless Chrome (via
`puppeteer-core` + whatever Chrome/Edge is installed — no browser download)
and reports what actually paints, plus console errors and failed requests.
Screenshots go to `client/.ui-check/` (gitignored).

```
cd server && npm run dev      # both servers must be running
cd client && npm run dev
cd client && npm run check:ui
```

It specifically flags panels that are invisible while present — zero-sized,
`opacity: 0`, clipped to `inset(… 100% …)`, or clip-path on an inline box.
Confirmed it catches the bug above: reverting the `block` fix makes it
report "2 invisible panel(s)" on / and /browse.

**Build and lint cannot see runtime CSS. Run this after UI work.**

### Wordmark
COLLEGE OLX is deliberately the loudest thing in any masthead: `COLLEGE` in
Bangers with a hard crimson offset behind it (zero blur — it reads as a
misregistered second print pass, not a shadow), and `OLX` stamped into a
rotated crimson slab with an ink border and hard offset. It presses on hover
and active like a Button. It does not break the one-crimson-per-region rule
because the logo *is* that region's crimson — do not put another crimson
element beside it in the masthead.

### Plumbing
- `utils/apiError.js` — `apiErrorMessage(err, fallback)`. Use it for every
  API error toast. When there is no `err.response` the request never reached
  the server, and the old fallbacks implied the user's input was wrong; this
  says so plainly instead (and in dev names the likely cause).
- `utils/validateCollegeEmail.js` — now exports `COLLEGE_DOMAINS`,
  `EMAIL_PLACEHOLDER` and `DOMAIN_ERROR` so the domain error prints inline
- `client/.env` + `.env.example` — added `VITE_COLLEGE_EMAIL_DOMAINS`
  (**keep in sync with the server's `COLLEGE_EMAIL_DOMAINS`**; currently
  `pec.edu.in`)

### The auth splash
The left side is built on one idea — **the page is being printed** — so every
moving part is something a press does badly: two halftone plates drifting out
of register, the press light raking across, crimson impact lines striking in,
the Bangers lettering dragged on line by line, the caption stamped last, and a
montage of hostel-clearout items that wipes in and then breathes. Pointer
parallax runs by depth on fine pointers only. Narration advances a beat every
4.6s. All of it collapses to the final frame under reduced motion.

**Timeline positions are absolute seconds, not relative offsets**, and that is
deliberate: the copy must be readable fast. The headline starts at 0.28s and
has landed by ~0.85s, the blurb by ~1.0s; everything decorative (plates,
impact lines, montage) is scheduled around that and never in front of it. If
you add a step, give it an absolute position too — a relative `'-=…'` offset
will silently push the copy later as the sequence grows.

`headline` is now an **array of lines** (`['Prove you’re', <em>one of us</em>]`)
so each line can be tweened separately — the old single-JSX form is gone from
all four auth screens.

Verified with `npm run build` and `npm run lint` — both clean, and every module
transforms over the dev server. **The splash has not been seen in a browser** —
no headless browser in this environment. Worth an eyeball before building on it.


### Server boot (fixed 2026-09-14 — worth knowing)
`server.js` used to `await Promise.all([...job schedulers])` **before**
`server.listen()`. The Bull schedulers sit on Redis, Bull retries forever
instead of rejecting, so an unreachable Redis hung the boot permanently: the
API never opened port 5000 and every browser request failed with no response
at all. The symptom was a generic "That did not go through" on register, which
looked like a validation problem and was not.

Now: `connectDB()` is still awaited (it IS on the request path), `listen()`
happens straight after, and the job queues are scheduled in the background
where a Redis outage cannot take the API down. `config/redis.js` throttles the
retry spam to one prominent first error plus a reminder each minute.

**Redis is intermittent.** The free instance at
`digestion-dad-arithmetic-46430.db.redis.io` connects fine one minute and
refuses the next — observed repeatedly on 2026-09-14. The API and everything
else keep working; the only request-path dependency is the phone OTP, which
stores the code under `otp:<phone>` for 600s. So when Redis is down, phone
verification fails *even with the mock SMS*, because the mock still writes
the code to Redis. If this keeps up, either move to a more reliable Redis or
give the OTP an in-memory fallback for development.

### Phone OTP runs mocked (no Twilio)
Twilio is paid, so `services/sms.service.js` mocks the SMS when Twilio is not
configured: it prints the code in a box on the server console and returns it
as `data.devOtp`, which `VerifyPhone` shows on screen. A real account SID
starts with `AC` — that's how "configured" is detected.

**Production never mocks.** With `NODE_ENV=production` and no Twilio, the
service throws a 503 rather than silently accepting unverifiable numbers, and
`devOtp` is gated a second time on `NODE_ENV` so a live code can't leak.
Verified end to end: mocked code verifies, a wrong code still 400s.

### Services configured (2026-09-14) — all verified live
| Service | State |
|---|---|
| MongoDB Atlas | working — `campus-connect` |
| Cloudinary | working — cloud `firstset`; full upload path tested end to end |
| Email (Nodemailer) | working — Gmail app password, **port 587/STARTTLS** |
| Phone OTP | mocked (Twilio deliberately skipped — paid) |
| Redis | intermittent, see above |
| OpenAI | **not needed** — `services/ai.service.js` is imported by nothing |

`email.service.js` no longer uses `service: 'gmail'`, which defaults to port
465. Port 465 was blocked outbound and failed as `ETIMEDOUT` at connect —
before auth — which reads like bad credentials but isn't. Explicit
`smtp.gmail.com:587` + STARTTLS, overridable via `SMTP_HOST` / `SMTP_PORT`.

Gmail app passwords are displayed in four spaced groups; the spaces must be
stripped before they go in `.env`.

### Admin panel: shell + login + moderation (2026-09-15)
`/admin` was 30 of 33 files as 4-line stubs — a build, not a restyle. Built
in the recommended order: shell + login, then moderation (the part with
real consequences), then stopped.

**Foundation ported from `/client` by hand** — there is no shared package
between the two apps, so `tailwind.config.js`, `index.css`, `lib/motion.js`
and the UI primitives (`Panel`, `Button`, `Input`/`Textarea`/`Field`/
`fieldStyles`, `Badge`, `Avatar`, `Modal`, `Skeleton`, `Wordmark`,
`PriceSlab`) are copied, not imported. Keep both in sync by hand when the
system itself changes. `gsap`, `lucide-react`, `@tanstack/react-query` and
`socket.io-client` were missing from `admin/package.json` and are now
installed.

**Auth reworked to match `/client`'s pattern, not the scaffold's.** The
stub `adminApi.js`/`adminAuthSlice` stored a Bearer token in Redux, but
`verifyAccessToken` on the server reads the **httpOnly cookie** the same
way `/client` does — there is no separate admin login endpoint, `AdminLogin`
posts to the same `/auth/login`. Reworked to mirror `/client` exactly:
`adminAuthSlice` gained a `ready` flag, `useAdminSessionRestore` asks
`GET /users/me` on boot, and `AdminProtectedRoute` waits for `ready` before
redirecting — same reasoning as `client/src/hooks/useSessionRestore.js`.

**A student session must not read as signed in here.** `useAdminSessionRestore`
only dispatches credentials when the restored user's role is `admin` or
`moderator`; a student's valid session cookie is simply left unauthenticated
in `adminAuth`, so `AdminProtectedRoute` sends them to `/login`.
`AdminLogin` does the same check after a successful login — the cookie gets
set either way (the login call succeeded), but credentials are only
dispatched for admin/moderator, so a student's session never becomes usable
here even though it is valid on `/client`. Verified: a student login shows
"This account does not have admin access." and stays on `/login`.

`AdminSidebar` is the one permanently-dark region (mirrors the client
masthead being a fixture, not a Panel) — Wordmark, role badge, nav, the
signed-in admin, sign out. `AdminNavbar` is per-page (title/blurb/actions),
not global chrome, so pages own their own heading rather than threading it
through context.

**`PendingListings`** (`GET /admin/listings?status=pending`) is the reason
the panel exists first: every listing here has `scamScore >= 70` — the only
way `status` becomes `'pending'` (see `listing.controller.js` `create` and
`utils/scamScore.js`) — and is invisible to everyone, including its own
seller, until approved or rejected here. Cards mirror `ListingCard`'s
layout but the corner badge is the scam score, not the condition, because
that is the fact this screen exists to show. Approve is a plain PATCH;
Reject opens a modal for a reason (`rejectionReason`, shown to the seller).

**`ReportQueue`** (`GET /admin/reports?status=open`) resolves or dismisses
a report with an optional note. `targetId` is not populated server-side (a
report can point at a listing, a user or a message — three different
collections), so it prints as a plain id rather than faking a link that
might be wrong. **This queue is legitimately empty today** — `POST /reports`
works end to end, but nothing in `/client` calls it yet; no "Report this"
control exists on any page. Built to work correctly against the real
backend regardless, same as `PendingListings`.

**Dashboard** shows five real KPIs from `GET /admin/stats` — no chart, no
fabricated ticker. `RevenueChart`, `CategoryDonut` and `LiveStatsTicker`
are still stubs (see Next up); a dashboard with a fake chart is worse than
one with no chart.

Verified in a real browser with two throwaway accounts (one moderator, one
student) created directly in Mongo, plus a real report submitted through
`POST /reports` and two listings seeded with `scamScore >= 70` (the public
create flow currently tops out around 55 without a `categoryAvgPrice`, so
this heuristic rarely fires on its own — worth knowing, not fixed here):
unauthenticated `/` redirects to `/login`; a student login is refused;
moderator login lands on the dashboard with real stats; the session
survives a reload (cookie-based, not memory); Pending listings renders both
seeded cards with correct scam scores, Approve removes one, Reject with a
reason removes the other and returns the queue to its empty state; Reports
renders the seeded report and Resolve-with-a-note empties the queue; sign
out returns to `/login` and the protected route redirects again afterward.
15 checks, all passing, zero console errors. All test data removed
afterward. Screenshots in `admin/.ui-check/` (gitignored, same convention
as `client/.ui-check/`).

`useAdminSocket` was left correct (cookie session, `withCredentials`, no
Bearer token) but **not wired up** — nothing in this build needs it; it is
there for whoever builds the dashboard ticker next.

### Admin panel: the remaining pages + delete user (2026-09-15)
Users, All listings, Deals, Categories, Events, Broadcast and Logs are now
built, so nothing in the sidebar is a placeholder any more.

**`DataTable` has no table library.** The installed `@tanstack/react-table`
is a version whose API is a rewrite — `createTableHook`, `constructTable`,
feature objects — with none of the `useReactTable` / `getCoreRowModel()`
surface the original stub was written against; the build failed outright
("not exported by react-table"). It is now a plain table taking
`{ key, header, render, sortable, sortValue }` columns, with search and
pagination driven by the caller (every admin list endpoint paginates
server-side). The dependency was removed from `package.json`.

**Backend gaps closed for these pages:**
- `GET /admin/users/:id` — new. The public `/users/:id` withholds email,
  phone, role and isBlocked, which is exactly what a detail page needs.
- `GET /admin/listings` gained an optional `sellerId`, so UserDetail can
  show *everything* one seller posted. The public
  `/users/:id/listings` only returns active/sold — right for a stranger,
  wrong for an admin reviewing someone's history.
- `GET /admin/deals` — did not exist at all; AllDeals had nothing to call.
  Optional `userId` filters by either side, so UserDetail reuses it.
- `GET /admin/community/events` + `DELETE /admin/community/events/:id` —
  the student-side delete is organiser-scoped ("call it off" on your own
  event); the admin one has no such check, which is the entire point.
- `POST /admin/categories` spread `req.body` into `Category.create`
  unvalidated, the same gap fixed earlier for the community handlers. It
  now goes through `createCategorySchema` in `validators/admin.validator.js`.

**`DELETE /admin/users/:id` — the destructive one.** Removes the account
and everything of theirs the student site would keep rendering: listings,
deals, offers, reviews (both written and received), conversations and their
messages, saved items, saved searches, community posts, events,
notifications, reports. It also clears other people's saves that pointed at
the deleted listings, so nothing dangles.

Three guards, and they matter: it is **admin-only** (a moderator can ban,
which is the recoverable version), it **refuses to delete you**, and it
**refuses to delete another admin**. The UI puts it at the bottom of
UserDetail behind a modal that only enables the button once you type the
account's full college email — deliberately *not* a button in the user
table, because a destructive action one stray click away from a list of
rows is exactly how the wrong record gets deleted (see below). Every
deletion is written to the log with the admin's email and the counts.

**Shared records go with it**, and the modal says so: a conversation or a
deal belongs to two people, so deleting one side removes the other side's
copy. There is no version of "delete all their data" that leaves half a
chat behind.

**The sidebar is `sticky top-0`.** It is navigation, so it stays put while
the page scrolls; without it the whole rail scrolled away and you had to
scroll back up to change page.

**The Logs page strips ANSI escapes.** morgan's `dev` format colours its
output and winston writes the line to the file verbatim — invisible in a
terminal, litter in HTML (`[0mGET /api/v1/listings [36m304[0m`).

Verified in a real browser: sticky measured from the live DOM after
scrolling 900px (sidebar and masthead both still at viewport top); a
purpose-built throwaway account owning a listing, a chat, a wanted post, a
carpool and saved items was deleted through the UI and every one of those
records confirmed gone from the database, **with a check that it did not
over-reach** (the other participant's own listings and account untouched);
the confirm button stayed disabled until the typed email matched exactly;
a moderator sees Ban but no delete control at all; category creation works
as admin and is correctly refused (403) as a moderator.

**A real event was destroyed during this round's testing.** A verification
script clicked "the first Cancel button" on the Events page; events sort
soonest-first, seeded demo events interleaved with real ones, and on a
re-run it hit a real user's event (3 RSVPs) instead of a demo one.
`DELETE` there has no undo and the RSVPs were unrecoverable. **Never target
records by row position in a test against a database that holds real data**
— match on an exact identifier the test itself created.

### Demo content lives in the database on purpose (2026-09-15)
Six demo students (Priya Sharma, Rohan Mehta, Ananya Iyer, Karan Singh,
Simran Kaur, Vikram Rao — all `@pec.edu.in`, password `Passw0rd123`), their
listings, two events, two open reports, two scam-flagged pending listings
and four deals (one completed through the real handshake, the rest seeded)
were created so the admin lists and the student site are not empty. **This
is not test data to clean up** — it was left deliberately.

Two things about it worth knowing:
- Real accounts already in the database (Ansh, Gopal, Pulkit, prithvi) were
  never posted-as or modified. All demo content belongs to demo accounts.
- `moderator.demo@pec.edu.in` (password `Passw0rd123`) is a **moderator**
  account kept for signing into the panel. It was briefly promoted to admin
  to verify the admin-only paths and put back. **Delete it or change its
  password before this is ever deployed.**

### "Report this" on the client — the moderation loop is closed (2026-09-15)
`POST /reports` and the admin queue had both worked for a while, but
nothing in `/client` ever called it, so the queue only ever held seeded
rows. It is now reachable from a listing (in the seller panel, under the
safety line) and from a public profile.

`report/ReportButton` owns the trigger and `report/ReportModal` the form;
one modal serves all three target types and only the reason list changes.
**Reasons are a fixed list, not free text** — a moderator triaging a queue
needs to sort at a glance, and "scam" typed eleven ways does not. The free
text is the second field. The trigger is `variant="link"`: reporting is
secondary and must not compete with the one crimson action on the screen.
It hides when signed out (the endpoint is authenticated, so the modal would
only end in a 401) and on your own listing.

**Backend gaps closed:**
- `POST /reports` spread `req.body` into `Report.create` unvalidated — the
  same gap fixed earlier for the community handlers, but on the one queue
  moderators are meant to trust: a client could file a report that arrived
  pre-`resolved`, carrying its own `adminNote` and a `resolvedBy` pointing
  at anyone. `validators/report.validator.js` is now the allow-list.
- **You cannot report yourself**, and reports are **idempotent per open
  case**: reporting the same thing again while the first is still open
  returns the original (200) instead of putting a duplicate in front of a
  moderator. The UI says "you have already reported this" on that path.
- `GET /admin/reports` now resolves `targetId` to a label. It can point at a
  listing, a user or a message, so no single populate reaches it — one
  query per type, then a lookup. **A bare ObjectId made the queue
  unactionable**: a moderator could not tell what had been reported. A null
  label means the target is already deleted, which the row says outright.

Verified end to end in real browsers: a student reports someone else's
listing and lands in the moderator's queue with their own words attached;
the reason is required; a second report says "already reported" and creates
nothing (confirmed at the API — exactly one row); the control is absent on
your own listing and present on a public profile; the queue names the
listing rather than printing an id.

### Reporting a chat message (2026-09-15)
The third target type is now reachable: a small flag in the meta row under
any **incoming** bubble (offers included), opening the same `ReportModal`
with `targetType: 'message'`.

Two deliberate choices in `MessageBubble`:
- **Rendered at low contrast, not hidden until hover.** A control that only
  exists on hover cannot be found on a touch screen, which is where most of
  this app is read.
- **26px, under the 46px button floor.** One per message in a dense list;
  at full size it would shout louder than the messages themselves. The
  chat surface already has sub-floor icon chrome (36px back, 42px send).

The admin queue quotes the reported message, so a moderator can read what
was actually said rather than chasing an id.

Verified with two demo students: seller sends a "pay me on UPI first"
message, the recipient reports it, exactly one flag renders (none on your
own message), the modal offers *message* reasons rather than listing ones,
and the moderator's queue shows it typed `MESSAGE` with the text quoted —
12 checks, no console errors.

### Categories are one list now (2026-09-15)
`client/src/constants/categories.js` is **deleted**. Browse filters, the
sell form, the Wanted chips and the home sidebar all read the `Category`
collection through `hooks/useCategories.js` → `GET /categories` (which
already existed, already filtered to `isActive` and sorted by `order` — no
backend work was needed at all).

Before this there were two lists free to disagree, and the one an admin
could actually edit was the one students never saw. The hook returns an
array rather than a loading state: categories are chrome, not page content,
so an empty filter row for one moment beats threading `isLoading` through
four components. `staleTime` is 30 minutes — they change about once a term.

Keys moved from `cat.id` to `cat.slug`: the Mongoose documents have `_id`
and no `id` virtual in JSON, and the slug is unique anyway.

Also fixed: `CategoryManager` set a new category's `order` to
`categories.length`, which collides the moment anything has been deleted —
"Musical Instruments" had landed on the same order as "Other". It is now
one past the highest.

Verified: "Musical Instruments" — created through the admin panel, never
present in the old hardcoded file — now shows in the home sidebar, the
browse filter, the sell form and on Wanted; then a brand new category made
in the panel appeared to a student in a fresh browser context, with a
non-colliding order. 11 checks.

### Forgot password (2026-09-15)
`POST /auth/forgot-password` and `POST /auth/reset-password`, with
`/forgot-password` and `/reset-password` on the client and a link from the
sign-in screen. Anyone locked out previously had no route back in at all.

**The token is not a JWT**, unlike email verification. A JWT cannot be
invalidated once issued, so a used reset link would keep working until it
expired — and reset links get forwarded, left in inboxes and shared
devices. Instead: 32 random bytes, emailed raw, with only its **SHA-256
stored** on the user (`passwordResetToken`/`passwordResetExpires`, both
`select: false`). A leaked database therefore yields no working links. One
hour, single use.

**The endpoint answers identically whether or not the account exists** —
otherwise it becomes a way to enumerate who is registered, one address at a
time. That includes when the email send *fails*: the error is logged and
the same 200 goes back. (Note `register` still leaks existence via its 409;
worth revisiting, but changing it would hurt a legitimate signup.)

**Resetting clears `refreshToken`**, ending every other session. If someone
else had got in with the old password, the reset is exactly the moment they
should be thrown out.

**`passwordResetLimiter` is new and deliberately different from
`authLimiter`.** `authLimiter` skips *successful* requests, which is right
for login (failed guesses are what matter) and wrong here: for "email me a
link", the successful request is the abusable one — without it, anyone
could point this at a classmate's address and fill their inbox. Five an
hour, counting everything.

Verified 24 checks across the API and a real browser: identical answers for
known and unknown addresses, a hash of the right length stored with a
future expiry, garbage/expired/malformed tokens and short passwords all
refused, the no-token page as its own dead end, mismatched confirmation
caught client-side, and after a real reset through the form — old password
dead, new one works, token cleared, the link refused on reuse, other
session ended. The test account used `example.com` (RFC 2606) so no mail
was sent to the college's real mail server.

### Account suspended screen (2026-09-15)
A blocked account used to get a bare 403 under the password field, and —
worse — anyone blocked *while signed in* just watched the app break page by
page, since `verifyAccessToken` 403s every authenticated request.

**`ApiError.withCode()` is new**, and errorHandler passes `code` through
when set. Both blocked paths (login, and the access-token middleware) now
tag `ACCOUNT_BLOCKED`. The client branches on the **code, not the message**
— a 403 from a moderator-only route is an ordinary "not for you" and must
not sign anyone out, and matching on wording would break the first time
someone rephrased it. Attach a code only where a client genuinely has to
tell two same-status errors apart.

`pages/auth/Suspended.jsx` (crimson splash, "You are off the page for now")
is reached from the login handler and from the API interceptor, which
clears the session and redirects on any ACCOUNT_BLOCKED response.

**The copy only claims what the server actually does.** A first draft said
listings were hidden and nobody could message them — neither is true:
blocking sets a flag on the User and nothing filters that seller's listings
or stops someone opening a thread with them. It now says listings stay up
and you cannot answer anyone about them, which is the truth (see Next up —
that gap is worth closing).

There is also **no reason recorded against a ban** — `isBlocked` is a
boolean and the admin Ban button collects nothing — so the screen does not
promise an appeals process that does not exist.

Verified 13 checks: a wrong password stays an untagged 401, a blocked
account is a tagged 403, signing in while suspended lands on the screen,
a student hitting an admin route gets a plain 403 and is *not* thrown out,
and a session blocked mid-use is redirected on its next page.

### A ban now actually takes someone off the page (2026-09-16)
Blocking used to set `isBlocked` and nothing else. The suspended screen said
so honestly, which was the tell: their listings stayed in browse and search,
their community posts and events stayed up, buyers could open threads that
would never be answered, and their public profile was still browsable. A ban
that leaves the shopfront open is not a ban.

`utils/blockedUsers.js` (`getBlockedUserIds` / `excludeBlocked`) is the one
place that answers "who is suspended". It is **deliberately a live query,
not a cache** — a moderator bans because something is happening *now*, and
content lingering for even a cache window is the wrong failure. `User` gained
a **partial index** on `isBlocked` (`partialFilterExpression: { isBlocked:
true }`), so it indexes only the handful of suspended rows rather than every
row under a low-cardinality boolean.

Applied to: `GET /listings` (browse and search), `GET /listings/:id` (hiding
from the grid but serving the direct link would just move the problem),
`getSimilar`, all four community lists, `GET /users/:id` and
`/users/:id/listings` (404, not 403 — whether they exist is nobody's
business either), and `POST /chat/conversations`, which now refuses to open
a thread with a suspended account.

**`banReason` is new.** Optional — a moderator dealing with an obvious
spammer should not have to write an essay — but with nothing recorded,
nobody could ever be told why. The admin Ban button now opens a modal that
explains what a suspension does and takes the reason; unbanning clears it,
so a stale explanation cannot resurface against the next ban. It is shown
back to the moderator on the user's page, and to the suspended person on
their way out. `ApiError.withCode(code, details)` carries it on the login
403.

**A bug in my own wiring, found by testing:** the API interceptor's
ACCOUNT_BLOCKED redirect fired on the *login* request too, and its hard
`window.location.assign` beat the login page — throwing away the router
state carrying the reason. The interceptor now skips `/auth/login`, which is
the login screen's own business; everywhere else is still the mid-session
case it was written for.

Verified 25 checks on the data (every surface visible before, gone after,
restored on unban, thread refused, reason returned on login) and 12 more
through both UIs (the ban modal, the reason shown back to the moderator and
to the student, unban clearing it, and the mid-session redirect still
working). All test content removed afterwards.

---

## Next up

**The student-facing product loop is closed end to end.** The admin panel
has a working shell, login and moderation queue. What is left:

1. **Admin dashboard: real chart / ticker** — `RevenueChart`, `CategoryDonut`,
   `LiveStatsTicker` are the last stubs in `/admin`. `useAdminSocket` is
   wired correctly (cookie session) but not called from anywhere yet.
2. **Before deploying:** delete `moderator.demo@pec.edu.in` (or change its
   password) and decide what to do with the demo students and their
   listings.
3. **Bundle size.** `/client` is ~587 kB (GSAP added ~79 kB), `/admin` is
   ~534 kB — both flagged by the build. Worth code-splitting once either
   app's page count grows further.

### Known, not a bug
- **The scam-score heuristic rarely reaches the `pending` threshold (70) in
  practice.** `calculateScamScore` (`server/src/utils/scamScore.js`) caps at
  45 (urgent keywords) + 10 (zero price, not marked free) = 55 without a
  `categoryAvgPrice`, which nothing currently passes in from
  `listing.controller.js`. Not fixed here — flagging it because
  `PendingListings` was built and verified against seeded data rather than
  a listing that reached `pending` through the real create flow.

---

## Reference

- **`docs/client-summary.md`** — what the client app has, in brief
- **`docs/admin-summary.md`** — admin state and build order, in brief
- Design spec: `docs/design-system.md`
- Project conventions, API shape, models: `CLAUDE.md`
- Server auth: `server/src/routes/auth.routes.js`,
  `server/src/controllers/auth.controller.js`,
  `server/src/middleware/collegeEmail.js`
