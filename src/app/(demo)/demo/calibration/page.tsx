import { CalibrationView } from '@/components/calibration/CalibrationView'
import { summarizeCalibration } from '@/lib/calibration'
import { getDemoCalibrationRecords } from '@/lib/demo/queries'

export const metadata = { title: 'Demo calibration | Decision Archaeology' }

export default function DemoCalibrationPage() {
  return <CalibrationView eyebrow="Demo archive" data={summarizeCalibration(getDemoCalibrationRecords())} />
}
