import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { REPORT_BUCKET } from "@/lib/reports";

// Opens a report's PDF through a short-lived link. Visitors get published reports only;
// report publishers can also open drafts. The storage rules decide.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createSessionClient();
  const { data: report } = await supabase.from("reports").select("file_path, title").eq("id", id).maybeSingle();
  if (!report) return new NextResponse("Not found", { status: 404 });
  const name = `${report.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "report"}.pdf`;
  const { data } = await supabase.storage.from(REPORT_BUCKET).createSignedUrl(report.file_path, 600, { download: request.nextUrl.searchParams.has("download") ? name : undefined });
  if (!data?.signedUrl) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
