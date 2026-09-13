# Campus Connect

A college-exclusive peer-to-peer marketplace for buying, selling, and connecting with verified students on campus.

## Running locally

Open three terminals, one per app:

```bash
# Terminal 1 — backend API + Socket.io (http://localhost:5000)
cd server && npm install && npm run dev

# Terminal 2 — student-facing app (http://localhost:5173)
cd client && npm install && npm run dev

# Terminal 3 — admin panel (http://localhost:5174)
cd admin && npm install && npm run dev
```

MongoDB and Redis must be running locally (or reachable via `MONGO_URI` / `REDIS_URL`) before starting the server.

## Environment variables

### server/.env
```
PORT, MONGO_URI, REDIS_URL
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
NODEMAILER_USER, NODEMAILER_PASS
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE
OPENAI_API_KEY
COLLEGE_EMAIL_DOMAINS
CLIENT_URL, ADMIN_URL
```

### client/.env
```
VITE_API_URL
VITE_SOCKET_URL
```

### admin/.env
```
VITE_API_URL
VITE_SOCKET_URL
```
