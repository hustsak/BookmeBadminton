# BookMeBadminton — Staging & Release Verification Checklist

This checklist must be verified in a staging environment prior to initiating public release.

---

## 1. Infrastructure & Environment Readiness

- [ ] Managed PostgreSQL database provisioned with SSL enabled.
- [ ] Application deployed over valid HTTPS domain with SSL/TLS certificate active.
- [ ] Environment variables configured in hosting secret manager (`DATABASE_URL`, `NODE_ENV=production`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`).
- [ ] Database migrations applied cleanly via `npx prisma migrate deploy`.
- [ ] Health check endpoint `GET /api/health` returns `200 OK` with `readiness: "ready"` and `database.status: "connected"`.
- [ ] Automated pre-release database snapshot executed and stored securely.

---

## 2. Customer Booking Flow

- [ ] **Venue Exploration**: Public venue and court catalog loads correctly without exposing owner email or phone number.
- [ ] **Availability & Slot Selection**: Time slots update in real-time; conflicting slots are visually disabled.
- [ ] **Authoritative Pricing**: Total price calculated exclusively on server (`hourlyRate * durationHours`); tampering with client prices has zero effect.
- [ ] **Booking Creation**: Booking persists with status `CONFIRMED` and unique booking code (e.g. `BK-...`).
- [ ] **Advisory Lock Concurrency**: Simultaneous booking attempts on the exact same court and time slot accept only 1 reservation and safely reject the other with 409 Conflict.
- [ ] **My Bookings Isolation**: Customers can view only their own bookings; other customers' bookings are never exposed.
- [ ] **Cancellation & Slot Release**: Customer can cancel their booking; slot is released immediately for new reservations.
- [ ] **Unauthorized Cancellation**: Attempting to cancel another customer's booking returns 403 Forbidden.

---

## 3. Payment & VietQR Flow

- [ ] **VietQR Display**: VietQR modal generates correct payment instruction with venue bank, account number, amount, and booking code reference.
- [ ] **Payment Status Security**: A customer cannot self-approve their payment or change payment status via client-side API requests.
- [ ] **Owner Verification**: Venue owner logs in and confirms payment via `/api/owner/bookings/[id]/confirm-payment`; status updates to `PAID`.
- [ ] **Cancelled Booking Protection**: Payment attempts on cancelled bookings are rejected with 400 Bad Request.
- [ ] **Owner Analytics Integrity**: Only verified `PAID` payments contribute to revenue totals; pending receipts and cancelled bookings are isolated.

---

## 4. Open Matches & Social Features

- [ ] **Match Creation**: User creates a friendly match linked to an active court booking.
- [ ] **Match Participation**: Players join the match; maximum player capacity is enforced under concurrency.
- [ ] **Match Cancellation**: Creator can cancel match; participants receive notification.
- [ ] **Results & Confirmation**: Match score submitted by creator; participants confirm or dispute within allowed workflow.
- [ ] **Player Ratings & Leaderboards**: Elo ratings and leaderboard stats calculate deterministically based on confirmed matches.

---

## 5. Security & Access Boundaries

- [ ] **No Production Auth Fallback**: In `NODE_ENV=production`, unauthenticated requests to owner/admin endpoints receive 401/403 rather than impersonating a default user.
- [ ] **Owner Scope Enforcement**: Venue owners can view/manage only their own venues, courts, and bookings.
- [ ] **Admin Authorization**: Admin platform endpoints require genuine administrator role.
- [ ] **Cron Endpoint Protection**: Public requests to `/api/cron/reminders` without `Bearer <CRON_SECRET>` return 401 Unauthorized.
- [ ] **Security Headers**: Responses include `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`.

---

## 6. Mobile Experience & PWA

- [ ] **Web App Manifest**: `/manifest.webmanifest` returns valid JSON with correct app name and icons.
- [ ] **Service Worker**: Registers cleanly on HTTPS; caches static app shell; strictly bypasses `/api/*` routes.
- [ ] **Offline Fallback**: Disconnecting network shows friendly `/offline` page rather than browser connection error.
- [ ] **Responsive Design**: Clean UI layout without horizontal scroll or truncated buttons at 320px, 375px, 390px, and 430px viewports.

---

## 7. Rollback Preparedness

- [ ] Pre-release database snapshot available.
- [ ] Previous application container image / commit tagged and ready for rollback.
- [ ] Incident communication channel and maintenance banner ready if needed.
