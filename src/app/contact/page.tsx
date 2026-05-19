"use client";

import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contact</h1>
        <p className="mt-2 text-sm text-black/70">
          MVP: this form is a placeholder (no email sending yet).
        </p>
      </div>
      <form
        className="rounded-xl border border-black/10 p-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <input
          required
          placeholder="Your email"
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <textarea
          required
          placeholder="Message"
          rows={5}
          className="w-full rounded-md border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Send
        </button>
        {sent ? (
          <p className="text-sm text-green-700">
            Saved. Wire this to email/CRM when ready.
          </p>
        ) : null}
      </form>
    </div>
  );
}

