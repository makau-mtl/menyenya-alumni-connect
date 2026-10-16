import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// M6: directory, public profiles, confirmation, merging, terminating membership.
let db: Db;
let admin: string;

const base = (name: string, phone: string, over: Record<string, unknown> = {}) => ({
  full_name: name, phone, phone_country: "KE", phone_whatsapp: true, category: "alumnus", year_left: 2009,
  occupation_status: "employed", level: "Growth", county: "Kakamega", region: "Western",
  consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: true, whatsapp_updates: false },
  ...over,
});
const register = async (email: string, payload: Record<string, unknown>) => {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify(payload)]));
  return { user: u, person: (await personFor(db, u))! };
};
const setModule = (key: string, enabled: boolean, config?: object) =>
  db.query(`update public.module_settings set enabled = $2${config ? ", config = $3" : ""} where module_key = $1`,
    config ? [key, enabled, JSON.stringify(config)] : [key, enabled]);

let listed: { user: string; person: string };
let hidden: { user: string; person: string };
let friend: { user: string; person: string };

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await setModule("registration", true);
  listed = await register("listed@example.com", base("Nehemiah Makau", "0711 000 001", { skills: [] }));
  await db.query("update public.member_profiles set headline = 'Product manager', skills = '{Project management}' where person_id = $1", [listed.person]);
  hidden = await register("hidden@example.com", base("Hidden Person", "0711 000 002", {
    consents: { membership_data: true, directory_listing: false, public_profile: false, email_updates: false, whatsapp_updates: false } }));
  friend = await register("friend@example.com", base("Faith Friend", "0711 000 003", {
    category: "friend", relationship: "Parent", year_left: undefined, occupation_status: undefined, level: undefined }));
}, 60_000);

describe("directory", () => {
  it("shows every current member, alumni and friends, to signed-in members only", async () => {
    await as(db, { user: listed.user }, async () => {
      const r = await db.query<{ full_name: string; category: string; year_left: number | null }>(
        "select full_name, category, year_left from public.directory_search()");
      expect(r.rows.map((x) => x.full_name).sort()).toEqual(["Faith Friend", "Hidden Person", "Nehemiah Makau"]);
      expect(r.rows.find((x) => x.category === "alumnus")?.year_left).toBe(2009);
    });
    await as(db, "anon", async () => {
      await expect(db.query("select * from public.directory_search()")).rejects.toThrow(/permission denied/);
    });
    const outsider = await createLogin(db, "outsider@example.com");
    await as(db, { user: outsider }, async () => {
      expect((await db.query("select * from public.directory_search()")).rows).toEqual([]);
    });
  });

  it("filters by class, region, category and search words, including skills", async () => {
    await as(db, { user: friend.user }, async () => {
      const q = (sql: string, args: unknown[] = []) => db.query<{ full_name: string }>(sql, args).then((r) => r.rows.map((x) => x.full_name));
      expect(await q("select full_name from public.directory_search(p_category => 'friend')")).toEqual(["Faith Friend"]);
      expect(await q("select full_name from public.directory_search(p_year => 2009)")).toEqual(["Hidden Person", "Nehemiah Makau"]);
      expect(await q("select full_name from public.directory_search(p_query => 'project')")).toEqual(["Nehemiah Makau"]);
      expect(await q("select full_name from public.directory_search(p_region => 'Coast')")).toEqual([]);
    });
  });

  it("shows phone and email only as the member chooses: nobody, their class, or all members", async () => {
    const card = (user: string, person: string) =>
      as(db, { user }, async () => (await db.query<{ phone: string | null; email: string | null }>(
        "select phone, email from public.directory_member($1)", [person])).rows[0]);
    // Default: only the association.
    expect(await card(friend.user, listed.person)).toEqual({ phone: null, email: null });
    // Class only: a classmate (Hidden Person, also 2009) sees it; a friend doesn't.
    await db.query("update public.member_profiles set contact_visibility = 'cohort' where person_id = $1", [listed.person]);
    expect(await card(hidden.user, listed.person)).toEqual({ phone: "+254711000001", email: "listed@example.com" });
    expect(await card(friend.user, listed.person)).toEqual({ phone: null, email: null });
    // All members.
    await db.query("update public.member_profiles set contact_visibility = 'members' where person_id = $1", [listed.person]);
    expect((await card(friend.user, listed.person)).phone).toBe("+254711000001");
    // A member can change their own choice.
    await as(db, { user: listed.user }, () => db.query("update public.member_profiles set contact_visibility = 'hidden'"));
    expect(await card(friend.user, listed.person)).toEqual({ phone: null, email: null });
  });
});

describe("public profile", () => {
  it("is visible to anyone only after the member switches it on", async () => {
    await as(db, "anon", async () => {
      expect((await db.query("select * from public.public_profile($1)", [listed.person])).rows).toEqual([]);
    });
    await db.query("insert into public.consents (person_id, purpose, granted) values ($1, 'public_profile', true)", [listed.person]);
    await db.query("insert into storage.objects (bucket_id, name) values ('member-photos', $1)", [`${listed.person}/me-400.webp`]);
    await as(db, "anon", async () => {
      const r = await db.query<{ full_name: string }>("select full_name from public.public_profile($1)", [listed.person]);
      expect(r.rows[0].full_name).toBe("Nehemiah Makau");
      expect((await db.query("select name from storage.objects where bucket_id = 'member-photos'")).rows.length).toBe(1);
    });
  });
});

describe("confirmation", () => {
  it("does nothing while switched off", async () => {
    await as(db, { user: admin }, async () => {
      expect((await db.query("select * from public.confirmations_waiting()")).rows).toEqual([]);
    });
  });

  it("lets only the configured roles confirm, and never their own record", async () => {
    await setModule("verification", true, { alumnus: ["cohort_rep"], friend: ["verifier"] });
    const rep = await register("rep@example.com", base("Rita Rep", "0711 000 004"));
    const cohort = (await db.query<{ id: string }>("select id from public.cohorts where year_left = 2009")).rows[0].id;
    await assignRole(db, rep.person, "cohort_rep", "cohort", cohort);
    await as(db, { user: rep.user }, async () => {
      const waiting = await db.query<{ full_name: string }>("select full_name from public.confirmations_waiting()");
      expect(waiting.rows.map((r) => r.full_name).sort()).toEqual(["Hidden Person", "Nehemiah Makau"]);
      await expect(db.query("select public.confirm_member($1, 'confirm')", [friend.person])).rejects.toThrow(/can't confirm/);
      await expect(db.query("select public.confirm_member($1, 'confirm')", [rep.person])).rejects.toThrow(/can't confirm/);
      await db.query("select public.confirm_member($1, 'confirm')", [listed.person]);
      await expect(db.query("select public.confirm_member($1, 'flag', 'x')", [hidden.person])).rejects.toThrow(/what needs checking/);
      await db.query("select public.confirm_member($1, 'flag', 'Not sure of the class year')", [hidden.person]);
    });
    const r = await db.query<{ membership_status: string; verified_by: string }>(
      "select membership_status, verified_by from public.member_profiles where person_id = $1", [listed.person]);
    expect(r.rows[0]).toEqual({ membership_status: "verified", verified_by: rep.person });
    // Administrators aren't in the list for alumni here, so they can't confirm them.
    await as(db, { user: admin }, async () => {
      await expect(db.query("select public.confirm_member($1, 'confirm')", [hidden.person])).rejects.toThrow(/can't confirm/);
    });
    await setModule("verification", false);
  });
});

describe("merging duplicates", () => {
  it("moves gifts and the login to the surviving record, and can be undone", async () => {
    await db.query(`select * from public.give('alumni-fund', 1000, 'once', 'Sam', 'Giver', 'sam@example.com',
      '0733 000 333', null, false, false, null)`);
    const donor = (await db.query<{ person_id: string }>(
      "select person_id from public.person_contacts where kind = 'email' and value = 'sam@example.com'")).rows[0].person_id;
    const member = await register("samuel@example.com", base("Samuel Giver", "0733 000 333"));
    const flag = await db.query<{ id: string }>(
      "select id from public.duplicate_flags where status = 'open' and $1 in (person_a_id, person_b_id)", [donor]);
    expect(flag.rows.length).toBe(1);

    let mergeId = "";
    await as(db, { user: member.user }, async () => {
      await expect(db.query("select public.merge_persons($1, $2)", [member.person, donor])).rejects.toThrow(/administrators and verifiers/);
    });
    await as(db, { user: admin }, async () => {
      mergeId = (await db.query<{ m: string }>("select public.merge_persons($1, $2, 'Same person') m", [member.person, donor])).rows[0].m;
    });
    const gifts = await db.query<{ n: number }>("select count(*)::int n from public.donations where donor_person_id = $1", [member.person]);
    expect(gifts.rows[0].n).toBe(1);
    const merged = await db.query<{ status: string; merged_into_id: string }>("select status, merged_into_id from public.persons where id = $1", [donor]);
    expect(merged.rows[0]).toEqual({ status: "merged", merged_into_id: member.person });
    expect((await db.query("select status from public.duplicate_flags where id = $1", [flag.rows[0].id])).rows[0]).toEqual({ status: "merged" });

    await as(db, { user: admin }, async () => {
      await db.query("select public.undo_merge($1)", [mergeId]);
    });
    const back = await db.query<{ n: number }>("select count(*)::int n from public.donations where donor_person_id = $1", [donor]);
    expect(back.rows[0].n).toBe(1);
    expect((await db.query("select status from public.persons where id = $1", [donor])).rows[0]).toEqual({ status: "active" });
  });

  it("refuses to merge two records that both have logins", async () => {
    await as(db, { user: admin }, async () => {
      await expect(db.query("select public.merge_persons($1, $2)", [listed.person, friend.person])).rejects.toThrow(/own login/);
    });
  });

  it("can mark a pair as not duplicates", async () => {
    const f = await db.query<{ id: string }>("select id from public.duplicate_flags where status = 'open' limit 1");
    await as(db, { user: admin }, async () => {
      await db.query("select public.dismiss_duplicate($1)", [f.rows[0].id]);
    });
    expect((await db.query("select status from public.duplicate_flags where id = $1", [f.rows[0].id])).rows[0]).toEqual({ status: "not_duplicate" });
  });
});

describe("terminating membership", () => {
  it("needs the disclaimer acknowledged, hides the member, and can be undone within the window", async () => {
    const m = await register("leaver@example.com", base("Lea Leaver", "0711 000 099"));
    await as(db, { user: m.user }, async () => {
      await expect(db.query("select public.terminate_membership('Moving on', true, false)")).rejects.toThrow(/confirm you have read/);
      await db.query("select public.terminate_membership('Moving on', true, true)");
    });
    const p = await db.query<{ membership_status: string; deletion: boolean; days: number }>(`
      select membership_status, deletion_requested_at is not null deletion,
             round(extract(epoch from rejoin_until - terminated_at) / 86400)::int days
      from public.member_profiles where person_id = $1`, [m.person]);
    expect(p.rows[0]).toEqual({ membership_status: "terminated", deletion: true, days: 30 });
    await as(db, { user: friend.user }, async () => {
      expect((await db.query("select 1 from public.directory_search(p_query => 'Lea')")).rows).toEqual([]);
    });
    await as(db, { user: m.user }, async () => {
      expect((await db.query("select * from public.directory_search()")).rows).toEqual([]);
      await expect(db.query("update public.member_profiles set membership_status = 'registered'")).rejects.toThrow();
      await db.query("select public.rejoin_membership()");
    });
    const after = await db.query<{ membership_status: string; deletion_requested_at: string | null }>(
      "select membership_status, deletion_requested_at from public.member_profiles where person_id = $1", [m.person]);
    expect(after.rows[0]).toEqual({ membership_status: "registered", deletion_requested_at: null });
    await as(db, { user: friend.user }, async () => {
      expect((await db.query("select 1 from public.directory_search(p_query => 'Lea')")).rows.length).toBe(1);
    });
  });

  it("closes the rejoin window after the set number of days", async () => {
    await db.query(`update public.module_settings set config = '{"rejoin_days": 7}' where module_key = 'membership_exit'`);
    const m = await register("late@example.com", base("Larry Late", "0711 000 098"));
    await as(db, { user: m.user }, () => db.query("select public.terminate_membership(null, false, true)"));
    await db.query("update public.member_profiles set rejoin_until = now() - interval '1 day' where person_id = $1", [m.person]);
    await as(db, { user: m.user }, async () => {
      await expect(db.query("select public.rejoin_membership()")).rejects.toThrow(/window has closed/);
    });
  });
});
