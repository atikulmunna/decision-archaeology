import { summarizeCalibration } from '@/lib/calibration'
import { DEMO_NOW } from '@/lib/demo/clock'
import {
  demoLetterPeek,
  getDemoAssumptionReviews,
  getDemoCalibrationRecords,
  getDemoDecision,
  listDemoStrataRecords,
} from '@/lib/demo/queries'
import { DEMO_ROUTES } from '@/lib/routes'
import { buildSealPayload, sealVersion } from '@/lib/seal'
import { layoutStrata } from '@/lib/strata'

/** Rowan's Northwind decision, DA-0007: the record the case study shows live. */
export const CASE_STUDY_DECISION_ID = 'demo-0007'

/** Everything the case study renders, read from the demo archive at the fixed demo clock. Server only. */
export function caseStudyData() {
  const record = getDemoDecision(CASE_STUDY_DECISION_ID)
  if (!record) throw new Error(`The case study decision ${CASE_STUDY_DECISION_ID} is missing from the demo`)
  const { brier, scored } = summarizeCalibration(getDemoCalibrationRecords(), DEMO_NOW).forecasts
  return {
    record,
    reviews: getDemoAssumptionReviews(record.id),
    revisit: {
      letter: demoLetterPeek(record.id),
      due: false,
      lastRevisitedAt: null,
      nextCheckIn: null,
      revisitHref: `${DEMO_ROUTES.decision(record.id)}/revisit`,
    },
    payload: buildSealPayload(record),
    version: sealVersion(record),
    brier,
    scored,
    strata: layoutStrata(listDemoStrataRecords({}).records, { year: null, now: DEMO_NOW }),
  }
}
