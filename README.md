# Myntra Clone — Merged Production App

One repo, one backend, one frontend, one deploy target. All 6 internship
tasks integrated as features of the original training project (see full
migration history in this conversation for the module-by-module breakdown).

## Structure

```
backend/     Express + MongoDB + Socket.io + Stripe
frontend/    React + TypeScript + Vite + Tailwind
```

## Setup

### Backend
```
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
node seed.js            # loads 24 sample products + categories into MongoDB
npm start
```
Required env vars: `MONGO_URI`, `JWT_SECRET`.
Needed for checkout/payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### Frontend
```
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL, VITE_STRIPE_PUBLISHABLE_KEY
npm run dev
```

## What's integrated

- **Task 1** — Recently Viewed, Continue Shopping, guest history merge on login
- **Task 2** — Smart Cart, Save For Later, checkout stock validation
- **Task 3** — Recommendations (trending + personalized), Wishlist, Browsing History
- **Task 4** — Notifications (real-time via Socket.io), Preferences, Theme (light/dark/system)
- **Task 5** — Reviews & Ratings (built from scratch — no source project was ever delivered for this task)
- **Task 6** — Orders, Stripe Payments, Invoices (PDF), Cancel/Return (ported from a Postgres reference implementation to MongoDB)

## Known gaps / next steps

- **Push notifications** (Expo push / Web Push) not implemented — needs VAPID keys
  and device-token registration, deferred as a clean follow-up module.
- **Frontend is an MVP build**, not pixel-polished — architecture (routing, contexts,
  API layer, socket layer) is complete and production-shaped; visual design can be
  iterated further.
- Return requests create a record but don't auto-restock/refund — matches original
  scope (manual approval step assumed).
