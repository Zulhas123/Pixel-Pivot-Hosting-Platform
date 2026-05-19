import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-black/70">
          Enter the reset code and your new password.
        </p>
      </div>
      <Suspense fallback={<div className="rounded-xl border border-black/10 p-5">Loading…</div>}>
        <ResetPasswordClient initialEmail={email ?? ""} />
      </Suspense>
    </div>
  );
}

