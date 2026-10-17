# Progress

## 17 October 2026: member area redesign and dashboard

- **Layout:** members stay inside the website, with tabs under the header on laptops and an app-style bottom bar on phones. Officials get a separate admin workspace with a side menu. Built with shadcn/ui in our colours. The site can be added to a phone's home screen.
- **Dashboard:** digital membership card; "Waiting for you" action centre; your class (faces, ranking, invite on WhatsApp with your own link, class WhatsApp group); Who's around?; memories; members in numbers; the school today; initiatives; news; shortcuts.
- **New pages:** The school today (rate each priority 1–5 and comment), Meet-ups, Memories, Raise a case for support.
- **New admin tabs:** The school (figures, results, priorities and members' views), Cases for support (conversation, internal notes, status; opening a case is logged).
- **Profile:** optional gender (only overall figures). **Confirm members** shows only for configured confirmers.
- Tests: 15 new database tests; 112 pass.

## 17 October 2026: membership standing (Active / Inactive)

- Members see a card on their home page: **Active** (eligible to vote and take part in decisions) or **Inactive**, with what to do next.
- Rules: active for each calendar year paid for; last year's payers stay active until 31 March; no arrears, pay only for the year you want; no payment needed while membership fees are off (as now).
- When member confirmation is switched on, a member is active only once confirmed; when it is off, they are active as soon as they register.
- Administrators see a **Standing** column and an *Active (can vote)* / *Inactive* filter on the members list.
- Paid years are recorded once and never changed; M4 will record them from fee payments.
- Still to come: renewal reminder emails (needs email set up) and the voting tools that use this.
- Tests: 4 new database tests; 99 pass.

## 17 October 2026: Alumni merchandise

- New page **Alumni merchandise** (`/shop`), under Ways to support: items with photos, prices and sizes or colours; an order panel with the total; and the order form. Anyone can order.
- After sending, the buyer gets a reference (e.g. MER-7K2QXP) and the next steps: we call to confirm, they pay through the official Paybill using the reference, then collect.
- New admin tab **Merchandise** for administrators, the Secretary and the Treasurer: orders (New → Confirmed → Paid → Ready to collect → Collected, or Cancelled, with notes) and items (add, price, sizes, photo, order, hide).
- Orders keep the price at the time; changing a price only affects new orders. Nothing is deleted. One phone can send at most five orders a day.
- Tests: 4 new database tests; 95 pass.

## 17 October 2026: Ways to support (sponsors and partners)

- The menu "Ways to give" is now **Ways to support**, with two new pages: **Corporate sponsorships** and **Strategic partnerships**, modelled on trees.org.
- Each page: photo hero, why support us, option cards (what's included and the amount, or "Amount on request"), a wall of sponsor or partner logos, what the support builds, common questions, an enquiry form, and links to other ways to support. Wording is marked as a draft for the officials.
- Sponsors and partners marked for the home page appear in a logo strip there.
- New admin tab **Sponsors and partners**: read and mark enquiries, add logos, write the options and set amounts once approved.
- Enquiries are private to administrators; one email address can send at most five a day, and a hidden field catches spam.
- Also carried in: the Our people redesign, and the decisions on membership standing (calendar year, grace to 31 March, no arrears).
- Tests: 4 new database tests; 91 pass.

## 17 October 2026: Our people page

- New public page **Our people** (`/our-people`), replacing "Leadership and secretariat". Three tabs that stay at the top while scrolling: Leadership, Secretariat, Members.
- Each person has a card with photo, name and role or class. The round green arrow opens a short pop-up: role, class, official capacity, summary and LinkedIn. No phone or email.
- Signed-in members also see term dates in the pop-up; the public never does.
- New admin tab **Our people**: add a position (e.g. Chair, or School Principal (ex officio)), pick the holder from active members or type a non-member's name, set a term or "no fixed term", order, hide or remove. A "Terms ending" alert appears 30 days before a term ends.
- The Members section lists members with a public profile, plus anyone holding a position. Search and class filter.
- Menu, footer and About links now say "Our people"; the old address redirects.
- Tests: 4 new database tests (who sees term dates, who appears publicly); 87 tests pass.

## 17 October 2026: everyone in the directory

- Every current member appears in the member directory for signed-in members (no opt-out; terminated members drop out). Their photo is visible to fellow members.
- Members choose who sees their phone and email: only the association (default), their class, or all members. The member card shows Call, WhatsApp and Email when allowed.
- Registration consent and the privacy policy say so plainly; the directory tick-box is gone.


## 17 October 2026: M6, member area

**Built**
- Member directory for signed-in members: photo tiles with name, class ("Class of 2009") or a "Friend" label, region and one-line summary; search (name, profession, employer, skills) and filters (class, region, alumni/friends, mentoring); pages of 48. Only members who agreed to be listed; never phone or email.
- Member card with summary, work, skills, mentoring and volunteering, LinkedIn and other links.
- Public profile at /people/<id> for members who switched it on: name, class, summary, photo and links only.
- Member area tabs: My account, Member directory, Confirm members (when there are people to confirm), Admin.
- Confirmation setting (Admin → Settings): on or off; who confirms alumni and who confirms friends (class rep for their class, regional rep for their region, verifier, administrator). Confirmers get a list with Confirm and Flag (with a note). Nobody confirms themselves.
- Roles screen (Admin → Roles): give a role for the whole association, a class, a region or a committee; end a role (kept on record). Administrators can't give themselves roles.
- Duplicates (Admin → Duplicates, also verifiers): side-by-side comparison; keep one record and merge (gifts, pledges, payments and login move; contacts copied; nothing deleted) or mark as different people; administrators can undo a merge.
- Terminate membership: red button, a page with the disclaimer (immediate end, no refunds, fees forfeited, pledges stay, rejoin window), optional reason, optional data deletion, a tick-box and typing TERMINATE. Rejoin within the window (Admin → Settings, default 30 days) restores status and choices and cancels a deletion request. Members list shows terminations and deletion requests.
- Status "exited" renamed "terminated".
- Tests: 11 new database tests (83 in total).

**Not yet**: carrying out deletions, the deletion certificate and automatic anonymisation (M9); emails (wait for the web address).


## 16 October 2026: build order changed

M4 (recording payments) is deferred until the Board of Management's Paybill and the association's web address are ready. Next: M6 (member area), then M5 (testing and soft launch), then M4, then M7–M11. The web address is parked until the official association name is confirmed.


## 16 October 2026 (late): decisions recorded

- Spec §6.3a: terminating membership (red button, confirmation and disclaimer, no refunds), admin-set rejoin window (default 30 days), data deletion only with termination and carried out when the window closes, deletion certificate, automatic anonymisation (24 months; financial records 7 years). Scheduled in M6 (termination, rejoin, deletion request) and M9 (deletion job, certificates, automatic anonymisation).
- My account: "Continue building my profile" until the profile is complete, then "Edit my profile".


## 16 October 2026 (night): profile polish

- Names typed all in capitals or lower case are tidied automatically (existing records too).
- The Google or LinkedIn photo is used by default until a member uploads their own; a "Use my Google photo" button for existing members.
- Clearer consent at registration: "I agree to the association processing my personal data (required)".
- Skills: type to search a shared list of about 200 skills, Enter to add; unlisted skills can still be added.
- Optional fields are labelled "(optional)".
- Emergency contact removed from the profile; it will come with the opt-in welfare programme.


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
