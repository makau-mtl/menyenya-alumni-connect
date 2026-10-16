# Setting up sign-in (Google, LinkedIn, email link)

Members sign in with **Google** or **LinkedIn**, or with a **one-time link** sent to their email.
There are no member passwords. Signing in never registers anyone: a member is added to the
register only when they finish the last registration step.

You do these steps once. None of them cost money.

## 1. Supabase: allow sign-ups and set the return addresses

Supabase → your project → **Authentication**:

1. **Sign In / Providers** → turn **on** "Allow new users to sign up".
   This is safe: registration still has its own open/closed switch in the admin area (Members tab),
   and nothing is saved to the register until someone finishes every step.
2. **URL Configuration**:
   - **Site URL**: `https://menyenya-alumni-connect.vercel.app` (change it when the association's web address is ready).
   - **Redirect URLs**: add
     - `https://menyenya-alumni-connect.vercel.app/**`
     - `https://*-mtl11.vercel.app/**` (preview links)

## 2. Google (about 15 minutes)

1. Go to <https://console.cloud.google.com>, sign in with an account the association controls, and
   create a project called **Menyenya Alumni**.
2. **APIs & Services → OAuth consent screen**: choose **External**. App name: *Menyenya Alumni*.
   Support email: the association's email. Add the website as the app domain. Save.
   Then **Publish app** so anyone can sign in (not only test users).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, name *Menyenya website*.
   - **Authorised redirect URIs**: copy the **Callback URL** shown in Supabase under
     Authentication → Sign In / Providers → **Google** (it looks like
     `https://<your-project>.supabase.co/auth/v1/callback`).
   - Create, then copy the **Client ID** and **Client secret**.
4. Back in Supabase → **Sign In / Providers → Google**: switch it on, paste the Client ID and secret, Save.

The client secret goes **only** into Supabase. Never into Vercel, GitHub or a chat.

## 3. LinkedIn (about 20 minutes, needs the association's LinkedIn page)

1. Create the association's **LinkedIn company page** if it doesn't exist yet (LinkedIn → For Business → Create a Company Page).
2. Go to <https://www.linkedin.com/developers/apps> → **Create app**:
   - App name *Menyenya Alumni*, LinkedIn page: the association's page, logo, accept the terms.
   - The page admin may need to approve the link between the app and the page (LinkedIn sends a request).
3. In the app → **Products** → request **Sign In with LinkedIn using OpenID Connect**.
4. **Auth** tab → **Authorized redirect URLs**: add the Callback URL shown in Supabase under
   Sign In / Providers → **LinkedIn (OIDC)**. Copy the **Client ID** and **Primary Client Secret**.
5. Supabase → **Sign In / Providers → LinkedIn (OIDC)**: switch it on, paste both, Save.

LinkedIn gives us the member's name, email and photo, but not the link to their profile. Members
paste their LinkedIn link in their profile.

## 4. Vercel: show the buttons

Vercel → project → **Settings → Environment Variables**, for **Production** and **Preview**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_AUTH_PROVIDERS` | `google,linkedin_oidc` (only list the ones you have switched on) |

Then **Deployments → latest → ⋯ → Redeploy** (Production). Buttons only appear for providers in
this list, so a provider that isn't ready never shows a broken button.

## 5. Email links reaching everyone

Supabase's built-in email only reaches people in your Supabase organisation, a few per hour.
That is enough for testing with your own email, not for members. Once the association has its web
address:

1. Create a free account at <https://resend.com>, add the domain, and add the DNS records it shows.
2. Supabase → **Authentication → Emails → SMTP Settings**: switch on custom SMTP with Resend's
   details (host `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key),
   sender e.g. `no-reply@<the domain>`.

Until then, Google and LinkedIn sign-in work for everyone; email links work for testing.

## 6. Try it

1. Admin → **Members** → registration is **Closed**; as an administrator you can still test.
2. In a private browser window, open `/join`, sign in with Google, and go through the steps.
   (Use a different Google account from your admin one, or sign out first.)
3. Check Admin → **Members**: the new member appears once the last step is submitted.
4. When the officials are ready for the soft launch, press **Open registration**.
