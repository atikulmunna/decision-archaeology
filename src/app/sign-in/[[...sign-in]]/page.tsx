import { SignIn } from '@clerk/nextjs'
import { AuthLayout } from '@/components/shell/AuthLayout'

export const metadata = {
  title: 'Sign In | Decision Archaeology',
}

export default function SignInPage() {
  return (
    <AuthLayout heading="Pick up where you left off.">
      <SignIn />
    </AuthLayout>
  )
}
