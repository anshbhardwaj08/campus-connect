# Tests — in brief

```
cd server
npm test          # the whole suite, ~7 seconds
npm run test:watch
node --test tests/api/rental.test.js    # one file
```

No test framework. Node's own runner (`node --test`), `node:assert/strict`,
and one dev dependency — `mongodb-memory-server`.

---

## The safety property

**Tests never load `server/.env`.** `tests/helpers/env.js` sets its own
environment and explicitly deletes `MONGO_URI`, so the real connection string
is not in the process at all. The database each test file uses is a real
`mongod`, started on a random local port with its data on disk, and thrown
away when the file finishes.

This is not belt-and-braces. A throwaway verification script once deleted a
real student's event, with three RSVPs, because it matched a row by position
against the live database. Nothing in this suite can reach that data — not
by a typo, not by a bad query, not by someone copying a file and changing
one line.

The rule that came out of that is still in force for any script you write by
hand: **never target a record by row position against a database holding
real data.** Match on an identifier the script itself created.

Two other things `env.js` does for the same reason: SMTP points at a closed
port (so a failed send is instant and no mail is ever addressed anywhere
real), and Cloudinary gets dummy credentials.

## Layout

| | |
|---|---|
| `tests/helpers/env.js` | the environment, and the guard above. Loaded before anything under `src/` |
| `tests/helpers/db.js` | starts and stops the throwaway MongoDB; `clearDb()` between groups |
| `tests/helpers/api.js` | the real Express app on a random port, plus a cookie-jar client |
| `tests/helpers/factory.js` | `makeUser`, `makeSignedInUser`, `makeListing`, `makeRental`, `makeConversation` |
| `tests/unit/` | pure functions — no database, no HTTP |
| `tests/api/` | real requests against the real app |

`client()` is one browser: it keeps its own cookies, so two clients in one
test are two signed-in people who cannot see each other's session. Auth here
is httpOnly cookies, and the thing most likely to break is a cookie not
being set, sent back or cleared — which only shows up over real HTTP. That
is why there is no supertest and nothing is mocked.

## What it covers

339 tests.

| File | | What it is for |
|---|---|---|
| `unit/scamScore` | 8 | the thresholds that send a listing to a moderator |
| `unit/validators` | 19 | the allow-lists — mostly what they *refuse* |
| `unit/chatMessage` | 10 | what a message and an offer may be; the only copy of those rules |
| `unit/emailTransport` | 5 | that mail is handed to a transport, not silently dropped |
| `unit/vocabulary` | 15 | what a piece of text is about — the synonym list the wanted board runs on |
| `unit/vector` | 11 | cosine, and spotting a stale cached vector |
| `unit/embedder` | 21 | which embedding provider is chosen, and the request Gemini is sent |
| `api/auth` | 19 | register, login, session, password reset |
| `api/emailVerification` | 17 | that verification is compulsory and cannot be clicked past |
| `api/ban` | 14 | every surface a suspension has to hide |
| `api/listings` | 15 | browse, filters, who may change a listing |
| `api/retrieval` | 8 | retrieval on browse search and saved-search alerts, and when it may run |
| `api/similar` | 12 | "more like this, under ₹X" — ranking, the price rule, the fallback |
| `api/semanticMatcher` | 15 | the matcher's machinery: caching, batching, staleness, fallback |
| `api/wantedMatch` | 18 | which listings answer a wanted post, and what the student is told |
| `api/crossSell` | 22 | "goes with this" — what the app does with whatever a model returns |
| `api/deals` | 22 | the handshake, its guards, and reviews |
| `api/rental` | 24 | the hire clock end to end, including the daily job |
| `api/chat` | 11 | threads and participant membership |
| `api/communityClaim` | 14 | settling a ride or a found item from inside its chat thread |
| `api/eventRsvp` | 13 | that an RSVP count means people, not button presses |
| `api/reports` | 12 | the moderation queue |
| `api/adminStats` | 14 | the dashboard aggregations |

The weight is on guards rather than happy paths, because most of them exist
to close a hole that was found late: deal endpoints with no ownership check,
reviews taking their subject from the request body, `sendMessage` never
checking membership, handlers spreading `req.body` into a model.

## Writing one

Start from a file that already does what you need. Then:

- **Make what you assert on.** No test may depend on what happens to be in
  the database — every fixture comes from the factory, inside the test.
- **Say why in the comment, not what.** `assert.equal(res.status, 403)` is
  already readable; what is not obvious to the next reader is that POST
  `/deals` makes the *caller* the buyer, which is why the seller accepting
  an offer needs a different endpoint.
- **Group with `describe` and set state in its `before`.** Tests in a file
  run in order and share it; `clearDb()` at the top of each group's `before`
  keeps groups independent.
- A group that walks a flow (agree → code → confirm → return) is fine and
  often clearer than rebuilding the whole state per assertion.

Three things that bite:

- **Mongoose strips `createdAt` from updates.** Backdating a document for a
  date-bucketing test has to go through `Model.collection.updateOne`.
- **Two JWTs signed for the same user in the same second are byte
  identical.** Never assert that a reissued token differs; assert on the
  `Set-Cookie` the response sent, which `res.setCookies` exposes.
- **Joi's `.email()` rejects the `.invalid` TLD.** Test addresses use
  `example.com`, reserved by RFC 2606 and equally undeliverable.

## What the suite needed from the app

Three changes, all gated on `NODE_ENV === 'test'`, which is never set in
development or production:

- `middleware/rateLimiter.js` — the limiters skip. A suite fires hundreds of
  requests from one address in seconds, which is exactly what they are for.
- `middleware/logger.js` — winston goes silent, so morgan's line per request
  does not bury the failures you are reading.
- `config/redis.js` — the client connects lazily. `auth.controller` imports
  it, so without this every test process opens a socket to a broker that is
  not there and keeps the runner alive after the last assertion.

## Notes

- `server/.test-db/` holds the mongod data files. Gitignored, emptied by
  `pretest`, and it must be a directory the suite is free to delete
  (`TEST_DB_PATH` moves it).
- It is there rather than in the OS temp directory because this machine's
  system drive sits under 500MB free, and **mongod refuses to build indexes
  below that** — the failure reads as a hook error, not a disk error.
- The first `npm install` downloads a MongoDB binary (~100MB), cached
  afterwards.
- Nothing here touches `/client` or `/admin`. The UI is still checked by
  driving a browser — `npm run check:ui` in `client/`.
