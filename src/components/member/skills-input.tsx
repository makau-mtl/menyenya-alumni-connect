"use client";

import { useId, useMemo, useRef, useState } from "react";
import { inputClass } from "@/components/ui";

/**
 * Type to find a skill, Enter (or tap) to add it, then type the next one.
 * Picking from the shared list keeps answers consistent; a skill that isn't listed can still be added.
 */
export function SkillsInput({ options, initial, max = 15 }: { options: string[]; initial: string[]; max?: number }) {
  const [chosen, setChosen] = useState<string[]>(initial);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(chosen.map((c) => c.toLowerCase()));
    const starts = options.filter((o) => o.toLowerCase().startsWith(q) && !taken.has(o.toLowerCase()));
    const contains = options.filter((o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q) && !taken.has(o.toLowerCase()));
    return [...starts, ...contains].slice(0, 8);
  }, [query, options, chosen]);

  const exact = options.find((o) => o.toLowerCase() === query.trim().toLowerCase());
  const canAddOwn = matches.length === 0 && query.trim().length >= 2 && !exact && !chosen.some((c) => c.toLowerCase() === query.trim().toLowerCase());
  const items = [...matches, ...(canAddOwn ? [`Add "${query.trim()}"`] : [])];

  function add(value: string) {
    const v = value.startsWith('Add "') ? query.trim().replace(/\s+/g, " ") : value;
    if (!v || chosen.length >= max || chosen.some((c) => c.toLowerCase() === v.toLowerCase())) return;
    setChosen([...chosen, v]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      {chosen.map((c) => <input key={c} type="hidden" name="skills" value={c} />)}
      {chosen.length > 0 && (
        <ul aria-label="Your skills" className="flex flex-wrap gap-2">
          {chosen.map((c) => (
            <li key={c} className="flex items-center gap-1 rounded-full bg-tea-tint py-1 pl-3 pr-1 text-[0.95rem] font-semibold text-ink">
              {c}
              <button
                type="button"
                aria-label={`Remove ${c}`}
                onClick={() => setChosen(chosen.filter((x) => x !== c))}
                className="flex size-7 items-center justify-center rounded-full text-ink-soft hover:bg-white hover:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id="skills"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          disabled={chosen.length >= max}
          placeholder={chosen.length >= max ? `Up to ${max} skills` : chosen.length ? "Add another skill" : "Start typing, e.g. account…"}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && items.length) {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp" && items.length) {
              e.preventDefault();
              setActive((a) => (a - 1 + items.length) % items.length);
            } else if (e.key === "Enter") {
              e.preventDefault(); // never submits the form
              if (items.length) add(items[active]);
            } else if (e.key === "Backspace" && !query && chosen.length) {
              setChosen(chosen.slice(0, -1));
            } else if (e.key === "Escape") {
              setQuery("");
            }
          }}
          className={inputClass}
        />
        {items.length > 0 && (
          <ul id={listId} role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-line bg-surface py-1 shadow-[0_12px_32px_rgba(23,40,59,0.14)]">
            {items.map((m, i) => (
              <li
                key={m}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(m);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-4 py-2.5 ${i === active ? "bg-tea-tint" : ""} ${m.startsWith('Add "') ? "border-t border-line text-ink-soft" : ""}`}
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
