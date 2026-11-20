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

Only 292 Brevo credits remain, which is the free tier's monthly allowance
and plenty for a campus, but it is a budget rather than a tap.


### 1. The live board is empty · **S** · *was "remove the demo data"*

Checked 2026-11-20: `demo.seed@pec.edu.in` is gone and **`listings` holds
zero documents**, so there is nothing left to remove — this item is done in
the sense it was written. What replaced it is the opposite problem: 14 users,
13 wanted posts, 7 lost-and-found items, 3 carpools and 2 deals remain, and
not one listing for any of them to be about.

That makes everything built on the board invisible and unmeasurable:
cross-sell, "more like this", browse search and `npm run similar:run` all
have nothing to work on. Re-seed with `npm run seed:demo -- --for <email>`
before demoing or tuning anything, and keep the remove command
(`-- --for <email> --remove --commit`) for the real launch.

---

## Next

### 2. The scam gate cannot fire · **S** · *bug*

`utils/scamScore.js` is called as `calculateScamScore(req.body)`, but
`categoryAvgPrice` is never in the body, so the 40-point price branch never
runs. Maximum reachable score is **55**; `listing.controller.js` quarantines
at **>= 70**. No listing has ever been flagged and the admin pending queue is
unreachable by that path.

Fix the arithmetic, pass a real category average, and add a test that proves
a listing can actually reach the queue.

### 3. A rental request is scored against sale prices · **S** · *bug*

A live wanted post reads `cycle`, `maxBudget: 100`, description *"for one
hour"* — somebody wanting to **rent**. It matches nothing, correctly by the
current rules and uselessly in fact: `LookingFor` has no `listingType`, so an
hourly budget is compared against a ₹4,200 sale price. No matcher can fix
this; the model needs the field.

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

### 8. Housekeeping

- [ ] **Rotate the Redis password** — it was legible in a screenshot on
      2026-09-22 and should be treated as public. Redis Cloud -> Security ->
      regenerate, then update `REDIS_URL` on Render.
- [ ] Three accounts still use well-known passwords — `npm run preflight`
      FAILs on them: `gopalgarg`, `pulkitgoyal`, `prithvigarg`. Fix with
      `npm run rotate-password -- <email>`.
- [ ] Leftover test accounts: `Test Student`, `Reset Test`.
- [ ] `/verify-phone` has no route into it — wire it in or delete it.
- [ ] Unused import warning in `client/src/services/api.js`.
- [ ] Remove the demo seed data before any real launch:
      `npm run seed:demo -- --for <email> --remove --commit`

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
