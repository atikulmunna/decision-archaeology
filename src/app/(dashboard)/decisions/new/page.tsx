import { DecisionCaptureForm } from '@/components/decisions/DecisionCaptureForm'

export const metadata = {
  title: 'New Decision — Decision Archaeology',
}

type SearchParams = Promise<{ draftId?: string }>

export default async function NewDecisionPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Decision</h1>
        <p className="mt-1 text-sm text-gray-500">
          Capture your reasoning now, before hindsight rewrites it.
        </p>
      </div>
      <DecisionCaptureForm initialDraftId={params.draftId} />
    </div>
  )
}
