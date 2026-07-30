# Myntra Clone

A full-stack e-commerce web application modeled on Myntra — built end-to-end with real payments, real-time features, and background push notifications, not just a static UI clone.

**Live app:** https://myntra-final-lac.vercel.app/
**Backend API:** https://myntra-final.onrender.com

> Backend runs on a free-tier host that sleeps after inactivity — first load may take ~30-50 seconds while it wakes up.

## Features

- **Authentication** — JWT-based signup/login
- **Product browsing & search** — category filtering, product detail pages
- **Recently viewed & browsing history** — server-tracked, syncs in real time across devices, merges guest history on login
- **Cart & Save for Later** — variant (size/color) support, real-time sync across devices, live price-change detection
- **Personalized recommendations** — "You may also like," based on browsing history, wishlist, and category affinity, with stock/purchase-aware filtering
- **Checkout with real Stripe payments** — Stripe Payment Element, signature-verified & idempotent webhooks, DB transactions for consistency
- **Order management** — filterable/sortable/paginated order history, PDF invoice generation, one-click reorder, cancellation & return flows
- **Real-time notifications** — in-app (Socket.io) and background push (Web Push / VAPID) that work even with the tab closed, covering order updates, shipping, price drops, back-in-stock, and abandoned-cart reminders
- **Theme system** — light/dark/system, syncs across devices, fully token-driven (no hardcoded colors)

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router
**Backend:** Node.js, Express 5, Mongoose 8, Socket.io
**Database:** MongoDB (Atlas)
**Payments:** Stripe (Payment Element + webhooks)
**Push notifications:** Web Push (VAPID), service worker
**Deployment:** Vercel (frontend) · Render (backend) · MongoDB Atlas (database)

## Architecture Highlights

A few things worth pointing out beyond basic CRUD:

- **Idempotent, signature-verified Stripe webhooks** — duplicate event delivery is safely ignored via a unique index on the provider event ID; every payment event is persisted for audit.
- **MongoDB transactions** for every multi-document write that needs to stay consistent (cart ↔ save-for-later moves, stock decrement + order confirmation, cancellation + restock).
- **Real push notifications**, not just in-tab toasts — a service worker + VAPID keypair deliver actual OS-level notifications even when the browser is closed, with automatic cleanup of dead/expired device subscriptions.
- **DB-level query optimization** for recommendations — filtering, sorting, and stock/purchase exclusion happen in the MongoDB query itself (backed by compound indexes), not in application memory.

## Project Structure
## Local Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VAPID keys
node seed.js            # loads sample products + categories
npm run dev
```

For local Stripe webhook testing, run the [Stripe CLI](https://stripe.com/docs/stripe-cli) alongside the backend:
```bash
stripe listen --forward-to localhost:5000/webhooks/stripe
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL, VITE_STRIPE_PUBLISHABLE_KEY, VITE_VAPID_PUBLIC_KEY
npm run dev
```

## Notes

- Push notifications require VAPID keys — generate a pair with `npx web-push generate-vapid-keys` and set matching public keys on both frontend and backend.
- No admin/staff role system exists yet — a couple of operational endpoints (order fulfillment progression, product price/stock updates) are reachable by any authenticated user rather than gated to staff; noted in code as a follow-up for a production version.
