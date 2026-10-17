import { beforeAll, describe, expect, it } from "vitest";
import { as, createUser, freshDatabase, type Db } from "./harness";

// A new initiative needs a video and at least three photos before it goes public; existing ones are exempt.
let db: Db;
let admin: string;
let causeId = "";

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  causeId = (await db.query<{ id: string }>(
    `insert into public.causes (slug, title, summary, kind, fund_id, lifecycle)
     values ('science-lab', 'A new science laboratory', 'Equip a modern lab.', 'campaign', (select id from public.funds where key = 'general-fund'), 'draft') returning id`)).rows[0].id;
}, 90_000);

describe("launch kit", () => {
  it("keeps a new initiative private until it has a video and three photos", async () => {
    await as(db, { user: admin }, async () => {
      await expect(db.query("update public.causes set lifecycle = 'live' where id = $1", [causeId])).rejects.toThrow(/video/);
      await db.query("update public.causes set video_url = 'https://youtu.be/abcdefghijk', video_title = 'Project video' where id = $1", [causeId]);
      for (const n of [1, 2, 3]) {
        await db.query("insert into public.cause_photos (cause_id, path, purpose) values ($1, $2, 'design')", [causeId, `causes/lab-${n}`]);
      }
      await db.query("update public.causes set lifecycle = 'live' where id = $1", [causeId]);
    });
    await expect(db.query("update public.causes set video_url = 'https://evil.example/x' where id = $1", [causeId])).rejects.toThrow();
  });

  it("does not hold back the three existing initiatives", async () => {
    await as(db, { user: admin }, () => db.query("update public.causes set lifecycle = 'live' where slug = 'alumni-fund'"));
    const r = await db.query<{ lifecycle: string }>("select lifecycle from public.causes where slug = 'alumni-fund'");
    expect(r.rows[0].lifecycle).toBe("live");
  });
});
