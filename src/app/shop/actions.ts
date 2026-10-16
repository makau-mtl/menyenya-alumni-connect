"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

export type OrderState = { ok?: boolean; message?: string; reference?: string; errors?: Record<string, string> } | null;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120, "That name is too long."),
  phone: z.string().trim().refine((v) => v.replace(/[^0-9+]/g, "").length >= 9 && v.replace(/[^0-9+]/g, "").length <= 16, "Enter a phone number we can call."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address, or leave it blank.")]),
  collection: z.string().trim().min(2, "Tell us where you would like to collect it.").max(200, "Keep this under 200 characters."),
  notes: z.string().trim().max(1000, "Keep the note under 1,000 characters."),
  items: z.array(z.object({ item_id: z.string().uuid(), option: z.string().max(40).optional(), quantity: z.number().int().min(1).max(50) })).min(1, "Add at least one item.").max(20),
});

/** The order request form on the merchandise page. Anyone may order; signed-in members are linked to their record. */
export async function placeOrder(_prev: OrderState, formData: FormData): Promise<OrderState> {
  if (String(formData.get("website") ?? "")) return { ok: false, message: "Something went wrong." };
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    collection: String(formData.get("collection") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    items,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: errors.items ?? "Check the highlighted fields.", errors };
  }
  if (!isSupabaseConfigured) return { ok: false, message: "Orders can't be sent from this preview." };
  const v = parsed.data;
  const db = await createSessionClient();
  const { data, error } = await db.rpc("submit_merch_order", {
    p_name: v.name,
    p_phone: v.phone,
    p_email: v.email,
    p_collection: v.collection,
    p_notes: v.notes,
    p_items: v.items,
  });
  if (error) {
    console.error("Order failed", error);
    if (/too many/.test(error.message)) return { ok: false, message: "We already have several orders from this number today. We'll call you." };
    if (/choose a/.test(error.message)) return { ok: false, message: `Please ${error.message.replace(/^.*?(choose a)/, "$1")}.` };
    if (/not available/.test(error.message)) return { ok: false, message: "One of the items is no longer available. Refresh the page and try again." };
    return { ok: false, message: "Your order could not be sent. Please try again." };
  }
  return { ok: true, reference: String(data) };
}
