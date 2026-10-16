import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/providers";

// Where Google, LinkedIn and emailed sign-in links return to.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (searchParams.get("error")) {
    // The person cancelled at Google/LinkedIn, or the provider refused.
    return NextResponse.redirect(`${origin}/login?error=cancelled&next=${encodeURIComponent(next)}`);
  }
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link&next=${encodeURIComponent(next)}`);
}
