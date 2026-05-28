"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import PurdueChatWidget from "@/components/purdue-chat-widget";
import PurdueSoccerPanel from "@/components/purdue-soccer-panel";
import ReportView from "@/components/report-view";
import ScoutAnalysisChat from "@/components/scout-analysis-chat";

type JobStatus = "idle" | "submitting" | "running" | "polling" | "complete" | "failed";

interface ApiError {
  error?: string;
}

type ResultShape = {
  video: {
    id: string;
    status: string;
    error_message?: string | null;
    duration_seconds?: number;
  };
  player?: {
    name?: string;
    age?: number;
    current_team?: string;
  };
  report?: {
    id: string;
    positions: string[];
    confidence_score: number;
    style_summary: string;
    strengths: Array<{ category: string; description: string; confidence: number; evidence_ids?: string[] }>;
    development_areas: Array<{ category: string; description: string; confidence: number; evidence_ids?: string[] }>;
    evidence_flags: string[];
    role_view_cache?: Record<string, unknown>;
  };
  evidence?: Array<{
    id: string;
    time_seconds: number;
    time_label: string;
    category: "technical" | "physical" | "tactical" | "mental";
    description: string;
    confidence: number;
  }>;
};

export default function Home() {
  const [mainTab, setMainTab] = useState<"scout" | "purdue">("scout");
  const [analysisType, setAnalysisType] = useState<"player" | "team">("player");
  const [playerName, setPlayerName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [age, setAge] = useState("");
  const [team, setTeam] = useState("");
  const [targetTeam, setTargetTeam] = useState("");
  const [detectedTeams, setDetectedTeams] = useState<string[]>([]);
  const [detectingTeams, setDetectingTeams] = useState(false);
  const [detectTeamsMsg, setDetectTeamsMsg] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultShape | null>(null);

  const playerMeta = useMemo(() => {
    if (!result?.video) return "";
    const bits = [
      typeof result.video.duration_seconds === "number"
        ? `${Math.floor(result.video.duration_seconds / 60)}:${String(result.video.duration_seconds % 60).padStart(2, "0")} highlight`
        : null,
      result.player?.current_team || null,
      result.player?.age ? `Age ${result.player.age}` : null,
    ].filter(Boolean);
    return bits.join(" · ");
  }, [result]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    setResult(null);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisType,
        playerName,
        sourceUrl,
        age: age ? Number(age) : null,
        team,
        targetTeam,
      }),
    });

    if (!res.ok) {
      const body = (await res.json()) as ApiError;
      setStatus("failed");
      setError(body.error || "Failed to submit job");
      return;
    }

    const body = (await res.json()) as { videoId: string };
    setVideoId(body.videoId);
    setStatus("running");

    const runRes = await fetch(`/api/jobs/${body.videoId}/run`, { method: "POST" });
    if (!runRes.ok) {
      const runBody = (await runRes.json()) as ApiError;
      setStatus("failed");
      setError(runBody.error || "Failed to process job");
      return;
    }

    setStatus("polling");

    for (let i = 0; i < 20; i++) {
      const pollRes = await fetch(`/api/jobs/${body.videoId}`);
      if (pollRes.ok) {
        const pollBody = (await pollRes.json()) as ResultShape;
        if (pollBody.video?.status === "complete") {
          setResult(pollBody);
          setStatus("complete");
          return;
        }
        if (pollBody.video?.status === "failed") {
          setStatus("failed");
          setError(pollBody.video?.error_message || "Job failed during processing.");
          return;
        }
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    setStatus("failed");
    setError("Timed out waiting for report.");
  }

  async function detectTeamsFromLink() {
    if (!sourceUrl.trim()) {
      setDetectTeamsMsg("Enter a match URL first.");
      return;
    }
    setDetectingTeams(true);
    setDetectTeamsMsg(null);
    try {
      const res = await fetch("/api/team-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl }),
      });
      const body = (await res.json()) as { teams?: string[]; warning?: string; error?: string };
      if (!res.ok) {
        setDetectTeamsMsg(body.error || "Could not detect teams.");
        return;
      }
      const teamsFound = body.teams || [];
      setDetectedTeams(teamsFound);
      if (teamsFound.length >= 2) {
        setTargetTeam(teamsFound[0]);
        setDetectTeamsMsg(`Detected teams: ${teamsFound[0]} vs ${teamsFound[1]}`);
      } else {
        setDetectTeamsMsg(body.warning || "Could not confidently detect two teams. Enter team manually.");
      }
    } catch {
      setDetectTeamsMsg("Team detection request failed.");
    } finally {
      setDetectingTeams(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#10141b] px-6 py-10 text-[#f3f6fb]">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-5xl font-semibold tracking-tight">ScoutAI</h1>
        <p className="mt-3 text-lg text-[#b8c1d2]">Scouting reports plus Purdue-specific roster intel in one place.</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-[#2c3139] bg-[#171d26] p-2">
          <button
            type="button"
            onClick={() => setMainTab("scout")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === "scout" ? "bg-[#1f3f7f] text-white" : "bg-[#11161f] text-[#c8d1e3]"
            }`}
          >
            Scout Report
          </button>
          <button
            type="button"
            onClick={() => setMainTab("purdue")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mainTab === "purdue" ? "bg-[#1f3f7f] text-white" : "bg-[#11161f] text-[#c8d1e3]"
            }`}
          >
            Purdue Soccer
          </button>
        </div>

        {mainTab === "scout" ? (
          <>
            <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-[#2c3139] bg-[#171d26] p-6">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#2f3746] bg-[#10151d] p-2">
                <button
                  type="button"
                  onClick={() => setAnalysisType("player")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    analysisType === "player" ? "bg-[#1f3f7f] text-white" : "bg-[#11161f] text-[#c8d1e3]"
                  }`}
                >
                  Player Analysis
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisType("team")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    analysisType === "team" ? "bg-[#1f3f7f] text-white" : "bg-[#11161f] text-[#c8d1e3]"
                  }`}
                >
                  Team Analysis
                </button>
              </div>

              <input
                className="w-full rounded-lg border border-[#313844] bg-[#0f1216] px-4 py-3"
                placeholder={analysisType === "team" ? "Analyst label (optional)" : "Player name"}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required={analysisType === "player"}
              />
              <input
                className="w-full rounded-lg border border-[#313844] bg-[#0f1216] px-4 py-3"
                placeholder={analysisType === "team" ? "Full game URL (YouTube or Hudl)" : "YouTube or Hudl URL"}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                required
              />
              {analysisType === "team" ? (
                <div className="rounded-xl border border-[#2f3746] bg-[#10151d] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={detectingTeams || !sourceUrl.trim()}
                      onClick={detectTeamsFromLink}
                      className="rounded-lg border border-[#3a4353] px-3 py-2 text-sm hover:bg-[#202734] disabled:opacity-50"
                    >
                      {detectingTeams ? "Detecting teams..." : "Detect 2 Teams From URL"}
                    </button>
                    {detectTeamsMsg ? <p className="text-xs text-[#b8c3d7]">{detectTeamsMsg}</p> : null}
                  </div>

                  {detectedTeams.length >= 2 ? (
                    <select
                      value={targetTeam}
                      onChange={(e) => setTargetTeam(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#313844] bg-[#0f1216] px-4 py-3"
                    >
                      {detectedTeams.map((t) => (
                        <option key={t} value={t}>
                          Analyze team: {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={targetTeam}
                      onChange={(e) => setTargetTeam(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#313844] bg-[#0f1216] px-4 py-3"
                      placeholder="Team to analyze (required)"
                      required={analysisType === "team"}
                    />
                  )}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="w-full rounded-lg border border-[#313844] bg-[#0f1216] px-4 py-3"
                  placeholder="Age (optional)"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border border-[#313844] bg-[#0f1216] px-4 py-3"
                  placeholder="Team (optional)"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting" || status === "running" || status === "polling"}
                className="w-full rounded-lg bg-[#2f6fed] px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {status === "submitting" || status === "running" || status === "polling" ? "Processing..." : "Generate Report"}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-[#2c3139] bg-[#151b25] p-4">
              <p>
                <strong>Status:</strong> {status}
              </p>
              {videoId ? (
                <p className="mt-2 text-sm text-[#aeb4c0]">
                  <strong>Video ID:</strong> {videoId}
                </p>
              ) : null}
              {error ? <p className="mt-3 text-[#ff8b8b]">{error}</p> : null}
            </div>

            {sourceUrl.trim() ? (
              <div className="mt-6">
                <ScoutAnalysisChat
                  playerName={analysisType === "team" ? `Team Analysis: ${targetTeam || "selected team"}` : playerName}
                  sourceUrl={sourceUrl}
                  team={analysisType === "team" ? targetTeam : team}
                  age={age}
                  report={result?.report || null}
                  evidence={result?.evidence || []}
                />
              </div>
            ) : null}

            {result?.report ? (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[#2b313c] bg-[#161b23] p-4">
                  <p className="text-sm text-[#c1cbe0]">Report ready. Open shareable page for coach/recruiter/player views.</p>
                  <Link href={`/report/${result.report.id}`} className="rounded-lg border border-[#3a4353] px-4 py-2 text-sm hover:bg-[#202734]">
                    Open Report Page
                  </Link>
                </div>

                <ReportView
                  report={result.report}
                  evidence={result.evidence || []}
                  playerName={result.player?.name || "Player"}
                  playerMeta={playerMeta}
                  showActions={false}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-8">
            <PurdueSoccerPanel />
          </div>
        )}
      </div>
      <PurdueChatWidget />
    </main>
  );
}
