// The environment the suite runs in — and the reason it is safe to run.
//
// Tests never load server/.env. That is deliberate and it is the single
// most important property here: the real MONGO_URI is not in this process,
// so no bug, typo or stray script can point a test at the live database.
// It has gone wrong before — a verification script once deleted a real
// student's event, with three RSVPs, because it matched a row by position
// against production data. Nothing in this suite can reach that data.
//
// The database it does use is an in-memory MongoDB (see helpers/db.js),
// started fresh per test file and thrown away afterwards.
//
// Required before anything under src/ is imported: app.js reads CLIENT_URL
// at module load for CORS, and the rate limiters are constructed at import.
// Both helpers below require this file first, so importing either is enough.

process.env.NODE_ENV = 'test';

// Not "a test value" — absent. A connection string that is not here cannot
// be used by accident.
delete process.env.MONGO_URI;

process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-used-anywhere-real';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-used-anywhere-real';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ADMIN_URL = 'http://localhost:5174';
process.env.COLLEGE_EMAIL_DOMAINS = 'pec.edu.in';

// Point SMTP at a closed port so sending fails instantly with ECONNREFUSED
// rather than hanging on nodemailer's two-minute connect timeout. register
// and forgot-password both catch a failed send and carry on, which is the
// behaviour under test — no mail is ever addressed to a real mailbox.
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
process.env.NODEMAILER_USER = 'tests@example.invalid';
process.env.NODEMAILER_PASS = 'not-a-real-password';

// Nothing on a tested path issues a Redis command, and the client is lazy
// under test — see config/redis.js.
process.env.REDIS_URL = 'redis://127.0.0.1:6399';

// Cloudinary is configured at import by middleware/upload.js. No test
// uploads a file, so these are never used to authenticate anything.
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';
