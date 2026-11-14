# Testing

Three layers keep the app honest: fast unit and component tests, guards that scan the source, and smoke tests that drive a production build in a real browser.

Back to the [README](../README.md), or see the [case study](https://decision-archaeology.vercel.app/how-it-works), whose test counts are produced from this suite at build time.

## Unit and component tests

Vitest with jsdom and Testing Library, in `src/__tests__/`:

- `lib/`: the pure modules, such as the seal payloads (with pinned hashes for every version), forecasting maths, the strata layout, the tour and the letter rules;
- `api/`: route handlers in a Node environment, with Prisma and external services mocked;
- `components/` and `app/`: components and whole pages, including the demo pages.

Some tests guard the architecture rather than a feature:

- **Boundary tests** capture the props a server component hands to a client component and fail if any of them is a function.
- **The letter privacy scan** reads the source and fails if anything outside the allowed modules reads a letter's text.

## Guards

| Guard | Rule |
| --- | --- |
| `design-guard.test.ts` | Colours come only from the design tokens: no raw hex values or Tailwind palette classes, and icons come from lucide-react |
| `copy-style.test.ts` | No em or en dashes in the source, the docs, the scripts, the README or the licence |
| `wrap-guard.test.ts` | Any element that keeps user whitespace also breaks long words, so a pasted URL never widens a phone screen |

## Smoke tests

Playwright drives the locally installed Chrome (no browser download) against a production build on port 3100:

- the landing page, the case study and the demo archive, notes, calibration and reports pages, at 390 by 844 (dark) and 1280 by 800 (light): each loads, logs no console errors and never scrolls sideways;
- the full guided tour, ending on the case study, plus ending the tour early, and a check that the tour bar never covers the end of a page on a phone;
- the seal on DA-0007: Verify reports a match, and after changing a word it reports a mismatch;
- the link preview images, fetched without signing in.

## Running them

```bash
npm test          # the unit, component and guard tests
npm run e2e       # builds, starts next on port 3100, runs the smoke tests (reuses a server already on 3100)
```

## Recording the media

`npm run record` re-records `docs/media/`: the seal GIF in the README and five screenshots. It is a Playwright script, not a test, and needs a production server first:

```bash
npm run build && npx next start -p 3100
npm run record
```

The GIF frames are decoded in the browser and encoded with `gifenc`, so recording needs no tools beyond the dev dependencies.
