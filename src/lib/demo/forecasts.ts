import type { ForecastResolution } from '@/lib/forecasting'

/**
 * Rowan's forecasts, keyed by seed. `resolveByDays` counts from the day the
 * decision was sealed; `resolvedDaysAgo` counts back from DEMO_NOW. The set is
 * fixed so the demo calibration page shows known numbers (a test pins them):
 * 60 scored forecasts with a Brier score of 11.3875 / 60, one Can't tell, and
 * nine still open, three of them due.
 */
export type DemoForecastSeed = {
  statement: string
  probability: number
  resolveByDays: number
  resolution?: ForecastResolution
  resolvedDaysAgo?: number
}

const happened = (statement: string, probability: number, resolveByDays: number, resolvedDaysAgo: number): DemoForecastSeed => ({
  statement,
  probability,
  resolveByDays,
  resolution: 'HAPPENED',
  resolvedDaysAgo,
})
const didnt = (statement: string, probability: number, resolveByDays: number, resolvedDaysAgo: number): DemoForecastSeed => ({
  statement,
  probability,
  resolveByDays,
  resolution: 'DIDNT',
  resolvedDaysAgo,
})
const open = (statement: string, probability: number, resolveByDays: number): DemoForecastSeed => ({
  statement,
  probability,
  resolveByDays,
})

export const DEMO_FORECASTS: Record<string, DemoForecastSeed[]> = {
  'halcyon-platform-team': [
    happened('I ship my first change to the deploy pipeline', 80, 45, 500),
    happened('I still prefer platform work to payments', 70, 180, 420),
    didnt('I ask to move back to payments', 10, 365, 170),
  ],
  'emergency-fund': [
    happened('The buffer reaches six months of expenses', 85, 200, 330),
    didnt('I dip into the buffer for something that is not an emergency', 15, 365, 150),
    didnt('I keep investing a little every month while I save', 60, 180, 335),
  ],
  'half-marathon': [
    didnt('I make it to the start line', 95, 63, 440),
    didnt('I finish in under two hours', 85, 63, 440),
    didnt('I lose interest in running before race day', 20, 63, 440),
  ],
  'wedding-speech': [
    happened('I finish a full draft two weeks before the wedding', 90, 20, 475),
    happened('Someone asks me for a copy of the speech', 75, 35, 455),
    didnt('I freeze or lose my place during the speech', 35, 35, 453),
  ],
  'open-source-side-project': [
    happened('The project passes 300 stars', 30, 365, 300),
    happened('At least one outside contributor sticks around', 65, 180, 300),
    didnt('A company offers to buy it anyway', 10, 365, 100),
  ],
  'negotiate-equity': [
    happened('Northwind raises another round within eighteen months', 50, 540, 250),
    didnt('I regret the lower salary within a year', 25, 365, 85),
    didnt('I can sell some of the options within a year', 15, 365, 85),
  ],
  'northwind-offer': [
    happened('I own a major part of the product within a year', 80, 365, 200),
    happened('I am glad I took the role six months in', 90, 180, 270),
    didnt('My weekly hours stay under fifty', 70, 180, 200),
  ],
  'move-across-city': [
    happened('My commute drops under twenty minutes', 95, 30, 420),
    didnt('I see my old friends at least every other week', 80, 120, 290),
    happened('I use the saved time for exercise most weeks', 60, 120, 290),
  ],
  'start-therapy': [
    happened('I go to at least ten sessions in six months', 70, 180, 220),
    happened('I sleep through most nights within six months', 40, 180, 230),
    didnt('I stop after the first month', 30, 30, 360),
  ],
  'on-call-redesign': [
    happened('The new rotation ships within six weeks', 90, 42, 330),
    didnt('Weekend pages drop by more than half', 75, 120, 250),
    happened('At least six people share the rotation', 85, 90, 270),
  ],
  'pottery-class': [
    happened('I go to at least eight of the ten classes', 80, 75, 280),
    didnt('I make something I would give as a gift', 20, 75, 250),
    happened('Thursday evenings feel calmer than the rest of the week', 65, 75, 250),
  ],
  'lend-friend-deposit': [
    happened('Sam makes the first repayment on time', 90, 45, 300),
    happened('Sam is on schedule at the halfway point', 80, 180, 160),
    didnt('Money comes up awkwardly between us', 30, 180, 158),
  ],
  'rewrite-billing': [
    didnt('The rewrite ships within six weeks', 80, 42, 250),
    didnt('The switch goes out with no customer-facing incident', 70, 120, 190),
    happened('Every customer moves to the new service', 95, 180, 190),
  ],
  'index-funds': [
    happened('The monthly transfer runs every month for six months', 95, 180, 120),
    happened('I check the balance less than once a month', 45, 180, 120),
    didnt('I sell during a dip', 10, 180, 118),
  ],
  'no-work-after-ten': [
    didnt('I keep the cutoff every weeknight for two months', 75, 60, 200),
    didnt('I sleep noticeably better within a month', 60, 30, 200),
    didnt('Someone at work complains about the cutoff', 10, 90, 185),
  ],
  'decline-manager-track': [
    happened('I do not regret it six months later', 85, 180, 130),
    didnt('The role is offered to me again within four months', 40, 120, 125),
    happened('I stay hands-on for the rest of my time at Northwind', 70, 90, 130),
  ],
  'exercise-options': [
    happened('I exercise every vested option before the window closes', 90, 30, 210),
    didnt('Northwind announces a sale or another round within six months', 40, 180, 35),
    didnt('The tax bill comes in higher than I planned', 15, 120, 98),
  ],
  'cofound-fernhill': [
    happened('We sign a paying customer within four months', 70, 120, 115),
    happened('Our runway still covers a full year at the six-month mark', 80, 180, 30),
    happened('We have more than three paying clinics within five months', 25, 150, 30),
  ],
  'equal-equity-split': [
    didnt('We finish the legal paperwork within two weeks', 90, 14, 150),
    happened('The split does not come up as a disagreement within three months', 75, 90, 60),
    didnt('One of us asks to revisit the split within four months', 30, 120, 50),
  ],
  'weekly-parents-call': [
    happened('We keep the call going for three months', 60, 90, 50),
    didnt('We do not miss a single Sunday in the first two months', 65, 60, 50),
    didnt('My mother asks to move the call to a different day', 35, 60, 50),
  ],
  'first-customer-discount': [
    { statement: 'The customer would have signed at full price', probability: 30, resolveByDays: 60, resolution: 'VOID', resolvedDaysAgo: 55 },
    open('The case study is published within ninety days', 70, 90),
    open('The customer renews for a second year', 80, 730),
  ],
  'fernhill-podcast': [
    open('We publish six episodes in the first three months', 60, 84),
    open('An episode passes 500 listens', 20, 180),
    open('A listener becomes a paying customer', 40, 270),
  ],
  'generalist-first-hire': [
    open('The offer is accepted within three weeks', 75, 21),
    open('The new hire ships to production in their first week', 65, 60),
  ],
  'one-coffee-a-day': [
    open('I stay at one cup a day for a month', 70, 30),
    open('My afternoon headaches stop within two weeks', 50, 14),
  ],
}
