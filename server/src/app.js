const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const sanitizeMiddleware = require('./middleware/sanitize');
const { httpLogger } = require('./middleware/logger');
const apiLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const listingRoutes = require('./routes/listing.routes');
const categoryRoutes = require('./routes/category.routes');
const chatRoutes = require('./routes/chat.routes');
const offerRoutes = require('./routes/offer.routes');
const dealRoutes = require('./routes/deal.routes');
const reviewRoutes = require('./routes/review.routes');
const savedRoutes = require('./routes/saved.routes');
const lookingForRoutes = require('./routes/lookingfor.routes');
const reportRoutes = require('./routes/report.routes');
const eventRoutes = require('./routes/event.routes');
const lostFoundRoutes = require('./routes/lostfound.routes');
const carpoolRoutes = require('./routes/carpool.routes');
const notificationRoutes = require('./routes/notification.routes');
const searchRoutes = require('./routes/search.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// In production the app sits behind the host's proxy (Render, and every
// other PaaS). Without this, req.ip is the proxy's address for every request,
// so the rate limiters count the whole school as one visitor — twenty wrong
// passwords from anyone and the login locks for everybody. One hop: the
// host's load balancer. TRUST_PROXY overrides it for a host with more.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
}

app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
    credentials: true,
  })
);
// helmet's default Content-Security-Policy, widened only for what the two
// apps actually load: Google Fonts (Bangers, Work Sans), listing photos from
// Cloudinary, and blob: for the photo previews on the post form. Everything
// else — scripts, sockets, API calls — is same-origin.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      },
    },
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);
app.use(httpLogger);
// Only the API is rate-limited. The built apps' JS and CSS chunks are not
// requests anyone should be throttled on.
app.use('/api', apiLimiter);

app.get('/api/v1/health', (req, res) => res.status(200).json({ success: true, message: 'OK' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/deals', dealRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/saved', savedRoutes);
app.use('/api/v1/lookingfor', lookingForRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/lostfound', lostFoundRoutes);
app.use('/api/v1/carpool', carpoolRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/admin', adminRoutes);

// An unknown API route is a JSON 404 — never the app's HTML, which a fetch
// would try to parse and fail on confusingly.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// In production this one server also serves both built apps, so the whole
// product lives on one origin: the student app at /, the admin panel at
// /admin. That is what makes the login cookie work without a custom domain —
// two hosts on *.onrender.com (or *.vercel.app) count as two different
// sites, and a sameSite=lax cookie is not sent between them. In development
// vite serves the apps and none of this runs.
const serveApp = (mount, dir) => {
  const root = path.resolve(__dirname, '..', '..', dir, 'dist');
  const index = path.join(root, 'index.html');
  if (!fs.existsSync(index)) {
    console.warn(`Not serving ${dir}: ${index} is missing — run the build first`);
    return;
  }
  app.use(
    mount,
    express.static(root, {
      index: false,
      // Hashed file names change on every build, so they can be cached for
      // good. index.html is what points at them, so it never is.
      setHeaders: (res, file) => {
        if (file.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  // Any other path under the mount is a client-side route: hand back the app
  // and let its router decide. Without this, refreshing /deals is a 404.
  app.get(mount === '/' ? '*' : `${mount}/*`, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
};

if (process.env.NODE_ENV === 'production') {
  // /admin first: the student app's catch-all would otherwise claim it.
  serveApp('/admin', 'admin');
  serveApp('/', 'client');
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
