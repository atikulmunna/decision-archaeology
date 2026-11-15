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
      <div className="flex w-full max-w-[400px] flex-col gap-4">
        <SignUp fallback={<AuthCardPlaceholder mode="sign-up" />} />
        <AuthFailedNotice mode="sign-up" />
      </div>
    </AuthLayout>
  )
}
