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

app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.ADMIN_URL],
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeMiddleware);
app.use(httpLogger);
app.use(apiLimiter);

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

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
