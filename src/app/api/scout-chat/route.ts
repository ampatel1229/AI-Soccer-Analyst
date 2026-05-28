import { NextRequest, NextResponse } from "next/server";

type ChatHistoryItem = {
  role: "user" | "assistant";
  text: string;
};

type ReportTrait = {
  category: string;
  description: string;
  confidence: number;
  evidence_ids?: string[];
};

type ReportEvidence = {
  id: string;
  time_label: string;
  category: "technical" | "physical" | "tactical" | "mental";
  description: string;
  confidence: number;
};

type ChatPayload = {
  message?: string;
  history?: ChatHistoryItem[];
  context?: {
    playerName?: string;
    sourceUrl?: string;
    team?: string;
    age?: string;
    report?: {
      id: string;
      positions: string[];
      confidence_score: number;
      style_summary: string;
      strengths: ReportTrait[];
      development_areas: ReportTrait[];
      evidence_flags: string[];
    } | null;
    evidence?: ReportEvidence[];
  };
};

type LiveFactResult = {
  answer: string;
  citations: string[];
};

function jsonFromText(text: string): { answer: string; citations?: string[] } {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { answer: text.trim() };
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { answer?: string; citations?: string[] };
    return { answer: parsed.answer || text.trim(), citations: parsed.citations };
  } catch {
    return { answer: text.trim() };
  }
}

function buildContextBlock(payload: ChatPayload["context"]): string {
  if (!payload) return "No uploaded scout context provided.";

  const report = payload.report;
  const evidence = payload.evidence || [];
  const evidencePreview = evidence
    .slice(0, 10)
    .map((ev) => `- ${ev.time_label} | ${ev.category} | ${Math.round(ev.confidence)}% | ${ev.description}`)
    .join("\n");

  return [
    `player_name=${payload.playerName || "unknown"}`,
    `source_url=${payload.sourceUrl || "unknown"}`,
    `team=${payload.team || "unknown"}`,
    `age=${payload.age || "unknown"}`,
    report
      ? [
          `report_id=${report.id}`,
          `positions=${report.positions.join(", ")}`,
          `report_confidence=${Math.round(report.confidence_score)}%`,
          `style_summary=${report.style_summary}`,
          `strengths=${report.strengths.map((s) => `${s.description} (${Math.round(s.confidence)}%)`).join(" | ")}`,
          `development_areas=${report.development_areas.map((d) => `${d.description} (${Math.round(d.confidence)}%)`).join(" | ")}`,
          `evidence_flags=${report.evidence_flags.join(", ") || "none"}`,
        ].join("\n")
      : "report=not_ready",
    `evidence_count=${evidence.length}`,
    evidencePreview ? `evidence_preview:\n${evidencePreview}` : "evidence_preview:none",
  ].join("\n");
}

function buildMessages(
  message: string,
  history: ChatHistoryItem[],
  context: ChatPayload["context"],
): Array<{ role: "user"; content: string }> {
  const systemRules = `You are ScoutAI Chat, a soccer intelligence assistant.
Primary behavior:
1) If the user asks about the uploaded player/video/report, use provided context first and be specific.
2) If the user asks a general soccer question (outside uploaded context), answer normally like a broad soccer assistant.
3) Never fabricate report-specific facts not present in context.
4) If context is insufficient for a report-specific question, say exactly what is missing.
5) Keep answers concise but useful.

Return strict JSON:
{
  "answer": "string",
  "citations": ["string"]
}

Citation rules:
- For report/video-specific claims, cite from:
  - "Uploaded report context"
  - "Uploaded evidence timestamps"
- For general soccer knowledge, cite:
  - "General soccer knowledge model response"`;

  const historyText = history
    .slice(-8)
    .map((h) => `${h.role.toUpperCase()}: ${h.text}`)
    .join("\n");

  const userBlock = [
    `Context:\n${buildContextBlock(context)}`,
    historyText ? `Recent conversation:\n${historyText}` : "Recent conversation:none",
    `Current user question:\n${message}`,
  ].join("\n\n");

  return [{ role: "user", content: `${systemRules}\n\n${userBlock}` }];
}

function normalizeTeamName(team: string): string {
  return team
    .replace(/\?+$/, "")
    .replace(/\b(fc|f\.c\.|football club|soccer club|hotspurs)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanWikiValue(value: string): string {
  let v = value;
  v = v.replace(/<ref[^>]*>.*?<\/ref>/gi, "");
  v = v.replace(/<ref[^\/]*\/>/gi, "");
  v = v.replace(/\{\{.*?\}\}/g, "");
  v = v.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1");
  v = v.replace(/''+/g, "");
  return v.trim();
}

async function wikipediaSearchTitle(query: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = (await res.json()) as { query?: { search?: Array<{ title?: string }> } };
  const titles = body.query?.search?.map((item) => item.title || "").filter(Boolean) || [];
  if (titles.length === 0) return null;
  return titles[0];
}

async function wikipediaManagerFromPage(title: string): Promise<{ manager: string; sourceUrl: string } | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    query?: {
      pages?: Array<{
        missing?: boolean;
        title?: string;
        revisions?: Array<{ slots?: { main?: { content?: string } } }>;
      }>;
    };
  };
  const page = body.query?.pages?.[0];
  const content = page?.revisions?.[0]?.slots?.main?.content || "";
  if (!content) return null;

  const managerLine =
    content.match(/^\|\s*manager\s*=\s*(.+)$/im) ||
    content.match(/^\|\s*head coach\s*=\s*(.+)$/im) ||
    content.match(/^\|\s*coach\s*=\s*(.+)$/im);

  if (!managerLine || !managerLine[1]) return null;
  const manager = cleanWikiValue(managerLine[1]);
  if (!manager) return null;
  const finalTitle = page?.title || title;
  return { manager, sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(finalTitle.replace(/ /g, "_"))}` };
}

function extractTeamFromManagerQuestion(question: string): string | null {
  const q = question.trim();
  const match = q.match(/(?:manager|head coach)\s+(?:of|for)\s+(.+)$/i);
  if (match && match[1]) return normalizeTeamName(match[1]);
  const alt = q.match(/who\s+manages\s+(.+)$/i);
  if (alt && alt[1]) return normalizeTeamName(alt[1]);
  return null;
}

async function maybeResolveLiveFact(message: string): Promise<LiveFactResult | null> {
  const asksManager = /(current|now|latest|who)\s.*(manager|head coach)|who manages/i.test(message);
  if (!asksManager) return null;
  const team = extractTeamFromManagerQuestion(message);
  if (!team) return null;

  const title =
    (await wikipediaSearchTitle(`${team} football club`)) ||
    (await wikipediaSearchTitle(`${team} F.C.`)) ||
    (await wikipediaSearchTitle(team));
  if (!title) return null;
  const resolved = await wikipediaManagerFromPage(title);
  if (!resolved) return null;

  return {
    answer: `Current manager/head coach of ${team}: ${resolved.manager}.`,
    citations: [resolved.sourceUrl],
  };
}

async function callAnthropic(messages: Array<{ role: "user"; content: string }>) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("missing_anthropic_key");
  const model = process.env.ANTHROPIC_CHAT_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`anthropic_error:${response.status}:${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("anthropic_no_text");
  return text;
}

async function callGemini(messages: Array<{ role: "user"; content: string }>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing_gemini_key");
  const model = process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const merged = messages.map((m) => m.content).join("\n\n");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: merged }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`gemini_error:${response.status}:${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini_no_text");
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatPayload;
    const message = (body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    try {
      const live = await maybeResolveLiveFact(message);
      if (live) {
        return NextResponse.json(live);
      }
    } catch {
      // silently continue to model fallback if live fact lookup fails
    }

    const history = body.history || [];
    const modelMessages = buildMessages(message, history, body.context);

    let raw = "";
    try {
      raw = await callAnthropic(modelMessages);
    } catch {
      raw = await callGemini(modelMessages);
    }

    const parsed = jsonFromText(raw);
    return NextResponse.json({
      answer: parsed.answer,
      citations: parsed.citations || ["General soccer knowledge model response"],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown scout chat error";
    return NextResponse.json(
      {
        error: msg.includes("missing_")
          ? "Scout chat model keys are missing. Add ANTHROPIC_API_KEY or GEMINI_API_KEY in .env.local."
          : msg,
      },
      { status: 500 },
    );
  }
}
