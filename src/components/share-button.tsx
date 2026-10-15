"use client";

import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // The person closed the share sheet; fall through to copying.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button type="button" onClick={share} className="font-semibold text-tea underline underline-offset-4 hover:text-tea-dark">
      <span aria-live="polite">{copied ? "Link copied" : "Share this page"}</span>
    </button>
  );
}
