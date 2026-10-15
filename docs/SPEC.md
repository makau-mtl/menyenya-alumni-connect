# Menyenya (MHS) Alumni Connect — Build Specification

**Product:** Menyenya (MHS) Alumni Connect — the digital platform of the Menyenya SDA High School Alumni Association
**Status:** Build spec v1.0 (derived from the System Overview, 9 Oct 2026)
**Prepared by:** Miribo Technologies (pro bono build)
**Audience:** AI coding agent (Claude Code) and any developer implementing or maintaining the system
**Scope:** Full stack — database, server logic, web app (PWA), integrations. Phases 0–1 are specified in build-ready detail; Phases 2–4 are specified at feature level and will be detailed before they start.

---

## 0. How to use this document (instructions for the AI coding agent)

1. **Build one milestone at a time** (see §17). Do not start a milestone until the previous one passes its acceptance checks.
2. **Plan before coding.** For each milestone, first produce a short plan (files, tables, migrations, pages, tests) and wait for approval.
3. **Never invent requirements.** If something is unclear or missing, list it as a question rather than guessing. Product decisions belong to the product owner.
4. **Security and money rules in §1 are non-negotiable.** If a shortcut would break one, stop and ask.
5. **Every milestone ships with tests** (§15) and an updated `README.md` and `docs/PROGRESS.md`.
6. **Explain in plain language.** The product owner is not a developer. After each milestone, summarise what was built, how to try it, and anything they must do (e.g. add a key, click a setting).
7. **Keep it simple and cheap.** Prefer built-in features of the chosen platform over adding new services. No paid third-party service may be added without approval.

---

## 1. Purpose & Non-Negotiables

The platform builds the association's first digital membership database, lets anyone give to clearly defined causes (starting with the KES 100M tuition block), and grows into the association's operating system: events, initiatives, welfare, mentorship, chat, governance and a merchandise shop.

It holds personal data and records of money. Therefore:

- **Money is never stored as a mutable balance.** Payments and disbursements are append-only records. Totals and balances (pledged, paid, fund balance) are always computed from those records (views / queries), never edited by hand.
- **Nothing financial or legally relevant is hard-deleted.** Use status changes (e.g. `cancelled`, `void`, `reversed`). Corrections are new records that reference the original.
- **Access control is enforced in the database** (Postgres Row-Level Security), not only in the UI. A user who calls the API directly must still be unable to read or change data outside their role.
- **Every state-changing action on people, roles or money is audited** — who, what, when, before/after.
- **All payment callbacks are idempotent.** A repeated M-Pesa or card callback must never record a payment twice.
- **One record per person.** A person can donate, pledge, register, buy and attend without ever being duplicated. Duplicates are flagged for a human to merge; never merged automatically.
- **Privacy by default** (Kenya Data Protection Act 2019): collect only what is needed, record consent, restrict sensitive data (next of kin, welfare cases, student beneficiaries), allow members to export and request deletion of their data.
- **Configuration over code.** Clusters, cohorts, categories, membership levels, causes, event types, approval workflows, roles and pick lists are admin-editable data.
- **Near-zero running cost.** Free tiers wherever possible. No paid add-on services without approval.
- **Owned by the association.** All accounts (domain, hosting, database, repository, payment) are registered to the association. Code lives in the association's GitHub organisation.

---

## 2. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One codebase for public site, member area and admin |
| UI | **Tailwind CSS + shadcn/ui** | Mobile-first; accessible components |
| Database | **Supabase Postgres** | RLS on every table; SQL migrations in `supabase/migrations` |
| Auth | **Supabase Auth** | Email + password, Google sign-in; email OTP for donor pledge tracking |
| File storage | **Supabase Storage** | Images compressed in the browser before upload; private buckets for sensitive files |
| Realtime (chat) | **Supabase Realtime** | Group chats; no paid chat service |
| Server logic | Next.js server actions / route handlers + **Supabase Edge Functions** | Webhooks (M-Pesa, card) run as Edge Functions or route handlers |
| Scheduled jobs | **pg_cron** (+ Edge Functions) | Reminders, statements, reconciliation |
| Email | **Resend** (free tier) behind an `EmailProvider` interface | Receipts, reminders, OTP |
| WhatsApp | **WhatsApp Cloud API** behind a `MessagingProvider` interface | Optional, switchable per message type (it costs per message) |
| Push notifications | **Web Push (VAPID)** | Free; PWA |
| PWA | **Serwist** (or equivalent Next.js PWA tooling) | Installable, offline cache of recently viewed pages |
| Payments — M-Pesa | **Safaricom Daraja** (STK Push, C2B Paybill) behind a `PaymentProvider` interface | Sandbox first |
| Payments — cards | **Paystack** (Kenya) behind the same interface | Phase 2; see §19 open decisions |
| PDFs | Server-side PDF generation (e.g. `@react-pdf/renderer`) | Receipts, statements, annual reports |
| Validation | **Zod** | Every form and every API input |
| Testing | **Vitest** (unit), **Playwright** (end-to-end), SQL tests for RLS | §15 |
| Hosting | **Vercel** for the web app; Supabase cloud for data | See §16 on plan terms |
| Source control | **GitHub** (association organisation) | Main branch protected; preview deploy per branch |

Money is stored as `NUMERIC(14,2)` with a `currency` column (default `KES`). Never floats. Amounts in API payloads are strings (`"1500.00"`).

Dates and times are stored as `TIMESTAMPTZ`; the display timezone is `Africa/Nairobi`.

---

## 3. Product Surfaces

One web app with three areas:

| Area | Who | Purpose |
|---|---|---|
| **Public site** (`/`) | Anyone, no login | About, news, causes and campaign pages, events, shop (later), donate/pledge, track a pledge, register |
| **Member area** (`/app`) | Signed-in members | Member home (role centre), profile & "My Menyenya", directory, events, chats, mentorship, giving history |
| **Admin area** (`/admin`) | Office-holders, reps, admins | Members & verification, causes & campaigns, payments entry & reconciliation, events & approvals, reports, configuration |

All three are the same Next.js app with route groups and role checks. The admin area is mobile-usable but optimised for desktop.

---

## 4. Roles & Permissions

### 4.1 Model

- Permissions come from **role assignments**, not from a fixed role column on the user.
- A role assignment = `person` + `role` + **scope** + **term**.
  - **Scope types:** `association`, `cohort`, `cluster`, `committee`, `cause`, `school`.
  - **Term:** `starts_on`, `ends_on` (nullable). Expired assignments grant nothing.
- Office-holders hand over by ending one assignment and starting another. Records stay with the role/scope, not the individual.
- A Postgres function `has_role(role_key text, scope_type text default null, scope_id uuid default null) returns boolean` is the single check used by RLS policies and server code.

### 4.2 Roles (seed data; admin can add more)

| Role key | Scope | Can |
|---|---|---|
| `member` | self | Profile, directory, group chats, events, mentorship, welfare requests, giving history |
| `cohort_rep` | cohort | Verify and manage members of their cohort; cohort dashboard; propose cohort events; moderate cohort chat |
| `cluster_rep` | cluster | Manage members of their cluster; cluster dashboard; propose cluster events; moderate cluster chat |
| `verifier` | association | Verify friends of the alumni; resolve duplicate flags |
| `chair` | association | Approve association-wide events; final approvals; all reports |
| `vice_chair` | association | Deputise for chair; holds chair approvals when delegated |
| `secretary` | association | Governance records, meetings and minutes, official communications |
| `treasurer` | association | Payment entry and reconciliation, approve disbursements, financial reports |
| `welfare_coordinator` | association | (Welfare module only) Coordinate cases, open appeals, see next of kin when a case needs it |
| `events_coordinator` | association | Approve cohort and cluster events; escalate association-wide events to chair |
| `committee_member` | committee | Manage cases/matches/events for that committee; approve within workflow steps |
| `admin` | association | Users and role assignments, configuration, data quality, comms, shop operations |
| `school_liaison` | school | Student nominations, event approvals involving the school, project updates |

Visitors (no account) and organisation donors have no role; they use public flows only.

### 4.3 Rules

- Enforce in RLS **and** in server actions (defence in depth).
- A person can never approve their own request (events, disbursements, welfare).
- Only `admin` can create or end role assignments; every change is audited.
- Sensitive data access (next of kin, welfare cases, student beneficiaries) is limited to the listed roles and is itself logged.

---

## 5. Database Schema

Conventions: every table has `id UUID PK DEFAULT gen_random_uuid()`, `created_at`, `updated_at` (trigger-maintained) unless noted. Status enums instead of deletes. RLS enabled on **every** table, default deny.

Below, `→` means foreign key. Only key columns are listed; the agent should add obvious supporting columns and indexes (every FK indexed).

### 5.1 People & identity

**`persons`** — anyone the association has a record of (members, donors, buyers, attendees).
| Column | Type | Notes |
|---|---|---|
| full_name | TEXT NOT NULL | |
| display_name | TEXT | optional preferred name |
| status | ENUM('active','merged','deleted_on_request') | `merged` points to `merged_into_id` |
| merged_into_id | UUID → persons NULL | |
| user_id | UUID → auth.users NULL UNIQUE | set when the person has a login |

**`person_contacts`** — a person can have several phones and emails.
| Column | Type | Notes |
|---|---|---|
| person_id | UUID → persons | |
| kind | ENUM('phone','email') | |
| value | TEXT | phones stored E.164 (`+2547…`); emails lower-cased |
| is_primary | BOOLEAN | one primary per kind |
| is_whatsapp | BOOLEAN | phones only |
| verified_at | TIMESTAMPTZ NULL | |

**`organizations`** — company, church, SACCO, foundation, school, other.
| Column | Type | Notes |
|---|---|---|
| name | TEXT | |
| org_type | ENUM('company','church','sacco','foundation','ngo','school','other') | |
| contact_person_id | UUID → persons | |

**`member_profiles`** — one per registered member.
| Column | Type | Notes |
|---|---|---|
| person_id | UUID → persons UNIQUE | |
| category_id | UUID → member_categories | Alumnus / Friend of the alumni / … |
| level_id | UUID → membership_levels | member-chosen, changeable |
| cohort_id | UUID → cohorts NULL | required for alumni |
| admission_year | INT NULL | optional |
| year_left | INT NULL | required for alumni |
| relationship_to_school | TEXT NULL | required for friends (pick list + other) |
| home_county | TEXT | Kenya counties pick list + "Outside Kenya" |
| cluster_id | UUID → clusters | member-chosen |
| occupation_status | ENUM('employed','business','self_employed','studying','seeking','other') NULL | |
| profession | TEXT NULL | |
| employer_or_business | TEXT NULL | |
| profile_link | TEXT NULL | LinkedIn / portfolio / business site |
| products_services | TEXT NULL | |
| skills | TEXT[] | |
| willing_to_volunteer | BOOLEAN DEFAULT false | |
| mentoring_offer | ENUM('none','can_mentor','wants_mentor') | allowed values depend on level flags |
| membership_status | ENUM('registered','verified','active','lapsed','exited') | `active` = paid-up when fees are on |
| verified_by | UUID → persons NULL | |
| verified_at | TIMESTAMPTZ NULL | |
| invited_by_person_id | UUID → persons NULL | from invite link |
| registration_source | TEXT | e.g. `web`, `post_donation`, `invite`, `import` |
| directory_visibility | JSONB | per-field: `members` / `cohort` / `hidden` |

**`next_of_kin`** — required at registration; highly restricted.
| Column | Type | Notes |
|---|---|---|
| person_id | UUID → persons | |
| name | TEXT NOT NULL | |
| relationship | TEXT NOT NULL | |
| phone | TEXT NOT NULL | |

Visible only to the member themself, `admin`, and `welfare_coordinator` (and reps on an active welfare case). Every read by someone other than the member is logged in `sensitive_access_log`.

**`consents`**
| Column | Type | Notes |
|---|---|---|
| person_id | UUID → persons | |
| purpose | ENUM('membership_data','email_updates','whatsapp_updates','directory_listing','impact_updates','media_use') | |
| granted | BOOLEAN | |
| granted_at / withdrawn_at | TIMESTAMPTZ | history kept (new row per change) |
| wording_version | TEXT | which consent text they saw |

**`duplicate_flags`**
| Column | Type | Notes |
|---|---|---|
| person_a_id / person_b_id | UUID → persons | |
| reason | TEXT | e.g. `same_phone`, `same_email`, `same_name_cohort` |
| status | ENUM('open','merged','not_duplicate') | resolved by `verifier` or `admin` |

### 5.2 Structure & pick lists (all admin-editable)

- **`member_categories`** (name, description, required_fields JSONB, active)
- **`membership_levels`** (name, description, offers TEXT, fee_amount, fee_type ENUM('none','one_off','annual'), can_mentor BOOLEAN, can_request_mentor BOOLEAN, sort_order, active)
- **`clusters`** (name, description, active) — seed: Nairobi, Kisii, Nyamira, Nakuru, Eldoret, Kisumu, Mombasa, Diaspora
- **`cohorts`** (year_left INT UNIQUE, label e.g. "Class of 2010")
- **`interest_groups`** (name, description)
- **`group_memberships`** (person_id, group_type, group_id)
- **`streams`, `dorms`, `teachers`, `clubs`** (name, active) — pick lists for "My Menyenya"

### 5.3 Roles & governance

- **`roles`** (key, name, description, allowed_scope_types TEXT[])
- **`role_assignments`** (person_id, role_id, scope_type, scope_id NULL, starts_on, ends_on NULL, assigned_by, notes)
- **`committees`** (name, purpose, active)
- **`meetings`** (title, scope_type, scope_id, scheduled_at, status, minutes_text, minutes_file_path)
- **`documents`** (title, category ENUM('constitution','policy','minutes','financial_report','audit','plan','other'), visibility ENUM('public','members','officeholders'), file_path, published_at)

### 5.4 Giving

**`funds`** — ring-fenced pots of money.
| Column | Type | Notes |
|---|---|---|
| name | TEXT | e.g. "Tuition Block Fund", "General Fund", "Needy Students Fund", "Welfare Fund" |
| account_holder | ENUM('school_bom','association') | who holds the receiving account. The Tuition Block Fund is `school_bom`: money goes directly into a dedicated project account held by the school's Board of Management, never through the association. General, welfare and membership funds are `association`. |
| payment_channel_id | FK → `payment_channels` | the Paybill/bank account this fund receives into |
| account_reference | TEXT | bank / Paybill account label shown to donors |

**`payment_channels`** — one row per receiving account (e.g. "BoM Tuition Block Paybill", "Association Paybill").
| Column | Type | Notes |
|---|---|---|
| name, holder | TEXT, ENUM('school_bom','association') | |
| paybill_number, bank_name, bank_account_name, bank_account_number | TEXT | display details for record-only mode and receipts |
| daraja_credentials_ref | TEXT NULL | name of the secret holding this channel's Daraja keys (never the keys themselves) |
| active | BOOLEAN | |

Callbacks are routed per channel (a separate secret callback path per channel). Receipts state which account the money went to, e.g. "Received into the Menyenya SDA High School Board of Management Tuition Block project account". The platform records and reports; it never holds money. For the tuition block, reports are reconciled against BoM statements shared through the alumni representative on the school's project committee.

**`causes`** — what donors see.
| Column | Type | Notes |
|---|---|---|
| slug | TEXT UNIQUE | for URL and QR code |
| title, summary, story_md | TEXT | problem statement and story |
| kind | ENUM('campaign','ongoing_fund','general','appeal') | `general` = "Where most needed" |
| fund_id | UUID → funds | |
| target_amount | NUMERIC NULL | campaigns |
| official_start_date / end_date | DATE NULL | campaign clock starts at official launch |
| lifecycle | ENUM('draft','in_review','approved','preparation','live','construction','closed') | campaigns use preparation → live → construction → closed |
| visibility | ENUM('public','members') | |
| pledges_enabled | BOOLEAN | |
| pledge_list_visibility | ENUM('public','members','hidden_totals','hidden') | Newlife-style public list when `public` |
| donor_name_display | ENUM('full','first_initial','anonymous') | default display; donor may always choose anonymous |
| preset_amounts | NUMERIC[] | |
| recurring_periods | TEXT[] | subset of monthly, quarterly, annually |
| suggested_pledge_levels | JSONB | e.g. `[{"label":"KES 1,000/month × 36","amount":"36000","sweet_spot":true}]` |
| sponsorship_unit_label / amount / units_needed | TEXT / NUMERIC / INT NULL | e.g. "One term's fees" |
| target_levels | UUID[] NULL | optional targeting by membership level |
| owner_committee_id | UUID → committees NULL | |
| workflow_definition_id | UUID → workflow_definitions | approval before publishing |

**`bq_items`** (cause_id, name, quantity, unit, unit_cost, adopted_by_person_id / org_id NULL, status)

**`media_assets`** (owner_type ENUM('cause','event','news','product','welfare_case'), owner_id, media_type ENUM('image','video_embed','pdf'), purpose ENUM('problem','design','progress','impact','general'), storage_path or youtube_url, caption, sort_order, taken_on DATE NULL, consent_recorded BOOLEAN)

**`donations`** — a gift paid now (once, or one occurrence of a recurring gift).
| Column | Type | Notes |
|---|---|---|
| reference | TEXT UNIQUE | e.g. `MSA-D-2026-000123` |
| cause_id | UUID → causes | |
| donor_person_id | UUID → persons | always created/linked, even for guests |
| donor_org_id | UUID → organizations NULL | when "donate as organisation" |
| amount, currency | NUMERIC, TEXT | |
| cover_fees_amount | NUMERIC DEFAULT 0 | |
| dedication | TEXT NULL | in honour/memory of |
| comment | TEXT NULL | |
| is_anonymous | BOOLEAN | hides name publicly; admins still see it |
| impact_updates_opt_in | BOOLEAN | |
| recurring_gift_id | UUID → recurring_gifts NULL | |
| status | ENUM('initiated','paid','failed','cancelled','refunded') | derived from payments |

**`recurring_gifts`** — a promise to give each period. **Not auto-debited**: the system emails a reminder with a pay link each period.
| Column | Type | Notes |
|---|---|---|
| donor_person_id, cause_id | | |
| amount, currency | | |
| period | ENUM('monthly','quarterly','annually') | |
| next_due_on | DATE | |
| status | ENUM('active','paused','cancelled') | donor can cancel from the link in every email |

**`pledges`** — a commitment paid over time.
| Column | Type | Notes |
|---|---|---|
| reference | TEXT UNIQUE | format `MSA-YYYY-NNNNNN`; used as the Paybill account number |
| cause_id | UUID → causes | |
| pledger_person_id / pledger_org_id | | |
| pledge_type | ENUM('one_time','monthly','quarterly','annual','in_kind') | |
| amount_per_period | NUMERIC NULL | |
| number_of_periods | INT NULL | |
| total_amount | NUMERIC NULL | computed for cash pledges |
| in_kind_description / in_kind_estimated_value | TEXT / NUMERIC NULL | |
| start_date | DATE | |
| is_founding | BOOLEAN | true if made while the campaign is in `preparation` |
| is_anonymous | BOOLEAN | |
| source | ENUM('web','admin_entry','import') | |
| status | ENUM('active','fulfilled','cancelled') | |

Paid and balance for a pledge are always **computed** from `payment_allocations`.

**`pledge_schedules`** (pledge_id, due_on, amount_due) — generated for periodic pledges; used for reminders.

### 5.5 Money

**`payments`** — append-only record of money received. Never updated except `status` transitions recorded with an audit entry.
| Column | Type | Notes |
|---|---|---|
| provider | ENUM('mpesa_stk','mpesa_c2b','card','bank','cash','other') | |
| provider_reference | TEXT | M-Pesa receipt (e.g. `QK12AB34CD`), card ref, bank ref |
| account_reference_entered | TEXT NULL | what the payer typed as Paybill account (C2B) |
| payer_person_id | UUID → persons NULL | |
| payer_phone / payer_name | TEXT NULL | as received from provider |
| amount, currency | | |
| received_at | TIMESTAMPTZ | |
| status | ENUM('pending','completed','failed','reversed') | |
| entry_method | ENUM('webhook','manual','import') | manual = entered by treasurer/admin |
| entered_by | UUID → persons NULL | for manual entries |
| evidence_path | TEXT NULL | e.g. bank slip upload |
| raw_payload | JSONB NULL | provider callback, for forensics |
| UNIQUE(provider, provider_reference) | | hard de-duplication |

**`payment_allocations`** — links a payment (or part of it) to what it pays for.
| Column | Type | Notes |
|---|---|---|
| payment_id | UUID → payments | |
| target_type | ENUM('pledge','donation','membership_fee','event_ticket','order','unallocated') | |
| target_id | UUID NULL | |
| fund_id | UUID → funds | where the money belongs |
| amount | NUMERIC | sum of allocations = payment amount |

Payments that cannot be matched (e.g. wrong Paybill account number) are allocated to `unallocated` and appear in an **admin suspense queue** for manual matching.

**`disbursements`** — money out of a fund (append-only).
| Column | Type | Notes |
|---|---|---|
| fund_id | UUID → funds | |
| cause_id | UUID NULL | |
| category | TEXT | e.g. construction, fees, welfare payout, operations |
| amount, currency | | |
| paid_to | TEXT | |
| paid_on | DATE | |
| reference / evidence_path | TEXT | |
| approval_request_id | UUID → approval_requests | must be approved before recording as paid |
| status | ENUM('requested','approved','paid','void') | |

**`receipts`** (payment_id, receipt_number, pdf_path, sent_to_email, sent_at)

Read models (SQL views): `v_pledge_balances`, `v_cause_progress` (pledged, received, % of target, number of pledgers, last updated), `v_fund_balances` (in − out), `v_cohort_leaderboard`, `v_cluster_leaderboard`.

### 5.6 Events

- **`event_types`** (name, who_can_propose TEXT[] role keys, workflow_definition_id, ticketed BOOLEAN, default_cause_id NULL)
- **`events`** (event_type_id, title, description, organiser_scope_type ENUM('association','cohort','cluster','group'), organiser_scope_id, starts_at, ends_at, venue, budget, involves_school BOOLEAN, linked_cause_id NULL, target_levels UUID[] NULL, status ENUM('draft','submitted','changes_requested','approved','published','completed','cancelled'), approval_request_id)
- **`ticket_types`** (event_id, name, price, capacity)
- **`event_registrations`** (event_id, person_id, ticket_type_id NULL, status, payment_allocation_id NULL)
- **`event_check_ins`** (registration_id, checked_in_at, checked_in_by)

Homecoming is an event type, not a separate module.

### 5.7 Approval workflow engine (shared)

- **`workflow_definitions`** (name, subject_type ENUM('event','cause','disbursement','welfare_case','bursary','other'))
- **`workflow_steps`** (workflow_definition_id, step_order, role_key, scope_mode ENUM('subject_scope','association'), min_approvals INT DEFAULT 1, condition JSONB NULL — e.g. `{"budget_gt": 50000}` or `{"organiser_scope_type":"association"}`)
- **`approval_requests`** (workflow_definition_id, subject_type, subject_id, requested_by, current_step, status ENUM('pending','changes_requested','approved','rejected','withdrawn'))
- **`approval_actions`** (approval_request_id, step_order, actor_person_id, decision ENUM('approve','reject','request_changes'), comment, acted_at)

Seeded defaults:
- Cohort / cluster event: `events_coordinator` → (if `involves_school`) `school_liaison`.
- Association-wide event: `events_coordinator` → `chair`.
- Cause publication: `admin` → `chair`.
- Disbursement: `treasurer` → `chair`.
- Welfare payout (module on): `welfare_coordinator` → `treasurer`.

### 5.8 Modules switched on later (schema in their phase)

- **Welfare (optional, off by default):** `module_settings` row `welfare` with `enabled_scope` (`none` / list of cohort ids / `association`); `welfare_cases` (person_id, case_type, description, reported_by, confirmed_by_rep, status, approval_request_id), `welfare_case_notes`. Appeals are `causes` with `kind='appeal'`, `visibility='members'`.
- **Needy students / sponsorship:** `beneficiaries` (restricted; no public names), `sponsorships` (person_id, cause_id, units, period).
- **Mentorship:** `mentorship_profiles`, `mentorship_requests`, `mentorship_matches`, `mentorship_sessions`.
- **My Menyenya:** `school_life` (person_id, stream_id, dorm_ids, club_ids, positions_held, favourite_teacher_ids, favourite_memory), `connections` (person_a, person_b, kind ENUM('desk_mate','friend'), status ENUM('pending','confirmed')), `invites` (inviter_person_id, token, cohort_id, created_at, accepted_person_id NULL).
- **Chat:** `chat_channels` (scope_type, scope_id, name), `chat_members`, `chat_messages` (channel_id, sender_person_id, body, attachment_path, reply_to_id, status ENUM('visible','removed')), `chat_reports`, `chat_mutes`.
- **Shop:** `products`, `product_variants`, `inventory_movements` (append-only), `orders`, `order_items`, `fulfilments`.
- **Elections (Phase 4):** `elections`, `candidates`, `ballots` (secret; one per eligible member).

### 5.9 Communications, notifications, audit

- **`message_templates`** (key, channel ENUM('email','whatsapp','push'), subject, body, active)
- **`notifications`** (person_id NULL, to_address, channel, template_key, payload JSONB, status ENUM('queued','sent','failed'), provider_message_id, sent_at, error)
- **`push_subscriptions`** (person_id, endpoint, keys JSONB)
- **`news_posts`** (title, body_md, visibility, published_at, cause_id NULL)
- **`audit_log`** — append-only: actor_person_id, action (e.g. `payment.manual_created`, `role.assigned`), entity_type, entity_id, before JSONB, after JSONB, ip, created_at. Written by triggers on money, role and membership tables plus explicit calls from server code.
- **`sensitive_access_log`** — who viewed next of kin / welfare / beneficiary data, when, why.
- **`module_settings`** (module_key, enabled, config JSONB) — feature flags: `welfare`, `mentorship`, `chat`, `shop`, `membership_fees`, `whatsapp`, `card_payments`, `elections`.

---

## 6. Feature Specs — Phase 0–1 (build-ready)

Each feature lists user stories and **acceptance criteria (AC)**. A feature is done only when every AC passes and is covered by a test.

### 6.1 Public site

- Home: association intro, featured campaign (tuition block) with live progress bar, latest news, call-to-action buttons: **Join the association**, **Give**, **Track my pledge**.
- About: history of MHS, the association, leadership (from current role assignments), contact.
- Cause page (`/causes/[slug]`): title, story/problem statement, media gallery (problem, design, progress), BQ items (if any), progress (`pledged`, `received`, `% of target`, `number of pledges`, "updated …"), suggested pledge levels with a "sweet spot" highlight and "Pledge this amount" buttons, recent-gifts wall (respecting `pledge_list_visibility` and anonymity), share button and QR code, fund-protection statement, fraud warning ("We never ask you to pay to a personal number"), FAQ.
- During `preparation`, the cause page shows "Preparing for launch" with a readiness checklist instead of a countdown.

**AC**
- Pages render fast on a low-end Android phone over 3G (Lighthouse mobile performance ≥ 80).
- Progress numbers come from `v_cause_progress`, never hard-coded.
- Anonymous donors never appear by name on public pages.

### 6.2 Registration (self-service)

Single link for everyone: `/join`. Two steps.

**Step 1 — required (target: under 2 minutes):** full name; phone (WhatsApp); email; category; membership level (each option shows an ⓘ tooltip — hover on desktop, tap on mobile — with description, what it offers, fee); home county; regional cluster (ⓘ: "Choose where you live — clusters organise meetups and networking"); next of kin (name, relationship, phone); for **alumni**: cohort/class and year left; for **friends**: relationship to the school (pick list: parent, former parent, teacher, former teacher, local business, neighbour, SDA faithful, other); consent checkboxes (membership data required; email/WhatsApp updates and directory listing optional); create password **or** continue with Google.

**Step 2 — optional, can be completed later from the profile:** what they do (employed, running a business, self-employed, studying, seeking opportunities, other); profession or field; employer or business name; LinkedIn / portfolio / business website; products or services offered; skills; willing to volunteer; mentoring ("I can mentor" only if the chosen level has `can_mentor`; "I would like a mentor" only if `can_request_mentor`); communication preferences.

Behaviour:
- Creates `persons` + `person_contacts` + `member_profiles` + `next_of_kin` + `consents`, and an auth user.
- Places the member in their cohort group and cluster group automatically.
- Runs duplicate detection (same phone, same email, or same name + cohort) → creates `duplicate_flags`, never merges.
- If the person already exists (e.g. a donor), links to that person instead of creating a new one (after email verification).
- `?invite=<token>` pre-fills the cohort and links the inviter.
- `?from=donation&ref=<reference>` pre-fills name, email, phone.
- Membership status starts `registered`. If the level has a fee and `membership_fees` is enabled, show the payment step; otherwise skip.
- Welcome email with what happens next.

**AC**
- Required fields are enforced server-side, not only in the browser.
- Next of kin is required and is never shown in the directory.
- A person registering with a phone already on file is linked or flagged, not duplicated.
- Works without JavaScript-heavy widgets on slow connections; form state survives a page refresh.

### 6.3 Verification & member management

- **Cohort reps** see pending members of their cohort and can verify, edit basic details or flag.
- **Verifier** role verifies friends of the alumni and resolves duplicate flags (merge or "not a duplicate").
- **Cluster reps** see and manage members of their cluster (no verification of alumni outside their cohort).
- Merge: choose surviving record, move contacts, profiles, pledges, payments to it; mark the other `merged`; audit everything.

**AC**
- A cohort rep cannot see or change members outside their cohort (proved by an RLS test).
- Merging is reversible from the audit log by an admin.

### 6.4 Member sign-in and member home (role centre)

- Sign in with email + password or Google. Password reset by email. (Username login: optional alias that maps to email.)
- Member home shows only what the member's roles allow:
  - everyone: profile completeness, upcoming events (their cohort, their cluster, association-wide), causes, their giving history, directory link;
  - cohort/cluster reps: their dashboard (sign-ups, verified, pledges, payments for their group), pending verifications, event proposals;
  - office-holders: approvals waiting for them, finance/reports shortcuts.
- Directory: search and filter by cohort, cluster, category, profession, skills; respects each member's `directory_visibility`.

**AC**
- Removing a role assignment (or its term ending) removes access immediately on next request.
- Directory never exposes hidden fields, next of kin or contact details the member did not share.

### 6.5 Giving — pledges and donations (no account needed)

**Donation journey (3 steps, Trees-for-the-Future style):**
1. **Amount** — cause pre-selected from its page (or "Where most needed"); Give once / Recurring (monthly, quarterly, annually — only periods allowed by the cause); preset amounts; custom amount; currency (KES default; USD/GBP when card payments are on); optional dedication and comment.
2. **Details** — first and last name, email, phone (required for M-Pesa); "Donate as an organisation" (organisation name, contact person, type); "Donate anonymously"; "Update me on my impact" (consent).
3. **Payment** — M-Pesa STK push (Phase 1, Sprint 8) / card (Phase 2); optional "cover transaction costs"; total shown. **Before payments are live (record-only mode):** show Paybill/bank instructions with the reference as account number, and record the donation as `initiated`.

**Pledge journey:** choose cause → pledge type (one-time, monthly, quarterly, annual, in-kind) → amount and period or in-kind description → details (as above) → confirmation with **pledge reference** `MSA-YYYY-NNNNNN` and how to pay.

After any gift or pledge:
- confirmation page + email receipt/confirmation with reference and tracking link;
- prompt: "Would you like to become a member of the association?" → `/join?from=donation&ref=…`.

Recurring gifts: create `recurring_gifts`; a daily job emails a reminder with a pay link on each due date; every email has a one-click cancel/pause link.

**AC**
- Every gift/pledge links to exactly one `persons` row (existing person matched by verified email/phone; otherwise new).
- References are unique and human-readable; the sequence never repeats.
- Pledges made while the cause is in `preparation` are marked `is_founding = true`.
- Donor can choose anonymous even if the cause default shows names.

### 6.6 Pledge tracking (no account)

`/track`: enter pledge reference + email (or phone) → receive a one-time code by email → see pledged, paid, balance, payment history, and next due date; download statement PDF.

**AC**
- No pledge details are shown before the code is verified.
- Rate-limited (max 5 code requests per hour per reference/email).

### 6.7 Admin — payments (record-only first)

- **Manual payment entry** (treasurer/admin): provider (bank, M-Pesa statement, cash), reference, amount, date, payer, evidence upload; allocate to pledge/donation by searching reference or name; split across several targets.
- **Suspense queue:** unallocated payments to match.
- **Bulk import:** CSV upload of existing pledges and payments (template provided), with preview, validation errors per row, duplicate matching, and a dry-run before commit.
- **Receipts:** generate PDF receipt and email it on allocation.

**AC**
- A manual entry with a duplicate (provider, reference) is rejected with a clear message.
- Imports are atomic: either the whole file commits or nothing does; a log of what was imported is kept.
- All manual entries appear in the audit log with the user who entered them.

### 6.8 M-Pesa (Daraja) — Phase 1, Sprint 8

- **STK Push** from the giving form: initiate → `payments` row `pending` → Daraja callback → `completed`/`failed` → allocate to the donation/pledge → receipt.
- **C2B Paybill:** register confirmation/validation URLs; on confirmation, create `payments` row and auto-allocate using `BillRefNumber` (= pledge or donation reference). Unknown references go to the suspense queue.
- **Idempotency:** insert into `payments` under `UNIQUE(provider, provider_reference)` first; a duplicate callback is a no-op.
- **Status check fallback:** a scheduled job queries Daraja for STK requests still `pending` after 10 minutes.
- **Security:** callback URLs include an unguessable secret path segment; source IPs/validation per Safaricom guidance; never trust amounts from the client.
- Sandbox first. Production credentials per payment channel: the tuition block needs the school Board of Management to authorise Daraja API access on its Paybill; the association's own Paybill follows its registration.

**AC**
- Replaying the same callback twice creates one payment (test).
- A C2B payment with a valid pledge reference reduces that pledge's balance within a minute.

### 6.9 Notifications

- Email (default for everything): confirmations, receipts, OTP, recurring-gift reminders, pledge reminders, monthly statements, approval requests, verification outcomes.
- WhatsApp (when `whatsapp` module is on, Sprint 7): payment confirmation and pledge reminder templates only (cost control).
- Push (PWA): approvals waiting, new event in your cohort/cluster, chat mentions (Phase 3).
- All sends go through `notifications` (queued, then sent by a job); never sent inline in a request that could fail the user's action.

### 6.10 Transparency page & reports (Sprint 9)

- Public transparency page per cause and association-wide: pledged, received, spent (by category), balance, construction/progress updates with dated photos, MOU and fund policy documents, audited reports.
- Admin reports (CSV + PDF): pledges and balances, payments by period, defaulters/overdue pledges, by cohort, by cluster, by membership level, donor categories (individual, alumni, company, church, SACCO…), fund balances.
- Annual financial report generator (Phase 2): income, expenditure, balance per fund/initiative → publish as page + PDF.

**AC**
- Every figure reconciles: sum of allocations per fund − disbursements = fund balance (automated test + nightly check).

### 6.11 Cohort and cluster dashboards (Sprint 9)

For reps and office-holders: registrations over time, verified vs pending, pledges and amount paid, leaderboard position; shareable as an image/link to WhatsApp (no personal data in the shared version).

### 6.12 Basic event registration (Sprint 10)

Create an event (admin only in Phase 1; proposals and approvals arrive in Phase 2), public or members-only page, registration with optional ticket price (paid via the same payment flow), attendee list export, simple check-in by phone or name.

### 6.13 Campaign lifecycle

Admin moves a campaign through `preparation → live → construction → closed`. Setting `live` requires an `official_start_date`. Countdown and "years remaining" use that date. Founding pledges remain flagged forever.

---

## 7. Feature Specs — Phase 2 (Apr–Sep 2027)

- **Causes and full donation form:** "Where most needed" + multiple causes (Keep a Child in School, appeals); card payments via Paystack; currency selection; cover-fees.
- **Initiative/cause setup with approvals:** admin creates causes with all metadata in §5.4; publication goes through the workflow (§5.7); media galleries with ordering and purposes.
- **Sponsorship units:** donors fund units (e.g. one term's fees); page shows units funded vs needed; beneficiaries managed privately by the committee and school liaison; never named publicly.
- **Events engine with approvals:** cohort/cluster reps propose events by type; workflow per type (events coordinator; chair for association-wide; school liaison if at school); changes-requested loop; publish; tickets; check-in; linked giving; post-event report with photos.
- **Adopt-a-BQ-item.**
- **Leaderboards** by cohort and cluster (registrations, pledges, invites).
- **My Menyenya + invites:** school life fields, desk mates/friends with mutual confirmation, personal invite links for WhatsApp, invite counts, "new classmate joined" notifications, reconnect suggestions.
- **Pledge reminders and monthly statements.**

---

## 8. Feature Specs — Phase 3 (Oct 2027–Mar 2028)

- **Membership levels and fees in use:** fee per level (one-off or annual), renewal reminders, `lapsed` status, level targeting of initiatives/events/messages, reports by level.
- **Governance:** offices and terms, handover, committees, meetings and minutes, document repository with visibility levels.
- **Mentorship:** mentor/mentee profiles governed by level flags, matching by field and interests, requests, sessions log.
- **Group chats:** automatic channel per cohort and per cluster; interest group and committee channels; text, photos, links, shared events/causes; @mentions, replies; moderation by reps (remove, mute), member reporting; push notifications; mute per chat.
- **Alumni shop:** catalogue with variants, stock (append-only movements), cart, M-Pesa/card checkout, pickup point or delivery, order tracking; revenue to an operations fund, reported separately from campaign funds.
- **Welfare module (optional):** enabled per cohort(s) or association; case reporting → rep confirmation → coordinator decision → workflow approval → disbursement → close; members-only appeals; condolence notices (with family consent); strict privacy and access logging.

## 9. Feature Specs — Phase 4 (from Apr 2028)

Online elections (eligibility from membership status, nominations, candidate profiles, secret ballot, published results), membership subscriptions, opportunities/jobs board, business directory, volunteer and skills pool, new campaigns on the same engine.

---

## 10. Pages & Routes (Phase 0–1)

| Route | Area | Purpose |
|---|---|---|
| `/` | public | Home |
| `/about` | public | About MHS and the association |
| `/causes`, `/causes/[slug]` | public | Cause list and cause page |
| `/give/[slug]` | public | Donation form |
| `/pledge/[slug]` | public | Pledge form |
| `/thank-you/[reference]` | public | Confirmation + membership prompt |
| `/track` | public | Pledge tracking with OTP |
| `/transparency` | public | Money in and out |
| `/events`, `/events/[id]` | public/members | Events |
| `/join` | public | Registration |
| `/login`, `/reset-password` | public | Auth |
| `/app` | member | Member home (role centre) |
| `/app/profile` | member | Profile, consents, data export/delete request |
| `/app/directory` | member | Directory |
| `/app/dashboard/cohort/[id]`, `/app/dashboard/cluster/[id]` | rep | Dashboards |
| `/admin/members`, `/admin/verification`, `/admin/duplicates` | admin/rep/verifier | Member management |
| `/admin/causes` | admin | Causes and campaigns |
| `/admin/payments`, `/admin/payments/new`, `/admin/suspense`, `/admin/import` | treasurer/admin | Payments |
| `/admin/reports` | office-holders | Reports |
| `/admin/events` | admin | Events (Phase 1 basic) |
| `/admin/settings/*` | admin | Categories, levels, clusters, cohorts, pick lists, roles, templates, modules |
| `/api/webhooks/mpesa/*` | system | Daraja callbacks |

---

## 11. Scheduled Jobs (pg_cron)

| Job | Frequency | Purpose |
|---|---|---|
| `send_queued_notifications` | every minute | Send queued email/WhatsApp/push |
| `recurring_gift_reminders` | daily 08:00 EAT | Email pay links for gifts due today |
| `pledge_reminders` | daily 08:00 EAT | Remind pledgers of upcoming/overdue instalments (configurable days before) |
| `monthly_statements` | 1st of month | Email pledgers their statement |
| `mpesa_pending_check` | every 10 min | Query Daraja for unresolved STK requests |
| `nightly_reconciliation` | daily 02:00 EAT | Check allocations sum to payments, fund balances, flag drift to admins |
| `role_term_expiry` | daily | Notify admins of roles ending in 30 days |
| `cleanup_otps` | hourly | Expire one-time codes |

Every job is idempotent (safe to re-run) and logs its run.

---

## 12. Security & Privacy

- **RLS on every table**, default deny. Policies use `has_role()` and the member's own `person_id`.
- **Service role key** used only in server code and Edge Functions; never in the browser; never committed.
- **Secrets** in environment variables (`.env.local` locally, Vercel/Supabase dashboards in production); `.env.example` documents every variable.
- **Rate limiting** on login, OTP requests, registration and payment initiation.
- **Input validation** with Zod on the server for every form and endpoint.
- **Sensitive data:** next of kin, welfare, beneficiaries in separate tables with stricter RLS; access logged.
- **Data subject rights:** member can download their data (JSON/PDF) and request deletion; deletion anonymises the person but keeps financial records (legal obligation), noted in the privacy policy.
- **Privacy policy and consent wording** stored with versions; shown at registration and on giving forms.
- **Backups:** Supabase daily backups; enable point-in-time recovery once the association upgrades its plan; quarterly restore test.
- **Admin accounts** must use strong passwords; enable two-factor where supported.

---

## 13. PWA & Performance

- Installable (manifest with association icons and name), offline page, cache of recently viewed pages and the member's own profile.
- Web Push for approvals, events and (later) chat.
- Images: compressed in the browser before upload (max ~1600px, WebP/JPEG), responsive sizes, lazy-loaded. Video: YouTube embeds only.
- Target: usable on a low-end Android phone on 3G; keep JavaScript bundles small; avoid heavy libraries.

---

## 14. Admin Configuration (no code changes needed)

Admins can manage: member categories and their required fields; membership levels (name, description, offers, fee, fee type, mentoring flags); clusters; cohorts; streams, dorms, teachers, clubs; roles and role assignments; causes and funds; event types and their workflows; message templates; module switches (welfare scope, mentorship, chat, shop, membership fees, WhatsApp, card payments); consent wording versions.

---

## 15. Testing Strategy

- **Unit tests (Vitest):** reference generation, amount calculations, pledge balance logic, duplicate detection, workflow step resolution.
- **Database tests:** RLS — prove a cohort rep cannot read another cohort; a member cannot read others' next of kin; anonymous visitors cannot read anything private. Run against a test Supabase database.
- **End-to-end (Playwright):** registration (alumnus and friend), donation (record-only), pledge + tracking with OTP, manual payment entry and allocation, receipt email queued, rep verification.
- **Payment tests:** replay Daraja callback twice → one payment; unknown BillRefNumber → suspense queue. Use recorded sample payloads; never call live M-Pesa in tests.
- **Reconciliation test:** randomised payments/allocations/disbursements → fund balances always equal in − out.
- CI on GitHub Actions: lint, type-check, unit tests, migration check, E2E on preview deployment.

---

## 16. Environments, Deployment & Costs

- **Environments:** `dev` (Supabase dev project + Vercel preview), `production` (separate Supabase project + Vercel production). Daraja sandbox in dev, production keys only in production.
- **Local development:** Supabase CLI with Docker if available; otherwise point the app at the cloud `dev` project (no Docker required).
- **Migrations:** every schema change is a SQL migration file committed to the repo; applied to dev first, then production.
- **Deploys:** every pull request gets a Vercel preview URL (used for Technical Committee progress reviews); merging to `main` deploys production.
- **Ownership:** GitHub organisation, Supabase organisation, Vercel team, domain and Daraja/Paystack accounts all registered to the association, with at least two admins each.
- **Expected running costs (paid by the association):** domain (~KES 1,500/year); M-Pesa and card transaction charges; WhatsApp messages (optional); Supabase Pro (~USD 25/month) when the free tier's limits or inactivity pause become a problem; Vercel — the Hobby plan is for non-commercial use, so confirm before taking donations/sales on it (Vercel Pro or Cloudflare Pages as alternatives).

---

## 17. Build Order (milestones = sprints)

Each milestone ends with: working preview deployment, tests passing, `docs/PROGRESS.md` updated, plain-language summary for the product owner.

| # | Sprint dates | Milestone | Key outputs |
|---|---|---|---|
| M0 | before 19 Oct 2026 | Project setup | Repo, Next.js + Tailwind + shadcn, Supabase dev project linked, auth wired, CI, `.env.example`, README, `CLAUDE.md` |
| M1 | 19–30 Oct | Core data & roles | Migrations for §5.1–5.3, `has_role()`, RLS baseline, audit triggers, seed data (categories, levels, clusters, roles), admin sign-in, design system + wireframes |
| M2 | 2–13 Nov | Public site | Home, about, cause page with media gallery and progress (from views), admin cause editor (basic) |
| M3 | 16–27 Nov | Registration | `/join` steps 1–2, tooltips, next of kin, consents, auto groups, duplicate flags, welcome email |
| M4 | 30 Nov–11 Dec | Giving (record-only) | Pledge + donation forms, references, confirmation emails, membership prompt, admin payment entry, allocations, suspense queue, CSV import, receipts |
| M5 | 14–23 Dec | Test & soft launch | Fixes from Technical Committee testing; registration soft launch; monitoring |
| M6 | 4–15 Jan 2027 | Member area | Sign-in (email/Google), member home, directory with privacy, verification by reps and verifier, merge tool |
| M7 | 18–29 Jan | Tracking & messaging | `/track` with OTP, statements PDF, WhatsApp confirmations (module flag) |
| M8 | 1–12 Feb | M-Pesa | Daraja STK + C2B, idempotency, pending check, auto-allocation |
| M9 | 15–26 Feb | Transparency & dashboards | Transparency page, reports, cohort/cluster dashboards, rep role assignment UI, nightly reconciliation |
| M10 | 1–12 Mar | Events & reminders | Basic events + registration + check-in; recurring-gift and pledge reminders; monthly statements |
| M11 | 15–26 Mar | Launch readiness | Acceptance testing, security review (RLS + payments), performance pass, campaign lifecycle to `live` when the BoM tuition block Paybill is connected |

Phases 2–4 are broken into milestones at the end of M11, in the same format.

---

## 18. Seed Data

- Categories: Alumnus; Friend of the alumni.
- Levels: Foundation (token fee e.g. KES 20, one-off; can_request_mentor), Launch (low; can_request_mentor), Growth (medium; can_mentor), Impact (highest; can_mentor). Fees initially 0 / switched off until leadership decides.
- Clusters: Nairobi, Kisii, Nyamira, Nakuru, Eldoret, Kisumu, Mombasa, Diaspora.
- Cohorts: one per year from 1975 to current year.
- Funds/causes: General Fund ("Where most needed"); Tuition Block Fund + "Tuition Block" campaign (target KES 100,000,000, lifecycle `preparation`).
- Roles: §4.2. Workflows: §5.7 defaults.
- Message templates: registration welcome, pledge confirmation, donation receipt, OTP, recurring reminder, pledge reminder, monthly statement, verification approved.

---

## 19. Open Decisions (for the product owner — do not guess)

1. **Card payments provider:** Paystack (also supports M-Pesa — could replace direct Daraja for simplicity) vs Daraja for M-Pesa + Paystack for cards only.
2. **Hosting plan:** Vercel Hobby terms vs Vercel Pro vs Cloudflare Pages before accepting money on the live site.
3. **Domain and official association name** (Sprint 1 input).
4. **Membership level names, fees and fee types**; whether fees are switched on at launch.
5. **WhatsApp:** which messages justify the per-message cost.
6. **Directory defaults:** what each member field shows by default (members / cohort only / hidden).
7. **Pledge list visibility default** for the tuition block (Newlife-style public list vs totals only).
8. **Data retention period** for financial records and audit logs (statutory period to confirm with the treasurer/legal).
9. **Founding pledges recognition:** how they are shown publicly.
