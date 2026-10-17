"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryPhoto = { id: string; src: string; srcSmall: string; caption: string };
export type GalleryGroup = { key: string; title: string; intro?: string; photos: GalleryPhoto[] };

/** Photos in groups (the design, today, progress…). Tap one to see it full screen; swipe or use the arrows. */
export function Gallery({ groups }: { groups: GalleryGroup[] }) {
  const all = groups.flatMap((g) => g.photos);
  const [open, setOpen] = useState<number | null>(null);
  const startX = useRef<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + all.length) % all.length)), [all.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go]);

  let index = 0;
  const current = open === null ? null : all[open];
  return (
    <>
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="text-3xl font-bold">{g.title}</h2>
          {g.intro && <p className="mt-2 max-w-prose text-ink-soft">{g.intro}</p>}
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {g.photos.map((p, i) => {
              const at = index++;
              // With three or more photos the first is shown large beside the next two.
              const wide = i === 0 && g.photos.length >= 3;
              return (
                <li key={p.id} className={wide ? "col-span-2 flex flex-col lg:row-span-2" : ""}>
                  <button type="button" onClick={() => setOpen(at)} className={`group block w-full overflow-hidden rounded-xl text-left ${wide ? "lg:flex-1" : ""}`} aria-label={`View larger: ${p.caption || g.title}`}>
                    <img src={wide ? p.src : p.srcSmall} alt={p.caption} loading="lazy" className={`aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03] ${wide ? "lg:aspect-auto lg:h-full" : ""}`} />
                  </button>
                  {p.caption && <p className="mt-1.5 text-sm text-ink-soft">{p.caption}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-[70] flex flex-col bg-[#0f1b28] text-white"
          onPointerDown={(e) => { startX.current = e.clientX; }}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-white/70">{(open ?? 0) + 1} of {all.length}</span>
            <button type="button" onClick={() => setOpen(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close"><X className="size-6" /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4">
            <img src={current.src} alt={current.caption} className="max-h-[78vh] max-w-full rounded-lg object-contain" />
            {all.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-2 hidden rounded-full bg-white/10 p-3 hover:bg-white/20 sm:block" aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
                <button type="button" onClick={() => go(1)} className="absolute right-2 hidden rounded-full bg-white/10 p-3 hover:bg-white/20 sm:block" aria-label="Next photo"><ChevronRight className="size-6" /></button>
              </>
            )}
          </div>
          <p className="min-h-16 p-4 text-center text-white/90">{current.caption}</p>
        </div>
      )}
    </>
  );
}
