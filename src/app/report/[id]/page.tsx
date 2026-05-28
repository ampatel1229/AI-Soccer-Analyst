import { notFound } from "next/navigation";
import ReportView from "@/components/report-view";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: report, error: reportErr } = await supabase
    .from("reports")
    .select("id, video_id, player_id, positions, confidence_score, style_summary, strengths, development_areas, evidence_flags, role_view_cache")
    .eq("id", id)
    .single();

  if (reportErr || !report) {
    notFound();
  }

  const { data: player } = await supabase
    .from("players")
    .select("name, age, current_team")
    .eq("id", report.player_id)
    .maybeSingle();

  const { data: video } = await supabase
    .from("videos")
    .select("duration_seconds")
    .eq("id", report.video_id)
    .maybeSingle();

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, time_seconds, time_label, category, description, confidence")
    .eq("report_id", id)
    .order("time_seconds", { ascending: true });

  const meta = [
    video?.duration_seconds ? `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, "0")} highlight` : null,
    player?.current_team || null,
    player?.age ? `Age ${player.age}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-[#10141b] px-6 py-8 text-[#f3f6fb]">
      <div className="mx-auto max-w-5xl">
        <ReportView
          report={report}
          evidence={evidence || []}
          playerName={player?.name || "Player"}
          playerMeta={meta}
          showActions
        />
      </div>
    </main>
  );
}
