import { CalibrationWidget } from '@/components/calibration/CalibrationWidget'
import { PageHeader } from '@/components/ui/PageHeader'
import type { CalibrationData } from '@/lib/calibration'

/** The calibration page body, shared by the signed-in app and the public demo. */
export function CalibrationView({ eyebrow, data }: { eyebrow: string; data: CalibrationData }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={eyebrow} title="Calibration" meta="How accurately your predictions match your actual outcomes" />
      <CalibrationWidget data={data} />
    </div>
  )
}
