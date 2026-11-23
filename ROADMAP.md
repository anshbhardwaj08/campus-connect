# Roadmap — College OLX

What is planned, what is broken, what is deliberately not being done.

`CONTEXT.md` records what **has** happened and why. This file records what
**will**. When something here is finished, delete its entry and write the
"why" into CONTEXT.md — this file should never grow a "Done" section, or it
becomes a second changelog nobody reads.

**How to use this:** add items under the right heading, keep the one-line
*why*, and move things between headings freely. Priorities change; that is
what the headings are for.

| | meaning |
|---|---|
| **Now** | being built, or next up |
| **Next** | agreed, not started |
| **Later** | worth doing, no date |
| **Won't** | decided against, with the reason — so it is not re-proposed |

Sizes are rough: **S** under an hour, **M** half a day, **L** a day or more.

---

## Now

### -1. `GEMINI_API_KEY` is not set on Render · **S** · *the AI features are off in production*

Found 2026-11-21 by checking production directly. Keyword search works;
every retrieval path returns nothing. `?q=something to keep food cold&deep=1`
gave 0 results while `?q=fridge` gave the fridge, and `/listings/:id/similar`
answered `source: "category"` rather than `"semantic"`.

With no embedder the model name reads `none`, so every cached vector looks
stale and retrieval returns nothing. That is the designed degradation and it
is why nothing in a log says "broken" — which is exactly why this went
unnoticed.

What still works on the deployed site is whatever the hourly job *stored*:
the bell notifications and the "goes with this" strip. What is computed per
request — browse's second tier and "more like this" — does not. And with no
key the job stores nothing new, so a reference photo on a wanted post is
never read either (see CONTEXT.md, "the matcher reads the photograph"). Set
`GEMINI_API_KEY` (and check `REDIS_URL`, or no job runs at all) under
Render → `campus-connect` → Environment. See `docs/demo-script.md`.


### 0. Set the two mail vars on Render · **S** · *blocks sign-up on the deployed site*

Render's free tier blocks outbound SMTP (25, 465, 587), so on the deployed
service every verification and reset email hung for 120 seconds and then
failed silently. Local SMTP is unaffected, which is why it never showed up
in development.

**Everything except the Render dashboard is done** (checked 2026-11-20):

- [x] `services/email.service.js` sends over Brevo's HTTP API when
      `BREVO_API_KEY` is set, SMTP otherwise.
- [x] Brevo account exists, sender verified. `npm run preflight` locally:
      *"Brevo accepted the key, sending as …, 292 credits left."*
- [x] `BREVO_API_KEY` and `MAIL_FROM` are in `server/.env`.
- [x] Both added to `render.yaml` as `sync: false` — **they were missing**,
      so a Blueprint deploy never asked for them and the service fell
      straight back to blocked SMTP. That was the whole remaining bug.
- [ ] **Set `BREVO_API_KEY` and `MAIL_FROM` on the deployed service**:
      Render → `campus-connect` → Environment → Add, then let it redeploy.
      Copy both values out of `server/.env`.
- [ ] Confirm end to end: open
      `https://campus-connect-94sq.onrender.com`, use *forgot password* on
      an address that has an account, and check the mail arrives. It should
      answer in about a second — if it sits there for two minutes, the key
      did not take.

Brevo's free tier is **300 emails per day**, not per month — the counter
read 292 on 2026-11-20 and 300 again the next morning. Plenty for a campus,
but it resets daily rather than accumulating, so a bulk send cannot borrow
against tomorrow.


### 1. Remove the demo data before any real launch · **S**

The board was empty on 2026-11-20 — `demo.seed@pec.edu.in` and every listing
gone — which made cross-sell, "more like this" and browse search invisible
and unmeasurable. **Re-seeded 2026-11-21**: 16 listings and 7 wanted posts,
with `match:run` and `crosssell:run` behind them, and all four AI features
verified against it. `docs/demo-script.md` is written around this data, so
removing it invalidates that document.

So this is back to what it originally said: take it off before a real
launch, not before. `npm run seed:demo -- --for <email> --remove --commit`.

### 2. Run the e2e suite · **S** · *blocked on disk space*

`C:` is at zero bytes free, so the vite dev server cannot start and
`client/tests/e2e` has not run since the wanted-board filter and the photo
captioning went in. The server suite (373 tests) and the client build are
both green; it is only the browser suite that is unrun.

`client/tests/e2e/wanted-board.test.mjs` has a filter test in it that has
never been executed once. Clear some space on `C:` — `npm cache clean
--force` alone frees about 4.9 GB — then
`npm run test:e2e --prefix client`.

---

## Next

### 3. The scam gate cannot fire · **S** · *bug*

`utils/scamScore.js` is called as `calculateScamScore(req.body)`, but
`categoryAvgPrice` is never in the body, so the 40-point price branch never
runs. Maximum reachable score is **55**; `listing.controller.js` quarantines
at **>= 70**. No listing has ever been flagged and the admin pending queue is
unreachable by that path.

Fix the arithmetic, pass a real category average, and add a test that proves
a listing can actually reach the queue.

### 4. Delete `services/ai.service.js` · **S**

`suggestPrice` and `getScamScore` were written and never imported by
anything, and are now superseded: generation lives in `src/generators/`, on
Gemini rather than OpenAI. Dead code that looks load-bearing is worse than no
code. Drop the `openai` dependency with it — nothing else uses it.

---

## Later

### 5. Make it installable (PWA) · **M**

`CLAUDE.md` calls the client a PWA. There is no manifest and no service
worker — it is not one. Adding them buys "Add to Home Screen": real icon,
fullscreen, no browser chrome.

**Do this before Capacitor.** Most of the benefit, none of the auth problem.

### 6. Fix the cold start · **S** · *blocks 5 and 7*

Render's free tier spins the server down after inactivity, so a cold open
takes the better part of a minute. An app icon that hangs for fifty seconds
is uninstalled once and never opened again. An uptime ping or the paid tier.

### 7. Capacitor · **L**

The packaging is the easy part. The real work: in a Capacitor WebView the
origin is `capacitor://localhost`, so the httpOnly `sameSite: lax` cookies
are not sent to the Render domain and **every request returns 401**. Needs a
token auth path alongside the cookie one.

### 8. Caption the listings too, not just the wants · **M**

A wanted post's reference photo is read by the model and embedded with its
words; a listing's photos are not. Measured on 2026-11-23, captioning the
*want* alone took a vague request from 0 matches to 2 — see CONTEXT.md.

Doing the listings as well would help on the other side of the same
comparison, and `services/photoCaption.service.js` already does the work;
what it needs is a budget decision, because it is one model call per
photographed listing rather than per want, and `semantic.matcher.js` would
have to pass `+photoCaption` through the candidate query.

Worth it once there are photographed wants on the board to measure against.
Right now there are none, so there is nothing to measure.

### 9. Housekeeping

- [ ] **Rotate the Redis password** — it was legible in a screenshot on
      2026-09-22 and should be treated as public. Redis Cloud -> Security ->
      regenerate, then update `REDIS_URL` on Render.
- [ ] Three accounts still use well-known passwords — `npm run preflight`
      FAILs on them: `gopalgarg`, `pulkitgoyal`, `prithvigarg`. Fix with
      `npm run rotate-password -- <email>`.
- [ ] Leftover test accounts: `Test Student`, `Reset Test`, and
      `signup.probe.delete.me@pec.edu.in` (created 2026-11-20, marked
      verified, mailbox does not exist — it is the one hard bounce in the
      Brevo log). It says `delete.me` in the address; believe it.
- [ ] `/verify-phone` has no route into it — wire it in or delete it.
- [ ] Unused import warning in `client/src/services/api.js`.
- [ ] Re-seed the board for demos, then remove it before any real launch —
      see item 1. `npm run seed:demo -- --for <email> --remove --commit`
- [ ] **Run the wanted-board backfill on the live data.**
      `npm run wanted:retype` (dry run, read-only) reads 13 posts and finds
      one that was asking to rent and being scored against sale prices —
      "cycle", ₹100, *"for one hour"*. Add `-- --commit` to apply, then
      `npm run match:run` to let the matcher have another go at it.

---

## Won't

**Keyless / no API key.** Decided 2026-09-23 and then reversed the same day:
the key was already in `.env` and already working for embeddings, so
"keyless" was avoiding a cost that did not exist. The hand-written companion
map survives as the fallback, so the keyless path is still there — it is
what runs when the generator is unreachable.

**A local LLM (Ollama, ChromaDB).** A real architecture, and it does not fit:
Render's free tier is 512 MB and a usable model is gigabytes. It would also
have meant a second vector database for a board of fifteen listings, when
MongoDB plus a cosine loop already does the job. The generator seam takes an
Ollama provider whenever the hosting can.

**Collaborative filtering** ("people who bought X also bought Y"). Needs
thousands of transactions; this board has about three deals.

**A support chatbot.** No policy docs, FAQ or help centre to retrieve from,
so it would be a general model with a crimson border, confidently inventing
rules the product does not have.
