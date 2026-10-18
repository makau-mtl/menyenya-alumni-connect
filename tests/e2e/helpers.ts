import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";

// Local Supabase only (started in CI). These are the standard local development values, not secrets.
export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SERVICE_KEY = process.env.E2E_SERVICE_KEY ?? "";
export const DB_URL = process.env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const PASSWORD = "Journey-test-123!";

export function sql(query: string): string {
  return execFileSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-qtAc", query], { encoding: "utf8" }).trim();
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** A confirmed login with a password (used by the officials' password form). Returns the user id. */
export async function createLogin(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const body = (await res.json()) as { id?: string; msg?: string };
  if (!res.ok || !body.id) throw new Error(`Could not create ${email}: ${JSON.stringify(body)}`);
  return body.id;
}

/** Registers a member straight in the database, as that member. */
export function registerInDb(userId: string, fullName: string, phone: string, yearLeft: number) {
  const answers = JSON.stringify({
    full_name: fullName, phone, phone_country: "KE", phone_whatsapp: true, category: "alumnus", year_left: yearLeft,
    occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false },
  });
  sql(`select set_config('request.jwt.claim.sub', ${q(userId)}, false); set role authenticated; select public.complete_registration(${q(answers)}::jsonb); reset role;`);
}

export async function logIn(page: Page, email: string, next = "/app") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByText("Officials: log in with a password").click();
  await page.locator("#pw-email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export const unique = () => Math.random().toString(36).slice(2, 8);

/** A random, always-valid Kenyan mobile number (07 + 8 digits). */
export const kenyanPhone = (prefix = "07") => `${prefix}${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
