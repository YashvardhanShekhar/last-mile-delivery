# System Design — Last-Mile Delivery Tracker

## Overview

The platform is a monolithic Next.js application with PostgreSQL as the system of record. REST API routes handle business logic; the React frontend consumes the same APIs. Role-based access (Customer, Agent, Admin) is enforced via JWT on every protected endpoint. Orders, zones, rate cards, and immutable history are modeled relationally in PostgreSQL via Prisma.

## Rate Calculation Engine

Pricing is fully data-driven — no hardcoded zone or rate values in code.

**Zone detection** maps pickup and drop pincodes to zones through the `Area` table. Each area belongs to exactly one zone; pincodes are unique keys. On order creation or quote, the engine resolves both pincodes. Unmapped pincodes fail fast with a clear error so admins can extend coverage.

**Weight computation** uses industry-standard volumetric weight: `(length × breadth × height) / 5000`, with dimensions in centimeters yielding kilograms. Billable weight is `max(actualWeight, volumetricWeight)`, ensuring light but bulky packages are charged fairly.

**Rate lookup** queries `RateCard` by `(pickupZoneId, dropZoneId, orderType)`. Separate rate matrices exist for B2B and B2C. Intra-zone deliveries (pickup zone equals drop zone) use the diagonal entries of the matrix; inter-zone deliveries use off-diagonal entries. Each card stores `pricePerKg` and a flat `codCharge` per order type.

**Final charge** = `(billableWeight × pricePerKg) + (COD ? codCharge : 0)`. The quote API exposes this breakdown before the customer confirms; confirmed orders persist all computed fields for auditability.

## Zone Detection Approach

Zones are administrative pricing regions, not geofences. Detection is deterministic pincode lookup — O(1) indexed query on `Area.pincode`. This design suits Indian last-mile logistics where pincodes are the operational unit for sorting hubs. Admins create zones, attach areas with pincodes, and rate cards reference zone pairs. The model scales by adding areas without code changes. Future enhancement could layer geocoding fallback, but pincode-first keeps the MVP correct and testable.

## Auto-Assignment Logic

Agents expose `available` (boolean) and optional `latitude`/`longitude`. Auto-assignment runs when an admin triggers it or after a customer reschedules a failed delivery.

**Step 1 — Filter**: Select users with role AGENT and `available = true`.

**Step 2 — Nearest GPS**: If agents report coordinates, compute Haversine distance from a pickup anchor (zone centroid derived from mapped pincodes) and pick the minimum. This favors geographically proximate couriers.

**Step 3 — Zone familiarity**: If no GPS data, prefer agents who have previously handled orders in the pickup zone (inferred from order history).

**Step 4 — Fallback**: Assign any available agent.

Manual assignment remains available for operational override. Assignment transitions status to ASSIGNED, logs history, and notifies the customer.

## Order Status Lifecycle & Immutable History

Statuses follow a linear delivery pipeline: CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED, with FAILED as a terminal branch from any active delivery state. Agents may advance through delivery states; admins may override any status.

Every transition inserts an `OrderHistory` row with `status`, `changedById`, and `createdAt`. History rows are never updated or deleted — the timeline is append-only. The customer tracking UI renders this chronologically; audits and disputes rely on the same source.

## Failed Delivery Handling

When an agent marks FAILED, the order status updates, history is appended, and the customer receives email/SMS with a link to reschedule. The customer selects a new date via the reschedule API, which validates ownership and FAILED status. The system sets `rescheduleDate`, clears `agentId`, resets status to CREATED, logs the event, notifies the customer, and attempts auto-assignment for the new attempt. If no agents are available, the order stays CREATED until admin intervention — avoiding silent failures.

## Notifications

Status changes trigger parallel email (Resend) and SMS (Twilio). Missing credentials degrade gracefully to structured console logs in development. Notification copy includes human-readable status labels and deep links to the order tracking page.

## Data Model Summary

Users serve triple duty as customers, agents, and admins via `Role`. Orders reference customer, optional agent, pickup/drop zones, and store computed pricing snapshots. Rate cards form a zone-pair × order-type matrix. This normalization keeps pricing configurable while orders remain self-contained snapshots at creation time.

## Deployment Considerations

The app deploys to Vercel with an external PostgreSQL provider (Supabase/Neon). Pooled `DATABASE_URL` serves runtime queries; `DIRECT_URL` supports schema migrations. JWT secrets and notification API keys are environment-scoped. Horizontal scaling is straightforward because the API is stateless; agent location and availability are persisted in the database rather than in-memory.
