"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { saveMerchItem } from "@/app/admin/actions";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { usePhoto } from "./use-photo";

export type MerchValues = {
  id: string; name: string; description: string; price: string; options: string; optionLabel: string;
  status: "published" | "draft"; photo: string | null;
};
export const emptyMerch: MerchValues = { id: "", name: "", description: "", price: "", options: "", optionLabel: "Size", status: "published", photo: null };

export function MerchForm({ initial }: { initial: MerchValues }) {
  const [state, action, pending] = useActionState(saveMerchItem, null);
  const { photo, busy, error: photoError, choose, addTo } = usePhoto([1200, 600]);
  const err = state?.errors ?? {};
  const invalid = (k: string) => (err[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photo");
        if (photo) addTo(fd);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="id" value={initial.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Item name" name="name" error={err.name}>
          <input id="name" name="name" defaultValue={initial.name} required maxLength={80} className={inputClass} {...invalid("name")} />
        </Field>
        <Field label="Price in KES" name="price" error={err.price}>
          <input id="price" name="price" inputMode="numeric" defaultValue={initial.price} required className={inputClass} {...invalid("price")} />
        </Field>
      </div>
      <Field label="Description (optional)" name="description" error={err.description}>
        <textarea id="description" name="description" rows={2} maxLength={600} defaultValue={initial.description} className={inputClass} {...invalid("description")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <Field label="Choices, separated by commas (optional)" name="options" error={err.options} hint="e.g. S, M, L, XL. Leave blank if there is only one kind.">
          <input id="options" name="options" defaultValue={initial.options} className={inputClass} {...invalid("options")} />
        </Field>
        <Field label="Called" name="optionLabel" error={err.optionLabel} hint="e.g. Size or Colour">
          <input id="optionLabel" name="optionLabel" defaultValue={initial.optionLabel} maxLength={20} className={inputClass} {...invalid("optionLabel")} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="photo" className="font-semibold">Photo</label>
        <p className="text-sm text-ink-soft">A square photo on a plain background looks best.</p>
        {(photo?.preview ?? initial.photo) && <img src={photo?.preview ?? initial.photo ?? ""} alt="" className="size-32 self-start rounded-md object-cover ring-1 ring-line" />}
        <input id="photo" name="photo" type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0])}
          className="text-sm file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-surface file:px-3 file:py-1.5 file:font-semibold" />
        {busy && <p className="text-sm text-ink-soft">Preparing the photo…</p>}
        {photoError && <p className="text-sm font-semibold text-alert">{photoError}</p>}
      </div>
      <Field label="Show on the website" name="status">
        <select id="status" name="status" defaultValue={initial.status} className={`${inputClass} sm:max-w-xs`}>
          <option value="published">Yes, show it</option>
          <option value="draft">Not yet (hidden)</option>
        </select>
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || busy} className={buttonClass("primary")}>{pending ? "Saving…" : initial.id ? "Save changes" : "Add item"}</button>
        {initial.id && <Link href="/admin/shop" className={buttonClass("quiet")}>Cancel</Link>}
        {state && !state.ok && state.message && <p role="alert" className="font-semibold text-alert">{state.message}</p>}
      </div>
    </form>
  );
}
