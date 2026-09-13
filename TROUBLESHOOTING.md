# Troubleshooting Log

Running record of real issues hit while building Campus Connect, their root cause, and the fix. Keep appending to this as new issues come up — future setup (a new machine, a new contributor, redeploying) will hit the same class of problems.

---

## 1. Tailwind CSS v4 installed instead of v3

**Where:** `client/`, `admin/`
**Symptom:** `npm create vite@latest` pulled in `tailwindcss@^4.x`, which has no `tailwind.config.js` / `@tailwind` directive setup — it uses a CSS-first config model instead.
**Fix:** Explicitly installed `tailwindcss@3.4.13` alongside `postcss` and `autoprefixer`, then ran `npx tailwindcss init -p` to generate the classic config files.
**Takeaway:** When scaffolding a new Vite app, always pin the Tailwind major version if the classic `tailwind.config.js` workflow is expected — don't trust "latest" here.

---

## 2. `multer-storage-cloudinary` peer dependency conflict

**Where:** `server/`
**Symptom:** `npm install` failed with `ERESOLVE` — `multer-storage-cloudinary@4.0.0` declares a peer dependency on `cloudinary@^1.21.0`, but the project uses `cloudinary@^2.x` (the `.v2` API).
**Fix:** Installed with `npm install --legacy-peer-deps`. The package's actual runtime usage (`cloudinary.uploader.upload_stream`) is unchanged between v1 and v2, so this is safe — the peer dependency declaration is just stale.
**Takeaway:** If `npm install` in `server/` ever needs to be re-run from scratch (fresh clone, CI, etc.), remember to use `--legacy-peer-deps` or it will fail.

---

## 3. MongoDB Atlas connection failing with `querySrv ECONNREFUSED`

**Where:** `server/src/config/db.js`
**Symptom:** `mongoose.connect()` on a `mongodb+srv://` URI failed with `querySrv ECONNREFUSED _mongodb._tcp.cluster0.xxxxx.mongodb.net`, even with correct credentials and IP whitelisted in Atlas.
**Root cause:** The local network's default DNS resolver doesn't support SRV record lookups (confirmed via a raw `dns.resolveSrv()` test), which `mongodb+srv://` requires to discover the replica set members. Querying the same record via Google's DNS (`8.8.8.8`) worked immediately.
**Fix:** Added `dns.setServers(['8.8.8.8', '1.1.1.1'])` at the top of `config/db.js`, before `mongoose.connect()` runs.
**Takeaway:** This is a network-level issue, not a credentials or Atlas config issue — if this ever recurs on a new machine, check `dns.resolveSrv()` directly before suspecting Atlas.

---

## 4. Redis Cloud connection refused on college Wi-Fi

**Where:** `server/.env` (`REDIS_URL`)
**Symptom:** `ioredis` connection to a Redis Cloud database failed with `connect ECONNREFUSED` on its custom port (e.g. `12355`). A raw TCP test to an unrelated service on a different high port (`tcpbin.com:4242`) failed identically.
**Root cause:** The college Wi-Fi network only allows outbound traffic on a small allowlist of standard ports (80, 443, and apparently 27017 for MongoDB). Any non-standard port — which every cloud Redis provider uses — gets refused.
**Fix:** No code fix needed — connecting from mobile hotspot (or any non-restricted network) works immediately with the same `REDIS_URL`.
**Takeaway:** If the server works everywhere except on campus Wi-Fi, this is why. Options if it becomes a recurring blocker: run Redis locally (Memurai on Windows, or Docker) so traffic never leaves localhost, instead of relying on a cloud instance.

---

## 5. Server crashed on startup: `Error: accountSid must start with AC`

**Where:** `server/src/services/sms.service.js`
**Symptom:** `npm run dev` crashed immediately, before even connecting to MongoDB/Redis, with a Twilio SDK error.
**Root cause:** The Twilio client was being constructed **at module load time** (`const client = twilio(...)` at the top of the file). Twilio validates the `accountSid` format the moment the client is constructed — so as soon as anything `require()`'d this file, it crashed, even though no OTP had actually been sent. The placeholder value `your_twilio_account_sid` in `.env` doesn't start with `AC`, which Twilio requires.
**Fix:** Made the Twilio client lazy — it's now only constructed inside `sendPhoneOTP()` on first actual use, via a `getClient()` helper, instead of at import time.
**Takeaway:** Any third-party SDK client that validates credentials eagerly at construction should be lazily initialized in a service file, so a missing/placeholder API key for an unused feature doesn't take down the whole server. Worth double-checking `ai.service.js` (OpenAI) and `cloudinary.js` similarly if they ever start throwing on boot.

---

## Template for new entries

```md
## N. <Short description>

**Where:** <file/folder>
**Symptom:** <what you saw>
**Root cause:** <why it happened>
**Fix:** <what changed>
**Takeaway:** <what to remember next time>
```
