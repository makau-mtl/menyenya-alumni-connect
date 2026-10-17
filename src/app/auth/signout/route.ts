import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  // "signedout" tells the installed app to remove the pages it saved for offline use.
  const response = NextResponse.redirect(new URL("/?signedout=1", request.url), { status: 303 });
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}
