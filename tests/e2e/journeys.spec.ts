import { expect, test } from "@playwright/test";
import { createLogin, logIn, registerInDb, sql, unique } from "./helpers";

// The main journeys a member and an official take. If one of these breaks, the change isn't merged.

test("a new alumnus registers", async ({ page }) => {
  const email = `new-${unique()}@example.com`;
  await createLogin(email);
  await logIn(page, email, "/join/steps");
  await expect(page).toHaveURL(/\/join/);

  await page.locator("#field-fullName").fill("Nora Nyaboke");
  await page.locator("#field-phone").fill(`07${Math.floor(10000000 + Math.random() * 89999999)}`);
  await page.locator("#field-category").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#field-yearLeft").selectOption("2010");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#field-county").selectOption("Kisii");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#field-occupation").check();
  await page.locator("#field-level").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#field-membership_data").check();
  await page.getByRole("button", { name: "Finish registration" }).click();
  await expect(page).toHaveURL(/\/(join\/welcome|app)/, { timeout: 20_000 });
  expect(sql(`select count(*) from public.persons where full_name = 'Nora Nyaboke'`)).not.toBe("0");
});

test("a member completes My Menyenya and finds a classmate", async ({ page }) => {
  const id = unique();
  const a = await createLogin(`a-${id}@example.com`);
  const b = await createLogin(`b-${id}@example.com`);
  registerInDb(a, `Alice ${id}`, `0711${id.length}${Date.now() % 100000}1`.slice(0, 10), 2008);
  registerInDb(b, `Brian ${id}`, `0722${Date.now() % 1000000}`.slice(0, 10), 2008);

  await logIn(page, `a-${id}@example.com`);
  await page.goto("/app/profile#menyenya");
  await page.locator("#menyenya").getByText("Livingstone").click();
  await page.locator("#menyenya").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#menyenya").getByRole("status")).toHaveText("Saved.");

  await page.goto(`/app/directory?q=${encodeURIComponent(`Brian ${id}`)}`);
  await page.getByText(`Brian ${id}`).first().click();
  await expect(page.getByRole("heading", { name: `Brian ${id}` })).toBeVisible();
  await page.getByRole("link", { name: "Class of 2008" }).click();
  await expect(page.getByRole("heading", { name: "Class of 2008 cohort" })).toBeVisible();
});

test("a member posts a job and lists a business", async ({ page }) => {
  const id = unique();
  const u = await createLogin(`jobs-${id}@example.com`);
  registerInDb(u, `Jabali ${id}`, `0733${Date.now() % 1000000}`.slice(0, 10), 2012);
  await logIn(page, `jobs-${id}@example.com`);

  await page.goto("/app/opportunities/jobs");
  await page.getByRole("button", { name: "Post a job" }).click();
  await page.locator("#title").fill(`Accountant ${id}`);
  await page.locator("#organisation").fill("Kisii Traders");
  await page.locator("#location").fill("Kisii");
  await page.locator("#applyUrl").fill("https://example.com/apply");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Posted. Members can see it now.")).toBeVisible();
  await page.goto("/app/opportunities/jobs?show=all");
  await expect(page.getByRole("heading", { name: `Accountant ${id}` })).toBeVisible();

  await page.goto("/app/opportunities/business");
  await page.getByRole("button", { name: "List your business" }).click();
  await page.locator("#name").fill(`Jabali Agrovet ${id}`);
  await page.locator("#description").fill("Animal feeds and vet supplies for dairy farmers.");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Listed. Fellow members can find it now.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: `Jabali Agrovet ${id}` })).toBeVisible();
});

test("a member shares a story and an official publishes it", async ({ page, browser }) => {
  const id = unique();
  const u = await createLogin(`story-${id}@example.com`);
  registerInDb(u, `Stella ${id}`, `0744${Date.now() % 1000000}`.slice(0, 10), 2003);
  await logIn(page, `story-${id}@example.com`);
  await page.goto("/app/stories");
  await page.getByLabel("Title").fill(`From Menyenya to medicine ${id}`);
  await page.getByLabel("The story").fill("Saturdays in the chemistry lab taught me that a failed experiment is only the first result. Today I am a surgeon.");
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText(/The officials will read your story/)).toBeVisible();

  const adminEmail = `admin-${id}@example.com`;
  await createLogin(adminEmail);
  sql(`select public.bootstrap_admin('${adminEmail}')`);
  const admin = await (await browser.newContext()).newPage();
  await logIn(admin, adminEmail, "/admin/stories");
  await admin.getByRole("link", { name: `From Menyenya to medicine ${id}` }).click();
  await admin.getByRole("button", { name: "Approve and publish" }).click();
  await expect(admin.getByText("Published. It is now on the website.")).toBeVisible();

  await page.goto("/stories");
  await expect(page.getByText(`From Menyenya to medicine ${id}`).first()).toBeVisible();
});

test("the Secretary posts a way to help and a member signs up", async ({ page, browser }) => {
  const id = unique();
  const sec = await createLogin(`sec-${id}@example.com`);
  const mem = await createLogin(`vol-${id}@example.com`);
  registerInDb(sec, `Sara ${id}`, `0755${Date.now() % 1000000}`.slice(0, 10), 1999);
  registerInDb(mem, `Victor ${id}`, `0766${Date.now() % 1000000}`.slice(0, 10), 2015);
  sql(`insert into public.role_assignments (person_id, role_id, scope_type)
       select p.id, r.id, 'association' from public.persons p, public.roles r where p.full_name = 'Sara ${id}' and r.key = 'secretary'`);

  const secretary = await (await browser.newContext()).newPage();
  await logIn(secretary, `sec-${id}@example.com`, "/app/opportunities/volunteer");
  await secretary.getByRole("button", { name: "Post a way to help" }).click();
  await secretary.locator("#title").fill(`Career day speakers ${id}`);
  await secretary.locator("#place").fill("Menyenya");
  await secretary.getByRole("button", { name: "Post", exact: true }).click();
  await expect(secretary.getByText(/Posted\. Members whose skills match/)).toBeVisible();

  await logIn(page, `vol-${id}@example.com`, "/app/opportunities/volunteer");
  const card = page.locator("li", { has: page.getByRole("heading", { name: `Career day speakers ${id}` }) });
  await card.getByRole("button", { name: "I'll help" }).click();
  await expect(card.getByText("You’re helping. Asante!")).toBeVisible();
});

test("the public site and key pages open", async ({ page }) => {
  for (const path of ["/", "/who-we-are", "/causes", "/causes/tuition-block", "/causes/bursary-fund", "/stories", "/reports", "/businesses", "/our-people", "/shop"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});
