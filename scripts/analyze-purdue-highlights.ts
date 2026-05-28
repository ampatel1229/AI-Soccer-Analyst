import { runVideoJob } from "../src/lib/jobs";
import { getSupabaseServerClient } from "../src/lib/supabase-server";

const links = [
  { label: "Western Illinois 4-0 highlights", url: "https://youtu.be/Dkbp0BLGkc0?si=T_I24exgmWdt-5iU" },
  { label: "Indiana State 4-0 highlights", url: "https://youtu.be/QY-TeNDOY9Q?si=SakChQGdAPIxCnQr" },
  { label: "Wisconsin 2-1 highlights", url: "https://youtu.be/CLm09lBYoig?si=L5fhqA-HVmFEiPBj" },
];

async function main() {
  const supabase = getSupabaseServerClient();

  const { data: player, error: playerErr } = await supabase
    .from("players")
    .insert({ name: "Purdue Team Highlight Batch", current_team: "Purdue Women's Soccer" })
    .select("id")
    .single();

  if (playerErr || !player) throw new Error(playerErr?.message || "player row failed");

  const out: unknown[] = [];

  for (const item of links) {
    const { data: video, error: vErr } = await supabase
      .from("videos")
      .insert({ player_id: player.id, source_url: item.url, source_type: "youtube", status: "queued" })
      .select("id")
      .single();

    if (vErr || !video) {
      out.push({ label: item.label, error: vErr?.message || "video insert failed" });
      continue;
    }

    try {
      const run = await runVideoJob(video.id);
      const { data: report } = await supabase
        .from("reports")
        .select("id, positions, confidence_score, style_summary, strengths, development_areas, evidence_flags, role_view_cache, raw_gemini_output")
        .eq("id", run.reportId)
        .single();

      out.push({ label: item.label, run, report });
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown";
      out.push({ label: item.label, error: message });
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
