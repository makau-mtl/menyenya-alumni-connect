"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { enabledProviders, safeNext, type Provider } from "@/lib/auth/providers";

// Signing in never registers anyone: a member record is only created when the last
// registration step is submitted (see complete_registration in the database).

export type LoginState = { error?: string; notice?: string; email?: string } | null;

const notConnected = { error: "Sign-in isn't available on this preview." };

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function callback(next: string) {
  return `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Google, LinkedIn and any other provider switched on in Supabase. */
export async function signInWithProvider(formData: FormData) {
  if (!isSupabaseConfigured) redirect("/login?error=not-connected");
  const provider = String(formData.get("provider") ?? "") as Provider;
  const next = safeNext(formData.get("next"));
  if (!enabledProviders().includes(provider)) redirect("/login?error=provider");
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: await callback(next),
      ...(provider === "azure" ? { scopes: "email" } : {}),
    },
  });
  if (error || !data.url) {
    console.error("Provider sign-in failed", provider, error);
    redirect("/login?error=provider");
  }
  redirect(data.url);
}

/** A one-time sign-in link by email. When joining, it can create the login; when logging in, it can't. */
export async function sendSignInLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return notConnected;
  const email = String(formData.get("email") ?? "").trim();
  if (!z.string().email().safeParse(email).success) return { error: "Enter your email address.", email };
  const joining = formData.get("mode") === "join";
  const next = safeNext(formData.get("next"), joining ? "/join/steps" : "/app");

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: joining, emailRedirectTo: await callback(next) },
  });
  if (error?.status === 429) return { error: "Too many links requested. Please wait a few minutes and try again.", email };
  // Same answer whether or not the email has an account, so the form can't be used to check who is registered.
  if (error && error.status !== 400 && error.status !== 422) console.error("Sign-in link failed", error);
  return {
    notice: joining
      ? `We've sent a link to ${email}. Open it on this device to continue. It works once and expires in an hour.`
      : `If ${email} has an account, a sign-in link is on its way. It works once and expires in an hour.`,
    email,
  };
}

/** For officials' accounts set up by an administrator before email sign-in links reach everyone. */
export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return notConnected;
  const parsed = z
    .object({ email: z.string().trim().email(), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Enter your email and password.", email };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match.", email };
  redirect(safeNext(formData.get("next")));
}
