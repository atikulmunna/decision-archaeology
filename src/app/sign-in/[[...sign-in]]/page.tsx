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
      <div className="flex w-full max-w-[400px] flex-col gap-4">
        <SignIn fallback={<AuthCardPlaceholder mode="sign-in" />} />
        <AuthFailedNotice mode="sign-in" />
      </div>
    </AuthLayout>
  )
}
