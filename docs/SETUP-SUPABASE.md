# Connecting the database (Supabase)

One-time setup, done by the product owner. Nothing here needs code. Never paste keys or passwords into chat.

## 1. Let GitHub apply database changes

Database changes live in `supabase/migrations`. A GitHub workflow applies them to Supabase whenever they reach the `main` branch. It needs one secret: the database connection string.

1. In Supabase, click **Connect** at the top of the project page.
2. Under **Connection string**, choose **Session pooler** (not "Direct connection": GitHub's machines can't reach that one).
3. Copy the string. It looks like
   `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
4. Replace `[YOUR-PASSWORD]` (including the square brackets) with your database password. If the password contains symbols such as `@ : / ? # %`, reset it to one made of letters and numbers only (**Project Settings → Database → Reset database password**), because those symbols break the string.

In GitHub, open the repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `SUPABASE_DB_URL` | the completed connection string |

The `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD` secrets are no longer used and can be deleted.

## 2. Merge the database branch

Open the pull request for the `m1-database` branch and merge it. The **Database** workflow runs (repository → **Actions**) and creates every table. A green tick means it worked.

If it ran before the secret was added, open **Actions → Database → Run workflow** to run it again.

## 3. Connect the website (Vercel)

1. In Supabase, click **Connect** (top of the project page), or open **Project Settings → API Keys**. Copy:
   - the **Project URL** (`https://….supabase.co`)
   - the **Publishable key** (starts with `sb_publishable_`)
2. In Vercel, open the project → **Settings → Environment Variables**, and add for **Production** and **Preview**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |

3. **Deployments** → the latest deployment → **⋯ → Redeploy**.

The publishable key is designed to be public; the database's access rules protect the data. The **secret** key is not needed and should never be added here.

## 4. Sign-in settings (Supabase → Authentication)

1. **URL Configuration** → **Site URL**: `https://menyenya-alumni-connect.vercel.app`. Under **Redirect URLs**, add `https://menyenya-alumni-connect.vercel.app/auth/callback` and `https://*-mtl11.vercel.app/auth/callback` (for preview links).
2. **Sign In / Providers** → turn **off** "Allow new users to sign up" for now. Accounts are created by an administrator until registration opens in January.

## 5. Make yourself the first administrator

1. **Authentication → Users → Add user → Create new user**. Enter your email and a strong password, and tick **Auto Confirm User**.
2. **SQL Editor → New query**, paste the line below with your email, and click **Run**:

```sql
select public.bootstrap_admin('your-email@example.com');
```

3. Go to `/login` on the website, sign in, and you'll land on `/admin`.

## Later: Google sign-in

Needs a Google Cloud OAuth client. Until it's set up, the "Continue with Google" button shows a friendly message, and email sign-in works.
