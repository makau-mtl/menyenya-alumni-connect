import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createUser, freshDatabase, personFor, type Db } from "./harness";

// Who can change the public website's content (M2).
let db: Db;
let admin: string, secretary: string, treasurer: string, member: string;
let adminPerson: string;

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  secretary = await createUser(db, "sec@example.com", "Sam Secretary");
  treasurer = await createUser(db, "treasurer@example.com", "Tia Treasurer");
  member = await createUser(db, "member@example.com", "Meg Member");
  adminPerson = (await personFor(db, admin))!;
  await assignRole(db, adminPerson, "admin");
  await assignRole(db, (await personFor(db, secretary))!, "secretary");
  await assignRole(db, (await personFor(db, treasurer))!, "treasurer");
}, 60_000);

const causeId = async () =>
  (await db.query<{ id: string }>("select id from public.causes where slug = 'tuition-block'")).rows[0].id;
const updated = (r: { affectedRows?: number }) => r.affectedRows ?? 0;

describe("causes", () => {
  it("only administrators can edit a cause, and the change is audited", async () => {
    for (const user of [secretary, treasurer, member]) {
      await as(db, { user }, async () => {
        expect(updated(await db.query("update public.causes set title = 'Hijacked' where slug = 'tuition-block'"))).toBe(0);
      });
    }
    await as(db, { user: admin }, async () => {
      expect(updated(await db.query("update public.causes set summary = 'New summary' where slug = 'tuition-block'"))).toBe(1);
    });
    const log = await db.query<{ actor_person_id: string }>(
      "select actor_person_id from public.audit_log where action = 'causes.update' order by id desc limit 1");
    expect(log.rows[0].actor_person_id).toBe(adminPerson);
  });
});

describe("photos", () => {
  it("administrators add cause photos; visitors see only published ones", async () => {
    const id = await causeId();
    await as(db, { user: admin }, async () => {
      await db.query("insert into public.cause_photos (cause_id, path, caption) values ($1, 'causes/a', 'Site visit')", [id]);
      await db.query("insert into public.cause_photos (cause_id, path, status) values ($1, 'causes/b', 'archived')", [id]);
    });
    await as(db, { user: treasurer }, async () => {
      await expect(db.query("insert into public.cause_photos (cause_id, path) values ($1, 'causes/c')", [id])).rejects.toThrow();
    });
    await as(db, "anon", async () => {
      const r = await db.query<{ path: string }>("select path from public.cause_photos");
      expect(r.rows.map((x) => x.path)).toEqual(["causes/a"]);
    });
    const who = await db.query<{ uploaded_by: string }>("select uploaded_by from public.cause_photos where path = 'causes/a'");
    expect(who.rows[0].uploaded_by).toBe(adminPerson);
  });

  it("only administrators set site photos and the Chairman's video", async () => {
    await as(db, { user: secretary }, async () => {
      await expect(db.query("insert into public.site_photos (slot, path) values ('home.hero', 'site/x')")).rejects.toThrow();
      expect(updated(await db.query(`update public.site_settings set value = '{"youtubeId":"x"}' where key = 'chair_video'`))).toBe(0);
    });
    await as(db, { user: admin }, async () => {
      await db.query("insert into public.site_photos (slot, path) values ('home.hero', 'site/x')");
      expect(updated(await db.query(`update public.site_settings set value = '{"youtubeId":"abc123def45"}' where key = 'chair_video'`))).toBe(1);
    });
    await as(db, "anon", async () => {
      const r = await db.query<{ value: { youtubeId: string } }>("select value from public.site_settings where key = 'chair_video'");
      expect(r.rows[0].value.youtubeId).toBe("abc123def45");
      expect((await db.query("select slot from public.site_photos")).rows.length).toBe(1);
    });
  });
});

describe("news", () => {
  it("starts with the three published items", async () => {
    await as(db, "anon", async () => {
      expect((await db.query("select slug from public.news_posts")).rows.length).toBe(3);
    });
  });

  it("the Secretary and administrators write news; drafts stay hidden from visitors", async () => {
    await as(db, { user: secretary }, async () => {
      await db.query(`insert into public.news_posts (slug, title, summary, happens_on)
                      values ('draft-news', 'Draft', 'Not yet', '2026-11-01')`);
    });
    await as(db, { user: treasurer }, async () => {
      await expect(db.query(`insert into public.news_posts (slug, title, summary, happens_on)
                             values ('t-news', 'T', 'T', '2026-11-01')`)).rejects.toThrow();
      expect((await db.query("select 1 from public.news_posts where slug = 'draft-news'")).rows.length).toBe(0);
    });
    await as(db, "anon", async () => {
      expect((await db.query("select 1 from public.news_posts where slug = 'draft-news'")).rows.length).toBe(0);
    });
    await as(db, { user: admin }, async () => {
      await db.query("update public.news_posts set status = 'published' where slug = 'draft-news'");
    });
    await as(db, "anon", async () => {
      const r = await db.query<{ published_at: string | null }>("select published_at from public.news_posts where slug = 'draft-news'");
      expect(r.rows[0].published_at).not.toBeNull();
    });
  });

  it("records who wrote a post, whatever the browser sends", async () => {
    const sec = await personFor(db, secretary);
    await as(db, { user: secretary }, async () => {
      await db.query(`insert into public.news_posts (slug, title, summary, happens_on, created_by)
                      values ('who-wrote', 'W', 'W', '2026-11-02', $1)`, [adminPerson]);
    });
    const r = await db.query<{ created_by: string }>("select created_by from public.news_posts where slug = 'who-wrote'");
    expect(r.rows[0].created_by).toBe(sec);
  });
});

describe("photo files", () => {
  const upload = (name: string) =>
    db.query("insert into storage.objects (bucket_id, name) values ('site-media', $1)", [name]);

  it("administrators upload anywhere; the Secretary only into news; others not at all", async () => {
    await as(db, { user: admin }, async () => {
      await expect(upload("causes/tb/one-1600.webp")).resolves.toBeTruthy();
    });
    await as(db, { user: secretary }, async () => {
      await expect(upload("news/post/one-1600.webp")).resolves.toBeTruthy();
      await expect(upload("site/home.hero/x-1600.webp")).rejects.toThrow();
    });
    for (const who of [{ user: treasurer }, { user: member }, "anon" as const]) {
      await as(db, who, async () => {
        await expect(upload("news/sneaky-1600.webp")).rejects.toThrow();
      });
    }
  });
});
