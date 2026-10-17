import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { RetryButton } from "@/components/offline-status";

export const metadata: Metadata = { title: "You're offline" };
export const dynamic = "force-static";

// Shown by the installed app when there is no connection and the page wasn't saved earlier.
export default function OfflinePage() {
  return (
    <div className="section flex flex-col items-center py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-tea">
        <WifiOff className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">You&rsquo;re offline</h1>
      <p className="mt-3 max-w-md text-lg text-ink-soft">
        This page isn&rsquo;t saved on your phone yet. Pages you have opened recently still work without a connection.
      </p>
      <p className="mt-2 max-w-md text-ink-soft">Pledges, payments, orders and messages need a connection.</p>
      <RetryButton />
    </div>
  );
}
