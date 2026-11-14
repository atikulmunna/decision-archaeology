# Architecture

Decision Archaeology is one Next.js 16 App Router application deployed on Vercel. PostgreSQL (Neon) holds the data through Prisma 7 and its `pg` adapter, Clerk handles sign-in, and a small set of external services do the rest: OpenRouter for AI, Resend for email, Upstash QStash and a Vercel cron for background work, and Cloudflare R2 for attachments.

Back to the [README](../README.md), or see the [case study](https://decision-archaeology.vercel.app/how-it-works).

## Routes

| Where | What |
| --- | --- |
| `/`, `/how-it-works` | The public landing page and the engineering case study |
| `/demo/...` (`src/app/(demo)`) | The read-only demo archive, with the guided tour carried in `?tour=N` |
| `/decisions`, `/notes`, `/calibration`, `/ai`, `/shared` (`src/app/(dashboard)`) | The signed-in app |
| `src/app/api/...` | Route handlers: decisions and their outcomes, corrections, sharing, the Devil's Advocate, letters, revisits and check-ins; notes; calibration; AI reports; export and import; jobs; webhooks |

`src/proxy.ts` protects every route except the ones listed in `src/lib/public-routes.ts`: the landing page, the case study and its preview images, sign-in and sign-up, the demo, the Clerk webhook and the job endpoints. Job endpoints are called without a session, so each one checks its own secret or signature.

## The demo

The demo is Rowan Hale's archive, built from a fictional seed in `src/lib/demo/` with a fixed clock (`DEMO_NOW`), so it never changes between visits. It renders the same view components as the signed-in app. Links go through an `AppRoutes` object (`APP_ROUTES` or `DEMO_ROUTES`), so a component never needs to know which archive it is in. Demo pages never import Prisma, and a test enforces that.

## Data model

| Model | Holds |
| --- | --- |
| `User` | The account, synced from Clerk by webhook |
| `DecisionRecord` | One decision: the sealed fields, the seal hash and time, the catalog number |
| `OutcomeUpdate` | Each outcome logged later, never overwriting an earlier one |
| `AssumptionReview` | A verdict and note on one sealed assumption, keyed by its text hash |
| `Forecast` | A yes or no claim with a probability, a resolve-by date and its resolution |
| `CorrectionRequest` | A typo correction after sealing, with its audit trail |
| `CollaboratorShare`, `CollaboratorComment` | Sharing a decision and discussing it |
| `BiasReport` | An AI pattern report across the archive |
| `FieldNote` | A quick journal entry, optionally linked to one decision |
| `ChallengeQuestion`, `ChallengeAttempt` | The Devil's Advocate questions, and the daily limit on asking |
| `Letter` | A letter to your future self, hidden until its day |
| `Revisit`, `CheckInReminder` | Guided revisits and the next scheduled check-in |

## The client and server boundary

Server components read the data and resolve everything a page needs into plain values: links, dates formatted in UTC, a letter's state without its text. Client components receive only that plain data, never a function. For example, the strata view's server half resolves each decision's link before handing the drawing to the client half. Boundary tests capture the props that cross and fail if any of them is a function.

## Design system

The "Field Archive" look lives in `src/lib/design/tokens.ts` as light and dark tokens, exposed to Tailwind CSS 4. Components use tokens only; a guard test rejects raw colours and palette classes anywhere else.

## Background work

- A daily Vercel cron calls `/api/jobs/daily` with `CRON_SECRET`. It announces letters that opened and check-ins that came due, claiming each item before sending and releasing it if the email fails.
- QStash runs AI pattern reports through `/api/jobs/generate-report`, verified by signature.
