import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    const { data: video, error: videoErr } = await supabase
      .from("videos")
      .select("id, player_id, source_url, status, error_message, duration_seconds, created_at, updated_at")
      .eq("id", id)
      .single();

    if (videoErr || !video) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { data: player } = await supabase
      .from("players")
      .select("id, name, age, current_team")
      .eq("id", video.player_id)
      .maybeSingle();

    const { data: report } = await supabase
      .from("reports")
      .select("id, positions, confidence_score, style_summary, strengths, development_areas, evidence_flags, role_view_cache, created_at")
      .eq("video_id", id)
      .maybeSingle();

    const { data: evidence } = report
      ? await supabase
          .from("evidence")
          .select("id, time_seconds, time_label, category, description, confidence")
          .eq("report_id", report.id)
          .order("time_seconds", { ascending: true })
      : { data: [] };

    return NextResponse.json({ video, player: player || null, report: report || null, evidence: evidence || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}
