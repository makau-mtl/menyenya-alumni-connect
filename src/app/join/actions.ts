"use server";

import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { registrationSchema, type RegistrationInput } from "@/lib/registration";
import { importProviderPhoto } from "@/lib/members/provider-photo";

/** The last registration step. Only this creates the member record (in one database call). */
export async function finishRegistration(input: RegistrationInput): Promise<{ error: string } | void> {
  const member = await getMember();
  if (!member) return { error: "Your sign-in has expired. Sign in again; your answers are kept." };
  if (member.registered) redirect("/app");

  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your answers." };

  const { data, error } = await member.supabase.rpc("complete_registration", { p: parsed.data });
  if (error) {
    // Already on the register (for example a second tap on Finish): go to the account page.
    if (error.code === "22023" && /already registered/i.test(error.message)) redirect("/app");
    if (error.code === "22023") return { error: error.message };
    console.error("Registration failed", error);
    return { error: "We couldn't save your registration just now. Please try again in a moment." };
  }
  const r = (data ?? {}) as { person_id?: string; dues_reference?: string | null };
  // Use the Google or LinkedIn photo until the member uploads their own. Never blocks registration.
  if (r.person_id && member.providerPhoto) await importProviderPhoto(member.supabase, r.person_id, member.providerPhoto);
  redirect(r.dues_reference ? `/join/welcome?dues=${encodeURIComponent(r.dues_reference)}` : "/join/welcome");
}
