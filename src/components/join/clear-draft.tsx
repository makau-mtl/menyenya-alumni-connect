"use client";

import { useEffect } from "react";

/** Clears the saved registration answers once registration is complete. */
export function ClearJoinDraft({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(`${storageKey}:step`);
    } catch {}
  }, [storageKey]);
  return null;
}
