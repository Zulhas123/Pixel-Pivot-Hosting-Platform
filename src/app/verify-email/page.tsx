import { Suspense } from "react";
import { VerifyEmailClient } from "./VerifyEmailClient";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verify email</h1>
        <p className="mt-2 text-sm text-black/70">
          Enter the 6-digit OTP code (dev: printed in the server console).
        </p>
      </div>
      <Suspense fallback={<div className="rounded-xl border border-black/10 p-5">Loading…</div>}>
        <VerifyEmailClient initialEmail={email ?? ""} />
      </Suspense>
    </div>
  );
}

