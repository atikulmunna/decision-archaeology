import { SignUp } from '@clerk/nextjs'

export const metadata = {
  title: 'Sign Up — Decision Archaeology',
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f4efe6_0%,#f8fafc_40%,#ffffff_100%)] px-4 py-12">
      <SignUp />
    </div>
  )
}
