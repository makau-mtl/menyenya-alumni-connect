"use client";

import { useEffect, useId, useRef, useState } from "react";

/** A small ⓘ that opens on tap or click and closes on any tap elsewhere, on itself, or Escape. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="ml-1.5 inline-flex size-6 items-center justify-center rounded-full border border-ink-soft/50 text-xs font-bold text-ink-soft hover:border-ink hover:text-ink"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="note"
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
          className="absolute right-0 z-20 mt-2 block w-72 max-w-[80vw] cursor-pointer rounded-lg border border-line bg-surface p-4 text-left text-sm font-normal text-ink shadow-[0_12px_32px_rgba(23,40,59,0.14)] sm:left-0 sm:right-auto"
        >
          {children}
        </span>
      )}
    </span>
  );
}
