"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type Result = { ok?: boolean; message?: string } | null | undefined;

/**
 * Shows a save's result as a message at the top of the screen (hard to miss), in addition to any
 * message next to the button. `next` adds a button to the message, e.g. "Next: your photo".
 */
export function useToastResult(state: Result, next?: { label: string; onClick: () => void }) {
  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message, next ? { action: { label: next.label, onClick: next.onClick }, duration: 6000 } : undefined);
    else toast.error(state.message);
    // Only when a new result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
