# Admin (`/admin`, port 5174) — what exists

**Unbuilt.** 30 of 33 files are 4-line stubs — every page, every layout
component, every UI primitive. Nothing to restyle; this is a build.

Only `AdminRoutes`, `AdminProtectedRoute`, `DataTable` and two dashboard
pieces have any body.

## Backend is complete and waiting

`/api/v1/admin/*`, all gated behind `requireRole('admin', 'moderator')`:

- `GET /stats` — dashboard figures
- `GET /users`, `PATCH /users/:id/ban`, `PATCH /users/:id/unban`
- `GET /listings`, `PATCH /listings/:id/approve`, `PATCH /listings/:id/reject`
- `GET /reports`, `PATCH /reports/:id/resolve`
- `POST /notifications/broadcast`
- `GET /logs`
- `GET /categories`, `POST /categories` (admin only)

`anshbhardwaj.bt24cse@pec.edu.in` is already `role: admin`.

## Build order (smallest useful slice first)

1. **Shell + login** — `AdminLogin`, `AdminWrapper`, `AdminSidebar`,
   `AdminNavbar`, admin UI primitives. The admin app has its **own**
   `index.css` and `tailwind.config.js` — both need the Comic Noir treatment
   the client got
2. **Moderation** — `PendingListings`, `ReportQueue`. The reason the panel
   exists; the part with real consequences
3. **Users** — `UserList`, `UserDetail`, ban/unban
4. **Dashboard, categories, broadcast, logs** — useful, none of it blocks
   running the marketplace

Recommended: 1 + 2, then stop and see real moderation load before building
the reporting.

## Note

Listings with `scamScore >= 70` are created as `status: 'pending'` and never
appear on the client — **nothing surfaces them today**. Until `PendingListings`
exists, a flagged listing is invisible to everyone, including its seller.
