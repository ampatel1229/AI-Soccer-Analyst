"use client";

import { useMemo, useState } from "react";

type RoleView = "coach" | "recruiter" | "player";

type EvidenceItem = {
  id: string;
  time_seconds: number;
  time_label: string;
  category: "technical" | "physical" | "tactical" | "mental";
  description: string;
  confidence: number;
};

type TraitItem = {
  category: string;
  description: string;
  confidence: number;
  evidence_ids?: string[];
};

type ReportPayload = {
  id: string;
  positions: string[];
  confidence_score: number;
  style_summary: string;
  strengths: TraitItem[];
  development_areas: TraitItem[];
  evidence_flags: string[];
  role_view_cache?: {
    analysis_type?: "player" | "team";
    team_focus?: { targetTeam?: string | null; detectedTeams?: string[] };
    coach?: { headline?: string; summary?: string };
    recruiter?: { headline?: string; summary?: string; top_strengths?: string[] };
    player?: { headline?: string; summary?: string; next_steps?: string[] };
    calibration?: {
      version: string;
      base_confidence: number;
      calibrated_confidence: number;
      cap_applied: number;
      cap_reason: string;
      evidence_score: number;
      metrics: {
        frame_mode: boolean;
        duration_seconds: number;
        observation_count: number;
        distinct_categories: number;
        repeated_patterns: number;
        position_evidence_count: number;
      };
    };
  };
};

type Props = {
  report: ReportPayload;
  evidence: EvidenceItem[];
  playerName?: string;
  playerMeta?: string;
  showActions?: boolean;
};

function confidenceColor(confidence: number) {
  if (confidence >= 80) return "bg-emerald-500";
  if (confidence >= 60) return "bg-sky-500";
  return "bg-amber-500";
}

function roleLabel(role: RoleView) {
  if (role === "coach") return "Coach";
  if (role === "recruiter") return "Recruiter";
  return "Player";
}

export default function ReportView({ report, evidence, playerName, playerMeta, showActions = true }: Props) {
  const [role, setRole] = useState<RoleView>("coach");
  const isTeamReport = report.role_view_cache?.analysis_type === "team";

  const evidenceById = useMemo(() => {
    const map = new Map<string, EvidenceItem>();
    for (const item of evidence) map.set(item.id, item);
    return map;
  }, [evidence]);

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  const roleText = report.role_view_cache?.[role];
  const calibration = report.role_view_cache?.calibration;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{playerName || "Player Report"}</h1>
            {playerMeta ? <p className="mt-1 text-[#b6becc]">{playerMeta}</p> : null}
          </div>
          {showActions ? (
            <div className="flex gap-2">
              <button
                onClick={copyShareLink}
                className="rounded-lg border border-[#3a4353] px-4 py-2 text-sm hover:bg-[#202734]"
                type="button"
              >
                Share
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-[#3a4353] px-4 py-2 text-sm hover:bg-[#202734]"
                type="button"
              >
                Export PDF
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["coach", "recruiter", "player"] as RoleView[]).map((view) => (
            <button
              key={view}
              onClick={() => setRole(view)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                role === view
                  ? "border-[#4d8dff] bg-[#1f3f7f] text-white"
                  : "border-[#333c4b] bg-[#131822] text-[#d2d8e5]"
              }`}
              type="button"
            >
              {roleLabel(view)}
            </button>
          ))}
        </div>
      </div>

      {report.evidence_flags.length > 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/15 p-4 text-amber-200">
          <p className="font-semibold">Insufficient evidence flags</p>
          <p className="mt-1 text-sm">{report.evidence_flags.join(" · ")}</p>
        </div>
      ) : null}

      {calibration ? (
        <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
          <h2 className="text-xl font-semibold">Confidence Calibration</h2>
          <p className="mt-2 text-sm text-[#c4d0e5]">
            Base {Math.round(calibration.base_confidence)}% {"->"} Calibrated {Math.round(calibration.calibrated_confidence)}%
            {" "}
            (cap: {Math.round(calibration.cap_applied)}% · {calibration.cap_reason.replaceAll("_", " ")})
          </p>
          <p className="mt-1 text-sm text-[#9fb2d3]">Evidence score: {Math.round(calibration.evidence_score)}%</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#b9c6dc] sm:grid-cols-3">
            <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">obs: {calibration.metrics.observation_count}</span>
            <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">categories: {calibration.metrics.distinct_categories}</span>
            <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">repeats: {calibration.metrics.repeated_patterns}</span>
            <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">position support: {calibration.metrics.position_evidence_count}</span>
            <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">duration: {Math.round(calibration.metrics.duration_seconds)}s</span>
            <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">
              mode: {calibration.metrics.frame_mode ? "frame-level" : "metadata"}
            </span>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
        <h2 className="text-xl font-semibold">{isTeamReport ? "Likely Team Structure" : "Likely Positions"}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {report.positions.map((position) => (
            <span key={position} className="rounded-full bg-[#23417a] px-3 py-1 text-sm text-[#c5dbff]">
              {position}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[#cfd7e4]">Overall confidence: {Math.round(report.confidence_score)}%</p>
        {!isTeamReport ? (
          <div className="mt-4 rounded-lg border border-[#314160] bg-[#111b2d] p-3">
            <p className="text-sm font-semibold text-[#c5dbff]">Position Key</p>
            <p className="mt-2 text-xs text-[#cdd7e8]">GK = Goalkeeper</p>
            <p className="text-xs text-[#cdd7e8]">CB = Center Back</p>
            <p className="text-xs text-[#cdd7e8]">RB/LB = Right Back / Left Back</p>
            <p className="text-xs text-[#cdd7e8]">CDM = Center Defensive Midfield</p>
            <p className="text-xs text-[#cdd7e8]">CM = Center Mid</p>
            <p className="text-xs text-[#cdd7e8]">CAM = Center Attacking Mid</p>
            <p className="text-xs text-[#cdd7e8]">LW/RW = Left Wing / Right Wing</p>
            <p className="text-xs text-[#cdd7e8]">ST = Striker</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
        <h2 className="text-xl font-semibold">Play Style</h2>
        <p className="mt-3 leading-7 text-[#e8edf7]">{report.style_summary}</p>
        {roleText?.headline || roleText?.summary ? (
          <div className="mt-4 rounded-lg border border-[#2d3644] bg-[#10151d] p-3">
            {roleText?.headline ? <p className="font-semibold text-[#d7e5ff]">{roleText.headline}</p> : null}
            {roleText?.summary ? <p className="mt-1 text-sm text-[#bfcae0]">{roleText.summary}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
        <h2 className="text-xl font-semibold">Strengths</h2>
        <div className="mt-4 space-y-4">
          {report.strengths.map((item, idx) => (
            <article key={`${item.description}-${idx}`} className="rounded-xl border border-[#2f3746] bg-[#10151d] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#ebf1fc]">{item.description}</p>
                <span className="text-sm text-[#9cb0ce]">{item.category}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-[#283242]">
                <div className={`h-2 rounded-full ${confidenceColor(item.confidence)}`} style={{ width: `${Math.max(5, Math.min(100, item.confidence))}%` }} />
              </div>
              <p className="mt-1 text-sm text-[#b7c4db]">{Math.round(item.confidence)}% confidence</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(item.evidence_ids || []).map((id) => {
                  const ev = evidenceById.get(id);
                  return (
                    <span key={id} className="rounded-md border border-[#395072] bg-[#1a2a40] px-2 py-1 text-xs text-[#bbd5f8]">
                      {ev ? ev.time_label : "Timestamp"}
                    </span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
        <h2 className="text-xl font-semibold">Development Areas</h2>
        <div className="mt-4 space-y-4">
          {report.development_areas.map((item, idx) => (
            <article key={`${item.description}-${idx}`} className="rounded-xl border border-[#2f3746] bg-[#10151d] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#ebf1fc]">{item.description}</p>
                <span className="text-sm text-[#9cb0ce]">{item.category}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(item.evidence_ids || []).map((id) => {
                  const ev = evidenceById.get(id);
                  return (
                    <span key={id} className="rounded-md border border-[#614f2b] bg-[#2e2616] px-2 py-1 text-xs text-[#f7deaa]">
                      {ev ? ev.time_label : "Timestamp"}
                    </span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
        <h2 className="text-xl font-semibold">Evidence Log</h2>
        <div className="mt-3 space-y-2">
          {evidence.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-[#2f3746] bg-[#10151d] p-3">
              <p className="text-sm text-[#d7e1f3]">
                <span className="font-semibold">{ev.time_label}</span> · {ev.category} · {Math.round(ev.confidence)}%
              </p>
              <p className="mt-1 text-sm text-[#b5c3db]">{ev.description}</p>
            </div>
          ))}
          {evidence.length === 0 ? <p className="text-sm text-[#b5c3db]">No evidence items in this report yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
