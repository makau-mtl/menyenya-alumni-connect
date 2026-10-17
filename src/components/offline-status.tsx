"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { buttonClass } from "@/components/ui";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

/** Registers the offline helper, clears saved pages after signing out, and shows a bar while offline. */
export function OfflineStatus() {
  const online = useOnline();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const url = new URL(window.location.href);
    if (url.searchParams.has("signedout")) {
      // Remove this member's saved pages from the phone.
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("mhs-pages")).map((k) => caches.delete(k)))).catch(() => {});
      navigator.serviceWorker.controller?.postMessage("clear-pages");
      url.searchParams.delete("signedout");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, []);

  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm text-white">
      <WifiOff className="size-4 shrink-0 text-gold" aria-hidden />
      You&rsquo;re offline. Saved pages may be out of date, and sending things needs a connection.
    </div>
  );
}

export function RetryButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className={`${buttonClass("primary", "lg")} mt-8`}>
      Try again
    </button>
  );
}
