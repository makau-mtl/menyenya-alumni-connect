-- New list values for registration (M3). Kept in their own file: Postgres needs a new enum
-- value committed before other statements use it.
alter type public.consent_purpose add value if not exists 'public_profile';
create type public.dues_status as enum ('pending', 'paid', 'waived', 'cancelled');
create type public.notification_channel as enum ('email', 'whatsapp', 'push');
create type public.notification_status as enum ('queued', 'sent', 'failed');
