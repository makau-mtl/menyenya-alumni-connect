import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createUser, freshDatabase, personFor, type Db } from "./harness";

let db: Db;
const year = new Date().getFullYear();

beforeAll(async () => {
  db = await freshDatabase();
}, 60_000);

const giveArgs = (over: Partial<Record<string, unknown>> = {}) => {
  const a = {
    slug: "tuition-block", amount: 2500, freq: "once", first: "Ann", last: "Moraa",
    email: "Ann@Example.com", phone: "0712 345 678", org: null, anon: false, impact: true, ded: null, ...over,
  };
  return [a.slug, a.amount, a.freq, a.first, a.last, a.email, a.phone, a.org, a.anon, a.impact, a.ded];
};
const give = (over = {}) =>
  db.query<{ reference: string; receipt_token: string }>(
    "select * from public.give($1, $2, $3::public.gift_frequency, $4, $5, $6, $7, $8, $9, $10, $11)", giveArgs(over));

const pledge = (over: Partial<Record<string, unknown>> = {}) => {
  const a = { slug: "tuition-block", type: "monthly", per: 2500, n: 36, kind: null, first: "Peter", last: "Ombati",
    email: "peter@example.com", phone: "+254722000111", ...over };
  return db.query<{ reference: string; receipt_token: string }>(
    "select * from public.make_pledge($1, $2::public.pledge_type, $3, $4, $5, $6, $7, $8, $9)",
    [a.slug, a.type, a.per, a.n, a.kind, a.first, a.last, a.email, a.phone]);
};

describe("structure", () => {
  it("has row-level security on every table", async () => {
    const r = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and not rowsecurity");
    expect(r.rows).toEqual([]);
  });

  it("seeds the pick lists and causes", async () => {
    const r = await db.query<Record<string, number>>(`select
      (select count(*)::int from public.cohorts) as cohorts,
      (select count(*)::int from public.counties) as counties,
      (select count(*)::int from public.roles) as roles,
      (select count(*)::int from public.causes) as causes`);
    expect(r.rows[0]).toEqual({ cohorts: 52, counties: 48, roles: 13, causes: 3 });
  });

  it("normalises Kenyan phone numbers to +254", async () => {
    const r = await db.query<{ a: string; b: string; c: string; d: string | null }>(`select
      public.normalize_phone('0712 345 678') a, public.normalize_phone('254110123456') b,
      public.normalize_phone('+447700900123') c, public.normalize_phone('12345') d`);
    expect(r.rows[0]).toEqual({ a: "+254712345678", b: "+254110123456", c: "+447700900123", d: null });
  });
});

describe("visitors", () => {
  it("can read causes but no personal or money records", async () => {
    await as(db, "anon", async () => {
      expect((await db.query("select slug from public.causes")).rows.length).toBe(3);
      for (const t of ["persons", "person_contacts", "next_of_kin", "pledges", "donations", "payments", "audit_log"]) {
        const r = await db.query(`select count(*)::int as n from public.${t}`).catch(() => ({ rows: [{ n: 0 }] }));
        expect(r.rows[0], t).toEqual({ n: 0 });
      }
    });
  });

  it("cannot write to tables directly", async () => {
    await as(db, "anon", async () => {
      await expect(db.query("insert into public.persons (full_name) values ('Intruder')")).rejects.toThrow();
      await expect(db.query("update public.causes set title = 'x'")).resolves.toMatchObject({ affectedRows: 0 });
    });
  });

  it("cannot make themselves an administrator", async () => {
    await as(db, "anon", async () => {
      await expect(db.query("select public.bootstrap_admin('a@b.com')")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("giving", () => {
  it("records a gift with a reference and a private receipt", async () => {
    const r = await as(db, "anon", () => give());
    const { reference, receipt_token } = r.rows[0];
    expect(reference).toBe(`MSA-D-${year}-000001`);

    await as(db, "anon", async () => {
      const ok = await db.query<{ r: Record<string, unknown> }>("select public.get_receipt($1, $2) r", [reference, receipt_token]);
      expect(ok.rows[0].r).toMatchObject({ kind: "donation", amount: 2500, first_name: "Ann", email: "ann@example.com" });
      const bad = await db.query<{ r: unknown }>("select public.get_receipt($1, gen_random_uuid()) r", [reference]);
      expect(bad.rows[0].r).toBeNull();
    });
  });

  it("links a second gift with the same email to the same person", async () => {
    await as(db, "anon", () => give({ amount: 1000, phone: "0712345678" }));
    const r = await db.query<{ n: number }>(
      "select count(distinct donor_person_id)::int n from public.donations");
    expect(r.rows[0].n).toBe(1);
  });

  it("flags, but never merges, an email and phone that belong to different people", async () => {
    await as(db, "anon", () => give({ first: "Jane", last: "K", email: "jane@example.com", phone: "0700111222" }));
    await as(db, "anon", () => give({ first: "Jane", last: "K", email: "ann@example.com", phone: "0700111222" }));
    const r = await db.query<{ n: number }>("select count(*)::int n from public.duplicate_flags where status = 'open'");
    expect(r.rows[0].n).toBe(1);
  });

  it("rejects amounts below KES 50 and causes that do not exist", async () => {
    await as(db, "anon", async () => {
      await expect(give({ amount: 10 })).rejects.toThrow(/KES 50/);
      await expect(give({ slug: "nope" })).rejects.toThrow(/not open/);
    });
  });

  it("records founding pledges and updates progress from records", async () => {
    const before = await db.query<{ pledged: string; pledge_count: string }>("select * from public.cause_progress('tuition-block')");
    expect(Number(before.rows[0].pledged)).toBe(3_410_000);
    expect(Number(before.rows[0].pledge_count)).toBe(18);

    const r = await as(db, "anon", () => pledge());
    expect(r.rows[0].reference).toBe(`MSA-${year}-000001`);
    const p = await db.query<{ total_amount: string; is_founding: boolean }>("select total_amount, is_founding from public.pledges");
    expect(p.rows[0]).toMatchObject({ is_founding: true });
    expect(Number(p.rows[0].total_amount)).toBe(90_000);

    const after = await db.query<{ pledged: string; pledge_count: string }>("select * from public.cause_progress('tuition-block')");
    expect(Number(after.rows[0].pledged)).toBe(3_500_000);
    expect(Number(after.rows[0].pledge_count)).toBe(19);
  });

  it("does not take pledges for a cause that has them switched off", async () => {
    await as(db, "anon", async () => {
      await expect(pledge({ slug: "alumni-fund" })).rejects.toThrow(/not taking pledges/);
    });
  });
});

describe("members and roles", () => {
  let admin: string, adminPerson: string;
  let rep: string, repPerson: string;
  let member: string, memberPerson: string;
  let other: string, otherPerson: string;

  beforeAll(async () => {
    admin = await createUser(db, "admin@example.com", "Admin Person");
    await db.query("select public.bootstrap_admin('admin@example.com')");
    adminPerson = (await personFor(db, admin))!;

    rep = await createUser(db, "rep@example.com", "Class Rep");
    repPerson = (await personFor(db, rep))!;
    member = await createUser(db, "member@example.com", "Member 2010");
    memberPerson = (await personFor(db, member))!;
    other = await createUser(db, "other@example.com", "Member 1999");
    otherPerson = (await personFor(db, other))!;

    const cohort = async (y: number) =>
      (await db.query<{ id: string }>("select id from public.cohorts where year_left = $1", [y])).rows[0].id;
    const cat = (await db.query<{ id: string }>("select id from public.member_categories where key = 'alumnus'")).rows[0].id;
    for (const [p, y] of [[repPerson, 2010], [memberPerson, 2010], [otherPerson, 1999]] as const) {
      await db.query("insert into public.member_profiles (person_id, category_id, cohort_id, year_left) values ($1, $2, $3, $4)",
        [p, cat, await cohort(y), y]);
      await db.query("insert into public.next_of_kin (person_id, name, relationship, phone) values ($1, 'Kin', 'Sibling', '+254700000000')", [p]);
    }
    await assignRole(db, repPerson, "cohort_rep", "cohort", await cohort(2010));
  });

  it("links a new login to the person who already gave with that email", async () => {
    const u = await createUser(db, "ann@example.com", "Ann Moraa");
    const r = await db.query<{ n: number }>(
      "select count(*)::int n from public.persons where user_id = $1 and id = (select donor_person_id from public.donations limit 1)", [u]);
    expect(r.rows[0].n).toBe(1);
  });

  it("lets a member see their own gifts only", async () => {
    const ann = await db.query<{ user_id: string }>("select user_id from public.persons where full_name = 'Ann Moraa' and user_id is not null");
    await as(db, { user: ann.rows[0].user_id }, async () => {
      const r = await db.query<{ n: number }>("select count(*)::int n from public.donations");
      expect(r.rows[0].n).toBe(3);
      expect((await db.query("select * from public.pledges")).rows.length).toBe(0);
    });
  });

  it("lets a class rep see members of their own class only", async () => {
    await as(db, { user: rep }, async () => {
      const r = await db.query<{ person_id: string }>("select person_id from public.member_profiles");
      const ids = r.rows.map((x) => x.person_id).sort();
      expect(ids).toEqual([repPerson, memberPerson].sort());
    });
  });

  it("never shows next of kin to a class rep", async () => {
    await as(db, { user: rep }, async () => {
      const r = await db.query<{ person_id: string }>("select person_id from public.next_of_kin");
      expect(r.rows.map((x) => x.person_id)).toEqual([repPerson]);
    });
  });

  it("shows next of kin to the member only; not even administrators read it directly", async () => {
    await as(db, { user: member }, async () => {
      expect((await db.query("select * from public.next_of_kin")).rows.length).toBe(1);
    });
    await as(db, { user: admin }, async () => {
      expect((await db.query("select * from public.next_of_kin")).rows.length).toBe(0);
      await expect(db.query("select * from public.view_next_of_kin($1, 'checking records')", [memberPerson])).rejects.toThrow(/Welfare Coordinator/);
    });
  });

  it("lets the administrator see all pledges and gifts", async () => {
    await as(db, { user: admin }, async () => {
      expect((await db.query("select * from public.pledges")).rows.length).toBe(1);
      expect((await db.query("select * from public.donations")).rows.length).toBe(4);
    });
  });

  it("lets only administrators assign roles, never to themselves", async () => {
    await as(db, { user: member }, async () => {
      await expect(assignRole(db, memberPerson, "treasurer")).rejects.toThrow();
    });
    await as(db, { user: admin }, async () => {
      await expect(assignRole(db, adminPerson, "treasurer")).rejects.toThrow();
      await assignRole(db, otherPerson, "treasurer");
    });
  });

  it("ends access as soon as a role's term ends", async () => {
    await db.query("update public.role_assignments set ends_on = current_date - 1, starts_on = current_date - 10 where person_id = $1", [repPerson]);
    await as(db, { user: rep }, async () => {
      const r = await db.query<{ person_id: string }>("select person_id from public.member_profiles");
      expect(r.rows.map((x) => x.person_id)).toEqual([repPerson]);
    });
  });

  it("records changes to people and roles in the audit log", async () => {
    const r = await db.query<{ n: number }>("select count(*)::int n from public.audit_log where entity_type = 'role_assignments'");
    expect(r.rows[0].n).toBeGreaterThan(0);
    await expect(db.query("delete from public.audit_log")).rejects.toThrow(/append-only/);
  });
});

describe("money safeguards", () => {
  it("never records the same payment twice", async () => {
    const ins = "insert into public.payments (provider, provider_reference, amount, received_at, entry_method) values ('mpesa_c2b', 'QK12AB34CD', 2500, now(), 'webhook') returning id";
    const p = await db.query<{ id: string }>(ins);
    await expect(db.query(ins)).rejects.toThrow(/duplicate key/);

    await expect(db.query("update public.payments set amount = 9999 where id = $1", [p.rows[0].id])).rejects.toThrow(/only a payment/);
    await db.query("update public.payments set status = 'reversed' where id = $1", [p.rows[0].id]);
    await expect(db.query("delete from public.payments where id = $1", [p.rows[0].id])).rejects.toThrow(/cannot be deleted/);
  });

  it("never allocates more than was paid", async () => {
    const p = await db.query<{ id: string }>(
      "insert into public.payments (provider, provider_reference, amount, received_at, entry_method) values ('bank', 'B-1', 1000, now(), 'manual') returning id");
    const alloc = "insert into public.payment_allocations (payment_id, target_type, amount) values ($1, 'unallocated', $2)";
    await db.query(alloc, [p.rows[0].id, 600]);
    await expect(db.query(alloc, [p.rows[0].id, 500])).rejects.toThrow(/exceed/);
  });
});
