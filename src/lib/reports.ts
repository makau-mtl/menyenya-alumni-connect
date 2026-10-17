export const REPORT_BUCKET = "reports";

export const reportKinds: Record<string, { label: string; plural: string; who: string }> = {
  financial: { label: "Financial report", plural: "Financial reports", who: "the Treasurer" },
  moral: { label: "Moral report", plural: "Moral reports", who: "the Chairman" },
  other: { label: "Other report", plural: "Other reports", who: "an administrator" },
};

export type ReportRow = {
  id: string; kind: string; year: number; title: string; summary: string; file_path: string; file_size: number | null;
  status: string; replaces_id: string | null; published_at: string | null; created_at: string;
};

export const fileSize = (bytes: number | null) => (bytes ? (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`) : "");
