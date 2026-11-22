# Demo script — the AI features

Written for whoever is standing in front of the panel. Everything below was
run and verified on the seeded board on **2026-11-21**.

Three features, three different techniques. Say which is which, because
"we used AI" is the one claim a panel will push back on:

| On screen | What it actually is |
|---|---|
| Wanted board answers itself | retrieval — embeddings + cosine, no model writes anything |
| Browse search, second tier | retrieval — same, over the search box |
| "More like this, under ₹X" | retrieval — listing-to-listing, price-filtered |
| **"Goes with this"** | **RAG** — retrieved listings go into a prompt, a model picks |

Only the last one is RAG. The others are retrieval. A panel that knows the
difference will ask, and claiming RAG for a cosine query is the easiest way
to lose them.

---

## Before you present — read this first

**As of 2026-11-21 the deployed site has the semantic features switched
off**, and it fails silently, which is the worst way for it to fail. Checked
against production:

| | deployed site | why |
|---|---|---|
| Bell notifications (feature 1) | **works** | stored in the database by the hourly job |
| "Goes with this" (feature 2) | **works** | stored on the listing by the hourly job |
| Browse deep search (feature 3) | **returns nothing** | computed per request, needs the key |
| "More like this" (feature 4) | **falls back to category** | computed per request, needs the key |

The split is exactly *stored* versus *computed at request time*. Verified:
`?q=something to keep food cold&deep=1` returned 0 results on production
while `?q=fridge` returned the fridge, and `/similar` answered
`source: "category"` instead of `"semantic"`.

**The cause: `GEMINI_API_KEY` is not set on Render.** With no embedder the
model name reads `none`, every cached vector looks stale, and retrieval
returns nothing — by design, so a missing key degrades instead of erupting.
Fix before demoing:

1. Render → `campus-connect` → Environment → add `GEMINI_API_KEY` (copy from
   `server/.env`). Also check `REDIS_URL`, or no hourly job runs at all.
2. **Push the local changes too.** The price floor that keeps a ₹250 cycle
   lock out of the cycle's "more like this" row is uncommitted; without it
   that row shows the lock first. The row itself shipped in `6599c35`.
3. Re-check with the three URLs in section 4. `source` must say `semantic`.

Then the ordinary preparation:

4. **The board must be seeded.** `npm run seed:demo -- --for <your college
   email> --commit`, then `npm run match:run` and `npm run crosssell:run` to
   fill the vectors and the companions. Check with `npm run similar:run`.
   Already done on 2026-11-21.
5. **The first page load on Render takes ~43 seconds** (free tier spins
   down). Open the site before the panel walks in.
6. **Mind the quota.** Brevo's free tier is 300 emails/day, so don't demo
   sign-up more than a few times.

**If you cannot set the key in time, demo locally** (`npm run dev`, with
`server/.env` as it is) — everything in this document was verified working
there. Do not discover this live.

---

## 1. The wanted board answers itself (strongest opener)

Sign in as the account you seeded `--for`, open the **bell**. Six
notifications are already waiting. Read two of them out:

> *"Study table with three drawers" matches your request for **"something to
> study on in my room"***

> *"Mini fridge, 90 litres" matches your request for **"somewhere to keep my
> food cold"***

**The point to make out loud: there is not one word in common.** No keyword
system reaches a study table from "something to study on in my room". Say
that before anyone asks.

Then show the control. One of the seeded wanted posts is `dbjs` — gibberish.
It matched **nothing**, and that is deliberate: if a matcher returns
something for that, its threshold is wrong. Volunteering the negative
result is worth more than any of the positives.

The seeded posts are labelled in `scripts/seed-demo-listings.js`:
`both` (keywords would also find it), `semantic` (only embeddings can), and
`neither` (the control).

---

## 2. "Goes with this" — the RAG one

Open the **Redmi Note 12, ₹8,000**:
`/listings/6b014181dfc1bd091d9fb4d3`

The strip under it suggests, each with a reason the model wrote:

- Silicone back cover for Redmi Note 12 — ₹150
- Tempered glass screen guard, Redmi — ₹100
- 20000mAh power bank — ₹900

**Now the part that makes the demo.** There is also an **iPhone 11 for
₹16,000** on the board. It is a deliberate decoy: the same *kind* of thing as
the Redmi, with an ordinary listing description. It is **not** suggested.

That is the whole argument. A nearest-neighbour recommender suggests the
iPhone, because another phone is the most *similar* thing on the board. A
cross-sell wants the thing you need *as well*, not the thing you'd buy
*instead*. Scoring confirms it: the Redmi sits at **0.855** against its own
back cover and **0.812** against the iPhone — similarity alone ranks the
complement and the substitute the same way round, so the model does the
judging, not the distance.

If asked "how do you stop it inventing products?": the prompt contains a
**numbered list of real listings** and only numbers it was shown are accepted
back (`crossSell.service.js#pick`). It cannot suggest a phone case nobody is
selling, because it was never told one existed. Numbers rather than ids
because a 24-character ObjectId is something a model copies back wrong.

Two more answers worth having ready:

- **"Is it slow?"** No model runs on a page load. An hourly job writes the
  suggestions onto the listing and the page reads them. A model that is
  down costs a little quality, never a page.
- **"What if nothing goes with it?"** Then the empty state is the feature:
  it names what is missing and offers to post a wanted request — which
  feature 1 then answers. Browse → cross-sell → wanted post → match →
  notification is the loop worth drawing on a whiteboard.

One honest wart: under the **Casio fx-82MS**, the model suggested the other
calculator as a companion and hedged in its own reason ("though the user
already has one listed"). That is the substitute/complement mistake, caught
in the act. If someone spots it, agreeing is better than explaining it away.

---

## 3. Browse search that understands the request

In the search box, type the phrase and **press Enter or GO** — the second
tier only runs on a real submit, never while you type.

| Type this | You get |
|---|---|
| `something to keep food cold` | Mini fridge, 90 litres |
| `somewhere to study in my room` | Study table with three drawers |
| `something to stay warm this winter` | Bajaj room heater, 2000W |
| `phone charger for long days out` | 20000mAh power bank |
| `a bike to ride around campus` | both cycles, ranked first |

Zero words in common in every row. These were verified through the API on
2026-11-21.

**Do not demo a single word.** `bike` on its own returns nothing: it scores
**0.652** and the bar is **0.66**. A word carries less to match on than a
sentence. If a panelist tries it and gets nothing, the honest answer is the
good one — *we measured it, it lands just under the line, and we would
rather return nothing than return a cycling helmet, which is what the top
hit becomes if we lower the bar*. There is a table of these scores in
`CONTEXT.md` under "What it does and does not reach".

Why it only runs on submit: typing is a guess, pressing Enter is a decision.
Embedding a query is a network round trip, so doing it per keystroke would
be slow, expensive and rate-limited — and useless, since half a word has no
meaning to retrieve.

---

## 4. "More like this, under ₹X"

**Check `source` says `semantic` first.** See *Before you present* — without
`GEMINI_API_KEY` on Render this row quietly shows same-category items
instead, which on the iPhone means a phone case and a screen guard.

Open the **iPhone 11, ₹16,000**: `/listings/6b014181dfc1bd091d9fb4d7`

Under the cross-sell strip: **"More like this, under ₹16,000" → Redmi Note
12, ₹8,000.**

Two rows, opposite questions, on one page: *what else do I need* above,
*what could I buy instead* below.

Also worth opening:

- **Casio fx-991EX, ₹900** (`/listings/6b014181dfc1bd091d9fb4cd`) → Casio
  fx-82MS, ₹400. The two calculators score **0.938**, the closest pair on
  the board.
- **Hercules Roadeo, ₹4,200** (`/listings/6b014181dfc1bd091d9fb4cc`) →
  Firefox single-speed cycle, ₹2,800.

If someone asks why the ₹250 cycle lock is not in that row — it scores
**0.849** against the cycle, *higher* than another cycle does, because a
thing and its accessory get described in the same words. Two rules keep it
out: whatever the cross-sell already suggested is subtracted, and a price
floor at 25% of the listing's own price, because an accessory costs a
fraction of the thing it attaches to and an alternative costs about the
same. Measured on this board, companions land at 1–14% and alternatives at
44–67%.

That answer is the single best thing to have ready, because it shows the
feature was measured rather than guessed.

---

## If a panelist asks "where is the vector database?"

There isn't one, on purpose. Cosine in Node over a few hundred listings is
microseconds and needs no Atlas index, no tier check and no second code
path for the in-memory MongoDB the tests use. Vectors are cached on the
listing documents (`embedding.vector`, `.model`, `.sourceHash`) by the
hourly job, never on a request path. `$vectorSearch` earns its keep in the
tens of thousands of documents; the change would be inside
`matchers/retrieve.js` when the board gets there.

## If asked what happens when the model or the key is gone

Every path degrades instead of breaking, and this is worth saying because
it is unusual:

- wanted matcher → falls back to the hand-written vocabulary matcher
- browse search → keeps the keyword results
- "more like this" → falls back to same-category, newest first
- cross-sell → falls back to a hand-written companion map, then to nothing
- **saved-search alerts → go silent.** The one exception, deliberately: an
  unprompted notification has a higher bar than a page somebody is already
  looking at, and "we found nothing" beats "we found the wrong thing at
  7am".

## Cleaning up afterwards

`npm run seed:demo -- --for <email> --remove --commit` deletes the demo
seller and everything of theirs. Also delete
`signup.probe.delete.me@pec.edu.in` if it is still around.
