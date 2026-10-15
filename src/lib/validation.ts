import { z } from "zod";
import { parseKes } from "./money";

// Server-side validation for every form (SPEC §12). Messages are shown to the giver as written.

const amount = z
  .string()
  .transform((v, ctx) => {
    const n = parseKes(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount in shillings, for example 1000" });
      return z.NEVER;
    }
    if (n < 50) {
      ctx.addIssue({ code: "custom", message: "The smallest amount is KES 50" });
      return z.NEVER;
    }
    return n;
  });

// An HTML checkbox sends "on" when ticked and nothing when not.
const checkbox = z
  .unknown()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

export const donorSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(80),
  lastName: z.string().trim().min(1, "Enter your last name").max(80),
  email: z.string().trim().email("Enter an email address like name@example.com"),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^(?:(?:\+?254|0)[17]\d{8}|\+\d{8,15})$/,
          "Enter a mobile number, for example 0712 345 678, or +44 7700 900123 if you live abroad",
        ),
    ),
  asOrganisation: checkbox,
  organisationName: z.string().trim().max(120).optional(),
  anonymous: checkbox,
  impactUpdates: checkbox,
});

export const donationSchema = donorSchema.extend({
  causeSlug: z.string().min(1),
  amount,
  frequency: z.enum(["once", "monthly", "quarterly", "annually"]),
  dedication: z.string().trim().max(200).optional(),
});

export const pledgeSchema = donorSchema
  .extend({
    causeSlug: z.string().min(1),
    pledgeType: z.enum(["one_time", "monthly", "quarterly", "annual", "in_kind"]),
    amountPerPeriod: z.string().optional(),
    numberOfPeriods: z.string().optional(),
    inKindDescription: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.pledgeType === "in_kind") {
      if (!v.inKindDescription) {
        ctx.addIssue({ code: "custom", path: ["inKindDescription"], message: "Describe what you will give" });
      }
      return;
    }
    const n = parseKes(v.amountPerPeriod ?? "");
    if (n === null || n < 50) {
      ctx.addIssue({ code: "custom", path: ["amountPerPeriod"], message: "Enter an amount of at least KES 50" });
    }
    if (v.pledgeType !== "one_time") {
      const p = Number(v.numberOfPeriods);
      if (!Number.isInteger(p) || p < 1 || p > 120) {
        ctx.addIssue({ code: "custom", path: ["numberOfPeriods"], message: "Choose how many times you will give" });
      }
    }
  });

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
