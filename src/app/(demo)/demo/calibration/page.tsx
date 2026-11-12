import { CalibrationView } from '@/components/calibration/CalibrationView'
import { summarizeCalibration } from '@/lib/calibration'
import { getDemoCalibrationRecords } from '@/lib/demo/queries'
import { DEMO_NOW } from '@/lib/demo/clock'
import { DEMO_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Demo calibration | Decision Archaeology' }

export default function DemoCalibrationPage() {
  return <CalibrationView eyebrow="Demo archive" data={summarizeCalibration(getDemoCalibrationRecords(), DEMO_NOW)} routes={DEMO_ROUTES} />
}
