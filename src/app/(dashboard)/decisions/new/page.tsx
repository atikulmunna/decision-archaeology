import { auth } from '@clerk/nextjs/server'
import { DecisionCaptureForm } from '@/components/decisions/DecisionCaptureForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { nextCatalogNumber } from '@/lib/catalog'
import { getMaxCatalogNumber } from '@/lib/catalog-db'
import { getOrCreateDbUser } from '@/lib/db-user'

export const metadata = {
  title: 'New Decision | Decision Archaeology',
}

type SearchParams = Promise<{ draftId?: string }>

export default async function NewDecisionPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const { userId } = await auth()
  const dbUser = userId ? await getOrCreateDbUser(userId) : null
  const upcomingCatalogNumber = nextCatalogNumber(dbUser ? await getMaxCatalogNumber(dbUser.id) : null)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="New record"
        title="Log a decision"
        meta="Capture your reasoning now, before hindsight rewrites it"
      />
      <DecisionCaptureForm initialDraftId={params.draftId} upcomingCatalogNumber={upcomingCatalogNumber} />
    </div>
  )
}
