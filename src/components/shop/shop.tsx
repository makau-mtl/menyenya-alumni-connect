"use client";

import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState, useMemo, useState } from "react";
import { placeOrder } from "@/app/shop/actions";
import { buttonClass, Field, inputClass } from "@/components/ui";

export type ShopItem = { id: string; name: string; description: string; price: number; options: string[]; optionLabel: string; photo: string | null };
type Line = { key: string; item: ShopItem; option: string | null; quantity: number };

const kes = new Intl.NumberFormat("en-KE");
const money = (n: number) => `KES ${kes.format(n)}`;

function ItemCard({ item, onAdd }: { item: ShopItem; onAdd: (option: string | null, quantity: number) => void }) {
  const [option, setOption] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const needsOption = item.options.length > 0;
  return (
    <li className="flex flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
      {item.photo ? (
        <img src={item.photo} alt={item.name} loading="lazy" className="aspect-square w-full bg-paper object-cover" />
      ) : (
        <span aria-hidden className="flex aspect-square w-full items-center justify-center bg-[linear-gradient(135deg,#1f3a52_0%,#2e6b4f_100%)] font-display text-3xl font-bold text-white/90">
          mhs<span className="text-gold">.</span>
        </span>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xl font-bold leading-snug">{item.name}</p>
          <p className="shrink-0 font-semibold text-tea">{money(item.price)}</p>
        </div>
        {item.description && <p className="mt-2 text-ink-soft">{item.description}</p>}
        {needsOption && (
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">{item.optionLabel}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={option === o}
                  onClick={() => setOption(o)}
                  className={`min-w-11 rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${option === o ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-auto flex items-center gap-3 pt-5">
          <div className="flex items-center rounded-full ring-1 ring-line">
            <button type="button" aria-label="One fewer" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="size-10 rounded-full text-lg font-bold hover:bg-paper">−</button>
            <span aria-live="polite" className="w-8 text-center font-semibold">{quantity}</span>
            <button type="button" aria-label="One more" onClick={() => setQuantity((q) => Math.min(50, q + 1))} className="size-10 rounded-full text-lg font-bold hover:bg-paper">+</button>
          </div>
          <button
            type="button"
            disabled={needsOption && !option}
            onClick={() => {
              onAdd(option, quantity);
              setAdded(true);
              setQuantity(1);
              setTimeout(() => setAdded(false), 1500);
            }}
            className={`${buttonClass("primary", "sm")} flex-1`}
          >
            {added ? "Added ✓" : needsOption && !option ? `Choose a ${item.optionLabel.toLowerCase()}` : "Add to order"}
          </button>
        </div>
      </div>
    </li>
  );
}

/** Catalogue, the order being built, and the order form. */
export function Shop({ items }: { items: ShopItem[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [state, action, pending] = useActionState(placeOrder, null);
  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.item.price, 0), [lines]);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const err = state?.errors ?? {};
  const invalid = (k: string) => (err[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});

  function add(item: ShopItem, option: string | null, quantity: number) {
    const key = `${item.id}:${option ?? ""}`;
    setLines((ls) => {
      const found = ls.find((l) => l.key === key);
      if (found) return ls.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l));
      return [...ls, { key, item, option, quantity }];
    });
  }

  if (state?.ok) {
    return (
      <div role="status" className="mx-auto max-w-2xl rounded-3xl bg-tea-tint p-8 sm:p-10">
        <p className="font-display text-3xl font-bold">Thank you, your order is in</p>
        <p className="mt-4 text-lg">Your order reference is</p>
        <p className="mt-1 font-display text-4xl font-bold tracking-wider text-tea-dark">{state.reference}</p>
        <p className="mt-2 text-lg">Total: <strong>{money(total)}</strong></p>
        <ol className="mt-6 flex list-decimal flex-col gap-2 pl-5 text-lg">
          <li>Someone from the association will call you to confirm your order and when it will be ready.</li>
          <li>Then pay through the association&rsquo;s official Paybill shown on this website, using <strong>{state.reference}</strong> as the account number.</li>
          <li>Collect your items. Keep your reference until then.</li>
        </ol>
        <p className="mt-6 text-sm text-ink-soft">We never ask anyone to send money to a personal phone number. <Link href="/reports" className="font-semibold underline">Where your money goes</Link>.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
      <ul className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
        {items.map((item) => <ItemCard key={item.id} item={item} onAdd={(o, q) => add(item, o, q)} />)}
      </ul>

      <section id="order" aria-label="Your order" className="scroll-mt-28 rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line lg:sticky lg:top-28">
        <h2 className="font-display text-2xl font-bold">Your order</h2>
        {lines.length === 0 ? (
          <p className="mt-3 text-ink-soft">Choose items and add them here.</p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.key} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{l.item.name}</p>
                    <p className="text-sm text-ink-soft">
                      {l.option && `${l.item.optionLabel} ${l.option} · `}{l.quantity} × {money(l.item.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(l.quantity * l.item.price)}</p>
                    <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-sm text-alert underline">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="flex justify-between border-t-2 border-ink pt-3 text-lg font-bold"><span>Total</span><span>{money(total)}</span></p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.set("items", JSON.stringify(lines.map((l) => ({ item_id: l.item.id, option: l.option ?? undefined, quantity: l.quantity }))));
                startTransition(() => action(fd));
              }}
              className="mt-6 flex flex-col gap-4"
            >
              <div aria-hidden className="hidden">
                <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
              </div>
              <Field label="Your name" name="name" error={err.name}>
                <input id="name" name="name" required maxLength={120} autoComplete="name" className={inputClass} {...invalid("name")} />
              </Field>
              <Field label="Phone" name="phone" error={err.phone} hint="We call to confirm your order.">
                <input id="phone" name="phone" type="tel" required autoComplete="tel" className={inputClass} {...invalid("phone")} />
              </Field>
              <Field label="Email (optional)" name="email" error={err.email}>
                <input id="email" name="email" type="email" autoComplete="email" className={inputClass} {...invalid("email")} />
              </Field>
              <Field label="Where would you like to collect it?" name="collection" error={err.collection} hint="For example: at the school, or in Nairobi. We confirm when we call.">
                <input id="collection" name="collection" required maxLength={200} className={inputClass} {...invalid("collection")} />
              </Field>
              <Field label="Anything else (optional)" name="notes" error={err.notes}>
                <textarea id="notes" name="notes" rows={2} maxLength={1000} className={inputClass} {...invalid("notes")} />
              </Field>
              <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
                {pending ? "Sending…" : `Send order (${count} ${count === 1 ? "item" : "items"})`}
              </button>
              {state?.message && <p role="alert" className="font-semibold text-alert">{state.message}</p>}
              <p className="text-sm text-ink-soft">Nothing to pay now. We call to confirm, then you pay through the official Paybill.</p>
            </form>
          </>
        )}
      </section>

      {lines.length > 0 && (
        <a href="#order" className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full bg-ink px-6 py-3 font-semibold text-white shadow-xl lg:hidden">
          <span>Your order ({count})</span>
          <span>{money(total)} →</span>
        </a>
      )}
    </div>
  );
}
