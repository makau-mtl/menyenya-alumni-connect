/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { moveSupport, setSupportStatus, updateEnquiry } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { amountLabel } from "@/lib/support";
import { emptyPackage, emptySupporter, PackageForm, SupporterForm, type PackageValues, type SupporterValues } from "@/components/admin/support-forms";
import { buttonClass, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Sponsors and partners" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
const kindName = { sponsor: "Corporate sponsors", partner: "Strategic partners" } as const;
const statusName = { new: "New", in_progress: "In progress", closed: "Closed" } as const;

type Kind = "sponsor" | "partner";
type SupporterRow = { id: string; kind: Kind; name: string; website_url: string | null; logo_path: string | null; blurb: string | null; package_id: string | null; since_year: number | null; featured: boolean; status: string };
type PackageRow = { id: string; kind: Kind; name: string; audience: string | null; description: string; benefits: string[]; amount_kes: number | null; amount_period: string | null; status: string };
type Enquiry = { id: string; kind: Kind; organisation: string; contact_name: string; email: string; phone: string | null; package_id: string | null; message: string; status: keyof typeof statusName; notes: string; created_at: string };

type Props = { searchParams: Promise<{ supporter?: string; package?: string; saved?: string; show?: string }> };

function RowButtons({ table, id, status, first, last, editHref }: { table: string; id: string; status: string; first: boolean; last: boolean; editHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={moveSupport}>
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <button name="direction" value="up" disabled={first} aria-label="Move up" className={buttonClass("secondary", "sm")}>↑</button>
        <button name="direction" value="down" disabled={last} aria-label="Move down" className={`${buttonClass("secondary", "sm")} ml-1`}>↓</button>
      </form>
      <Link href={editHref} className={buttonClass("secondary", "sm")}>Edit</Link>
      <form action={setSupportStatus}>
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <button name="status" value={status === "draft" ? "published" : "draft"} className={buttonClass("secondary", "sm")}>{status === "draft" ? "Show" : "Hide"}</button>
      </form>
      <form action={setSupportStatus}>
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        <button name="status" value="archived" className={buttonClass("quiet", "sm")}>Remove</button>
      </form>
    </div>
  );
}

function Hidden({ status }: { status: string }) {
  return status === "draft" ? <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">Hidden</span> : null;
}

export default async function AdminSupportPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can manage sponsors and partners.</p>;
  const q = await searchParams;
  const showClosed = q.show === "all";

  let enquiryQuery = staff.supabase.from("support_enquiries").select("*").order("created_at", { ascending: false }).limit(200);
  if (!showClosed) enquiryQuery = enquiryQuery.neq("status", "closed");
  const [{ data: s }, { data: p }, { data: e }] = await Promise.all([
    staff.supabase.from("supporters").select("*").neq("status", "archived").order("sort_order").order("name"),
    staff.supabase.from("support_packages").select("*").neq("status", "archived").order("sort_order").order("name"),
    enquiryQuery,
  ]);
  const supporters = (s ?? []) as SupporterRow[];
  const packages = (p ?? []) as PackageRow[];
  const enquiries = (e ?? []) as Enquiry[];
  const packageName = new Map(packages.map((x) => [x.id, x.name]));

  const es = q.supporter ? supporters.find((x) => x.id === q.supporter) : undefined;
  const supporterInitial: SupporterValues = es
    ? { id: es.id, kind: es.kind, name: es.name, websiteUrl: es.website_url ?? "", blurb: es.blurb ?? "", packageId: es.package_id ?? "",
        sinceYear: es.since_year ? String(es.since_year) : "", featured: es.featured, status: es.status === "draft" ? "draft" : "published",
        logo: es.logo_path ? toPhoto(es.logo_path, es.name).srcSmall : null }
    : emptySupporter;
  const ep = q.package ? packages.find((x) => x.id === q.package) : undefined;
  const packageInitial: PackageValues = ep
    ? { id: ep.id, kind: ep.kind, name: ep.name, audience: ep.audience ?? "", description: ep.description, benefits: (ep.benefits ?? []).join("\n"),
        amount: ep.amount_kes ? String(ep.amount_kes) : "", amountPeriod: ep.amount_period === "one_off" ? "one_off" : "annual", status: ep.status === "draft" ? "draft" : "published" }
    : emptyPackage;

  return (
    <div className="flex flex-col gap-14">
      {q.saved && <p role="status" className="rounded-md bg-tea-tint p-4 font-semibold">Saved. The website is updated.</p>}

      {/* Enquiries */}
      <section id="enquiries" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold">Enquiries</h2>
          <Link href={showClosed ? "/admin/support#enquiries" : "/admin/support?show=all#enquiries"} className="font-semibold text-tea underline">
            {showClosed ? "Hide closed" : "Show closed too"}
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-ink-soft">Sent from the Corporate sponsorships and Strategic partnerships pages. Reply by email or phone, then mark them.</p>
        {enquiries.length === 0 ? (
          <p className="mt-4 text-ink-soft">No open enquiries.</p>
        ) : (
          <ul className="mt-5 flex flex-col gap-4">
            {enquiries.map((x) => (
              <li key={x.id} className="rounded-xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{x.organisation}</p>
                    <p className="text-ink-soft">
                      {x.contact_name} · <a href={`mailto:${x.email}`} className="underline">{x.email}</a>
                      {x.phone && <> · <a href={`tel:${x.phone}`} className="underline">{x.phone}</a></>}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {x.kind === "sponsor" ? "Sponsorship" : "Partnership"}
                      {x.package_id && ` · ${packageName.get(x.package_id) ?? "an option no longer shown"}`} · {dateFormat.format(new Date(x.created_at))}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${x.status === "new" ? "bg-gold-tint" : x.status === "closed" ? "bg-paper text-ink-soft" : "bg-tea-tint"}`}>{statusName[x.status]}</span>
                </div>
                {x.message && <p className="mt-3 whitespace-pre-line">{x.message}</p>}
                <form action={updateEnquiry} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={x.id} />
                  <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-semibold">
                    Note (only administrators see it)
                    <input name="notes" defaultValue={x.notes} maxLength={2000} className={inputClass} />
                  </label>
                  <select name="status" defaultValue={x.status} aria-label="Status" className={`${inputClass} w-40`}>
                    <option value="new">New</option>
                    <option value="in_progress">In progress</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button className={buttonClass("secondary", "sm")}>Save</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Sponsors and partners */}
      <section id="supporters" className="scroll-mt-24">
        <h2 className="text-2xl font-bold">Sponsors and partners on the website</h2>
        {(["sponsor", "partner"] as const).map((kind) => {
          const rows = supporters.filter((x) => x.kind === kind);
          return (
            <div key={kind} className="mt-6">
              <h3 className="text-lg font-bold">{kindName[kind]}</h3>
              {rows.length === 0 ? (
                <p className="mt-2 text-ink-soft">None yet.</p>
              ) : (
                <ol className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                  {rows.map((x, i) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-white ring-1 ring-line">
                        {x.logo_path ? <img src={toPhoto(x.logo_path, x.name).srcSmall} alt="" className="max-h-10 max-w-16 object-contain" /> : <span className="text-xs text-ink-soft">No logo</span>}
                      </span>
                      <div className="min-w-40 flex-1">
                        <p className="font-semibold">{x.name}<Hidden status={x.status} />{x.featured && <span className="ml-2 rounded bg-gold-tint px-2 py-0.5 text-xs font-semibold">Home page</span>}</p>
                        {x.package_id && <p className="text-sm text-ink-soft">{packageName.get(x.package_id)}</p>}
                      </div>
                      <RowButtons table="supporters" id={x.id} status={x.status} first={i === 0} last={i === rows.length - 1} editHref={`/admin/support?supporter=${x.id}#supporter-form`} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
        <div id="supporter-form" className="mt-8 max-w-3xl scroll-mt-24 rounded-xl border border-line bg-surface p-6">
          <h3 className="text-xl font-bold">{es ? `Change: ${es.name}` : "Add a sponsor or partner"}</h3>
          <div className="mt-5">
            <SupporterForm key={supporterInitial.id || "new"} initial={supporterInitial} packages={packages.map((x) => ({ id: x.id, name: x.name, kind: x.kind }))} />
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="scroll-mt-24">
        <h2 className="text-2xl font-bold">Sponsorship options and partnership areas</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">The cards on each page. Leave the amount blank until the leadership approves it; the page then shows &ldquo;Amount on request&rdquo;.</p>
        {(["sponsor", "partner"] as const).map((kind) => {
          const rows = packages.filter((x) => x.kind === kind);
          return (
            <div key={kind} className="mt-6">
              <h3 className="text-lg font-bold">{kind === "sponsor" ? "Corporate sponsorship options" : "Strategic partnership areas"}</h3>
              {rows.length === 0 ? (
                <p className="mt-2 text-ink-soft">None yet.</p>
              ) : (
                <ol className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
                  {rows.map((x, i) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                      <div className="min-w-40 flex-1">
                        <p className="font-semibold">{x.name}<Hidden status={x.status} /></p>
                        <p className="text-sm text-ink-soft">{amountLabel(x.amount_kes, x.amount_period)} · {x.benefits?.length ?? 0} benefits listed</p>
                      </div>
                      <RowButtons table="support_packages" id={x.id} status={x.status} first={i === 0} last={i === rows.length - 1} editHref={`/admin/support?package=${x.id}#package-form`} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
        <div id="package-form" className="mt-8 max-w-3xl scroll-mt-24 rounded-xl border border-line bg-surface p-6">
          <h3 className="text-xl font-bold">{ep ? `Change: ${ep.name}` : "Add an option or area"}</h3>
          <div className="mt-5">
            <PackageForm key={packageInitial.id || "new"} initial={packageInitial} />
          </div>
        </div>
      </section>
    </div>
  );
}
