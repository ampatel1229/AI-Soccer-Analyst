"use client";

import { FormEvent, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  options?: Array<{ label: string; value: string }>;
};

type ChatContext = {
  lastGameId?: string;
  lastIntent?: string;
};

export default function PurdueChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatContext, setChatContext] = useState<ChatContext>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Purdue Women’s Soccer assistant ready. I answer from verifiable roster, schedule, and official box score sources.",
    },
  ]);

  const canSend = useMemo(() => draft.trim().length > 0 && !isLoading, [draft, isLoading]);

  async function sendMessage(text: string) {
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/purdue-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, context: chatContext }),
      });
      const data = (await res.json()) as {
        answer?: string;
        citations?: string[];
        error?: string;
        context?: ChatContext;
        needsClarification?: boolean;
        clarificationOptions?: Array<{ label: string; value: string }>;
      };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.error || "Chat request failed. Please try again.",
          },
        ]);
        return;
      }
      if (data.context) setChatContext(data.context);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No answer returned.",
          citations: data.citations || [],
          options: data.needsClarification ? data.clarificationOptions || [] : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Could not reach the chat API. Check that the app server is running and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="w-[340px] rounded-2xl border border-[#334055] bg-[#141b25] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2b3444] px-4 py-3">
            <p className="text-sm font-semibold text-[#dce8ff]">Purdue Women&apos;s AI Chat</p>
            <button
              type="button"
              className="rounded border border-[#3a4458] px-2 py-1 text-xs text-[#c8d2e5] hover:bg-[#212a38]"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="max-h-[320px] space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user" ? "ml-6 bg-[#2c4f8e] text-white" : "mr-6 bg-[#1d2532] text-[#d7e1f5]"
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
                {msg.role === "assistant" && msg.options && msg.options.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.options.map((option) => (
                      <button
                        key={`${idx}-${option.value}`}
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          void sendMessage(option.value);
                        }}
                        className="rounded border border-[#3d4a61] bg-[#1a2434] px-2 py-1 text-[11px] text-[#cfe1ff] hover:bg-[#22314a] disabled:opacity-50"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isLoading ? (
              <div className="mr-6 rounded-lg bg-[#1d2532] px-3 py-2 text-sm text-[#9fb0c9]">Checking official sources...</div>
            ) : null}
          </div>

          <form onSubmit={submit} className="border-t border-[#2b3444] p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-[#3a4458] bg-[#0f141d] px-3 py-2 text-sm text-[#e7eefc]"
              placeholder="Ask about Purdue women’s soccer..."
            />
            <button
              type="submit"
              disabled={!canSend}
              className="mt-2 w-full rounded-lg bg-[#2f6fed] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? "Checking..." : "Ask"}
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          className="rounded-full border border-[#3a4458] bg-[#1f3f7f] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#2a56ac]"
          onClick={() => setOpen(true)}
        >
          Purdue AI Chat
        </button>
      )}
    </div>
  );
}
