"use client";

import { FormEvent, useMemo, useState } from "react";

type ReportTrait = {
  category: string;
  description: string;
  confidence: number;
  evidence_ids?: string[];
};

type ReportShape = {
  id: string;
  positions: string[];
  confidence_score: number;
  style_summary: string;
  strengths: ReportTrait[];
  development_areas: ReportTrait[];
  evidence_flags: string[];
} | null;

type EvidenceShape = Array<{
  id: string;
  time_label: string;
  category: "technical" | "physical" | "tactical" | "mental";
  description: string;
  confidence: number;
}>;

type Props = {
  playerName?: string;
  sourceUrl?: string;
  team?: string;
  age?: string;
  report: ReportShape;
  evidence: EvidenceShape;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: string[];
};

const SUGGESTED_QUESTIONS = [
  "What kind of soccer does Pep Guardiola play?",
  "What were Messi's biggest strengths in his prime?",
  "Based on this uploaded report, what should this player improve first?",
];

export default function ScoutAnalysisChat({ playerName, sourceUrl, team, age, report, evidence }: Props) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        "Scout Chat is ready. Ask about this uploaded video/report, or ask any general soccer question. I will use uploaded context first when relevant.",
    },
  ]);

  const canSend = useMemo(() => draft.trim().length > 0 && !loading, [draft, loading]);

  async function ask(question: string) {
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/scout-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          context: {
            playerName,
            sourceUrl,
            team,
            age,
            report,
            evidence,
          },
        }),
      });

      const body = (await res.json()) as { answer?: string; citations?: string[]; error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: body.error || "Scout chat failed. Please try again.",
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: body.answer || "No answer returned.",
          citations: body.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Could not reach Scout Chat API. Please verify the server is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    setDraft("");
    await ask(q);
  }

  return (
    <section className="rounded-2xl border border-[#2b313c] bg-[#161b23] p-5">
      <h2 className="text-xl font-semibold">Scout AI Chat</h2>
      <p className="mt-2 text-sm text-[#b8c3d7]">
        Works right after a YouTube/Hudl upload. Ask about this report, or ask general soccer questions.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={loading}
            onClick={() => {
              void ask(question);
            }}
            className="rounded-full border border-[#3a4353] bg-[#111822] px-3 py-1 text-xs text-[#d6e2f8] hover:bg-[#1d2838] disabled:opacity-60"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-[#2d3644] bg-[#10151d] p-3">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user" ? "ml-8 bg-[#2c4f8e] text-white" : "mr-8 bg-[#1d2532] text-[#d7e1f5]"
            }`}
          >
            <p>{msg.text}</p>
            {msg.role === "assistant" && msg.citations && msg.citations.length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px] text-[#9fb0c9]">
                {msg.citations.map((citation) => (
                  <li key={`${idx}-${citation}`}>Source: {citation}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        {loading ? <div className="mr-8 rounded-lg bg-[#1d2532] px-3 py-2 text-sm text-[#9fb0c9]">Thinking...</div> : null}
      </div>

      <form onSubmit={submit} className="mt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything about this report or soccer..."
          className="w-full rounded-lg border border-[#3a4458] bg-[#0f141d] px-3 py-2 text-sm text-[#e7eefc]"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="mt-2 w-full rounded-lg bg-[#2f6fed] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask Scout Chat"}
        </button>
      </form>
    </section>
  );
}

