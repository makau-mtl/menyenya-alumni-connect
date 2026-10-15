"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; notice?: string; email?: string } | null;

const notConnected = { error: "Member log-in opens with registration in January 2027." };

/** Only allow redirects back into this site. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return notConnected;
  const parsed = z
    .object({ email: z.string().trim().email(), password: z.string().min(1) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match. Check them, or email yourself a sign-in link.", email };
  redirect(safeNext(formData.get("next")));
}

export async function sendSignInLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return notConnected;
  const email = String(formData.get("email") ?? "").trim();
  if (!z.string().email().safeParse(email).success) return { error: "Enter your email address first.", email };

  const supabase = await createSessionClient();
  const next = safeNext(formData.get("next"));
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  // Same answer whether or not the email has an account, so the form can't be used to check who is registered.
  if (error && error.status !== 400 && error.status !== 422) console.error("Sign-in link failed", error);
  return { notice: `If ${email} has an account, a sign-in link is on its way. It works once and expires in an hour.`, email };
}

export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseConfigured) redirect("/login?error=not-connected");
  const supabase = await createSessionClient();
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
