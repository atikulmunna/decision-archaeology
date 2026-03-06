# Decision Archaeology

> *Capture the reasoning behind your decisions before hindsight rewrites history.*

**Decision Archaeology** is a personal decision intelligence platform that helps you log the full context of your significant decisions — the information available, the alternatives considered, the uncertainties acknowledged — at the exact moment you make them.

Over time, the system builds a structured, searchable archive of your reasoning history, powered by AI that surfaces cognitive bias patterns, tracks prediction accuracy, and helps you make progressively better decisions.

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
