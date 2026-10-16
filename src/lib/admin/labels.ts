export const lifecycleLabels: Record<string, { label: string; hint: string }> = {
  draft: { label: "Draft", hint: "Hidden from the website" },
  in_review: { label: "In review", hint: "Hidden; waiting for approval" },
  approved: { label: "Approved", hint: "Hidden; approved but not yet shown" },
  preparation: { label: "Preparing for launch", hint: "Shown with the launch checklist; pledges count as founding pledges" },
  live: { label: "Live", hint: "Open for giving. For the tuition block, only once the Board of Management Paybill is confirmed" },
  construction: { label: "Under construction", hint: "Shown with building progress" },
  closed: { label: "Closed", hint: "Shown as finished; no new gifts" },
};

export const statusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Hidden",
};
