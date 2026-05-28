import { runVideoJob } from "../src/lib/jobs";
import { getSupabaseServerClient } from "../src/lib/supabase-server";

const links = [
  {
    label: "Purdue at Maryland (W) 2025-09-21",
    url: "https://youtu.be/Wm52IgVXXeM?si=lVjppb0AqGy4GXTN",
  },
  {
    label: "Purdue at Oregon (W) 2024",
    url: "https://youtu.be/kzVF2y_ZMi8?si=pkbze-kBvIDHZE5E",
  },
  {
    label: "Highlight 1",
    url: "https://youtu.be/Dkbp0BLGkc0?si=T_I24exgmWdt-5iU",
  },
  {
    label: "Highlight 2",
    url: "https://youtu.be/QY-TeNDOY9Q?si=SakChQGdAPIxCnQr",
  },
  {
    label: "Highlight 3",
    url: "https://youtu.be/CLm09lBYoig?si=L5fhqA-HVmFEiPBj",
  },
];

async function main() {
  const supabase = getSupabaseServerClient();

  const { data: player, error: playerErr } = await supabase
    .from("players")
    .insert({
      name: "Purdue Women's Team Tape Batch",
      current_team: "Purdue Women's Soccer",
    })
    .select("id")
    .single();

  if (playerErr || !player) {
    throw new Error(playerErr?.message || "Failed to create player batch row");
  }

  const outputs: Array<Record<string, unknown>> = [];

  for (const item of links) {
    console.log(`\\n=== Processing: ${item.label} ===`);

    const { data: video, error: videoErr } = await supabase
      .from("videos")
      .insert({
        player_id: player.id,
        source_url: item.url,
        source_type: "youtube",
        status: "queued",
      })
      .select("id")
      .single();

    if (videoErr || !video) {
      outputs.push({ label: item.label, url: item.url, error: videoErr?.message || "Failed to create video row" });
      continue;
    }

    try {
      const run = await runVideoJob(video.id);
      const { data: report } = await supabase
        .from("reports")
        .select("id, positions, confidence_score, style_summary, strengths, development_areas, evidence_flags, raw_gemini_output")
        .eq("id", run.reportId)
        .single();

      const { data: evidence } = await supabase
        .from("evidence")
        .select("id, time_label, category, description, confidence")
        .eq("report_id", run.reportId)
        .order("time_seconds", { ascending: true });

      outputs.push({
        label: item.label,
        url: item.url,
        run,
        report,
        evidenceCount: evidence?.length || 0,
        evidencePreview: (evidence || []).slice(0, 8),
      });

      console.log(`Done: ${item.label} -> report ${run.reportId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await supabase.from("videos").update({ status: "failed", error_message: message }).eq("id", video.id);
      outputs.push({ label: item.label, url: item.url, videoId: video.id, error: message });
      console.error(`Failed: ${item.label} -> ${message}`);
    }
  }

  console.log("\\n=== FINAL JSON ===");
  console.log(JSON.stringify(outputs, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
