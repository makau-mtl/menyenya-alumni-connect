"use client";

import { useEffect, useState } from "react";

/** Tabs that stay at the top while scrolling and highlight the section in view. */
export function SectionTabs({ sections }: { sections: { id: string; label: string; count?: number }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sections" className="sticky top-[4.4rem] z-30 border-b border-line bg-surface/95 shadow-[0_6px_20px_-12px_rgba(23,40,59,0.25)] backdrop-blur sm:top-[4.9rem]">
      <ul className="section flex gap-1 sm:gap-2 overflow-x-auto py-3">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 sm:px-5 font-semibold transition-colors ${
                active === s.id ? "bg-ink text-white" : "text-ink-soft hover:bg-paper hover:text-ink"
              }`}
            >
              {s.label}
              {s.count ? <span className={`rounded-full px-2 text-sm ${active === s.id ? "bg-white/15" : "bg-paper"}`}>{s.count}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
