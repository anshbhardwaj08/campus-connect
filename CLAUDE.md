# Campus Connect — College OLX

## What this project is
A college-exclusive peer-to-peer marketplace where only verified
college-email holders can buy, sell, exchange goods and services,
and access community features like Lost & Found, carpools, and events.

## Start here
- CONTEXT.md              -> running handoff: what is done, what is next
- docs/client-summary.md  -> client app, in brief
- docs/admin-summary.md   -> admin app, in brief
- docs/design-system.md   -> Comic Noir UI spec

## UI rule (applies to every screen, client and admin)
The entire product uses ONE theme: **Comic Noir**. Every new page, component
and state follows it — there is no "just this once" exception and no second
look anywhere in the product.

Read docs/design-system.md BEFORE writing any UI. Non-negotiables:
- Only the eight tokens. Crimson is the ONLY accent; no second colour for
  success / warning / info states, no gradients, no new colours ever.
- The panel (ui/Panel) is the only container. No rounded cards, no blurred
  shadows, no component-library surfaces.
- Two fonts only: Bangers (display, <= 6 words) and Work Sans (everything).
- Halftone screens everywhere; dot size scales with content.
- All motion goes through src/lib/motion.js (GSAP). Never call gsap.from()
  directly from a component.
- No dark mode. The paper ground is the theme.

## Project structure
- /server  → Node.js + Express + Socket.io backend, port 5000
- /client  → Student-facing React PWA (Vite + Tailwind), port 5173
- /admin   → Admin panel React app (Vite + Tailwind), port 5174

## Tech stack
MongoDB Atlas + Mongoose, Express, React 18, Node.js, Socket.io,
Redux Toolkit, React Query, Tailwind CSS, Cloudinary, Redis, Bull,
JWT (httpOnly cookies), bcryptjs, Twilio OTP, Nodemailer, OpenAI API

## API base
All backend routes: /api/v1/*
Admin-only routes: /api/v1/admin/* (requireRole: admin or moderator)

## Coding conventions
- All API responses use ApiResponse wrapper: { success, data, message }
- All errors use ApiError class with statusCode
- All async controllers wrapped in catchAsync utility
- JWT access token in httpOnly cookie, refresh token rotated on use
- College email validated via collegeEmail.js middleware on register
- Role checks via rbac.js requireRole() middleware
- Images uploaded via Cloudinary (multer-storage-cloudinary)
- Socket.io rooms named by userId for notifications
- Socket.io rooms named by conversationId for chat

## Models summary (15 collections)
User, Listing, Category, Conversation, Message, Offer, Deal,
Review, SavedItem, SavedSearch, LookingFor, Report,
Event, LostFound, Carpool, Notification

## Key environment variables (all in server/.env)
MONGO_URI, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
CLOUDINARY_*, TWILIO_*, NODEMAILER_*, OPENAI_API_KEY,
COLLEGE_EMAIL_DOMAINS, CLIENT_URL, ADMIN_URL
