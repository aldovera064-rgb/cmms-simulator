import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 industrial-grid opacity-30" />
      <div className="relative z-10 w-full max-w-lg">
        <LoginForm />
      </div>
    </main>
  );
}
