import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { runVideoJob } from "@/lib/jobs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  try {
    const result = await runVideoJob(id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed";
    await supabase.from("videos").update({ status: "failed", error_message: message }).eq("id", id);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
