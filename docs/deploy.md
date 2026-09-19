# Deploying

The whole product deploys as **one Render web service**. In production the
API server also serves the built student app at `/` and the built admin panel
at `/admin`, so everything lives on one address, e.g.
`https://campus-connect-94sq.onrender.com`.

## Why one service

Without a custom domain, the only free addresses are hosting subdomains like
`*.onrender.com` and `*.vercel.app`. Browsers treat two of those as two
different sites. The login cookie (`sameSite: lax`) is not sent from one site
to another, so a frontend on Vercel and an API on Render would mean nobody
stays signed in. `sameSite: none` would work on Chrome but not on Safari or
any iPhone, which block cross-site cookies. On one origin the cookie is
first-party and works everywhere, the socket connects without CORS, and there
is only one thing to deploy.

If you later buy a domain, this setup still works: point the domain at the
Render service.

## What makes it work (already in the repo)

| File | What it does |
|---|---|
| `package.json` (root) | `npm run build` installs all three parts and builds both apps; `npm start` starts the server |
| `render.yaml` | Render Blueprint: service settings, and the list of env vars to fill in |
| `server/src/app.js` | In production: serves `client/dist` at `/` and `admin/dist` at `/admin` with a refresh-safe fallback; `trust proxy` so the rate limiter sees each student's own address; a Content-Security-Policy that allows Google Fonts and https images (avatars can be any image link) |
| `client/.env.production`, `admin/.env.production` | Build-time settings: a relative API path, and no socket URL (same origin) |
| `admin/vite.config.js` | The admin build lives under `/admin/` |

## Before the first deploy

1. **Check it locally:** `cd client && npm run test:prod`. This builds both
   apps and runs the server in production mode against a throwaway database.
   It checks sign-in, refreshing a page, the admin panel, the socket, and the
   rate limiter behind a proxy.
2. **Clear the preflight check:** `cd server && npm run preflight` must not
   report any `FAIL`. Locally it will warn about `NODE_ENV` and `localhost`
   URLs. Those are expected, because Render sets both.
3. **MongoDB Atlas:** Network Access → Add IP Address → `0.0.0.0/0`. Render's
   free plan has no fixed outgoing IP address.
4. **Gmail:** `NODEMAILER_PASS` must be a Gmail **app password** (Google
   Account → Security → 2-Step Verification → App passwords), not the account
   password. Registration sends a verification email.
5. **Push** everything to GitHub.

## Deploy on Render

1. Sign in at render.com with GitHub.
2. **New → Blueprint**, then pick this repository. Render reads `render.yaml`.
3. It asks for every value marked `sync: false`. Copy them from `server/.env`,
   except:
   - `CLIENT_URL`: `https://campus-connect-94sq.onrender.com`
   - `ADMIN_URL`: `https://campus-connect-94sq.onrender.com/admin`

   If Render gives the service a different address (the name is taken, so it
   adds a suffix), change both to the real address afterwards under
   **Environment**. Email links are built from `CLIENT_URL`.
4. **Apply.** The first build takes about 5–8 minutes.
5. Open the address. The student app is at `/` and the admin panel at `/admin`.

`REDIS_URL` is optional. Without it the site works, but the background jobs
do not run: expiring old listings, rental due-date reminders and saved-search
alerts. Render's free Key Value store, or Upstash, can provide one.

## Redis connections

The free Redis Cloud plan allows about 30 connections at once. The server
opens 7 (one for OTPs; Bull shares two between its four queues and needs one
more per queue). During a deploy the old and new instances overlap, so count
14. **Don't point a local dev server at the production Redis.** Its 7 more
connections is how the limit was first hit. Leave `REDIS_URL` out of your
local `.env`, or use a separate free database.

If the limit is hit anyway, the site keeps serving. The background jobs pause
and retry at most every 30 seconds, and the log says
`Queue … unavailable: ERR max number of clients reached`. The password is
never printed.

## Things to know about the free plan

- **It sleeps after 15 minutes with no visitors.** The next visit takes
  about 50 seconds to wake it. The Starter plan ($7/month) stays awake.
- **Files written to disk are lost on every deploy and restart.** Nothing
  depends on them: images go to Cloudinary, and the `logs/` folder is only
  for local debugging.

## Deploying again

Push to the branch Render watches (`main`). Render rebuilds and redeploys by
itself. Run `npm run test:prod` first if you changed anything in `server/`,
the build setup, or routing.
