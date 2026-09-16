# Admin (`/admin`, port 5174) — what exists

Built and verified against the live API. Nothing in the sidebar is a
placeholder any more.

Sign in with any `admin` or `moderator` account through the same
`/auth/login` the student site uses — there is no separate admin auth flow.
A student's session is valid but is refused here.

## Screens

- **Dashboard** — a live strip of today's figures, five counts from
  `GET /admin/stats`, a 7/30/90-day activity chart, a breakdown of what is
  on sale by category, and a shortcut into the pending queue. Every number
  is a real query; none of it is sample data.

  The strip is **genuinely live**: admin and moderator sockets join an
  `admins` room, and a listing posted, a deal closing, a report filed or an
  account registered ticks it without a reload. It seeds from today's bucket
  of the activity series, because a socket only knows what happened after it
  connected — with the socket down it says "Today so far" rather than
  pretending to watch.

  The tick updates the **cached series**, which is what the chart draws, so
  the two cannot disagree; the KPI cards and the donut are refetched instead,
  since a tick says what happened, not which category it belongs to.
- **Pending listings** — the queue the panel exists for. Everything here was
  flagged `scamScore >= 70` at creation and is invisible to everyone,
  including its seller, until approved or rejected. Reject asks for a reason
  and shows it to the seller.
- **Reports** — resolve or dismiss with a note. Each row names what was
  reported (the server resolves `targetId` per type, since it can point at
  a listing, a user or a message); if the target is already deleted the row
  says so. Students file these from the listing and profile pages.
- **Users** — every account, server-side search and pagination, ban/unban
  inline. Click through to one account for their listings, deals and
  reviews, plus **delete** (below). Banning from the detail page asks for a
  reason, which the suspended person is shown; unbanning clears it. A ban
  really does take them off the page — listings, community posts and events
  stop being served and nobody can open a new thread with them.
- **All listings** — every listing whatever its status, filterable.
  Read-only; the actions that change status live in Pending listings.
- **Deals** — every handshake, filterable by status.
- **Categories** — the `Category` collection, and a form to add to it.
  **Creating one is admin-only.** `/client` reads this same collection, so a
  category added here appears in the students' browse filters, sell form and
  home sidebar.
- **Events** — every campus event, with a cancel that ignores who organised
  it. The student-side delete is organiser-scoped; this is the override.
- **Broadcast** — one notification inserted for every registered user.
  Confirms the recipient count first; there is no undo.
- **Logs** — last 200 lines of `logs/combined.log` (every request morgan
  logged, plus winston errors). ANSI colour codes are stripped for display.

## Deleting a user

`DELETE /admin/users/:id` removes the account and everything of theirs the
student site would keep rendering — listings, deals, offers, reviews (given
and received), conversations and messages, saved items and searches,
community posts, events, notifications, reports — plus other people's saves
that pointed at the deleted listings.

Guards, in order of importance:

- **Admin-only.** A moderator gets Ban, which is the reversible version.
- **You cannot delete yourself**, and **you cannot delete another admin**.
- The control is on the user's own page, not in the table, behind a modal
  that stays disabled until you type the account's full college email.
- Each deletion is written to the log with the acting admin and the counts.

**Shared records go too.** A chat or a deal belongs to two people, so the
other side loses their copy — the modal says so before it asks.

## Design system

Ported from `/client` by hand — there is no shared package, so
`tailwind.config.js`, `index.css`, `lib/motion.js` and the UI primitives are
copies. Keep both in sync by hand when the system changes.

`DataTable` deliberately uses **no table library**: the installed
`@tanstack/react-table` ships a rewritten API the original stub could not
compile against. Columns are plain
`{ key, header, render, sortable, sortValue }`; search and pagination are
the caller's, since every list endpoint paginates server-side.

**The charts use no chart library either, and `recharts` was removed.** Its
palette, rounded tooltips and own animation engine are all things this
system forbids, so every default would have been overridden. `ActivityChart`
is a polyline through scaled points; `CategoryDonut` is arc paths. Since
crimson is the only accent, donut slices are told apart the way a printed
comic does it — solid plates from the palette, then halftone screens for the
tail — and legend swatches take each slice's own fill so the two cannot
drift apart.

`drawIn` (stroke-dashoffset) was added to `lib/motion.js` for the plotted
lines. It exists in **both** copies, client included, to keep them identical.

## Backend, gated behind `requireRole('admin', 'moderator')`

`/api/v1/admin/*`:

- `GET /stats`
- `GET /stats/activity` (optional `days`, 7–90, default 30)
- `GET /stats/categories`
- `GET /users`, `GET /users/:id`, `PATCH /users/:id/ban`, `PATCH /users/:id/unban`,
  `DELETE /users/:id` *(admin only)*
- `GET /listings` (optional `status`, `sellerId`), `PATCH /listings/:id/approve`,
  `PATCH /listings/:id/reject`
- `GET /deals` (optional `status`, `userId`)
- `GET /community/events`, `DELETE /community/events/:id`
- `GET /reports`, `PATCH /reports/:id/resolve`
- `POST /notifications/broadcast`
- `GET /logs`
- `GET /categories`, `POST /categories` *(admin only, validated)*

## Caveats worth knowing

- **The scam-score heuristic rarely reaches its own threshold.**
  `calculateScamScore` caps at 55 without a `categoryAvgPrice`, which
  nothing passes in, but `pending` needs 70. The pending queue was verified
  against seeded data, not a listing that got there on its own.
- **Categories have no edit, reorder or deactivate.** You can add and list
  them; changing one means touching the database. `isActive: false` hides a
  category from students, and nothing in this UI sets it.
- **Chat messages cannot be reported yet.** `ReportModal` and this queue
  both handle `targetType: 'message'`; no client surface offers it.
- **`moderator.demo@pec.edu.in` exists** for signing in during development —
  it is the only way to exercise the moderator role, which is narrower than
  admin. Its password was rotated on 2026-09-16 and is not written down
  anywhere in this repo. Run `npm run preflight` in `/server` before any
  deploy; it checks every account against known passwords, among other
  things.
- **Activity days are bucketed in `Asia/Kolkata`** (`REPORT_TZ` in
  `admin.controller.js`), not UTC — one campus, one timezone. UTC would file
  everything before 5:30 a.m. under the previous day.
- **"Deals closed" counts by `updatedAt`.** `Deal` has no `completedAt`;
  nothing mutates a completed deal, so `updatedAt` is when it closed. That
  stops being true the day deals become editable after the fact.
- **The donut counts every active listing**, including those withheld from
  students because their seller is suspended — consistent with the "Active
  listings" KPI beside it, which has always counted the same way.

## Testing against this database

It holds **real accounts and real content** alongside demo data. Never
target records by row position ("the first Cancel button") — a verification
script did exactly that and permanently deleted a real user's event, RSVPs
included. Match on an identifier the test itself created.
