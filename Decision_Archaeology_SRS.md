# Software Requirements Specification
## Decision Archaeology — Personal Decision Intelligence & Reasoning Archive

**Document Version:** 1.3.0 | **Status:** Draft | **Date:** March 7, 2026
**Classification:** Internal — Confidential

---

## Table of Contents

1. Introduction
2. Overall Description
3. Stakeholders & User Classes
4. System Features & Functional Requirements
5. Non-Functional Requirements
6. External Interface Requirements
7. Data Requirements
8. System Constraints
9. Assumptions & Dependencies
10. Appendix
11. Open Design Questions

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the complete functional and non-functional requirements for **Decision Archaeology**, a personal decision-logging and reasoning intelligence platform. The document is the authoritative reference for design, development, testing, and stakeholder review.

### 1.2 Product Overview

Decision Archaeology is a web and mobile application that allows individuals to log the full reasoning context behind their significant decisions at the time of making them — not after. Over time, the system builds a structured, searchable archive of a user's decision-making history, enabling them to:

- Revisit *why* they made a choice, not just what they chose
- Surface patterns in their reasoning (cognitive biases, recurring assumptions, overconfidence)
- Compare predicted outcomes to actual outcomes
- Build a compounding personal knowledge base from lived experience

Unlike journaling apps or task managers, Decision Archaeology is specifically structured around the epistemology of decisions: the information available at the time, the alternatives considered, the values at play, and the uncertainty acknowledged.

### 1.3 Scope

**In Scope:**
- Decision logging with structured reasoning capture
- Outcome tracking and prediction-vs-reality comparison
- AI-powered pattern analysis (bias detection, assumption auditing)
- Timeline and archive views
- Sharing and collaboration (optional, user-controlled)
- Reminders and check-in prompts for tracked decisions

**Out of Scope:**
- Financial advising or investment recommendations
- Clinical or therapeutic decision support
- Team or organizational decision management (v2 consideration)
- Integration with external calendar or task systems (v2)

### 1.4 Definitions

| Term | Definition |
|------|-----------|
| Decision Record | A structured log entry capturing a single decision and its full reasoning context |
| Decision Context | All information, alternatives, values, and uncertainties present at the time of the decision |
| Outcome Update | A follow-up entry added to a Decision Record documenting actual results |
| Prediction | A user-stated expected outcome at decision time |
| Bias Report | AI-generated analysis identifying probable cognitive biases in a user's reasoning patterns |
| Decision Archaeology | The practice of excavating past decisions to understand the reasoning that produced them |
| Calibration Score | A metric tracking how well a user's predictions align with actual outcomes over time |

### 1.5 Document Conventions

- **SHALL** — mandatory requirement
- **SHOULD** — recommended, not mandatory
- **MAY** — optional
- Requirements identified as `[DA-FRxx]` (functional) or `[DA-NFRxx]` (non-functional)

---

## 2. Overall Description

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Decision Archaeology                       │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│  │  Web Client  │   │  Mobile App  │   │     AI Engine       │ │
│  │ (Next.js SPA)│   │(React Native)│   │ (LLM + Analytics)   │ │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬──────────┘ │
│         └─────────────┬────┘                      │            │
│                  ┌────▼───────────────────────────▼──────┐     │
│                  │          API Server (Node/TS)          │     │
│                  └──────────────────┬─────────────────────┘     │
│                                     │                            │
│                          ┌──────────▼──────────┐               │
│                          │   PostgreSQL + Redis  │               │
│                          └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Product Functions (Summary)

- **Decision Capture:** A structured, guided form for logging decisions with full reasoning context
- **Outcome Tracking:** Periodic check-in prompts for users to update decisions with real outcomes
- **Pattern Analysis:** AI-generated reports on reasoning patterns, biases, and calibration
- **Timeline View:** Chronological visualization of all decision records with outcome status
- **Archive & Search:** Full-text and structured search across all decision records
- **Sharing (Optional):** Selected decision records can be shared with trusted collaborators for feedback

### 2.3 Core Philosophy

Decision Archaeology is built on three principles:

1. **Time-locked context** — the value of a decision record comes from capturing the reasoning *before* hindsight contaminates it
2. **Prediction accountability** — users commit to expected outcomes so the system can track calibration over time
3. **Pattern over event** — individual decisions matter less than the patterns across many; the system is optimized for long-term intelligence accumulation

---

## 3. Stakeholders & User Classes

### 3.1 Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Individual Users | Primary | Personal growth, decision quality improvement |
| Power Users (Researchers, Executives) | Primary | Systematic reasoning audits, high-stakes decision archives |
| Shared Collaborators | Secondary | Reviewing and providing feedback on shared decisions |
| Product & Engineering | Internal | Growth, reliability, feature development |

### 3.2 User Classes

#### 3.2.1 Individual User (Free)
- Up to 20 Decision Records
- Basic timeline and archive view
- Manual outcome updates (no automated check-ins)
- No AI pattern analysis

#### 3.2.2 Pro User
- Unlimited Decision Records
- Automated check-in reminders
- Full AI pattern analysis and Bias Reports
- Calibration Score tracking
- Export (PDF, JSON, Markdown)
- Optional decision sharing with up to 5 collaborators

#### 3.2.3 Power User (Researcher / Executive)
- All Pro features
- Bulk import of historical decisions (CSV/JSON)
- Advanced analytics: custom date ranges, decision category breakdowns, outcome accuracy by domain
- API access for integration with personal productivity tools

---

## 4. System Features & Functional Requirements

### 4.1 Authentication & Account Management

| ID | Requirement |
|----|-------------|
| DA-FR01 | The system SHALL support email/password registration with email verification |
| DA-FR02 | The system SHALL support OAuth 2.0 login via **Google** and **Microsoft** accounts, managed through **Clerk** |
| DA-FR03 | Users SHALL be able to update display name, avatar, and notification preferences |
| DA-FR04 | The system SHALL enforce password complexity: min 10 characters, uppercase, digit, special character — enforced via Clerk's password policy configuration |
| DA-FR05 | The system SHALL support MFA via TOTP — provided natively by Clerk |
| DA-FR06 | Inactive sessions SHALL expire after 60 minutes — configured via Clerk session lifetime settings |

### 4.2 Decision Capture

**Description:** The core input flow — a structured, guided form for logging a decision at decision time.

| ID | Requirement |
|----|-------------|
| DA-FR07 | The system SHALL provide a Decision Capture form with the following required fields: (1) Decision Title, (2) Decision Summary, (3) Context, (4) Alternatives Considered, (5) Chosen Option, (6) Reasoning |
| DA-FR08 | The system SHALL provide the following optional fields: (7) Values at Play, (8) Key Uncertainties, (9) Predicted Outcome, (10) Predicted Timeframe, (11) Confidence Level (1–10), (12) Domain Tag (Career, Finance, Health, Relationships, Creative, Other) |
| DA-FR09 | All required fields SHALL have a minimum of 20 characters to discourage superficial entries |
| DA-FR10 | The system SHALL prompt users to describe alternatives considered, even if the answer is "none considered" |
| DA-FR11 | Upon saving, the system SHALL timestamp the record and lock the core decision fields (Decision Summary, Reasoning, Alternatives) to preserve time-locked context |
| DA-FR11a | The system SHALL allow a **5-minute edit window** immediately after the initial save, during which core fields remain editable. A countdown timer SHALL be displayed. After this window expires, the lock is permanent |
| DA-FR11b | If a user identifies a typographical error in a locked field, they MAY submit a Correction Request via in-app form. The request SHALL be limited to fixing demonstrable typos (spelling, punctuation) and SHALL NOT allow semantic changes to the reasoning. The original raw text SHALL be preserved alongside the correction |
| DA-FR12 | Users SHALL be able to add supplementary notes to locked records without modifying the original fields |
| DA-FR13 | The system SHALL display a "Time Capsule" confirmation screen before saving, showing the user a summary of what will be locked and a clear warning that the 5-minute edit window is the final opportunity to modify core fields |
| DA-FR14 | Users SHALL be able to categorize decisions with up to 5 custom tags in addition to the domain tag |
| DA-FR15 | The system SHALL support attaching up to 5 files (PDF, image, max 10MB each) to a decision record as supporting context |

### 4.3 Outcome Tracking

**Description:** The system enables users to log actual outcomes and compare them against predictions.

| ID | Requirement |
|----|-------------|
| DA-FR16 | The system SHALL allow users to manually add an Outcome Update to any Decision Record at any time |
| DA-FR17 | An Outcome Update SHALL include: (1) What actually happened, (2) Outcome rating relative to prediction (Much better / Slightly better / As expected / Slightly worse / Much worse / Too early to tell), (3) What I would have done differently |
| DA-FR18 | If a Predicted Timeframe was set, the system SHALL send a check-in reminder (push/email) when that timeframe is reached (Pro tier) |
| DA-FR19 | Users SHALL be able to snooze check-in reminders by 1 week, 1 month, or 3 months |
| DA-FR20 | Decision Records without Outcome Updates SHALL be labeled "Pending Outcome" in timeline and archive views |
| DA-FR21 | The system SHALL allow multiple Outcome Updates per Decision Record (to capture evolving results) |

### 4.3a Onboarding & Cold-Start Experience

**Description:** Addresses the engagement gap before a user accumulates enough records to benefit from AI analysis.

| ID | Requirement |
|----|-------------|
| DA-FR21a | The system SHALL display a persistent **Progress Indicator** showing the user's record count relative to the 10-record threshold required for the first Bias Report (e.g., "7 of 10 decisions logged — 3 more to unlock your first Bias Report") |
| DA-FR21b | On first login, the system SHALL present a **Starter Decision Wizard** — a guided, simplified capture flow offering pre-populated example prompts across the six domain tags to lower the barrier to the first entry |
| DA-FR21c | The system SHALL send an **onboarding email sequence** (Days 1, 3, 7) prompting users to log their next decision, with short-form tips on what constitutes a high-quality entry |
| DA-FR21d | The system SHALL display **inline value messages** (e.g., "You've now logged 5 decisions — you can already revisit your earliest reasoning here") at the 3, 5, and 10 record milestones to reinforce perceived value before AI reports are available |

### 4.4 AI Pattern Analysis

**Description:** AI-generated insights synthesized from a user's full decision archive.

| ID | Requirement |
|----|-------------|
| DA-FR22 | The system SHALL generate a Bias Report analyzing the user's last 10+ Decision Records for patterns indicative of: confirmation bias, overconfidence, sunk cost fallacy, availability heuristic, status quo bias, and planning fallacy |
| DA-FR23 | The Bias Report SHALL include: bias name, evidence from specific records (referenced by title, not quoted), severity indicator (Mild / Moderate / Strong), and a suggested reframe for future decisions |
| DA-FR24 | Bias Reports SHALL be generated on demand and automatically after every 10 new Decision Records (Pro tier) |
| DA-FR25 | The system SHALL compute and display a **Calibration Score** per the following definition: |
| | • **Aligned** = Outcome rating of `As expected`, `Slightly better`, or `Slightly worse` |
| | • **Misaligned** = Outcome rating of `Much better` or `Much worse` |
| | • **Excluded** = Outcome rating of `Too early to tell` — excluded from score calculation entirely |
| | • Score = `(Aligned decisions) / (Aligned + Misaligned decisions)` × 100, expressed as a percentage |
| | • A minimum of **5 closed decisions with a Predicted Outcome set** is required before a score is displayed; below this threshold the UI SHALL show a "Not enough data" state with the current count |
| DA-FR26 | Calibration Scores SHALL be broken down by domain tag (Career, Finance, Health, etc.) |
| DA-FR27 | The system SHALL generate a "Recurring Assumptions" report identifying assumptions that appear across multiple decision records |
| DA-FR28 | The system SHALL generate a "Decision Velocity" chart showing how frequently decisions are logged by domain and time period |
| DA-FR29 | All AI-generated reports SHALL include a disclosure that results are probabilistic and based on the user's self-reported data |
| DA-FR30 | Users SHALL be able to flag individual bias findings within a Bias Report as inaccurate, providing an optional free-text reason |
| DA-FR30a | Flagged findings SHALL be used to adjust **per-user prompt context** in future report generations — the system SHALL include a summary of previously flagged biases in the LLM prompt to signal known false positives |
| DA-FR30b | Aggregated anonymized flag data (bias type + flag reason category) SHALL be reviewed quarterly by the product team to improve the **Cognitive Bias Taxonomy** (Appendix 10.2). No raw user text SHALL be used in this process |

### 4.5 Timeline View

**Description:** A chronological visualization of the user's decision history.

| ID | Requirement |
|----|-------------|
| DA-FR31 | The Timeline View SHALL display all Decision Records in reverse-chronological order by default |
| DA-FR32 | Each timeline entry SHALL display: title, date, domain tag, outcome status (pending / positive / negative / mixed), and confidence level at time of decision |
| DA-FR33 | Users SHALL be able to filter the timeline by domain tag, date range, outcome status, and custom tags |
| DA-FR34 | Clicking a timeline entry SHALL open the full Decision Record in a detail panel |
| DA-FR35 | The timeline SHALL visually differentiate locked (time-capsule) fields from supplementary notes |

### 4.6 Archive & Search

| ID | Requirement |
|----|-------------|
| DA-FR36 | The system SHALL provide full-text search across all Decision Record fields |
| DA-FR37 | Search results SHALL be ranked by relevance and filterable by domain, date, and outcome status |
| DA-FR38 | The system SHALL support structured queries, e.g., filtering for decisions with Confidence Level > 8 that had negative outcomes |
| DA-FR39 | Search results SHALL highlight matching terms within the record preview |

### 4.7 Sharing & Collaboration

| ID | Requirement |
|----|-------------|
| DA-FR40 | Pro users SHALL be able to share individual Decision Records with up to 5 named collaborators via email invite |
| DA-FR41 | Collaborators SHALL be able to view the Decision Record and leave timestamped comments |
| DA-FR42 | Collaborators SHALL NOT be able to edit or delete any part of the Decision Record |
| DA-FR43 | Sharing SHALL be revocable by the record owner at any time |
| DA-FR44 | Shared records SHALL display the owner's display name but SHALL NOT expose account-level information |
| DA-FR44a | Collaborators SHALL receive an **in-app and email notification** when the record owner adds an Outcome Update to a shared Decision Record |
| DA-FR44b | The shared record view SHALL display a **revision history** of all Outcome Updates (date added, outcome rating) visible to collaborators in chronological order |
| DA-FR44c | Collaborators SHALL be able to submit a **Check-In Request** to the record owner — a notification prompting the owner to update the outcome when the collaborator believes the predicted timeframe has passed. The owner MAY ignore such requests |

### 4.8 Export & Import

| ID | Requirement |
|----|-------------|
| DA-FR45 | Users SHALL be able to export individual Decision Records or their entire archive as PDF, Markdown, or JSON |
| DA-FR46 | Exported JSON SHALL follow a documented schema for portability |
| DA-FR47 | Power Users SHALL be able to bulk import historical decisions via a CSV or JSON template |
| DA-FR48 | The system SHALL validate imported records against required field schema and report errors before committing |
| DA-FR49 | Imported records SHALL be labeled "Imported" and SHALL NOT be subject to the time-lock restriction |
| DA-FR49a | The system SHALL provide a downloadable **Import Template** (CSV and JSON formats) with field descriptions, validation rules, and example rows |

### 4.9 Reminders & Notifications

| ID | Requirement |
|----|-------------|
| DA-FR50 | Users SHALL be able to configure weekly or monthly prompts reminding them to log pending decisions |
| DA-FR51 | Check-in reminders for outcome updates SHALL be delivered via push notification (mobile) and email |
| DA-FR52 | Users SHALL be able to customize notification frequency per Decision Record |
| DA-FR53 | A "Decisions this week" weekly digest SHALL be available as an opt-in email summary |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement |
|----|-------------|
| DA-NFR01 | Web page load SHALL be under 2 seconds on 50 Mbps |
| DA-NFR02 | Mobile app initial load SHALL be under 3 seconds on LTE |
| DA-NFR03 | Archive search results SHALL return within 500ms for archives up to 10,000 records |
| DA-NFR04 | AI report generation SHALL complete within 90 seconds |
| DA-NFR05 | Non-AI API responses SHALL be under 300ms at p95 |

### 5.2 Reliability

| ID | Requirement |
|----|-------------|
| DA-NFR06 | System uptime SHALL be 99.9% (excluding scheduled maintenance) |
| DA-NFR07 | Decision Records SHALL be auto-saved as drafts every 30 seconds to prevent data loss |
| DA-NFR08 | The system SHALL implement automated DB failover with RPO < 1 minute |
| DA-NFR09 | Mobile app SHALL support offline decision capture with sync upon reconnection |
| DA-NFR09a | In the event of an **offline/online sync conflict** (e.g., a draft was modified on two devices), the system SHALL present both versions to the user side-by-side and require explicit selection before committing. Automatic silent merging SHALL NOT occur for core Decision Record fields |

### 5.3 Security

| ID | Requirement |
|----|-------------|
| DA-NFR10 | All data in transit SHALL use TLS 1.3+ |
| DA-NFR11 | All data at rest SHALL use AES-256 encryption |
| DA-NFR12 | Decision Records SHALL be encrypted at the record level using per-record derived encryption keys (e.g., AES-256-GCM with keys derived from a master key via HKDF) |
| DA-NFR12a | File attachments stored in AWS S3 SHALL be encrypted using the **same per-record derived key** as their parent Decision Record, using S3 SSE-C (customer-provided key). The plaintext key SHALL never be stored at rest; only the key derivation material SHALL be persisted |
| DA-NFR12b | The key derivation architecture SHALL be documented in a separate **Encryption Design Document** prior to implementation, reviewed by a security-qualified engineer |
| DA-NFR13 | The system SHALL comply with OWASP Top 10 |
| DA-NFR14 | LLM API keys SHALL be stored in a secrets manager |
| DA-NFR15 | All authentication events SHALL be logged with IP and timestamp |
| DA-NFR16 | Rate limiting: max 200 API requests/minute per authenticated user |

### 5.4 Privacy & Compliance

| ID | Requirement |
|----|-------------|
| DA-NFR17 | The system SHALL be GDPR and CCPA compliant |
| DA-NFR18 | Decision Records SHALL NEVER be used to train third-party LLMs without explicit user consent |
| DA-NFR19 | PII SHALL be stripped from LLM prompts before transmission to third-party providers |
| DA-NFR20 | Users SHALL be able to request data export within 30 days |
| DA-NFR21 | Account and data deletion SHALL complete within 72 hours of request |
| DA-NFR22 | The system SHALL provide a transparent data usage policy explaining exactly what is sent to LLM providers and why |

### 5.5 Accessibility & Usability

| ID | Requirement |
|----|-------------|
| DA-NFR23 | The web app SHALL comply with WCAG 2.1 Level AA |
| DA-NFR24 | The system SHALL support keyboard-only navigation for all core flows |
| DA-NFR25 | All interactive elements SHALL have ARIA labels |
| DA-NFR26 | The system SHALL support Chrome, Firefox, Safari, Edge (latest 2 versions) |
| DA-NFR27 | The mobile app SHALL support iOS 16+ and Android 12+ |
| DA-NFR28 | The Decision Capture form SHALL be completable in under 5 minutes for a typical entry |

---

## 6. External Interface Requirements

### 6.1 Third-Party Integrations

| Integration | Purpose |
|-------------|---------|
| **NVIDIA NIM API** | Primary LLM — `nvidia/llama-3.1-nemotron-70b-instruct` for bias reports, calibration, and synthesis; `meta/llama-3.1-8b-instruct` for lightweight normalization pass |
| **Mistral API** | Fallback LLM — `mistral-large-latest`; used when NVIDIA NIM is unavailable or rate-limited |
| **Clerk** | Unified auth platform — email/password, Google OAuth, Microsoft OAuth, MFA (TOTP), session management. Free tier: 10,000 MAU. Keys: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| SendGrid | Transactional email and weekly digest (free tier: 100 emails/day) |
| Stripe | Subscription billing (pay-per-transaction, no monthly fee) |
| **Cloudflare R2** | File attachment storage — S3-compatible API. Free tier: 10 GB storage, 1M writes/month |
| Firebase Cloud Messaging | Mobile push notifications (free, no limits) |
| **Axiom** | Monitoring and log aggregation — free tier: 500 GB/month, 30-day retention |
| Sentry | Error tracking (free tier: 5K errors/month) |

### 6.2 API Access (Power Tier)

- REST API with OAuth 2.0 authorization
- Endpoints for: creating decision records, fetching records, adding outcome updates, retrieving analysis reports
- Rate limit: 1,000 requests/day per API key
- Full OpenAPI 3.0 specification published at `/docs`

---

## 7. Data Requirements

### 7.1 Core Entities

```
User                    DecisionRecord
──────────────          ────────────────────────────────────
id                      id
email                   user_id
display_name            title
tier                    summary (LOCKED after save)
created_at              context (LOCKED)
                        alternatives (LOCKED)
                        chosen_option (LOCKED)
                        reasoning (LOCKED)
OutcomeUpdate           values (optional)
──────────────          uncertainties (optional)
decision_id             predicted_outcome (optional)
user_id                 predicted_timeframe (optional)
what_happened           confidence_level (1–10)
outcome_rating          domain_tag
lessons_learned         custom_tags (array)
created_at              attachments (array)
                        supplementary_notes (editable)
                        created_at
                        is_imported (boolean)

BiasReport              CollaboratorShare
──────────────          ──────────────────
user_id                 decision_id
generated_at            shared_with_user_id
biases (JSONB)          shared_at
calibration_score       is_active
recurring_assumptions
flagged_by_user
```

### 7.2 Retention Policy

| Data Type | Retention |
|-----------|-----------|
| All Decision Records (Pro/Power) | Indefinite |
| Free tier records | Until account upgrade or deletion |
| LLM prompt/response logs (PII-stripped) | 12 months |
| Audit logs | 7 years |
| Deleted user data | Purged within 72 hours |

---

## 8. System Constraints

- AI pattern analysis requires a minimum of 10 Decision Records to generate meaningful Bias Reports
- The time-lock mechanism on core fields is irreversible by design; this is a core product principle, not a technical limitation
- Offline mobile mode supports capture only; AI analysis requires connectivity
- Calibration scores are only meaningful after 5+ closed decisions with predictions set

---

## 9. Assumptions & Dependencies

| Dependency | Risk / Fallback |
|------------|----------------|
| NVIDIA NIM API | Fallback to Mistral API (`mistral-large-latest`) |
| Mistral API | Queue AI jobs; display in-app "Analysis temporarily unavailable" message with estimated retry time |
| Clerk | Auth is unavailable; display maintenance page. No silent fallback — auth is a hard dependency |
| Cloudflare R2 | Disable file attachment uploads; existing attachments served from CDN cache |
| Stripe | Block new paid signups; existing subscribers unaffected |
| Firebase Cloud Messaging | Email fallback via SendGrid for all push notifications |
| SendGrid | In-app notification banner fallback |

### Key Assumptions
- Users engage in good faith; the platform's value is directly proportional to input honesty
- Bias detection is probabilistic and suggestive, not diagnostic
- A/B testing will be needed to optimize the Decision Capture form UX for completion rate

---

## 10. Appendix

### 10.1 AI Analysis Architecture — Decision Archaeology

The AI layer processes decision archives using a multi-pass prompting strategy:

| Pass | Purpose |
|------|---------|
| 1. Normalization | Standardize free-text fields into structured representations |
| 2. Assumption Extraction | Identify implicit assumptions embedded in reasoning fields |
| 3. Bias Detection | Match reasoning patterns against a cognitive bias taxonomy |
| 4. Calibration Analysis | Compare predicted vs. actual outcomes across closed decisions |
| 5. Synthesis | Generate human-readable Bias Report with specific, referenced evidence |

### 10.2 Cognitive Bias Taxonomy (v1)

The initial bias detection model covers:

| Bias | Pattern Signal |
|------|---------------|
| Confirmation Bias | Alternatives section consistently lists options already rejected before analysis |
| Overconfidence | Confidence Level ≥ 8 combined with negative outcomes at above-average rate |
| Planning Fallacy | Predicted timeframes consistently shorter than actual outcome timing |
| Sunk Cost Fallacy | Reasoning references prior investment as a primary justification |
| Availability Heuristic | Context sections reference recent, vivid events disproportionately |
| Status Quo Bias | Chosen option disproportionately matches the "default" framing in context |

### 10.3 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-05 | Initial draft |
| 1.1.0 | 2026-03-05 | Added: 5-minute time-lock edit window (DA-FR11a, DA-FR11b); Onboarding & Cold-Start requirements (DA-FR21a–21d); Calibration Score precise definition (DA-FR25 revised); Collaboration enhancements (DA-FR44a–44c); Bias feedback loop mechanism (DA-FR30a–30b); Import template requirement (DA-FR49a); Attachment encryption architecture (DA-NFR12a–12b); Offline sync conflict resolution (DA-NFR09a) |
| 1.2.0 | 2026-03-07 | Infrastructure alignment: replaced Anthropic/OpenAI with NVIDIA NIM + Mistral; replaced Apple OAuth with Microsoft OAuth; replaced AWS S3 with Cloudflare R2; replaced Datadog with Axiom |
| 1.3.0 | 2026-03-07 | Auth: replaced direct Google/Microsoft OAuth with Clerk as unified auth provider; updated DA-FR02, DA-FR04, DA-FR05, DA-FR06, Section 6.1, and Section 9 |

---

## 11. Open Design Questions

The following items are flagged for resolution before development begins:

| # | Question | Owner | Target Resolution |
|---|----------|-------|-------------------|
| OD-01 | What is the UX treatment for the Correction Request flow (DA-FR11b)? Should corrections require admin approval or be self-serve with audit trail? | Product | Pre-design sprint |
| OD-02 | Should the Calibration Score "Aligned" definition be user-configurable (i.e., can the user tighten or widen the range)? | Product | Beta feedback |
| OD-03 | Key derivation material storage: database column vs. dedicated secrets manager (see DA-NFR12)? | Security / Engineering | Encryption Design Doc |
| OD-04 | Should Bias Reports be generated asynchronously and cached, or generated on-demand each time? Cost and latency implications differ significantly | Engineering | Architecture review |
| OD-05 | What is the onboarding email sequence opt-out mechanism, and does it count toward GDPR communication consent? | Legal / Product | Pre-launch |

