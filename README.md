# Last-Mile Delivery Tracker

A full-stack delivery management platform with zone-based pricing, intelligent agent assignment, immutable order tracking, and email/SMS notifications.

## Features

- **Role-based auth**: Customer, Delivery Agent, Admin
- **Rate engine**: Pincode → zone detection, volumetric weight (L×B×H÷5000), B2B/B2C rate cards, COD surcharge — all admin-configurable
- **Orders**: Quote before confirm, admin can create on behalf of customers
- **Assignment**: Manual or auto-assign nearest available agent (GPS + zone heuristics)
- **Tracking**: Live status + immutable timeline with actor and timestamp
- **Failed delivery**: Customer notified, reschedule flow, agent reassigned
- **Notifications**: Email (Gmail) + SMS (Twilio) on every status change

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (Bearer token)
- **Email**: Gmail (Nodemailer + App Password)
- **SMS**: [Twilio](https://twilio.com) trial (optional)

## Quick Start

### 1. Clone & install

```bash
cd last-mile-delivery
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and set:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection (pooled, e.g. Supabase port 6543) |
| `DIRECT_URL` | Direct PostgreSQL URL for migrations (port 5432) |
| `JWT_SECRET` | Random secret for JWT signing |
| `NEXT_PUBLIC_APP_URL` | Public app URL for notification links |
| `GMAIL_USER` | Gmail address used to send order notifications |
| `GMAIL_APP_PASSWORD` | Google App Password (with 2FA enabled) |
| `TWILIO_*` | Optional — SMS logs to console without it |

### 3. Database

```bash
npm run db:setup
```

This runs `prisma db push` and seeds demo data.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lmd.com | password123 |
| Customer | customer@lmd.com | password123 |
| Agent | agent@lmd.com | password123 |

**Sample pincodes**: 110054 (North), 110016 (South), 110092 (East)

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add env vars from `.env.example`
4. Use Supabase/Neon PostgreSQL
5. Run `npm run db:setup` against production DB (locally with prod `DATABASE_URL`)

Build command: `npm run build`

### Hosted URL

Deploy to Vercel and set `NEXT_PUBLIC_APP_URL` to your production domain.

> **Note**: Replace `[YOUR-DEPLOYED-URL]` in submissions with your Vercel URL after deployment.

## Database Schema

```
User          — id, name, email, password, role, phone, lat/lng, available
Zone          — id, name
Area          — id, name, pincode (unique), zoneId
RateCard      — pickupZoneId, dropZoneId, orderType, pricePerKg, codCharge
Order         — shipment details, weights, charges, status, agentId, rescheduleDate
OrderHistory  — immutable log: orderId, status, changedById, createdAt
```

See `prisma/schema.prisma` for full definitions and relations.

## Rate Calculation Logic

1. **Zone detection**: Lookup `Area` by pickup/drop pincode → get `Zone`
2. **Volumetric weight**: `(L × B × H) / 5000` (cm → kg)
3. **Billable weight**: `max(actualWeight, volumetricWeight)`
4. **Rate lookup**: `RateCard` where `(pickupZone, dropZone, orderType)` — separate matrices for B2B and B2C; same zone = intra-zone rate
5. **Base charge**: `billableWeight × pricePerKg`
6. **COD surcharge**: Add `codCharge` from rate card when `paymentType = COD`
7. **Total**: `baseCharge + codSurcharge`

All rates and COD amounts are admin-configured — nothing is hardcoded in application logic.

## API Documentation

Base URL: `/api`  
Auth: `Authorization: Bearer <token>`

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register customer (or agent via body.role) |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user |

### Admin — Zones & Rates

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET/POST | `/zones` | Admin POST | List/create zones |
| PATCH/DELETE | `/zones/:id` | Admin | Update/delete zone |
| GET/POST | `/areas` | Admin POST | List/create areas |
| DELETE | `/areas/:id` | Admin | Remove area |
| GET/POST | `/rate-cards` | Admin POST | List/create rate cards |
| PATCH/DELETE | `/rate-cards/:id` | Admin | Update/delete rate card |
| GET | `/customers` | Admin | List customers |
| GET | `/agents` | Any auth | List agents |

### Orders

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/orders/quote` | Auth | Preview charge (no order created) |
| GET | `/orders` | Auth | List orders (filtered by role; admin query params: status, zoneId, agentId) |
| POST | `/orders` | Customer/Admin | Create order (admin may pass customerId) |
| GET | `/orders/:id` | Auth | Order detail + history |
| POST | `/orders/:id/assign` | Admin | Manual agent assign |
| POST | `/orders/:id/auto-assign` | Admin | Nearest available agent |
| PATCH | `/orders/:id/status` | Agent/Admin | Update status |
| POST | `/orders/:id/reschedule` | Customer | Reschedule failed delivery |

### Agent

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/agents/me/location` | Update GPS |
| PATCH | `/agents/me/availability` | Toggle available flag |

### Order status lifecycle

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                                              ↘ FAILED → (reschedule) → CREATED → ...
```

Each transition appends an immutable `OrderHistory` row.

## Project Structure

```
app/
  api/          — REST API routes
  admin/        — Admin dashboard
  agent/        — Agent dashboard
  customer/     — Customer portal
  login/        — Auth pages
lib/
  rate-calculator.ts   — Pricing engine
  agent-assignment.ts  — Auto-assign logic
  order-service.ts     — Order lifecycle + notifications
  notifications.ts     — Email/SMS
prisma/
  schema.prisma
  seed.ts
SYSTEM_DESIGN.md       — Architecture write-up
```

## System Design

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for the 800-word architecture document.

## License

MIT
