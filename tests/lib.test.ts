import { describe, expect, it } from "vitest";
import { donationReference, isReference, pledgeReference } from "@/lib/references";
import { formatKes, formatKesShort, parseKes, percentOf } from "@/lib/money";
import { donationSchema, pledgeSchema } from "@/lib/validation";

describe("references", () => {
  it("formats pledge and donation references", () => {
    expect(pledgeReference(2026, 1247)).toBe("MSA-2026-001247");
    expect(donationReference(2026, 123)).toBe("MSA-D-2026-000123");
  });
  it("rejects out-of-range sequences", () => {
    expect(() => pledgeReference(2026, 0)).toThrow();
    expect(() => pledgeReference(2026, 1_000_000)).toThrow();
  });
  it("recognises valid references only", () => {
    expect(isReference("MSA-2026-001247")).toBe(true);
    expect(isReference("MSA-D-2026-000123")).toBe(true);
    expect(isReference("MSA-26-1")).toBe(false);
  });
});

describe("money", () => {
  it("formats shillings", () => {
    expect(formatKes(36000)).toBe("KES 36,000");
    expect(formatKesShort(3_410_000)).toBe("KES 3.41M");
    expect(formatKesShort(100_000_000)).toBe("KES 100M");
  });
  it("parses typed amounts", () => {
    expect(parseKes("1,500")).toBe(1500);
    expect(parseKes(" KES 2000 ")).toBe(2000);
    expect(parseKes("12.50")).toBeNull();
    expect(parseKes("-5")).toBeNull();
  });
  it("caps percentages at 100", () => {
    expect(percentOf(3_410_000, 100_000_000)).toBeCloseTo(3.41);
    expect(percentOf(200, 100)).toBe(100);
    expect(percentOf(5, null)).toBe(0);
  });
});

const donor = { firstName: "Ann", lastName: "Moraa", email: "ann@example.com", phone: "0712345678" };

describe("validation", () => {
  it("accepts a valid donation", () => {
    const r = donationSchema.safeParse({ ...donor, causeSlug: "tuition-block", amount: "1,000", frequency: "once" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe(1000);
  });
  it("rejects tiny amounts and bad phones", () => {
    const r = donationSchema.safeParse({ ...donor, phone: "123", causeSlug: "x", amount: "10", frequency: "once" });
    expect(r.success).toBe(false);
  });
  it("requires a description for in-kind pledges", () => {
    const r = pledgeSchema.safeParse({ ...donor, causeSlug: "tuition-block", pledgeType: "in_kind" });
    expect(r.success).toBe(false);
  });
  it("requires periods for monthly pledges", () => {
    const ok = pledgeSchema.safeParse({ ...donor, causeSlug: "t", pledgeType: "monthly", amountPerPeriod: "2500", numberOfPeriods: "36" });
    const bad = pledgeSchema.safeParse({ ...donor, causeSlug: "t", pledgeType: "monthly", amountPerPeriod: "2500" });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});

describe("phone numbers", () => {
  const base = { firstName: "A", lastName: "B", email: "a@example.com", causeSlug: "t", amount: "100", frequency: "once" };
  it.each(["0712 345 678", "+254712345678", "0110-123-456", "+447700900123"])("accepts %s", (phone) => {
    expect(donationSchema.safeParse({ ...base, phone }).success).toBe(true);
  });
  it.each(["123", "0812345678", "phone"])("rejects %s with a clear message", (phone) => {
    const r = donationSchema.safeParse({ ...base, phone });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("mobile number");
  });
});

describe("content helpers", () => {
  it("reads YouTube links in their common forms", async () => {
    const { youtubeId } = await import("@/lib/photos");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://m.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("not a link")).toBeNull();
  });

  it("splits text into paragraphs at blank lines", async () => {
    const { toParagraphs } = await import("@/lib/photos");
    expect(toParagraphs("One\nline.\n\n  Two.  \n\n\n")).toEqual(["One line.", "Two."]);
  });

  it("makes web-address names from titles", async () => {
    const { slugify } = await import("@/lib/photos");
    expect(slugify("Homecoming 2026: Class of '96!")).toBe("homecoming-2026-class-of-96");
    expect(slugify("Café & Chai")).toBe("cafe-chai");
  });

  it("lists every photo space once", async () => {
    const { photoSpaces } = await import("@/content/photo-spaces");
    const keys = photoSpaces.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z0-9.-]+$/);
  });
});
