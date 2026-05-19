"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse =
  | { user: null }
  | { user: { id: string; role: string; email: string; name: string } };

export function NavBar() {
  const [me, setMe] = useState<MeResponse>({ user: null });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="border-b border-black/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Pixel Pivot Hosting
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/hosting" className="text-black/80 hover:text-black">
            Hosting
          </Link>
          <Link href="/domains" className="text-black/80 hover:text-black">
            Domains
          </Link>
          <Link href="/pricing" className="text-black/80 hover:text-black">
            Pricing
          </Link>
          <Link href="/contact" className="text-black/80 hover:text-black">
            Contact
          </Link>
          {me.user ? (
            <>
              <Link href="/dashboard" className="text-black/80 hover:text-black">
                Dashboard
              </Link>
              {me.user.role === "ADMIN" ? (
                <Link href="/admin" className="text-black/80 hover:text-black">
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-black/10 px-3 py-1.5 hover:bg-black/5"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-black/10 px-3 py-1.5 hover:bg-black/5"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

