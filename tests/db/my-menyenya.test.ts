import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Stream and dormitories: optional, from administrators' lists; directory filter; figures hide groups under 5.
let db: Db;
let admin: string;
const people: { user: string; person: string }[] = [];
let dormA = "";
let dormB = "";
let stream = "";

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  for (let i = 0; i < 6; i++) {
    const u = await createLogin(db, `m${i}@example.com`);
    await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
      full_name: `Member ${i}`, phone: `0711 800 00${i}`, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: 2005,
      occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
      consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
    people.push({ user: u, person: (await personFor(db, u))! });
  }
  await as(db, { user: admin }, async () => {
    dormA = (await db.query<{ id: string }>("insert into public.school_dorms (name) values ('Livingstone') returning id")).rows[0].id;
    dormB = (await db.query<{ id: string }>("insert into public.school_dorms (name) values ('Kraft') returning id")).rows[0].id;
    stream = (await db.query<{ id: string }>("insert into public.school_streams (name) values ('East') returning id")).rows[0].id;
  });
}, 120_000);

describe("my Menyenya", () => {
  it("lets members choose their stream and dormitories, only from the lists", async () => {
    for (const p of people) {
      await as(db, { user: p.user }, () => db.query("update public.member_profiles set stream_id = $1, dorm_ids = $2 where person_id = $3", [stream, [dormA], p.person]));
    }
    await as(db, { user: people[0].user }, async () => {
      await db.query("update public.member_profiles set dorm_ids = $1 where person_id = $2", [[dormA, dormB], people[0].person]);
      await expect(db.query("update public.member_profiles set dorm_ids = $1 where person_id = $2", [["00000000-0000-4000-8000-000000000000"], people[0].person])).rejects.toThrow(/list/);
      await expect(db.query("insert into public.school_dorms (name) values ('Made up')")).rejects.toThrow();
    });
  });

  it("filters the directory and hides small groups in the figures", async () => {
    await as(db, { user: people[1].user }, async () => {
      const kraft = (await db.query<{ full_name: string }>("select full_name from public.directory_search(p_dorm => $1)", [dormB])).rows;
      expect(kraft).toEqual([{ full_name: "Member 0" }]);
      const b = (await db.query<{ b: { dorms: { name: string; count: number | null }[]; streams: { count: number | null }[] } }>("select public.school_life_breakdown() as b")).rows[0].b;
      expect(b.dorms).toEqual([{ id: dormA, name: "Livingstone", count: 6 }, { id: dormB, name: "Kraft", count: null }].sort((x, y) => x.name.localeCompare(y.name)));
      expect(b.streams[0].count).toBe(6);
      expect((await db.query<{ dorms: string[] }>("select dorms from public.member_school_life($1)", [people[0].person])).rows[0].dorms.sort()).toEqual(["Kraft", "Livingstone"]);
    });
  });
});
