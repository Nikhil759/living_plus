import Link from "next/link";

export default function AuthResetPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-headline text-ink">Set a new password</h1>
      <p className="max-w-sm text-body text-ink-secondary">
        Password reset from email is handled in Supabase. Open the link from your inbox, then sign
        in again.
      </p>
      <Link href="/login" className="font-semibold text-primary">
        Back to sign in
      </Link>
    </main>
  );
}
