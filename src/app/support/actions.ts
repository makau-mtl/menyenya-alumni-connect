"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

export type EnquiryState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

const schema = z.object({
  kind: z.enum(["sponsor", "partner"]),
  organisation: z.string().trim().min(2, "Enter the organisation's name.").max(160, "That name is too long."),
  contactName: z.string().trim().min(2, "Enter your name.").max(120, "That name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(30, "That number is too long."),
  packageId: z.string(),
  message: z.string().trim().max(3000, "Keep the message under 3,000 characters."),
});

/** The enquiry form on the sponsorship and partnership pages. */
export async function sendEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  // A field people can't see; automated spam fills it in.
  if (String(formData.get("website") ?? "")) return { ok: true, message: "Thank you." };
  const parsed = schema.safeParse(Object.fromEntries(["kind", "organisation", "contactName", "email", "phone", "packageId", "message"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Check the highlighted fields.", errors };
  }
  if (!isSupabaseConfigured) return { ok: false, message: "Enquiries can't be sent from this preview." };
  const v = parsed.data;
  const { error } = await createPublicClient().rpc("submit_support_enquiry", {
    p_kind: v.kind,
    p_organisation: v.organisation,
    p_contact_name: v.contactName,
    p_email: v.email,
    p_phone: v.phone || null,
    p_package_id: v.packageId || null,
    p_message: v.message,
  });
  if (error) {
    console.error("Enquiry failed", error);
    if (/too many/.test(error.message)) return { ok: false, message: "We already have several messages from this address today. We'll be in touch." };
    return { ok: false, message: "Your enquiry could not be sent. Please try again, or email us." };
  }
  return { ok: true, message: "Thank you. Someone from the association will get back to you within a week." };
}
