import { auth } from '@clerk/nextjs/server'
import { Masthead } from '@/components/shell/Masthead'
import { PageContainer } from '@/components/shell/PageContainer'
import { getOrCreateDbUser } from '@/lib/db-user'
import { createTimer } from '@/lib/timing'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const timer = createTimer('page.dashboard.layout')
  const { userId } = await auth()
  const dbUser = userId ? await getOrCreateDbUser(userId) : null
  timer.end({ hasUser: Boolean(dbUser) })

  return (
    <div className="min-h-screen bg-paper">
      <Masthead />
      <main>
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  )
}
