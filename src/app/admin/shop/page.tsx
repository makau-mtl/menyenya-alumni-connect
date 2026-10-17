/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { moveMerchItem, setMerchItemStatus, updateMerchOrder } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { emptyMerch, MerchForm, type MerchValues } from "@/components/admin/merch-form";
import { Plus } from "lucide-react";
import { inputClass } from "@/components/ui";
import { Empty, PageHeader, Panel, Pill, StatTiles } from "@/components/portal/page-parts";
import { RowActions } from "@/components/portal/row-actions";
import { Button } from "@/components/shadcn/button";

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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Merchandise"
        description="Orders from the Alumni merchandise page, and the items on sale."
        actions={<Button asChild variant="outline"><Link href="/shop">View the shop</Link></Button>}
      />
      {q.saved && <p role="status" className="rounded-md bg-secondary p-4 font-semibold">Saved. The merchandise page is updated.</p>}
      <StatTiles
        items={[
          { label: "New orders", value: String(waiting) },
          { label: "Open orders", value: String(orders.filter((o) => !["collected", "cancelled"].includes(o.status)).length) },
          { label: "Items on sale", value: String(items.filter((i) => i.status === "published").length) },
          { label: "Value of open orders", value: `KES ${kes.format(orders.filter((o) => !["collected", "cancelled"].includes(o.status)).reduce((t, o) => t + Number(o.total_kes), 0))}` },
        ]}
      />

      <Panel
        id="orders"
        title="Orders"
        description={<>Call the buyer to confirm, then mark <strong>Confirmed</strong>. When the payment shows on the Paybill statement with the order reference, mark <strong>Paid</strong>; then <strong>Ready to collect</strong> and <strong>Collected</strong>.</>}
        actions={<Button asChild variant="outline" size="sm"><Link href={showDone ? "/admin/shop#orders" : "/admin/shop?show=all#orders"}>{showDone ? "Hide collected and cancelled" : "Show collected and cancelled too"}</Link></Button>}
      >
        {orders.length === 0 ? (
          <Empty>No open orders.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((x) => (
              <li key={x.id} className="rounded-lg bg-muted/40 p-4 ring-1 ring-border">
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
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statuses[x.status].tone}`}>{statuses[x.status].label}</span>
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
                  <Button size="sm" variant="outline">Save</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="items" title="Items" actions={<Button asChild size="sm"><Link href="/admin/shop#item-form"><Plus /> Add an item</Link></Button>}>
        {items.length === 0 ? (
          <Empty>No items yet. Add the first one below.</Empty>
        ) : (
          <ol className="flex flex-col divide-y">
            {items.map((x, n) => (
              <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="size-14 shrink-0 overflow-hidden rounded bg-paper ring-1 ring-line">
                  {x.photo_path && <img src={toPhoto(x.photo_path, x.name).srcSmall} alt="" className="size-full object-cover" />}
                </span>
                <div className="min-w-40 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">{x.name}{x.status === "draft" && <Pill>Hidden</Pill>}</p>
                  <p className="text-sm text-ink-soft">KES {kes.format(x.price_kes)}{x.options?.length ? ` · ${x.option_label}: ${x.options.join(", ")}` : ""}</p>
                </div>
                <RowActions id={x.id} name={x.name} status={x.status} first={n === 0} last={n === items.length - 1}
                  editHref={`/admin/shop?item=${x.id}#item-form`} move={moveMerchItem} setStatus={setMerchItemStatus} />
              </li>
            ))}
          </ol>
        )}
        <div id="item-form" className="mt-6 max-w-3xl scroll-mt-24 rounded-lg bg-muted/40 p-5 ring-1 ring-border">
          <h3 className="text-xl font-bold">{editing ? `Change: ${editing.name}` : "Add an item"}</h3>
          <p className="mt-1 text-sm text-ink-soft">Changing a price affects new orders only; orders already sent keep their price.</p>
          <div className="mt-5">
            <MerchForm key={initial.id || "new"} initial={initial} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
