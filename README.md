# Decision Archaeology

**Decision Archaeology** is a structured decision logging platform that captures the full reasoning context of decisions at the time they are made. It tracks prediction accuracy against actual outcomes, detects cognitive bias patterns across a user's decision history using LLM analysis, and surfaces calibration metrics broken down by life domain.

---

## What It Does

- **Time-locked decision capture** — Log decisions with full reasoning context. Core fields are locked after saving to preserve the authentic record before hindsight sets in.
- **Outcome tracking** — Compare what you predicted to what actually happened.
- **AI pattern analysis** — Identify recurring cognitive biases (overconfidence, planning fallacy, sunk cost, etc.) across your decision history.
- **Calibration scoring** — Track how well your predictions align with reality over time, broken down by life domain.
- **Timeline & archive** — A searchable, filterable history of every decision you've ever logged.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | Next.js (App Router) |
| Mobile | React Native |
| Backend API | Node.js / TypeScript |
| Database | PostgreSQL (Neon) |
| Cache / Queue | Redis (Upstash) |
| Auth | Clerk |
| AI (Primary) | NVIDIA NIM — `llama-3.1-nemotron-70b-instruct` |
| AI (Fallback) | Mistral API — `mistral-large-latest` |
| File Storage | Cloudflare R2 |
| Email | SendGrid |
| Push Notifications | Firebase Cloud Messaging |
| Payments | Stripe |
| Error Tracking | Sentry |
| Logging | Axiom |

---

## Project Status

🚧 **In active development** — see [TASKS.md](./TASKS.md) for the implementation roadmap.

---

## Getting Started

> Setup instructions will be added in Phase 1 once the project scaffold is complete.

---

## License

MIT
