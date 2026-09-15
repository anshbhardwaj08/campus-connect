# Working context — College OLX

A running handoff file. **Read this first when starting a new session**, then
`docs/design-system.md` before touching any UI.

Keep it current: when a chunk of work lands, move it from "Next up" to "Done"
and add anything a cold reader could not infer from the code.

Last updated: 2026-09-15 (client complete; admin panel is a build, not a restyle)

---

## Where the project stands

MERN scaffold is in place across all three apps. The backend auth flow
(register → verify email → OTP → login → refresh) is wired end to end. The
frontend has just been re-themed: **the whole UI is moving to Comic Noir**, and
the auth screens are the first surface converted.

| App | Port | State |
|---|---|---|
| `/server` | 5000 | Scaffolded, auth flow working |
| `/client` | 5173 | Comic Noir throughout — every student-facing screen is converted |
| `/admin` | 5174 | **Unbuilt** — 30 of 33 files are 4-line stubs. Backend is complete and waiting |

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

---

## Next up

The student-facing app is complete and the product loop is closed. What is
left is the **admin panel**, and it is a build, not a conversion.

### The admin panel is unbuilt, not unstyled
`/admin` is **30 of 33 files as 4-line stubs** — every page, every layout
component, every UI primitive. Only `AdminRoutes`, `DataTable` and a couple
of dashboard pieces have any body. Earlier notes in this file called it
"still on the old look"; that was wrong. There is nothing to restyle.

**The backend is ready and waiting** — `/api/v1/admin/*` is complete and
already gated behind `requireRole('admin', 'moderator')`:
`stats`, `users`, `users/:id/ban`, `users/:id/unban`, `listings`,
`listings/:id/approve`, `listings/:id/reject`, `reports`,
`reports/:id/resolve`, `notifications/broadcast`, `logs`, `categories`
(create is admin-only).

`anshbhardwaj.bt24cse@pec.edu.in` already has `role: admin`, so there is an
account to sign in with.

A sensible order, smallest useful slice first:
1. **Shell + login** — `AdminLogin`, `AdminWrapper`, `AdminSidebar`,
   `AdminNavbar`, and the admin UI primitives. Reuse the Comic Noir tokens;
   the admin app has its own `index.css` and `tailwind.config.js` that both
   need the same treatment the client got.
2. **Moderation** — `PendingListings` and `ReportQueue`. This is the part
   with real consequences and the reason the panel exists at all.
3. **Users** — `UserList`, `UserDetail`, ban/unban.
4. **Dashboard, categories, broadcast, logs** — useful, but none of it
   blocks running the marketplace.

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

---

## Next up

**The product loop is closed end to end**: post → find → chat → offer →
accept → meet and verify → confirm → review → trust score. What is left:

1. **`ui/Toast.jsx`** — the last unconverted component. Probably delete it:
   Sonner is themed in `index.css` and nothing imports this.
2. **Admin panel** (`/admin`) — whole app, still entirely on the old look.
3. **Community `create` handlers spread `req.body` unvalidated**
   (`{ ...req.body, userId }`), unlike listings which go through Joi.
   Mongoose drops unknown keys, but a client can still set `status`,
   `rsvpCount` or `expiresAt` at creation. Worth a validator pass.

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

---

## Next up

**Every student-facing screen is now on Comic Noir.** What is left:

1. **`ui/Toast.jsx`** — the last unconverted component. Probably delete it:
   Sonner is themed in `index.css` and nothing imports this.
2. **Admin panel** (`/admin`) — whole app, still entirely on the old look.
3. **Wire the two dangling backends** (see below) — both are small and both
   close real loops.

### Not built, worth knowing
- **Nothing creates a Deal from the UI.** `POST /deals` works and `/deals`
  renders them, but a deal is only openable via the API — the natural
  trigger is "accept offer" in a chat, which currently only sets
  `dealStatus: 'agreed'` on the conversation. Wire that to `POST /deals`.
- **Nothing writes a Review.** `POST /reviews` exists and `ReviewList`
  renders them, but there is no "leave a review" form. The natural spot is
  a completed `DealCard`.
- **Community `create` handlers spread `req.body` unvalidated**
  (`{ ...req.body, userId }`), unlike listings which go through Joi. Mongoose
  drops unknown keys, but a client can still set `status`, `rsvpCount` or
  `expiresAt` at creation. Worth a validator pass.

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

---

## Next up

Roughly in dependency order. **Resume here.**

1. **Community** — `EventCard`, `LostFoundCard`, `CarpoolCard`, plus the
   `Events`, `LostFound`, `Carpool` and `LookingFor` pages. All still stubs,
   all linked from the masthead, so they are the last dead links in the nav.
2. **`ui/Toast.jsx`** — still unconverted; decide whether it survives at all
   now that Sonner is themed in `index.css`.
3. **Admin panel** — whole app, last. Still entirely on the old look.

### Not built, worth knowing
- **Nothing creates a Deal from the UI.** `POST /deals` works and `/deals`
  renders them, but a deal is only openable via the API — the natural
  trigger is "accept offer" in a chat, which currently only sets
  `dealStatus: 'agreed'` on the conversation. Wire that to `POST /deals`
  when you next touch chat.
- **Nothing writes a Review.** `POST /reviews` exists and `ReviewList`
  renders them, but there is no "leave a review" form yet. The natural spot
  is a completed `DealCard`.

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

---

## Next up

Roughly in dependency order. **Resume here.**

1. **Profile & deals** — `ProfileHeader`, `ReviewList`, `StarRating`,
   `DealCard`, `VerifyCodeModal`, plus a real notifications view (the
   masthead bell links to `/profile` as a stand-in; `notifSlice` already
   holds live notifications, so the data is there).
2. **Community** — `EventCard`, `LostFoundCard`, `CarpoolCard`, `LookingFor`.
3. **`ui/Toast.jsx`** — still unconverted; decide whether it survives at all
   now that Sonner is themed in `index.css`.
4. **Admin panel** — whole app, last. Still entirely on the old look.

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

---

## Next up

Roughly in dependency order. **Resume here.**

1. **Chat** — `MessageBubble` onto `.bubble--in` / `.bubble--out`, plus
   `ChatWindow`, `ConversationList`, `OfferCard`. Socket.io is already wired
   (`server/src/sockets/events.js`, `client/src/services/socket.js`) but
   `useNotifications()` is **not called anywhere yet** — hook it up here.
   `ListingDetail`'s "Message the seller" already links to
   `/chat?listing=<id>`, which currently lands on a stub.
2. **Profile & deals** — `ProfileHeader`, `ReviewList`, `StarRating`,
   `DealCard`, `VerifyCodeModal`, and a real notifications view (the
   masthead bell currently points at `/profile` as a stand-in).
3. **Community** — `EventCard`, `LostFoundCard`, `CarpoolCard`, `LookingFor`.
4. **`ui/Toast.jsx`** — still unconverted; decide whether it survives at all
   now that Sonner is themed in `index.css`.
5. **Admin panel** — whole app, last. Still entirely on the old look.

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

### Known gaps, not yet built
- **No notifications page.** The masthead bell links to `/profile` as a
  stand-in. `notifSlice` already holds the data (`notifications`, `markAsRead`)
  — a real page or dropdown can consume it directly, no backend work needed.
- **Forgot password.** No server route exists (`server/src/routes/auth.routes.js`
  has none). The Login screen deliberately does *not* link to it yet. Needs a
  backend endpoint first, then a screen — headline "Happens to everyone".
- **Account suspended screen.** `AuthLayout` already supports it via
  `splashTone="crimson"`; headline "You are off the page for now".
- Bundle is 587 kB (GSAP added ~79 kB) — worth code-splitting once the page
  count grows.

---

## Reference

- **`docs/client-summary.md`** — what the client app has, in brief
- **`docs/admin-summary.md`** — admin state and build order, in brief
- Design spec: `docs/design-system.md`
- Project conventions, API shape, models: `CLAUDE.md`
- Server auth: `server/src/routes/auth.routes.js`,
  `server/src/controllers/auth.controller.js`,
  `server/src/middleware/collegeEmail.js`
