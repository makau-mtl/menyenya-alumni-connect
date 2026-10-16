// Sign-in providers switched on in Supabase (Authentication → Sign In / Providers).
// List them in NEXT_PUBLIC_AUTH_PROVIDERS, e.g. "google,linkedin_oidc". Buttons only show for listed ones,
// so a provider that isn't set up yet never shows a broken button.

export const providerLabels = {
  google: "Google",
  linkedin_oidc: "LinkedIn",
  azure: "Microsoft",
  apple: "Apple",
} as const;

export type Provider = keyof typeof providerLabels;

export function enabledProviders(): Provider[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is Provider => p in providerLabels);
}

/** Only allow redirects back into this site. */
export function safeNext(value: unknown, fallback = "/app") {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
