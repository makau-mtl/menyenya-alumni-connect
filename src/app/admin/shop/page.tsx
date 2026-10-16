/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { moveMerchItem, setMerchItemStatus, updateMerchOrder } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { emptyMerch, MerchForm, type MerchValues } from "@/components/admin/merch-form";
import { buttonClass, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Merchandise" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
const kes = new Intl.NumberFormat("en-KE");
const statuses = {
  new: { label: "New", tone: "bg-gold-tint" },
  confirmed: { label: "Confirmed", tone: "bg-tea-tint" },
  paid: { label: "Paid", tone: "bg-tea-tint" },
  ready: { label: "Ready to collect", tone: "bg-tea text-white" },
  collected: { label: "Collected", tone: "bg-paper text-ink-soft" },
  cancelled: { label: "Cancelled", tone: "bg-paper text-ink-soft" },
} as const;
type Status = keyof typeof statuses;

type Item = { id: string; name: string; description: string; price_kes: number; options: string[]; option_label: string; photo_path: string | null; status: string };
type Order = {
  id: string; reference: string; buyer_name: string; phone: string; email: string | null; collection: string; buyer_notes: string;
  total_kes: number; status: Status; staff_notes: string; created_at: string;
  merch_order_items: { item_name: string; option: string | null; quantity: number; unit_price_kes: number }[];
};

type Props = { searchParams: Promise<{ item?: string; saved?: string; show?: string }> };

export default async function AdminShopPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.canManageShop) return <p>Only administrators, the Secretary and the Treasurer can manage merchandise.</p>;
  const q = await searchParams;
  const showDone = q.show === "all";

  let orderQuery = staff.supabase
    .from("merch_orders")
    .select("*, merch_order_items(item_name, option, quantity, unit_price_kes)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!showDone) orderQuery = orderQuery.not("status", "in", "(collected,cancelled)");
  const [{ data: i }, { data: o }] = await Promise.all([
    staff.supabase.from("merch_items").select("*").neq("status", "archived").order("sort_order").order("name"),
    orderQuery,
  ]);
  const items = (i ?? []) as Item[];
  const orders = (o ?? []) as Order[];
  const editing = q.item ? items.find((x) => x.id === q.item) : undefined;
  const initial: MerchValues = editing
    ? { id: editing.id, name: editing.name, description: editing.description, price: String(editing.price_kes), options: (editing.options ?? []).join(", "),
        optionLabel: editing.option_label, status: editing.status === "draft" ? "draft" : "published", photo: editing.photo_path ? toPhoto(editing.photo_path, editing.name).srcSmall : null }
    : emptyMerch;
  const waiting = orders.filter((x) => x.status === "new").length;

  return (
    <div className="flex flex-col gap-14">
      {q.saved && <p role="status" className="rounded-md bg-tea-tint p-4 font-semibold">Saved. The merchandise page is updated.</p>}

      <section id="orders" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold">Orders {waiting > 0 && <span className="ml-2 rounded-full bg-gold px-3 py-0.5 text-base">{waiting} new</span>}</h2>
          <Link href={showDone ? "/admin/shop#orders" : "/admin/shop?show=all#orders"} className="font-semibold text-tea underline">
            {showDone ? "Hide collected and cancelled" : "Show collected and cancelled too"}
          </Link>
        </div>
        <p className="mt-2 max-w-3xl text-ink-soft">
          Call the buyer to confirm, then mark <strong>Confirmed</strong>. When the payment shows on the Paybill statement with
          the order reference, mark <strong>Paid</strong>; then <strong>Ready to collect</strong> and <strong>Collected</strong>.
        </p>
        {orders.length === 0 ? (
          <p className="mt-4 text-ink-soft">No open orders.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-4">
            {orders.map((x) => (
              <li key={x.id} className="rounded-xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">
                      <span className="font-mono tracking-wide">{x.reference}</span> · {x.buyer_name}
                    </p>
                    <p className="text-ink-soft">
                      <a href={`tel:${x.phone}`} className="underline">{x.phone}</a>
                      {x.email && <> · <a href={`mailto:${x.email}`} className="underline">{x.email}</a></>} · {dateFormat.format(new Date(x.created_at))}
                    </p>
                    <p className="text-ink-soft">Collect: {x.collection}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statuses[x.status].tone}`}>{statuses[x.status].label}</span>
                </div>
                <ul className="mt-3 text-[0.95rem]">
                  {x.merch_order_items.map((l, n) => (
                    <li key={n}>
                      {l.quantity} × {l.item_name}{l.option && ` (${l.option})`} at KES {kes.format(l.unit_price_kes)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-semibold">Total KES {kes.format(x.total_kes)}</p>
                {x.buyer_notes && <p className="mt-2 text-ink-soft">Buyer&rsquo;s note: {x.buyer_notes}</p>}
                <form action={updateMerchOrder} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={x.id} />
                  <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold">
                    Note (only staff see it)
                    <input name="notes" defaultValue={x.staff_notes} maxLength={2000} className={inputClass} />
                  </label>
                  <select name="status" defaultValue={x.status} aria-label="Status" className={`${inputClass} w-48`}>
                    {(Object.keys(statuses) as Status[]).map((s) => <option key={s} value={s}>{statuses[s].label}</option>)}
                  </select>
                  <button className={buttonClass("secondary", "sm")}>Save</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="items" className="scroll-mt-24">
        <h2 className="text-2xl font-bold">Items</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-ink-soft">No items yet. Add the first one below.</p>
        ) : (
          <ol className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {items.map((x, n) => (
              <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="size-14 shrink-0 overflow-hidden rounded bg-paper ring-1 ring-line">
                  {x.photo_path && <img src={toPhoto(x.photo_path, x.name).srcSmall} alt="" className="size-full object-cover" />}
                </span>
                <div className="min-w-40 flex-1">
                  <p className="font-semibold">
                    {x.name}
                    {x.status === "draft" && <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">Hidden</span>}
                  </p>
                  <p className="text-sm text-ink-soft">KES {kes.format(x.price_kes)}{x.options?.length ? ` · ${x.option_label}: ${x.options.join(", ")}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={moveMerchItem}>
                    <input type="hidden" name="id" value={x.id} />
                    <button name="direction" value="up" disabled={n === 0} aria-label={`Move ${x.name} up`} className={buttonClass("secondary", "sm")}>↑</button>
                    <button name="direction" value="down" disabled={n === items.length - 1} aria-label={`Move ${x.name} down`} className={`${buttonClass("secondary", "sm")} ml-1`}>↓</button>
                  </form>
                  <Link href={`/admin/shop?item=${x.id}#item-form`} className={buttonClass("secondary", "sm")}>Edit</Link>
                  <form action={setMerchItemStatus}>
                    <input type="hidden" name="id" value={x.id} />
                    <button name="status" value={x.status === "draft" ? "published" : "draft"} className={buttonClass("secondary", "sm")}>{x.status === "draft" ? "Show" : "Hide"}</button>
                  </form>
                  <form action={setMerchItemStatus}>
                    <input type="hidden" name="id" value={x.id} />
                    <button name="status" value="archived" className={buttonClass("quiet", "sm")}>Remove</button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div id="item-form" className="mt-8 max-w-3xl scroll-mt-24 rounded-xl border border-line bg-surface p-6">
          <h3 className="text-xl font-bold">{editing ? `Change: ${editing.name}` : "Add an item"}</h3>
          <p className="mt-1 text-sm text-ink-soft">Changing a price affects new orders only; orders already sent keep their price.</p>
          <div className="mt-5">
            <MerchForm key={initial.id || "new"} initial={initial} />
          </div>
        </div>
      </section>
    </div>
  );
}
