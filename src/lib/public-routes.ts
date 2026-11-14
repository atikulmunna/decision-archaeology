/** Routes that render without signing in. The proxy protects everything else. */
// Job routes are called without a Clerk session (QStash, Vercel cron); each checks its own signature or secret.
export const PUBLIC_ROUTES = ['/', '/sign-in(.*)', '/sign-up(.*)', '/demo(.*)', '/api/webhooks/(.*)', '/api/jobs/(.*)'] as const
