# Vercel Deployment Checklist

This project is ready for a staging deployment on Vercel. Use this guide to set up a safe preview/production path without copying secrets into the repository.

## 1. Create the Vercel Project

1. Push the repository to GitHub.
2. In Vercel, choose `Add New` -> `Project`.
3. Import this repository.
4. Keep the framework preset as `Next.js`.
5. Leave the default build settings unless you have a specific reason to change them.

Expected commands:

- Install: `npm install`
- Build: `npm run build`

## 2. Configure Environment Variables

Add the following values in Vercel Project Settings -> Environment Variables.

### Required now

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NVIDIA_API_KEY`
- `MISTRAL_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT_URL`
- `R2_BUCKET_NAME`

### Optional for the current app

- `R2_PUBLIC_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FIREBASE_SERVICE_ACCOUNT`
- `NEXT_PUBLIC_SENTRY_DSN`
- `AXIOM_API_KEY`
- `AXIOM_DATASET`
- `JWT_SECRET`
- `MASTER_ENCRYPTION_KEY`

## 3. Environment Mapping

Set variables per environment instead of assuming one set of values works everywhere.

- `Production`: your real public domain and production secrets
- `Preview`: staging-safe values for branch deploys
- `Development`: optional, if you want Vercel CLI to pull envs locally

Important:

- `NEXT_PUBLIC_APP_URL` must match the deployed base URL for that environment
- environment variable changes only apply to the next deployment

## 4. Clerk Setup

In Clerk:

1. Create a production instance when you are ready for real production keys.
2. Add the production/published domain in Clerk Domains.
3. Update OAuth credentials for production if you use social login.
4. Add the webhook endpoint:

`https://YOUR_DOMAIN/api/webhooks/clerk`

Clerk webhook URLs must be exact:

- protocol must match
- domain must match
- path must match

## 5. Resend Setup

1. Add `RESEND_API_KEY` to Vercel.
2. Use a verified sender/domain for `RESEND_FROM_EMAIL`.
3. Test:
   - collaborator invite emails
   - reminder emails
   - outcome update emails

## 6. Upstash QStash Setup

1. Add:
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
2. Confirm `NEXT_PUBLIC_APP_URL` points at the deployed environment.
3. Test:
   - reminder job delivery
   - bias report job delivery

## 7. Cloudflare R2 Setup

1. Add:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_ENDPOINT_URL`
   - `R2_BUCKET_NAME`
2. Optionally add `R2_PUBLIC_URL` if you later switch to public asset serving.
3. Test attachment upload, listing, and deletion on the deployed app.

## 8. Database and Webhooks

Before calling the deployment healthy:

1. Sign up or sign in through Clerk on the deployed URL.
2. Confirm the Clerk webhook successfully creates the user in your app database.
3. If sign-in works but the app user is missing, check:
   - webhook URL
   - webhook signing secret
   - deployment logs

## 9. Recommended Staging Smoke Test

Run this after the first deploy:

1. Sign in
2. Create a draft
3. Resume the draft
4. Finalize a decision
5. Confirm the lock window behavior
6. Upload an attachment
7. Add an outcome update
8. Share a decision
9. Open the shared record
10. Generate a bias report
11. Export JSON/Markdown
12. Download JSON/CSV import templates
13. Import a test archive on a Power-tier account

## 10. Go-Live Notes

Before public launch:

- use production Clerk keys, not test keys
- verify the final production domain in Clerk
- verify Resend sending domain
- verify QStash callback delivery on the production URL
- verify attachment uploads against the production R2 bucket
- keep `.env.local` local only and never commit real secrets
