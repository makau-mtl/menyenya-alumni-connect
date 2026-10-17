import "server-only";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { memberPhotoUrl } from "@/lib/members/photos";
import type { NavGroup, PortalUser } from "@/components/portal/portal-shell";

/** The side menu for the member portal and admin area, based on who is signed in. */
export async function getPortalNav(): Promise<{ groups: NavGroup[]; user: PortalUser }> {
  // Used by the admin workspace. Members reach their own pages through the website.
  const [member, staff] = await Promise.all([getMember(), getStaff()]);
  const groups: NavGroup[] = [];
  const myAccount: NavGroup["items"] = [
    { href: "/app", label: "My account", icon: "dashboard" },
    { href: "/", label: "Back to the website", icon: "home" },
  ];
  let user: PortalUser = { name: member?.fullName ?? staff?.email ?? "Member", email: member?.email ?? staff?.email ?? "", photo: null, subtitle: null };

  if (member?.registered && member.membershipStatus !== "terminated") {
    const [{ data: waiting }, { data: p }] = await Promise.all([
      member.supabase.rpc("confirmations_waiting"),
      member.supabase.from("member_profiles").select("year_left, photo_path, member_categories(key)").eq("person_id", member.personId!).single(),
    ]);
    const confirm = (waiting as unknown[] | null)?.length ?? 0;
    const cat = (p?.member_categories as unknown as { key: string } | null)?.key;
    user = {
      ...user,
      photo: await memberPhotoUrl(member.supabase, p?.photo_path ?? null, "small"),
      subtitle: cat === "alumnus" && p?.year_left ? `Class of ${p.year_left}` : "Friend of the alumni",
    };
    myAccount.push(...(confirm ? [{ href: "/app/confirm", label: "Confirm members", icon: "confirm" as const, badge: confirm }] : []));
  }

  if (staff) {
    const counts = async (table: string, status: string) =>
      (await staff.supabase.from(table).select("id", { count: "exact", head: true }).eq("status", status)).count ?? 0;
    const [enquiries, orders] = await Promise.all([
      staff.isAdmin ? counts("support_enquiries", "new") : 0,
      staff.canManageShop ? counts("merch_orders", "new") : 0,
    ]);
    const items = [
      ...(staff.isFinance ? [{ href: "/admin", label: "Overview", icon: "overview" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/members", label: "Members", icon: "members" as const }] : []),
      ...(staff.isAdmin || staff.isVerifier ? [{ href: "/admin/duplicates", label: "Duplicates", icon: "duplicates" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/roles", label: "Roles", icon: "roles" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/people", label: "Our people", icon: "people" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/support", label: "Sponsors and partners", icon: "support" as const, badge: enquiries }] : []),
      ...(staff.canManageShop ? [{ href: "/admin/shop", label: "Merchandise", icon: "shop" as const, badge: orders }] : []),
      ...(staff.canEditSchool ? [{ href: "/admin/school", label: "The school", icon: "school" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/causes", label: "Causes", icon: "causes" as const }] : []),
      ...(staff.canEditNews ? [{ href: "/admin/news", label: "News and events", icon: "news" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/site", label: "Photos and video", icon: "photos" as const }] : []),
      ...(staff.isAdmin ? [{ href: "/admin/settings", label: "Settings", icon: "settings" as const }] : []),
    ];
    if (items.length) groups.push({ label: "Administration", root: "/admin", items });
  }
  groups.push({ label: "Leave admin", root: "/app", items: myAccount });
  return { groups, user };
}
