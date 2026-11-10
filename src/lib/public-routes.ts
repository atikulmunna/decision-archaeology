/** Routes that render without signing in. The proxy protects everything else. */
export const PUBLIC_ROUTES = ['/', '/sign-in(.*)', '/sign-up(.*)', '/demo(.*)', '/api/webhooks/(.*)'] as const
