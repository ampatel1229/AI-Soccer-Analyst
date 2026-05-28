import { NextRequest, NextResponse } from "next/server";
import { validateSourceUrl } from "@/lib/source-validator";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  let stage = "start";
  try {
    stage = "parse_body";
    const body = await req.json();
    const analysisType = String(body.analysisType || "player").toLowerCase();
    const playerName = String(body.playerName || "").trim();
    const sourceUrl = String(body.sourceUrl || "").trim();
    const targetTeam = String(body.targetTeam || "").trim();

    if (analysisType !== "player" && analysisType !== "team") {
      return NextResponse.json({ error: "analysisType must be 'player' or 'team'" }, { status: 400 });
    }

    if (analysisType === "player" && !playerName) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    if (analysisType === "team" && !targetTeam) {
      return NextResponse.json({ error: "Team to analyze is required" }, { status: 400 });
    }

    if (!sourceUrl) {
      return NextResponse.json({ error: "Source URL is required" }, { status: 400 });
    }

    stage = "validate_source";
    const valid = validateSourceUrl(sourceUrl);
    if (!valid.ok || !valid.sourceType) {
      return NextResponse.json({ error: valid.reason || "Unsupported source" }, { status: 400 });
    }

    stage = "supabase_client";
    const supabase = getSupabaseServerClient();

    stage = "insert_player";
    const storedName = analysisType === "team" ? `TEAM_ANALYSIS::${targetTeam}` : playerName;
    const storedTeam = analysisType === "team" ? targetTeam : body.team || null;

    const { data: player, error: playerErr } = await supabase
      .from("players")
      .insert({
        name: storedName,
        age: body.age || null,
        current_team: storedTeam,
      })
      .select("id")
      .single();

    if (playerErr || !player) {
      return NextResponse.json(
        {
          error: `stage=${stage} failed: ${playerErr?.message || "Failed to create player"}`,
          details: playerErr || null,
        },
        { status: 500 },
      );
    }

    stage = "insert_video";
    const { data: video, error: videoErr } = await supabase
      .from("videos")
      .insert({
        player_id: player.id,
        source_url: sourceUrl,
        source_type: valid.sourceType,
        status: "queued",
      })
      .select("id, status")
      .single();

    if (videoErr || !video) {
      return NextResponse.json(
        {
          error: `stage=${stage} failed: ${videoErr?.message || "Failed to create video job"}`,
          details: videoErr || null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      playerId: player.id,
      videoId: video.id,
      status: video.status,
      analysisType,
      targetTeam: analysisType === "team" ? targetTeam : null,
    });
  } catch (error) {
    console.error("POST /api/jobs failure", { stage, error });
    return NextResponse.json(
      {
        error: `stage=${stage} failed: ${error instanceof Error ? error.message : "Unexpected server error"}`,
      },
      { status: 500 },
    );
  }
}
