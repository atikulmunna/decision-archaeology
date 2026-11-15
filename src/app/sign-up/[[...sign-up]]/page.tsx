import { SignUp } from '@clerk/nextjs'
import { AuthCardPlaceholder } from '@/components/shell/AuthCardPlaceholder'
import { AuthFailedNotice } from '@/components/shell/AuthFailedNotice'
import { AuthLayout } from '@/components/shell/AuthLayout'

export const metadata = {
  title: 'Sign Up | Decision Archaeology',
}

export default function SignUpPage() {
  return (
    <AuthLayout heading="Start your archive.">
      {/* Clerk's own card width (25rem, never wider than the screen less 2.5rem), so the placeholder matches it.
          The group lets the failure notice hide the placeholder. */}
      <div className="group flex w-[25rem] max-w-[calc(100vw-2.5rem)] shrink-0 flex-col gap-4">
        <SignUp fallback={<AuthCardPlaceholder mode="sign-up" />} />
        <AuthFailedNotice mode="sign-up" />
      </div>
    </AuthLayout>
  )
}
