import { SignIn } from '@clerk/nextjs'
import { AuthCardPlaceholder } from '@/components/shell/AuthCardPlaceholder'
import { AuthFailedNotice } from '@/components/shell/AuthFailedNotice'
import { AuthLayout } from '@/components/shell/AuthLayout'

export const metadata = {
  title: 'Sign In | Decision Archaeology',
}

export default function SignInPage() {
  return (
    <AuthLayout heading="Pick up where you left off.">
      {/* Clerk's own card width (25rem, never wider than the screen less 2.5rem), so the placeholder matches it.
          The group lets the failure notice hide the placeholder. */}
      <div className="group flex w-[25rem] max-w-[calc(100vw-2.5rem)] shrink-0 flex-col gap-4">
        <SignIn fallback={<AuthCardPlaceholder mode="sign-in" />} />
        <AuthFailedNotice mode="sign-in" />
      </div>
    </AuthLayout>
  )
}
