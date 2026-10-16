import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, type Db } from "./harness";

// Alumni merchandise: catalogue and order requests.
let db: Db;
let admin: string;
let stranger: string;
let tshirt: string;
let mug: string;

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  stranger = await createLogin(db, "someone@example.com");
}, 60_000);

const order = (items: unknown, phone = "0711 222 333") =>
  db.query<{ ref: string }>("select public.submit_merch_order('Jane Buyer', $1, '', 'At the school', '', $2::jsonb) as ref", [phone, JSON.stringify(items)]);

describe("merchandise", () => {
  it("lets only shop staff add items", async () => {
    await as(db, { user: stranger }, async () => {
      await expect(db.query("insert into public.merch_items (name, price_kes) values ('T-shirt', 1000)")).rejects.toThrow();
    });
    await as(db, { user: admin }, async () => {
      tshirt = (await db.query<{ id: string }>("insert into public.merch_items (name, price_kes, options) values ('Alumni T-shirt', 1200, '{S,M,L}') returning id")).rows[0].id;
      mug = (await db.query<{ id: string }>("insert into public.merch_items (name, price_kes) values ('Mug', 600) returning id")).rows[0].id;
      await db.query("insert into public.merch_items (name, price_kes, status) values ('Secret hoodie', 3000, 'draft')");
    });
    await as(db, "anon", async () => {
      expect((await db.query<{ name: string }>("select name from public.merch_items order by name")).rows.map((r) => r.name)).toEqual(["Alumni T-shirt", "Mug"]);
    });
  });

  it("takes orders from anyone at today's prices, and keeps them private", async () => {
    let ref = "";
    await as(db, "anon", async () => {
      ref = (await order([{ item_id: tshirt, option: "M", quantity: 2 }, { item_id: mug, quantity: 1 }])).rows[0].ref;
      expect(ref).toMatch(/^MER-[A-Z0-9]{6}$/);
      await expect(order([{ item_id: tshirt, quantity: 1 }])).rejects.toThrow(/choose a size/);
      await expect(order([{ item_id: tshirt, option: "XXL", quantity: 1 }])).rejects.toThrow(/choose a size/);
      await expect(order([])).rejects.toThrow(/at least one/);
      expect((await db.query("select * from public.merch_orders")).rows).toEqual([]);
    });
    await as(db, { user: stranger }, async () => {
      expect((await db.query("select * from public.merch_orders")).rows).toEqual([]);
    });
    await as(db, { user: admin }, async () => {
      const o = await db.query<{ total_kes: string; phone: string }>("select total_kes, phone from public.merch_orders where reference = $1", [ref]);
      expect(Number(o.rows[0].total_kes)).toBe(3000);
      expect(o.rows[0].phone).toBe("0711222333");
      const lines = await db.query<{ item_name: string; option: string | null }>("select item_name, option from public.merch_order_items order by item_name");
      expect(lines.rows).toEqual([{ item_name: "Alumni T-shirt", option: "M" }, { item_name: "Mug", option: null }]);
    });
  });

  it("lets staff move an order along but never change what was ordered", async () => {
    await as(db, { user: admin }, async () => {
      await db.query("update public.merch_orders set status = 'confirmed', staff_notes = 'Called her'");
      await expect(db.query("update public.merch_orders set total_kes = 1")).rejects.toThrow(/Only the status/);
      await expect(db.query("update public.merch_order_items set quantity = 9")).resolves.toBeDefined();
      expect((await db.query<{ q: number }>("select sum(quantity)::int as q from public.merch_order_items")).rows[0].q).toBe(3);
    });
  });

  it("limits repeated orders from one phone", async () => {
    await as(db, "anon", async () => {
      for (let i = 0; i < 5; i++) await order([{ item_id: mug, quantity: 1 }], "0722 000 111");
      await expect(order([{ item_id: mug, quantity: 1 }], "0722 000 111")).rejects.toThrow(/too many/);
    });
  });
});
