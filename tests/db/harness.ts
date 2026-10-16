import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");

/** A fresh local Postgres with the Supabase stand-in and every migration applied, in order. */
export async function freshDatabase() {
  const db = new PGlite();
  await db.exec(readFileSync(path.join(root, "tests/db/supabase-stub.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(path.join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof freshDatabase>>;

/** Run queries as a visitor, a signed-in user, or the database owner. */
export async function as<T>(db: Db, who: "anon" | { user: string } | "owner", fn: () => Promise<T>): Promise<T> {
  if (who === "owner") {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  } else if (who === "anon") {
    await db.exec("set role anon; select set_config('request.jwt.claim.sub', '', false);");
  } else {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who.user]);
    await db.exec("set role authenticated;");
  }
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

/** Create a confirmed login only (fires the same trigger Supabase would). No person is created. */
export async function createLogin(db: Db, email: string, name = "Test User") {
  const r = await db.query<{ id: string }>(
    "insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ($1, now(), $2) returning id",
    [email, JSON.stringify({ full_name: name })],
  );
  return r.rows[0].id;
}

/** Create a confirmed login with a person record (as for officials set up by an administrator). */
export async function createUser(db: Db, email: string, name = "Test User") {
  const id = await createLogin(db, email, name);
  await db.query("select public.link_user_to_person($1, $2, $3)", [id, email, name]);
  return id;
}

export async function personFor(db: Db, userId: string) {
  const r = await db.query<{ id: string }>("select id from public.persons where user_id = $1", [userId]);
  return r.rows[0]?.id;
}

export async function assignRole(db: Db, personId: string, roleKey: string, scope = "association", scopeId: string | null = null) {
  await db.query(
    `insert into public.role_assignments (person_id, role_id, scope_type, scope_id)
     values ($1, (select id from public.roles where key = $2), $3, $4)`,
    [personId, roleKey, scope, scopeId],
  );
}
