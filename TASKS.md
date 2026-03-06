# Decision Archaeology — Implementation Roadmap

> Living task document. Status: `[ ]` todo · `[/]` in progress · `[x]` done

---

## Phase 1 — Project Scaffold + Auth + Database

*Goal: A running Next.js app with authentication, database connection, and all third-party clients configured.*

### 1.1 Project Initialization
- [ ] Initialize Next.js 14+ project with TypeScript and App Router (`npx create-next-app`)
- [ ] Configure path aliases (`@/` → `src/`)
- [ ] Set up ESLint + Prettier
- [ ] Create `.env.local` from `.env.example` template
- [ ] Set up `src/` directory structure: `app/`, `components/`, `lib/`, `hooks/`, `types/`

### 1.2 Authentication (Clerk)
- [ ] Install `@clerk/nextjs`
- [ ] Configure `ClerkProvider` in root layout
- [ ] Set up middleware for protected routes
- [ ] Build sign-in / sign-up pages using Clerk components
- [ ] Enable Google and Microsoft OAuth providers in Clerk dashboard
- [ ] Configure session lifetime to 60 minutes
- [ ] Enable TOTP MFA in Clerk dashboard
- [ ] Create `useCurrentUser` hook wrapping Clerk's `useUser`

### 1.3 Database (PostgreSQL via Neon)
- [ ] Create Neon project and obtain `DATABASE_URL`
- [ ] Install Prisma ORM
- [ ] Write initial Prisma schema:
  - `User` model (synced from Clerk via webhook)
  - `DecisionRecord` model (all fields per SRS §7.1, locked fields flagged)
  - `OutcomeUpdate` model
  - `BiasReport` model
  - `CollaboratorShare` model
- [ ] Run initial migration (`prisma migrate dev`)
- [ ] Seed DB with test user and sample decision records
- [ ] Set up Prisma Client singleton for Next.js

### 1.4 Cache & Queue (Upstash Redis)
- [ ] Create Upstash Redis instance
- [ ] Install `@upstash/redis`
- [ ] Configure Redis client in `lib/redis.ts`
- [ ] Set up basic job queue for async AI report generation

### 1.5 File Storage (Cloudflare R2)
- [ ] Create R2 bucket in Cloudflare dashboard
- [ ] Install `@aws-sdk/client-s3` (R2 is S3-compatible)
- [ ] Configure R2 client in `lib/storage.ts` with R2 endpoint
- [ ] Write `uploadFile()` and `getSignedUrl()` helpers

### 1.6 Clerk → DB Sync
- [ ] Create `/api/webhooks/clerk` route to handle `user.created` / `user.updated` / `user.deleted` events
- [ ] Upsert Clerk users into `User` table on webhook receipt

---

## Phase 2 — Decision Capture

*Goal: The core product experience — the structured decision logging form with time-lock.*

### 2.1 Decision Capture Form
- [ ] Build multi-step `DecisionCapture` form component
  - Step 1: Title, Summary, Context
  - Step 2: Alternatives Considered, Chosen Option, Reasoning
  - Step 3 (optional): Values, Uncertainties, Predicted Outcome, Predicted Timeframe, Confidence Level (1–10), Domain Tag
- [ ] Enforce minimum 20-character validation on required fields
- [ ] Add domain tag selector (Career, Finance, Health, Relationships, Creative, Other)
- [ ] Add custom tag input (up to 5 tags)
- [ ] Add file attachment uploader (up to 5 files, 10MB each, via R2)
- [ ] Auto-save draft to DB every 30 seconds

### 2.2 Time Capsule Confirmation
- [ ] Build "Time Capsule" confirmation screen showing summary of fields to be locked
- [ ] On submit: timestamp and save record, mark core fields as locked
- [ ] Start 5-minute edit window countdown timer (DA-FR11a)
- [ ] After 5 minutes: render locked fields as read-only
- [ ] Allow supplementary notes to be added to locked records at any time (DA-FR12)

### 2.3 Correction Request Flow
- [ ] Build in-app Correction Request form for locked records
- [ ] Limit corrections to typographical fixes (spelling, punctuation)
- [ ] Preserve original text alongside correction with audit trail

### 2.4 Decision Record API Routes
- [ ] `POST /api/decisions` — create new decision record
- [ ] `GET /api/decisions` — list all user's records (paginated)
- [ ] `GET /api/decisions/:id` — fetch single record
- [ ] `PATCH /api/decisions/:id/notes` — update supplementary notes only

---

## Phase 3 — Timeline & Archive

*Goal: Users can browse, filter, and search their full decision history.*

### 3.1 Timeline View
- [ ] Build `Timeline` page with reverse-chronological list of Decision Records
- [ ] Each card shows: title, date, domain tag, outcome status badge, confidence level
- [ ] Filter bar: domain tag, date range, outcome status, custom tags
- [ ] Clicking a card opens the full Decision Record detail panel
- [ ] Visually differentiate locked fields vs. supplementary notes

### 3.2 Archive & Search
- [ ] Implement PostgreSQL full-text search across all decision fields
- [ ] Build search results page with relevance ranking
- [ ] Highlight matching terms in result previews
- [ ] Support structured filters: confidence level range, outcome status, domain, date

### 3.3 Onboarding & Cold-Start Experience
- [ ] Build first-login Starter Decision Wizard (guided simplified form)
- [ ] Add persistent progress indicator toward first Bias Report (unlocks at 10 records)
- [ ] Trigger in-app milestone messages at 3, 5, and 10 records

---

## Phase 4 — Outcome Tracking & Reminders

*Goal: Users can log actual outcomes and the system tracks prediction accuracy.*

### 4.1 Outcome Updates
- [ ] Build `AddOutcomeUpdate` form component
  - Fields: What actually happened, Outcome Rating (5-point scale), What I would have done differently
- [ ] `POST /api/decisions/:id/outcomes` — save outcome update
- [ ] Support multiple outcome updates per decision record
- [ ] Label decisions with no outcomes as "Pending Outcome" in UI

### 4.2 Calibration Score
- [ ] Compute Calibration Score per precise definition (SRS DA-FR25):
  - Aligned = As expected / Slightly better / Slightly worse
  - Misaligned = Much better / Much worse
  - Excluded = Too early to tell
- [ ] Display overall score + per-domain breakdown
- [ ] Show "Not enough data" state until 5+ closed decisions with predictions

### 4.3 Reminders & Notifications
- [ ] `POST /api/decisions/:id/reminders` — set check-in reminder at predicted timeframe
- [ ] Build reminder scheduler (Redis queue + cron) to trigger at predicted dates
- [ ] Send reminder via email (SendGrid) and push (Firebase Cloud Messaging)
- [ ] Allow snoozing: 1 week, 1 month, 3 months
- [ ] Opt-in weekly digest email ("Decisions this week")
- [ ] Set up onboarding email sequence (Day 1, 3, 7 after signup) via SendGrid

---

## Phase 5 — AI Pattern Analysis

*Goal: The NVIDIA NIM-powered intelligence layer that turns the archive into insights.*

### 5.1 AI Infrastructure
- [ ] Install NVIDIA NIM SDK / OpenAI-compatible client pointing to NVIDIA endpoint
- [ ] Install Mistral SDK for fallback
- [ ] Build `lib/ai.ts` with `generateWithFallback(prompt)` — tries NVIDIA, falls back to Mistral
- [ ] Set up async job queue for report generation (Redis-backed)
- [ ] Build `GET /api/ai/status/:jobId` — poll report generation status

### 5.2 5-Pass AI Pipeline (Appendix §10.1)
- [ ] **Pass 1 — Normalization:** Use `meta/llama-3.1-8b-instruct` (lightweight) to standardize free-text fields
- [ ] **Pass 2 — Assumption Extraction:** Identify implicit assumptions in reasoning fields
- [ ] **Pass 3 — Bias Detection:** Match patterns against cognitive bias taxonomy (SRS §10.2)
- [ ] **Pass 4 — Calibration Analysis:** Compare predicted vs. actual outcomes across closed decisions
- [ ] **Pass 5 — Synthesis:** Generate human-readable Bias Report with referenced evidence

### 5.3 Bias Report
- [ ] Build `BiasReport` UI component displaying:
  - Bias name, severity (Mild / Moderate / Strong), evidence (referenced by record title), suggested reframe
- [ ] Add AI disclosure banner on all report views
- [ ] Auto-generate report after every 10 new records (Pro tier)
- [ ] Allow on-demand generation

### 5.4 Feedback & Flagging
- [ ] Build "Flag as inaccurate" control on individual bias findings
- [ ] Accept optional free-text reason
- [ ] Store flagged biases in `BiasReport.flagged_by_user`
- [ ] Inject flagged bias summary into future LLM prompts as false-positive context

### 5.5 Additional AI Reports
- [ ] **Recurring Assumptions** report — patterns across multiple decision records
- [ ] **Decision Velocity** chart — frequency by domain and time period

---

## Phase 6 — Sharing & Collaboration

*Goal: Pro users can share individual records with up to 5 collaborators for feedback.*

- [ ] `POST /api/decisions/:id/share` — invite collaborator by email
- [ ] Collaborator receives email invite with view link (Clerk-authenticated access)
- [ ] Build read-only shared record view (owner display name shown, no account info exposed)
- [ ] Allow collaborators to leave timestamped comments
- [ ] Notify collaborators via email + in-app when owner adds an Outcome Update
- [ ] Build Outcome Update revision history visible to collaborators
- [ ] Collaborator Check-In Request button — sends notification to record owner
- [ ] `DELETE /api/decisions/:id/share/:userId` — revoke sharing

---

## Phase 7 — Export & Import

*Goal: Users can take their data in and out freely.*

### 7.1 Export
- [ ] `GET /api/export?format=json` — export full archive as JSON
- [ ] `GET /api/export?format=markdown` — export as Markdown
- [ ] `GET /api/export/:id?format=pdf` — export single record as PDF
- [ ] Document JSON export schema

### 7.2 Import (Power Tier)
- [ ] Create downloadable CSV and JSON import templates with field documentation
- [ ] `POST /api/import` — validate + ingest CSV or JSON decision records
- [ ] Report validation errors before committing
- [ ] Mark imported records with `is_imported: true` (exempt from time-lock)

---

## Phase 8 — Mobile App (React Native)

*Goal: iOS and Android app with offline decision capture.*

- [ ] Initialize React Native project (Expo)
- [ ] Share API client and types from monorepo
- [ ] Implement Clerk auth on mobile
- [ ] Build mobile Decision Capture form
- [ ] Implement offline draft storage (AsyncStorage)
- [ ] Sync offline drafts on reconnection with conflict resolution UI (DA-NFR09a)
- [ ] Integrate Firebase Cloud Messaging for push notifications
- [ ] Support iOS 16+ and Android 12+

---

## Phase 9 — Payments & Tier Enforcement

*Goal: Stripe-backed subscription with feature gating by tier.*

- [ ] Install `stripe` and `@stripe/stripe-js`
- [ ] Create Stripe products and prices: Free, Pro, Power
- [ ] `POST /api/billing/checkout` — create Stripe Checkout session
- [ ] `POST /api/webhooks/stripe` — handle `checkout.session.completed`, `customer.subscription.updated/deleted`
- [ ] Update `User.tier` in DB on subscription changes
- [ ] Enforce tier limits in API middleware:
  - Free: max 20 decision records
  - Pro: unlimited records, AI analysis, sharing, reminders
  - Power: all Pro + bulk import + API access
- [ ] Build billing management page (upgrade/downgrade/cancel via Stripe Portal)
- [ ] Switch from `sk_test_` to `sk_live_` keys at launch

---

## Phase 10 — Security, Performance & Launch Prep

- [ ] Record-level encryption: implement AES-256-GCM with HKDF-derived per-record keys
- [ ] R2 attachment encryption with per-record derived keys (SSE-C)
- [ ] Write Encryption Design Document
- [ ] OWASP Top 10 audit
- [ ] Set up Sentry (error tracking) in Next.js and React Native
- [ ] Set up Axiom (log aggregation)
- [ ] Rate limiting middleware: 200 API req/min per user (DA-NFR16)
- [ ] WCAG 2.1 AA accessibility audit on all core flows
- [ ] Lighthouse performance audit (target: LCP < 2s)
- [ ] Set up GDPR data export endpoint (30-day SLA)
- [ ] Account deletion flow (72-hour purge)
- [ ] Write transparent data usage policy for LLM processing

---

## Open Design Questions (resolve before dev)

| # | Question | Target |
|---|---|---|
| OD-01 | Correction Request UX: admin approval or self-serve with audit trail? | Pre-design sprint |
| OD-02 | Calibration Score "Aligned" definition user-configurable? | Beta feedback |
| OD-03 | Key derivation material: DB column vs. secrets manager? | Encryption Design Doc |
| OD-04 | Bias Reports: async cached vs. on-demand generated? | Architecture review |
| OD-05 | Onboarding email opt-out vs. GDPR consent? | Pre-launch |
