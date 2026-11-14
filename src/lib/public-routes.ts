/** Routes that render without signing in. The proxy protects everything else. */
// The case study and the link preview images are public so crawlers can read them without a session.
// Job routes are called without a Clerk session (QStash, Vercel cron); each checks its own signature or secret.
export const PUBLIC_ROUTES = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/demo(.*)',
  '/how-it-works(.*)',
  '/opengraph-image(.*)',
  '/api/webhooks/(.*)',
  '/api/jobs/(.*)',
] as const
