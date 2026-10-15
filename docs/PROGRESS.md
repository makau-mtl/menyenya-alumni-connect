# Progress

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
