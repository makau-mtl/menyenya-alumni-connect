# CLAUDE.md — Menyenya (MHS) Alumni Connect

The full build specification is in `docs/SPEC.md`. Read the relevant sections before any work. Progress is tracked in `docs/PROGRESS.md`.

## Who you are working with
The product owner is **not a developer**. Explain what you did in plain language, say exactly how to try it, and list anything they must do themselves (add a key, change a setting). Avoid jargon or explain it in one line.

## How we work
- Work on **one milestone at a time** (SPEC §17). Start each milestone with a short written plan and wait for approval before coding.
- Never invent requirements. If something is unclear, ask. Open product decisions are listed in SPEC §19.
- Keep changes small and commit often with clear messages. One feature per branch; open a pull request so a preview deployment is created.
- After each milestone: tests pass, `README.md` and `docs/PROGRESS.md` are updated, and you give a short summary.

## Non-negotiable rules (SPEC §1)
- The platform records money; it never holds it. Each fund pays into a named institutional account (tuition block → school Board of Management project account; other funds → association account).
- Money is never stored as an editable balance. Payments and disbursements are append-only; totals come from views.
- Never hard-delete financial or personal records; use status changes.
- Row-Level Security on **every** table, default deny. Check access with `has_role()`. Never rely on the UI alone.
- Payment callbacks must be idempotent (`UNIQUE(provider, provider_reference)`).
- One record per person; flag duplicates, never auto-merge.
- Next of kin, welfare and beneficiary data are restricted and access is logged.
- Never put secrets in code or commit `.env*` files (except `.env.example`). Never use the Supabase service role key in browser code.
- No new paid services or heavy libraries without approval. Keep it cheap and fast on low-end phones.

## Stack
Next.js (App Router, TypeScript), Tailwind + shadcn/ui, Supabase (Postgres, Auth, Storage, Realtime, Edge Functions, pg_cron), Zod, Resend, Daraja (M-Pesa), Vitest, Playwright, Vercel.

## Commands (keep this section updated)
- `npm run dev` — run locally
- `npm run test` — unit tests
- `npm run test:e2e` — end-to-end tests
- `npm run lint` / `npm run typecheck`
- Database changes: add a new SQL file in `supabase/migrations/`; never edit an applied migration.
