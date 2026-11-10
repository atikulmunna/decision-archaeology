/**
 * Path sets for the signed-in app and the public demo. Views read links from
 * one of these instead of hard-coding paths, so the same view renders in both.
 */

export type AppRoutes = {
  archive: string
  decision: (id: string) => string
  calibration: string
  reports: string
  report: (id: string) => string
}

export const APP_ROUTES: AppRoutes = {
  archive: '/decisions',
  decision: (id) => `/decisions/${id}`,
  calibration: '/calibration',
  reports: '/ai/reports',
  report: (id) => `/ai/reports/${id}`,
}

export const DEMO_ROUTES: AppRoutes = {
  archive: '/demo',
  decision: (id) => `/demo/decisions/${id}`,
  calibration: '/demo/calibration',
  reports: '/demo/reports',
  report: (id) => `/demo/reports/${id}`,
}

/** A masthead link. `prefixes` lists the paths whose sub-pages also mark it active (defaults to its own href). */
export type NavLink = { href: string; label: string; prefixes?: readonly string[] }

export const APP_NAV_LINKS: readonly NavLink[] = [
  { href: '/decisions', label: 'Archive' },
  { href: '/calibration', label: 'Calibration' },
  { href: '/ai/reports', label: 'Reports' },
]

/** `/demo` prefixes every demo route, so Archive is active only on itself and on decision pages. */
export const DEMO_NAV_LINKS: readonly NavLink[] = [
  { href: '/demo', label: 'Archive', prefixes: ['/demo/decisions'] },
  { href: '/demo/calibration', label: 'Calibration' },
  { href: '/demo/reports', label: 'Reports' },
]
