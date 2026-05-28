import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { detectSourceType } from "./source-validator";
import { getSupabaseServerClient } from "./supabase-server";
import { calibrateReportConfidence } from "./confidence-calibration";
import { buildPurdueWomenSeasonModelContext } from "./purdue-women-2025-season";

const execFileAsync = promisify(execFile);

type EvidenceCategory = "technical" | "physical" | "tactical" | "mental";

interface YtMetadata {
  duration?: number;
  title?: string;
  uploader?: string;
  description?: string;
}

type AnalysisFocus = {
  type: "player" | "team";
  targetTeam?: string | null;
  opponentTeam?: string | null;
  detectedTeams?: string[];
};

interface GeminiObservation {
  id: string;
  time_seconds: number;
  time_label: string;
  category: EvidenceCategory;
  skill: string;
  description: string;
  confidence: number;
  repeat_pattern?: boolean;
  pattern_count?: number;
  supports_positions?: string[];
}

interface GeminiPayload {
  video_summary?: {
    duration_seconds?: number;
    estimated_positional_context?: Array<{ position: string; confidence: number }>;
    coverage_flags?: string[];
  };
  observations?: GeminiObservation[];
  cannot_assess?: Array<{ area: string; reason: string }>;
}

interface ClaudePayload {
  positions: Array<{ label: string; confidence: number }>;
  overall_confidence: number;
  style_summary: string;
  strengths: Array<{ category: string; description: string; confidence: number; evidence_ids: string[] }>;
  development_areas: Array<{ category: string; description: string; confidence: number; evidence_ids: string[] }>;
  evidence_flags: string[];
  role_views?: {
    coach?: { headline?: string; summary?: string };
    recruiter?: { headline?: string; summary?: string; top_strengths?: string[] };
    player?: { headline?: string; summary?: string; next_steps?: string[] };
  };
}

interface EventSummary {
  event_id: string;
  event_type: string;
  confidence: number;
  supporting_observation_ids: string[];
  sample_timestamps: string[];
  interpretation: string;
}

interface FrameSample {
  timestamp: number;
  label: string;
  mimeType: string;
  base64Data: string;
}

const ATTACKING_POSITIONS = new Set(["CF", "SS", "WM", "CAM"]);

function isAttackingRole(positions: Array<{ label: string; confidence: number }>): boolean {
  return positions.some((p) => ATTACKING_POSITIONS.has((p.label || "").toUpperCase()));
}

function pickEvidenceIds(observations: GeminiObservation[], preferredCategory?: EvidenceCategory): string[] {
  const source = preferredCategory
    ? observations.filter((obs) => obs.category === preferredCategory)
    : observations;
  const picked = (source.length > 0 ? source : observations).slice(0, 2).map((obs) => obs.id);
  return picked.length > 0 ? picked : ["obs_1"];
}

function roleSpecificDevelopmentAreas(
  positions: Array<{ label: string; confidence: number }>,
  observations: GeminiObservation[],
): Array<{ category: string; description: string; confidence: number; evidence_ids: string[] }> {
  if (isAttackingRole(positions)) {
    return [
      {
        category: "tactical",
        description:
          "Final-third decision quality: scan one pass earlier and choose the extra pass when the weak-side runner is open instead of forcing the first shooting window.",
        confidence: 66,
        evidence_ids: pickEvidenceIds(observations, "tactical"),
      },
      {
        category: "technical",
        description:
          "Last-action execution in attacking phases: improve body shape on first touch before finishing/crossing so the second action is cleaner under pressure.",
        confidence: 63,
        evidence_ids: pickEvidenceIds(observations, "technical"),
      },
      {
        category: "tactical",
        description:
          "Off-ball timing around the box: delay or curve runs to avoid arriving on the same line as the ball and increase cutback/through-ball availability.",
        confidence: 61,
        evidence_ids: pickEvidenceIds(observations),
      },
    ];
  }

  return [
    {
      category: "tactical",
      description:
        "Speed up pre-reception scanning and shoulder checks before receiving, so next action is planned instead of reactive in pressure phases.",
      confidence: 64,
      evidence_ids: pickEvidenceIds(observations, "tactical"),
    },
    {
      category: "technical",
      description:
        "Improve first-pass quality after regains by opening hips earlier and selecting safer progression lanes before forcing vertical balls.",
      confidence: 62,
      evidence_ids: pickEvidenceIds(observations, "technical"),
    },
    {
      category: "physical",
      description:
        "Sharpen repeat high-intensity actions in transition moments (sprint-recover-sprint) to sustain effectiveness deeper into phases.",
      confidence: 58,
      evidence_ids: pickEvidenceIds(observations, "physical"),
    },
  ];
}

function isGenericDevelopmentDescription(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("need frame-level analysis") ||
    normalized.includes("need more varied phases") ||
    normalized.includes("insufficient evidence") ||
    normalized.includes("cannot assess") ||
    normalized.includes("metadata fallback")
  );
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync("which", [command]);
    return true;
  } catch {
    return false;
  }
}

async function fetchYtMetadata(url: string): Promise<YtMetadata> {
  const bin = process.env.YT_DLP_BIN || "yt-dlp";
  const { stdout } = await execFileAsync(bin, ["--dump-single-json", "--no-warnings", url], {
    maxBuffer: 12 * 1024 * 1024,
  });

  return JSON.parse(stdout) as YtMetadata;
}

async function downloadVideo(url: string, outDir: string, options?: { fastMode?: boolean }): Promise<string> {
  const bin = process.env.YT_DLP_BIN || "yt-dlp";
  const outputTemplate = path.join(outDir, "source.%(ext)s");
  const fastMode = !!options?.fastMode;
  const format = fastMode
    ? "best[ext=mp4][height<=480]/best[height<=480]/best"
    : "mp4/bestvideo+bestaudio/best";
  const args = [
    "-f",
    format,
    "--merge-output-format",
    "mp4",
    "--no-warnings",
    "--no-playlist",
    "--concurrent-fragments",
    fastMode ? "8" : "4",
    "-o",
    outputTemplate,
    url,
  ];
  if (fastMode) {
    args.splice(2, 0, "-S", "res:480");
  }

  await execFileAsync(bin, args, { maxBuffer: 6 * 1024 * 1024 });

  const files = await fs.readdir(outDir);
  const picked = files.find((f) => f.startsWith("source."));
  if (!picked) {
    throw new Error("Video download completed but file was not found.");
  }

  return path.join(outDir, picked);
}

function toTimeLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

async function extractFrames(videoPath: string, durationSeconds: number, outDir: string): Promise<FrameSample[]> {
  const frameCount = Math.max(8, Math.min(20, Number(process.env.FRAME_SAMPLE_COUNT || 10)));
  const ffmpegPath = process.env.FFMPEG_BIN || "ffmpeg";

  if (!(await commandExists(ffmpegPath))) {
    return [];
  }

  const safeDuration = Math.max(30, durationSeconds || 30);
  const spacing = safeDuration / frameCount;
  const frames: FrameSample[] = [];

  for (let i = 0; i < frameCount; i++) {
    const ts = Math.min(safeDuration - 1, Math.max(0, Math.floor((i + 0.5) * spacing)));
    const label = toTimeLabel(ts);
    const filename = path.join(outDir, `frame-${String(i).padStart(2, "0")}.jpg`);

    try {
      await execFileAsync(ffmpegPath, [
        "-ss",
        String(ts),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=960:-1",
        "-q:v",
        "4",
        "-y",
        filename,
      ]);

      const data = await fs.readFile(filename);
      frames.push({
        timestamp: ts,
        label,
        mimeType: "image/jpeg",
        base64Data: data.toString("base64"),
      });
    } catch {
      continue;
    }
  }

  return frames;
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function formatNetworkError(prefix: string, error: unknown): Error {
  const base = error instanceof Error ? error.message : String(error);
  const cause = typeof error === "object" && error !== null && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  if (cause && typeof cause === "object") {
    const causeObj = cause as Record<string, unknown>;
    const code = typeof causeObj.code === "string" ? causeObj.code : "";
    const message = typeof causeObj.message === "string" ? causeObj.message : "";
    const host = typeof causeObj.hostname === "string" ? causeObj.hostname : "";
    const detail = [code, message, host ? `host=${host}` : ""].filter(Boolean).join(" | ");
    return new Error(`${prefix}: ${base}${detail ? ` (${detail})` : ""}`);
  }
  return new Error(`${prefix}: ${base}`);
}

function parseTeamsFromTitle(title: string): string[] {
  const cleaned = (title || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const separators = [/\s+vs\.?\s+/i, /\s+v\s+/i, /\s+at\s+/i, /\s+@\s+/i, /\s*-\s*/i];
  for (const sep of separators) {
    const parts = cleaned.split(sep).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const left = parts[0].replace(/\(.*?\)/g, "").trim();
      const right = parts[1].replace(/\(.*?\)/g, "").trim();
      if (left.length >= 2 && right.length >= 2) return [left, right];
    }
  }
  return [];
}

async function runGeminiFromFrames(
  metadata: YtMetadata,
  sourceUrl: string,
  frames: FrameSample[],
  teamContext: string,
  focus: AnalysisFocus,
): Promise<GeminiPayload> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const systemPromptPlayer = `You are a soccer analyst producing structured evidence from highlight footage.
Return strict JSON only.

Use this position taxonomy: GK, CB, FB/WB, CDM, CM, CAM, WM, SS, CF.
Output 10-18 observations if enough visual evidence exists, otherwise 6-10 with explicit cannot_assess.
Every observation must include a valid timestamp from supplied frame labels.
Confidence scoring: repeated visual pattern > 2 appearances can be >75. single-frame inferences must stay <=62.
`;

  const systemPromptTeam = `You are a soccer TEAM analyst producing structured evidence from match footage.
Return strict JSON only.

Analyze only this team:
target_team=${focus.targetTeam || "unknown"}
opponent_team=${focus.opponentTeam || "unknown"}

Focus on team-level behavior:
- build-up structure and progression lanes
- chance creation patterns and final-third choices
- defensive block shape and pressing triggers
- transition organization in both directions
- set-piece structure

Output 12-22 observations when evidence supports it, each tied to valid timestamps.
Do not output generic "need more footage" statements as development points.
`;

  const contextText = `video_title=${metadata.title || "unknown"}\nsource_url=${sourceUrl}\nduration_seconds=${metadata.duration || 0}\ndescription_excerpt=${(metadata.description || "").slice(0, 2500)}`;

  const frameLegend = frames.map((f, idx) => `frame_${idx}: ${f.label}`).join("\n");

  const schemaPrompt = `Return JSON with this exact shape:
{
  "video_summary": {
    "duration_seconds": number,
    "estimated_positional_context": [{ "position": "GK|CB|FB/WB|CDM|CM|CAM|WM|SS|CF", "confidence": number }],
    "coverage_flags": ["string"]
  },
  "observations": [{
    "id": "obs_...",
    "time_seconds": number,
    "time_label": "m:ss",
    "category": "technical|physical|tactical|mental",
    "skill": "string",
    "description": "string",
    "confidence": number,
    "repeat_pattern": true,
    "pattern_count": number,
    "supports_positions": ["GK|CB|FB/WB|CDM|CM|CAM|WM|SS|CF"]
  }],
  "cannot_assess": [{"area":"string","reason":"string"}]
}`;

  const parts: Array<Record<string, unknown>> = [
    { text: focus.type === "team" ? systemPromptTeam : systemPromptPlayer },
    { text: contextText },
    { text: `Team context:\n${teamContext}` },
    { text: `Analysis focus:\n${JSON.stringify(focus)}` },
    { text: `Frame legend:\n${frameLegend}` },
    { text: schemaPrompt },
  ];

  for (const frame of frames) {
    parts.push({ text: `Frame timestamp: ${frame.label}` });
    parts.push({ inline_data: { mime_type: frame.mimeType, data: frame.base64Data } });
  }

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
  } catch (error) {
    throw formatNetworkError("Gemini network request failed", error);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no text content");
  }

  return JSON.parse(extractJson(text)) as GeminiPayload;
}

async function runClaudeFrameObserver(metadata: YtMetadata, sourceUrl: string, frames: FrameSample[]): Promise<GeminiPayload> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_VISION_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const apiKey: string = key;

  const baseFrames = frames.slice(0, Math.max(6, Math.min(12, Number(process.env.FRAME_SAMPLE_COUNT || 10))));

  async function requestObservationJson(
    selectedFrames: FrameSample[],
    maxTokens: number,
    compactMode: boolean,
  ): Promise<GeminiPayload> {
    const content: Array<Record<string, unknown>> = [];
    content.push({
      type: "text",
      text:
        "You are a soccer analyst extracting timestamped observations from frame samples. " +
        "Return strict JSON only. No markdown. No extra text.",
    });
    content.push({
      type: "text",
      text:
        `Source URL: ${sourceUrl}\n` +
        `Video title: ${metadata.title || "unknown"}\n` +
        `Duration seconds: ${metadata.duration || 0}\n` +
        `Frame labels: ${selectedFrames.map((f) => f.label).join(", ")}\n` +
        "Position taxonomy: GK, CB, FB/WB, CDM, CM, CAM, WM, SS, CF.\n" +
        (compactMode
          ? "Output 6-10 concise observations. Keep each description under 18 words.\n"
          : "Output 8-16 observations when evidence supports it.\n") +
        "If evidence is narrow, include cannot_assess entries.",
    });

    for (const frame of selectedFrames) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: frame.mimeType,
          data: frame.base64Data,
        },
      });
      content.push({
        type: "text",
        text: `Timestamp label for previous frame: ${frame.label}`,
      });
    }

    content.push({
      type: "text",
      text:
        "Return minified JSON with this exact schema keys only:\n" +
        '{"video_summary":{"duration_seconds":0,"estimated_positional_context":[{"position":"GK","confidence":0}],"coverage_flags":["string"]},' +
        '"observations":[{"id":"obs_1","time_seconds":0,"time_label":"0:00","category":"technical","skill":"string","description":"string","confidence":0,"repeat_pattern":true,"pattern_count":1,"supports_positions":["GK"]}],' +
        '"cannot_assess":[{"area":"string","reason":"string"}]}',
    });

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content }],
        }),
      });
    } catch (error) {
      throw formatNetworkError("Claude frame observer network request failed", error);
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Claude frame observer failed: ${response.status} ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((item) => item.type === "text")?.text;
    if (!text) throw new Error("Claude frame observer returned no text content");
    return JSON.parse(extractJson(text)) as GeminiPayload;
  }

  try {
    return await requestObservationJson(baseFrames, 2600, false);
  } catch (firstError) {
    const reducedFrames = baseFrames.slice(0, Math.max(6, Math.min(8, baseFrames.length)));
    try {
      return await requestObservationJson(reducedFrames, 3200, true);
    } catch (secondError) {
      const f = firstError instanceof Error ? firstError.message : String(firstError);
      const s = secondError instanceof Error ? secondError.message : String(secondError);
      throw new Error(`Claude frame observer parse retry failed. first=${f}. second=${s}`);
    }
  }
}

function deriveEvents(observations: GeminiObservation[]): EventSummary[] {
  const buckets = new Map<string, GeminiObservation[]>();

  for (const obs of observations) {
    const key = obs.skill || obs.category;
    const existing = buckets.get(key) || [];
    existing.push(obs);
    buckets.set(key, existing);
  }

  const events: EventSummary[] = [];
  for (const [skill, grouped] of buckets.entries()) {
    grouped.sort((a, b) => a.time_seconds - b.time_seconds);
    const avg = grouped.reduce((acc, cur) => acc + cur.confidence, 0) / grouped.length;
    events.push({
      event_id: `evt_${skill.replace(/[^a-z0-9]+/gi, "_")}`,
      event_type: skill,
      confidence: Math.round(Math.min(95, avg + Math.min(12, grouped.length * 2))),
      supporting_observation_ids: grouped.map((g) => g.id),
      sample_timestamps: grouped.slice(0, 3).map((g) => g.time_label),
      interpretation: grouped.length >= 2 ? `Repeated pattern across ${grouped.length} observations.` : "Limited single-event signal.",
    });
  }

  return events.sort((a, b) => b.confidence - a.confidence).slice(0, 16);
}

function applyQualityGate(claude: ClaudePayload, observations: GeminiObservation[], durationSeconds: number, frameMode: boolean) {
  const categories = new Set(observations.map((o) => o.category));
  const flags = new Set(claude.evidence_flags || []);

  if (!frameMode) {
    flags.add("frame_level_analysis_not_enabled");
  }

  if (observations.length < 6) {
    flags.add("insufficient_observation_volume");
  }

  if (categories.size < 2) {
    flags.add("low_phase_coverage");
  }

  if (durationSeconds < 300) {
    flags.add("short_highlight_bias");
  }

  const confidencePenalty = (observations.length < 6 ? 12 : 0) + (categories.size < 2 ? 10 : 0) + (durationSeconds < 300 ? 8 : 0);

  claude.overall_confidence = Math.max(35, Math.min(95, Math.round(claude.overall_confidence - confidencePenalty)));
  claude.evidence_flags = Array.from(flags);

  const clampTrait = (items: ClaudePayload["strengths"] | ClaudePayload["development_areas"]) =>
    items.map((item) => ({
      ...item,
      confidence: Math.max(35, Math.min(95, Math.round(item.confidence - Math.floor(confidencePenalty / 2)))),
    }));

  claude.strengths = clampTrait(claude.strengths);
  claude.development_areas = clampTrait(claude.development_areas);
}

async function runClaude(gemini: GeminiPayload, events: EventSummary[], teamContext: string): Promise<ClaudePayload> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

  const prompt = `You are an elite soccer scouting report synthesizer.
Use ONLY supplied evidence. No unsupported claims.

Observation JSON:\n${JSON.stringify(gemini)}

Derived event summary:\n${JSON.stringify(events)}

Team context:\n${teamContext}

Return strict JSON with schema:
{
  "positions": [{ "label": "GK|CB|FB/WB|CDM|CM|CAM|WM|SS|CF", "confidence": number }],
  "overall_confidence": number,
  "style_summary": "2-3 detailed sentences",
  "strengths": [{"category":"technical|physical|tactical|mental","description":"string","confidence":number,"evidence_ids":["obs_..."]}],
  "development_areas": [{"category":"technical|physical|tactical|mental","description":"string","confidence":number,"evidence_ids":["obs_..."]}],
  "evidence_flags": ["string"],
  "role_views": {
    "coach": {"headline":"string","summary":"string"},
    "recruiter": {"headline":"string","summary":"string","top_strengths":["string"]},
    "player": {"headline":"string","summary":"string","next_steps":["string"]}
  }
}

Requirements:
- Strengths: 4-5 items when evidence supports it; otherwise 3 with evidence flag.
- Development areas: 2-3 items.
- Every item MUST include 1-3 evidence_ids from observations.
- Use specific tactical language.
- If uncertainty exists, articulate it explicitly but still be useful.
- Development areas must be coaching-actionable and skill-specific (e.g., extra pass timing, body shape before finish, run timing, scanning, pressing trigger choices).
- Do NOT output generic-only development text such as "need more footage" as a standalone development area.`;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (error) {
    throw formatNetworkError("Claude synthesis network request failed", error);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude request failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Claude returned no text content");
  }

  return JSON.parse(extractJson(text)) as ClaudePayload;
}

async function runClaudeTeam(
  gemini: GeminiPayload,
  events: EventSummary[],
  teamContext: string,
  focus: AnalysisFocus,
): Promise<ClaudePayload> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

  const prompt = `You are an elite soccer TEAM analyst.
Use ONLY supplied evidence. No unsupported claims.

Analyze this team:
target_team=${focus.targetTeam || "unknown"}
opponent_team=${focus.opponentTeam || "unknown"}
detected_teams=${(focus.detectedTeams || []).join(" vs ")}

Observation JSON:\n${JSON.stringify(gemini)}

Derived event summary:\n${JSON.stringify(events)}

Team context:\n${teamContext}

Return strict JSON with schema:
{
  "positions": [{"label":"3-4-3|4-3-3|4-2-3-1|4-4-2|3-5-2|hybrid","confidence":number}],
  "overall_confidence": number,
  "style_summary": "2-4 detailed sentences about team playing style",
  "strengths": [{"category":"technical|physical|tactical|mental","description":"string","confidence":number,"evidence_ids":["obs_..."]}],
  "development_areas": [{"category":"technical|physical|tactical|mental","description":"string","confidence":number,"evidence_ids":["obs_..."]}],
  "evidence_flags": ["string"],
  "role_views": {
    "coach": {"headline":"string","summary":"string"},
    "recruiter": {"headline":"string","summary":"string","top_strengths":["string"]},
    "player": {"headline":"string","summary":"string","next_steps":["string"]}
  }
}

Requirements:
- Strengths: 4-6 team-level strengths.
- Development areas: 3-5 concrete team-level improvements.
- Development areas must include actionable coaching points (extra pass timing, weak-side rest-defense spacing, pressing trigger timing, back-post marking assignments).
- Never return generic-only statements like "need more footage."
- Every item MUST include 1-3 evidence_ids from observations.`;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (error) {
    throw formatNetworkError("Claude team synthesis network request failed", error);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude team request failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("Claude team synthesis returned no text content");
  return JSON.parse(extractJson(text)) as ClaudePayload;
}

function fallbackFromMetadata(metadata: YtMetadata): { gemini: GeminiPayload; claude: ClaudePayload } {
  const title = (metadata.title || "").toLowerCase();
  const position = title.includes("gk")
    ? "GK"
    : title.includes("cb")
      ? "CB"
      : title.includes("lb") || title.includes("rb")
        ? "FB/WB"
        : title.includes("cdm")
          ? "CDM"
          : title.includes("cam")
            ? "CAM"
            : title.includes("cm")
              ? "CM"
              : title.includes("lw") || title.includes("rw")
                ? "WM"
                : title.includes("st") || title.includes("striker")
                  ? "CF"
                  : "CM";

  const observations: GeminiObservation[] = [
    {
      id: "obs_1",
      time_seconds: 20,
      time_label: "0:20",
      category: "tactical",
      skill: "positioning",
      description: "Fallback observation based on metadata-only run.",
      confidence: 45,
      supports_positions: [position],
    },
  ];

  return {
    gemini: {
      video_summary: {
        duration_seconds: metadata.duration || 0,
        estimated_positional_context: [{ position, confidence: 60 }],
        coverage_flags: ["metadata_only_inference"],
      },
      observations,
      cannot_assess: [{ area: "full_profile", reason: "Frame-level analysis unavailable." }],
    },
    claude: {
      positions: [{ label: position, confidence: 60 }],
      overall_confidence: 52,
      style_summary: "Preliminary report from metadata fallback. Enable full frame-level processing for higher-confidence scouting output.",
      strengths: [
        {
          category: "tactical",
          description: "Metadata suggests role-fit cues but not enough direct on-ball context.",
          confidence: 45,
          evidence_ids: ["obs_1"],
        },
      ],
      development_areas: roleSpecificDevelopmentAreas([{ label: position, confidence: 60 }], observations),
      evidence_flags: ["metadata_only_inference", "frame_level_analysis_not_enabled"],
      role_views: {
        coach: {
          headline: "Preliminary scouting read",
          summary: "This output is generated from metadata fallback and should be treated as a starting point.",
        },
        recruiter: {
          headline: "Initial role fit",
          summary: "Use for quick screening only until full frame analysis is enabled.",
          top_strengths: ["Provisional role alignment"],
        },
        player: {
          headline: "Early feedback",
          summary: "This is an early snapshot. Full video analysis will produce stronger actionable feedback.",
          next_steps: ["Upload longer highlight", "Include defensive phases"],
        },
      },
    },
  };
}

function sanitizeOutput(gemini: GeminiPayload, claude: ClaudePayload, duration: number) {
  const observations = (gemini.observations || [])
    .filter((obs) => typeof obs.description === "string" && obs.description.length > 10)
    .map((obs, i) => ({
      ...obs,
      id: obs.id || `obs_${i + 1}`,
      time_seconds: Math.max(0, Math.min(duration || 99999, Math.floor(obs.time_seconds || 0))),
      time_label: obs.time_label || toTimeLabel(obs.time_seconds || 0),
      confidence: Math.max(0, Math.min(100, Math.round(obs.confidence || 0))),
    }));

  gemini.observations = observations;

  const obsIds = new Set(observations.map((o) => o.id));

  const fixTraits = (traits: ClaudePayload["strengths"] | ClaudePayload["development_areas"]) =>
    traits
      .filter((t) => t.description && t.description.length > 10)
      .map((t) => ({
        ...t,
        confidence: Math.max(0, Math.min(100, Math.round(t.confidence || 0))),
        evidence_ids: (t.evidence_ids || []).filter((id) => obsIds.has(id)).slice(0, 3),
      }))
      .filter((t) => t.evidence_ids.length > 0);

  claude.positions = claude.positions.slice(0, 3).map((p) => ({ label: p.label, confidence: Math.max(0, Math.min(100, Math.round(p.confidence || 0))) }));
  claude.strengths = fixTraits(claude.strengths).slice(0, 5);
  claude.development_areas = fixTraits(claude.development_areas).slice(0, 3);
  claude.overall_confidence = Math.max(0, Math.min(100, Math.round(claude.overall_confidence || 0)));

  if (claude.strengths.length === 0) {
    claude.strengths = [
      {
        category: "tactical",
        description: "Evidence volume is limited; no high-confidence repeatable strength cleared the quality gate.",
        confidence: 40,
        evidence_ids: observations.slice(0, 1).map((o) => o.id),
      },
    ];
  }

  const genericCount = claude.development_areas.filter((item) => isGenericDevelopmentDescription(item.description)).length;
  if (claude.development_areas.length === 0 || genericCount === claude.development_areas.length) {
    claude.development_areas = roleSpecificDevelopmentAreas(claude.positions, observations).slice(0, 3);
  }
}

function shouldUsePurdueWomenContext(teamName: string | null): boolean {
  if (!teamName) return false;
  const normalized = teamName.toLowerCase();
  return normalized.includes("purdue") && normalized.includes("soccer") && (normalized.includes("women") || normalized.includes("womens"));
}

export async function runVideoJob(videoId: string) {
  const supabase = getSupabaseServerClient();

  const { data: video, error: fetchError } = await supabase
    .from("videos")
    .select("id, player_id, source_url")
    .eq("id", videoId)
    .single();

  if (fetchError || !video) {
    throw new Error(`Video not found: ${videoId}`);
  }

  if (!detectSourceType(video.source_url)) {
    throw new Error("Unsupported source URL");
  }

  const { data: playerMeta } = await supabase.from("players").select("name, current_team").eq("id", video.player_id).single();
  const currentTeam = playerMeta?.current_team || null;
  const isTeamAnalysis = (playerMeta?.name || "").startsWith("TEAM_ANALYSIS::");
  const explicitTargetTeam = isTeamAnalysis
    ? (playerMeta?.name || "").replace("TEAM_ANALYSIS::", "").trim() || currentTeam || null
    : null;
  const usePurdueWomenContext = shouldUsePurdueWomenContext(currentTeam);
  const teamContext = usePurdueWomenContext
    ? buildPurdueWomenSeasonModelContext(Number(process.env.PURDUE_CONTEXT_MAX_GAMES || 19))
    : "No additional team context supplied.";

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "scoutai-"));
  const strictAccuracyMode = (process.env.STRICT_ACCURACY_MODE || "true").toLowerCase() === "true";
  let stage = "init";

  try {
    stage = "set_status_downloading";
    await supabase.from("videos").update({ status: "downloading" }).eq("id", videoId);

    stage = "yt_metadata";
    const metadata = await fetchYtMetadata(video.source_url);
    const duration = metadata.duration ?? 0;
    const detectedTeams = parseTeamsFromTitle(metadata.title || "");
    const normalizedTarget = (explicitTargetTeam || "").toLowerCase();
    const inferredTargetTeam = explicitTargetTeam || (detectedTeams.length > 0 ? detectedTeams[0] : null);
    const opponentTeam = detectedTeams.find((team) => team.toLowerCase() !== normalizedTarget) || null;
    const focus: AnalysisFocus = {
      type: isTeamAnalysis ? "team" : "player",
      targetTeam: inferredTargetTeam,
      opponentTeam,
      detectedTeams,
    };

    let frameMode = false;
    let fallbackReason = "";
    let geminiOutput: GeminiPayload;
    let claudeOutput: ClaudePayload;

    try {
      stage = "download_video";
      const videoPath = await downloadVideo(video.source_url, tempDir, { fastMode: isTeamAnalysis });
      stage = "extract_frames";
      const frames = await extractFrames(videoPath, duration, tempDir);

      stage = "set_status_analyzing";
      await supabase
        .from("videos")
        .update({
          status: "analyzing",
          duration_seconds: duration,
          storage_path: videoPath,
        })
        .eq("id", videoId);

      if (frames.length >= 6) {
        frameMode = true;
        try {
          stage = "gemini_frame_observer";
          geminiOutput = await runGeminiFromFrames(metadata, video.source_url, frames, teamContext, focus);
        } catch (geminiError) {
          const geminiMessage = geminiError instanceof Error ? geminiError.message : "gemini_frame_observer_failed";
          try {
            stage = "claude_frame_observer_fallback";
            geminiOutput = await runClaudeFrameObserver(metadata, video.source_url, frames);
            geminiOutput.video_summary = {
              ...(geminiOutput.video_summary || {}),
              coverage_flags: [
                ...((geminiOutput.video_summary?.coverage_flags || []) as string[]),
                "frame_observer_source_claude",
                `gemini_fallback_reason:${geminiMessage.slice(0, 90)}`,
              ],
            };
          } catch (claudeFrameError) {
            const claudeMessage =
              claudeFrameError instanceof Error ? claudeFrameError.message : "claude_frame_observer_failed";
            throw new Error(
              `Both frame observers failed. Gemini: ${geminiMessage}. Claude Vision: ${claudeMessage}`,
            );
          }
        }
        stage = "claude_synthesis";
        const events = deriveEvents(geminiOutput.observations || []);
        claudeOutput = isTeamAnalysis
          ? await runClaudeTeam(geminiOutput, events, teamContext, focus)
          : await runClaude(geminiOutput, events, teamContext);
      } else {
        fallbackReason = `insufficient_frames_extracted:${frames.length}`;
        if (strictAccuracyMode) {
          throw new Error(
            "Strict accuracy mode blocked metadata fallback. Frame extraction returned too few frames. " +
              "Install ffmpeg and confirm the source video can be decoded.",
          );
        }
        const fallback = fallbackFromMetadata(metadata);
        geminiOutput = fallback.gemini;
        claudeOutput = fallback.claude;
      }
    } catch (error) {
      fallbackReason =
        error instanceof Error
          ? error.message
          : "frame_or_llm_stage_failed";
      if (strictAccuracyMode) {
        throw new Error(
          "Strict accuracy mode blocked metadata fallback. " +
            `Root cause: ${fallbackReason}`,
        );
      }
      const fallback = fallbackFromMetadata(metadata);
      geminiOutput = fallback.gemini;
      claudeOutput = fallback.claude;
    }

    stage = "sanitize_and_quality_gate";
    sanitizeOutput(geminiOutput, claudeOutput, duration);
    applyQualityGate(claudeOutput, geminiOutput.observations || [], duration, frameMode);
    if (isTeamAnalysis && duration >= 3600) {
      claudeOutput.evidence_flags = (claudeOutput.evidence_flags || []).filter((flag) => flag !== "short_highlight_bias");
      claudeOutput.development_areas = claudeOutput.development_areas.map((area) =>
        isGenericDevelopmentDescription(area.description)
          ? {
              ...area,
              category: "tactical",
              description:
                "Chance creation can improve by delaying the final action for one extra circulation pass when central lanes are blocked.",
            }
          : area,
      );
    }
    if (usePurdueWomenContext) {
      claudeOutput.evidence_flags = Array.from(
        new Set([...claudeOutput.evidence_flags, "team_context_purdue_women_2025_applied"]),
      );
    }
    const calibrationSummary = calibrateReportConfidence(
      claudeOutput,
      geminiOutput.observations || [],
      duration,
      frameMode,
    );
    if (!frameMode && fallbackReason) {
      claudeOutput.evidence_flags = Array.from(
        new Set([...claudeOutput.evidence_flags, `fallback_reason:${fallbackReason.slice(0, 120)}`]),
      );
    }

    const observations = geminiOutput.observations || [];
    const obsIdToDbId = new Map<string, string>();

    const evidenceRows = observations.map((obs) => ({
      id: crypto.randomUUID(),
      report_id: "",
      time_seconds: Math.max(0, Math.floor(obs.time_seconds || 0)),
      time_label: obs.time_label || "0:00",
      category: (obs.category || "tactical") as EvidenceCategory,
      description: obs.description,
      confidence: Math.max(0, Math.min(100, obs.confidence || 0)),
    }));

    stage = "insert_report";
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .insert({
        video_id: videoId,
        player_id: video.player_id,
        positions: claudeOutput.positions.map((p) => p.label),
        confidence_score: Math.max(0, Math.min(100, claudeOutput.overall_confidence || 0)),
        style_summary: claudeOutput.style_summary,
        strengths: claudeOutput.strengths,
        development_areas: claudeOutput.development_areas,
        evidence_flags: claudeOutput.evidence_flags,
        raw_gemini_output: {
          ...geminiOutput,
          analysis_type: isTeamAnalysis ? "team" : "player",
          team_focus: isTeamAnalysis ? { targetTeam: explicitTargetTeam, detectedTeams } : null,
          analysis_mode: frameMode ? "frame_level" : "metadata_fallback",
          fallback_reason: fallbackReason || null,
          strict_accuracy_mode: strictAccuracyMode,
          team_context_applied: usePurdueWomenContext,
          team_context_label: usePurdueWomenContext ? "purdue_women_2025" : "none",
          calibration: calibrationSummary,
        },
        role_view_cache: {
          ...(claudeOutput.role_views || {}),
          analysis_type: isTeamAnalysis ? "team" : "player",
          team_focus: isTeamAnalysis ? { targetTeam: explicitTargetTeam, detectedTeams } : null,
          calibration: calibrationSummary,
        },
      })
      .select("id")
      .single();

    if (reportErr || !report) {
      throw new Error(reportErr?.message || "Failed to create report");
    }

    if (evidenceRows.length > 0) {
      stage = "insert_evidence";
      for (let i = 0; i < evidenceRows.length; i++) {
        const sourceObs = observations[i];
        evidenceRows[i].report_id = report.id;
        obsIdToDbId.set(sourceObs.id, evidenceRows[i].id);
      }

      const { error: evidenceErr } = await supabase.from("evidence").insert(evidenceRows);
      if (evidenceErr) {
        throw new Error(evidenceErr.message);
      }
    }

    const rewriteEvidenceRefs = (items: Array<{ evidence_ids: string[] }>) =>
      items.map((item) => ({
        ...item,
        evidence_ids: item.evidence_ids.map((id) => obsIdToDbId.get(id) || id),
      }));

    stage = "update_report_evidence_refs";
    await supabase
      .from("reports")
      .update({
        strengths: rewriteEvidenceRefs(claudeOutput.strengths),
        development_areas: rewriteEvidenceRefs(claudeOutput.development_areas),
      })
      .eq("id", report.id);

    stage = "set_status_complete";
    await supabase.from("videos").update({ status: "complete" }).eq("id", videoId);

    return {
      videoId,
      reportId: report.id,
      duration,
      title: metadata.title,
      positions: claudeOutput.positions,
      mode: frameMode ? "frame_level" : "fallback",
      observationCount: observations.length,
      calibratedConfidence: calibrationSummary.calibrated_confidence,
      confidenceCap: calibrationSummary.cap_applied,
    };
  } catch (error) {
    const detailed = formatNetworkError(`runVideoJob failed at stage=${stage}`, error);
    throw detailed;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // noop cleanup
    }
  }
}
