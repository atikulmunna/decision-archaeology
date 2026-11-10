import { ReportsListView } from '@/components/ai/ReportsListView'
import { getDemoReports } from '@/lib/demo/report'
import { getDemoCalibrationRecords } from '@/lib/demo/queries'
import { DEMO_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Demo reports | Decision Archaeology' }

export default function DemoReportsPage() {
  return (
    <ReportsListView
      mode="demo"
      routes={DEMO_ROUTES}
      reports={getDemoReports()}
      decisionCount={getDemoCalibrationRecords().length}
    />
  )
}
