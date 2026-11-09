import { SignUp } from '@clerk/nextjs'
import { AuthLayout } from '@/components/shell/AuthLayout'

export const metadata = {
  title: 'Sign Up | Decision Archaeology',
}

export default function SignUpPage() {
  return (
    <AuthLayout heading="Start your archive.">
      <SignUp />
    </AuthLayout>
  )
}
