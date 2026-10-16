# Progress

## 16 October 2026: logo

- The association's logo is **mhs.alumni** (chosen by the product owner). It is in the website header and footer, and is the browser tab and phone home-screen icon.
- Logo files for print and social media are in `public/brand/`; usage, colours and fonts in `docs/BRAND.md`.


## 16 October 2026 (evening): M3, registration

Agreed with the product owner first, and written into the spec (§4.3, §5.1, §5.2, §6.2, §6.4, §12, decisions log).

**Built**
- Sign in first with Google or LinkedIn (buttons appear once switched on), or an emailed one-time link. No member passwords; officials keep a password option for now. Signing in never creates a member.
- Registration in short steps with a progress bar: About you → Your Menyenya link → Where you live → Membership level (alumni only) → Consents and finish, with a summary and Change links. Answers survive a refresh and clear when the tab closes.
- Phone with a country picker, Kenya by default, saved as +254… with the country.
- Regions are the former provinces plus Diaspora; the region fills itself from the county.
- A suggested membership level from the year left and what the member does now (never Impact). Friends have no level.
- One database function saves everything at the end: links to an existing donor record by verified email, flags (never merges) shared phones, emails or same name in the same class, records consents, adds a fee only if one applies and fees are switched on, and queues the welcome email.
- Class invite links that fill in the class and record who invited.
- Welcome page, My account (profile completeness) and My profile: passport-style photo (private, members only), one-line summary, work, skills, LinkedIn and other links, mentoring by level, volunteering, welfare and emergency contact, and privacy choices (each change kept as history).
- Next of kin: the member and the Welfare Coordinator only; the coordinator's views go through a logged function with a reason.
- Member photos: seen by the member, administrators, and other members only while the member agrees to be in the directory.
- Admin → Members: registration switch, class invite links, member list with filters, duplicate count.
- Guard rails: members can't change their own status or verification, or create profiles directly.
- `give_role()` for giving officials roles from the SQL editor.
- Draft privacy policy at /privacy, for the officials and a legal adviser to confirm.
- Tests: 46 database tests (16 new on registration, sign-in, next of kin, photos and fees), 23 unit tests.

**For the product owner**: `docs/SETUP-SIGN-IN.md` (Google, LinkedIn, Supabase settings, Vercel variable).

**Not yet**: welcome emails are queued but sent once the association's email domain and Resend are set up; member directory and public profiles (M6); verification by class reps (M6); fee amounts and the fees switch are set in the database until the settings screen.


## 16 October 2026 (afternoon): M2, the site updates itself

**Built**
- Admin area with tabs, shown by role: Overview (Chairman, Treasurer, admins), Causes and Photos and video (admins), News and events (admins and the Secretary).
- Cause editor: title, summary, story, parts, launch checklist (tick, reorder, add), target, stage, who can see it, pledges on or off.
- Photo galleries per cause, with captions, a cover photo and hide/show. Cover photos show on Our work and Donate.
- 23 named photo spaces across Home, Who we are, Ways to give, Join and Careers, filled from the admin area.
- The Chairman's video is set by pasting a YouTube link.
- News and events editor with drafts, optional full story (adds a news page) and photo. The three starting items moved into the database.
- Photos are shrunk in the browser to two WebP copies (1600px, 800px) before upload; phones load the small one.
- Database: new tables for cause photos, site photos, site settings and news, all with access rules and audit logging; a public `site-media` storage bucket that only admins (any folder) and the Secretary (news folder only) can upload to. Who made each change is stamped by the database, not the browser.
- Tests: 7 new database tests on who can edit what, 4 new unit tests. 51 tests in total.
- After the database went live: header shows My account and Log out when signed in; menus close after moving to a new page.

**For the product owner**: `docs/HOW-TO-UPDATE-THE-SITE.md` (including how to give the Secretary a role until the roles screen arrives).

**Not yet**: roles screen (M9), editing the mission, leadership names and other fixed text (still in `src/content/site.ts`).


## 16 October 2026: M1, database, roles and admin sign-in (with giving brought forward)

**Built**
- Six database migrations (`supabase/migrations`): people and contacts, membership profiles, next of kin, consents, duplicate flags; pick lists (categories, levels, clusters, counties, classes 1975–2026); roles with scope and term, and the `has_role()` check; payment channels, funds, causes, gifts, recurring gifts, pledges, payments and allocations; audit log and sensitive-access log; starting data including the plenary's founding pledges.
- Access rules on every table. Visitors give only through `give()` and `make_pledge()`, which validate, match or create the person, flag possible duplicates, and return a reference with a private receipt token.
- Money safeguards: payments can't be recorded twice, edited (except status) or deleted; allocations can't exceed the payment.
- 23 database tests against a local Postgres, including class reps seeing only their class and next of kin hidden from reps.
- Website: giving and pledging save to the database when connected; the thank-you page needs the private token; progress comes from the database.
- Sign-in: email and password, emailed sign-in link, Google (once switched on). `/admin` shows totals, latest pledges and gifts to the Chairman, Treasurer and administrators.
- GitHub workflows: **Checks** (lint, types, tests, build) and **Database** (applies migrations to Supabase).

**For the product owner**: follow `docs/SETUP-SUPABASE.md`.

**Not yet**: registration saving (M3), payment entry and imports (M4), emails (confirmation messages say "will be sent").

## 15 October 2026 (evening): public website redesigned

Following feedback, the public site now follows the pattern of Trees for the Future's site.
- Header on every page: Who we are, Our work, Ways to give, News and events, plus Log in, Join and Donate.
- Home: hero with Donate and Join, the Chairman's video message, who we are, the tuition block, "Your support, your choice", news and events, closing call to action.
- New pages: Who we are (mission, story, what we do, vision, values, governance), Leadership and secretariat, Careers, Ways to give, Donate, Join (with the registration form, preview only), Log in (preview only), News and events, Contact.
- Photo and video spaces show what belongs in each until real photos and the Chairman's video are supplied.
- Mission, vision, values, story and leadership titles are drafts for the officials to approve (`src/content/site.ts`).

## 15 October 2026: project set up and first public screens (preview)

**Built**
- Project: Next.js (App Router, TypeScript), Tailwind CSS, Zod validation, Vitest tests, brand fonts (Domine, Nunito Sans) served locally.
- Home page with the tuition block shown as a wall of 100 bricks (each KES 1M), filled from the plenary's founding pledges (KES 3.41M from 18 members).
- Causes list and cause pages: tuition block (in "Preparing for launch" mode with the launch checklist), Where most needed, Keep a child in school.
- Give form (3 steps: amount, details, payment) and pledge form (monthly, quarterly, yearly, one amount, in kind), in record-only mode.
- Thank-you page with the reference (MSA-YYYY-NNNNNN for pledges, MSA-D-YYYY-NNNNNN for gifts), how to pay, the account money goes into, and an invitation to join.
- Holding pages for Join, Track my pledge and About.

**Preview limits**
- Data is sample data held in memory; anything entered is lost when the server restarts. Supabase replaces this in M1.
- Paybill numbers are not shown until the Board of Management confirms its account.
- No photos or drawings yet; the cause page shows where they will go.

**Next**
- M1: Supabase project (needs the association's account), database tables and access rules, admin sign-in.
- Registration form (/join), then the admin cause editor.
- Deploy a preview link for the Technical Committee showcase in mid-November.
