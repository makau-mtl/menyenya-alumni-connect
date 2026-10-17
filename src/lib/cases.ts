// Labels for cases for support, shared by the handlers' screens.
export const statusInfo: Record<string, { label: string; tone: string }> = {
  submitted: { label: "New", tone: "bg-gold text-ink" },
  under_review: { label: "Being reviewed", tone: "bg-secondary text-tea-dark" },
  responded: { label: "Replied", tone: "bg-tea text-white" },
  closed: { label: "Closed", tone: "bg-muted text-muted-foreground" },
};
export const kindInfo: Record<string, string> = { member_in_need: "Member in need", needy_student: "Needy student", project_idea: "Project or idea", other: "Other" };
