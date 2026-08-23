import { RegisterForm } from "@/components/register-form"

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <RegisterForm />
      </div>
    </main>
  )
}