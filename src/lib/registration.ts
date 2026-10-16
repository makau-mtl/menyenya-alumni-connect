// Registration rules shared by the steps (browser) and the server action.
// The database function complete_registration() checks everything again.

import { z } from "zod";

export const occupationOptions = [
  { value: "studying", label: "Studying" },
  { value: "employed", label: "Employed" },
  { value: "business", label: "Running a business" },
  { value: "self_employed", label: "Self-employed or freelance" },
  { value: "seeking", label: "Looking for opportunities" },
  { value: "other", label: "Something else" },
] as const;

export type Occupation = (typeof occupationOptions)[number]["value"];

export const friendRelationships = [
  "Parent",
  "Former parent",
  "Teacher",
  "Former teacher",
  "Local business",
  "Neighbour",
  "SDA faithful",
  "Other",
] as const;

/**
 * Suggests a level from the year someone left and what they do now. A suggestion only: the member
 * confirms or changes it. Impact is never suggested; it is about being able to give significantly,
 * which we never guess.
 */
export function suggestLevel(yearLeft: number | null, occupation: Occupation | null, thisYear = new Date().getFullYear()) {
  if (!yearLeft || !occupation) return null;
  const years = thisYear - yearLeft;
  if (occupation === "studying" || years <= 5) return "Foundation";
  if (occupation === "business" || occupation === "employed" || occupation === "self_employed") {
    return years >= 15 ? "Growth" : "Launch";
  }
  return "Launch";
}

export const registrationSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "Enter your full name")
      .max(120)
      .refine((v) => /\s/.test(v), "Enter your first and last name"),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number"),
    phone_country: z.string().regex(/^[A-Z]{2}$/),
    phone_whatsapp: z.boolean(),
    category: z.enum(["alumnus", "friend"]),
    year_left: z.number().int().nullable(),
    admission_year: z.number().int().nullable(),
    class_or_stream: z.string().trim().max(60),
    relationship: z.string().trim().max(80),
    county: z.string().min(1, "Choose your county"),
    region: z.string().min(1, "Choose your region"),
    occupation_status: z.enum(occupationOptions.map((o) => o.value) as [Occupation, ...Occupation[]]).nullable(),
    level: z.string().nullable(),
    invite: z.string().max(40).nullable(),
    consents: z.object({
      membership_data: z.literal(true, { message: "Please agree so we can keep your membership details" }),
      email_updates: z.boolean(),
      whatsapp_updates: z.boolean(),
      directory_listing: z.boolean(),
      public_profile: z.boolean(),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.category === "alumnus") {
      if (!v.year_left) ctx.addIssue({ code: "custom", path: ["year_left"], message: "Choose the year you left" });
      if (!v.occupation_status) ctx.addIssue({ code: "custom", path: ["occupation_status"], message: "Say what you do now" });
      if (!v.level) ctx.addIssue({ code: "custom", path: ["level"], message: "Choose a membership level" });
    } else if (!v.relationship) {
      ctx.addIssue({ code: "custom", path: ["relationship"], message: "Say how you are connected to the school" });
    }
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
