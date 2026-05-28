import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { womenRoster2026Spring } from "@/lib/purdue-soccer-data";
import { purdueWomenGames2025, purdueWomenSeasonSummary2025, type PurdueWomenGame2025 } from "@/lib/purdue-women-2025-season";

type ChatIntent =
  | "game_lineup"
  | "game_scorers"
  | "game_result"
  | "game_stats"
  | "game_venue"
  | "game_quality"
  | "season_record"
  | "schedule"
  | "roster_size"
  | "roster_role"
  | "player_lookup"
  | "unknown";

type ChatContext = {
  lastGameId?: string;
  lastIntent?: ChatIntent;
};

type ClarificationOption = {
  label: string;
  value: string;
};

type ChatResponse = {
  answer: string;
  citations: string[];
  context: ChatContext;
  needsClarification?: boolean;
  clarificationPrompt?: string;
  clarificationOptions?: ClarificationOption[];
};

const boxScoreCache = new Map<string, string>();

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function includesAny(question: string, terms: string[]): boolean {
  return terms.some((term) => question.includes(term));
}

function detectIntent(question: string): ChatIntent {
  const q = normalize(question);
  if (includesAny(q, ["starting lineup", "starting line up", "starting xi", "starters", "starting 11"])) return "game_lineup";
  if (includesAny(q, ["who scored", "scorer", "goalscorer", "goal scorer"])) return "game_scorers";
  if (includesAny(q, ["shots", "possession", "corner", "yellow", "red", "saves", "fouls", "xg"])) return "game_stats";
  if (includesAny(q, ["result", "score", "final score", "who won"])) return "game_result";
  if (includesAny(q, ["venue", "attendance", "home", "away", "where was"])) return "game_venue";
  if (includesAny(q, ["opponent quality", "strength of opponent", "quality tier"])) return "game_quality";
  if (includesAny(q, ["schedule", "all games", "list games", "fixtures"])) return "schedule";
  if (includesAny(q, ["record", "overall", "2025 season", "season summary", "big ten record"])) return "season_record";
  if (includesAny(q, ["roster size", "how many players", "squad size"])) return "roster_size";
  if (includesAny(q, ["goalkeeper", "goalkeepers", "gk", "defender", "defenders", "midfielder", "midfielders", "forward", "forwards"])) {
    return "roster_role";
  }
  if (findPlayer(question)) return "player_lookup";
  return "unknown";
}

function requiresGame(intent: ChatIntent): boolean {
  return intent.startsWith("game_");
}

function gameById(gameId: string | undefined): PurdueWomenGame2025 | null {
  if (!gameId) return null;
  return purdueWomenGames2025.find((game) => game.gameId === gameId) || null;
}

function gameNameTokens(game: PurdueWomenGame2025): string[] {
  const stop = new Set(["womens", "women", "soccer", "the", "and", "of", "at", "vs", "university"]);
  const tokens = normalize(game.opponent)
    .split(" ")
    .filter((token) => token.length >= 3 && !stop.has(token));
  if (game.opponentAlias) tokens.push(normalize(game.opponentAlias));
  const nickname = normalize(game.opponent).split(" ").at(-1);
  if (nickname && nickname.length >= 3) tokens.push(nickname);
  return Array.from(new Set(tokens));
}

function gameMatchScore(question: string, game: PurdueWomenGame2025): number {
  const q = normalize(question);
  let score = 0;
  if (q.includes(game.date)) score += 12;
  if (q.includes(normalize(game.opponent))) score += 10;
  if (game.opponentAlias && q.includes(normalize(game.opponentAlias))) score += 7;
  for (const token of gameNameTokens(game)) {
    if (q.includes(token)) score += 2;
  }
  return score;
}

function findGameCandidates(question: string): Array<{ game: PurdueWomenGame2025; score: number }> {
  return purdueWomenGames2025
    .map((game) => ({ game, score: gameMatchScore(question, game) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function clarificationForGames(intent: ChatIntent, candidates: Array<{ game: PurdueWomenGame2025; score: number }>): Omit<ChatResponse, "context"> {
  const top = candidates.slice(0, 3).map((entry) => entry.game);
  const intentLabel =
    intent === "game_lineup"
      ? "starting lineup"
      : intent === "game_scorers"
        ? "scoring"
        : intent === "game_stats"
          ? "match stats"
          : intent === "game_result"
            ? "result"
            : intent === "game_venue"
              ? "venue/attendance"
              : "match context";

  return {
    answer: `I need the exact match before I answer ${intentLabel}.`,
    citations: ["Purdue women’s 2025 match dataset (in-app)"],
    needsClarification: true,
    clarificationPrompt: "Which match do you mean?",
    clarificationOptions: top.map((g) => ({
      label: `${g.date} ${g.homeAway === "home" ? "vs" : "at"} ${g.opponent}`,
      value: `${g.date} ${g.homeAway === "home" ? "vs" : "at"} ${g.opponent}`,
    })),
  };
}

function findPlayer(question: string) {
  const q = normalize(question);
  let best: { idx: number; score: number } = { idx: -1, score: 0 };

  womenRoster2026Spring.forEach((player, idx) => {
    const name = normalize(player.name);
    if (q.includes(name)) {
      best = { idx, score: 999 };
      return;
    }
    const parts = name.split(" ").filter((p) => p.length >= 3);
    let score = 0;
    for (const part of parts) {
      if (q.includes(part)) score += 1;
    }
    if (score > best.score) best = { idx, score };
  });

  if (best.score >= 2 || best.score === 999) return womenRoster2026Spring[best.idx];
  return null;
}

function rosterAnswer(intent: ChatIntent, question: string): ChatResponse | null {
  const q = normalize(question);

  if (intent === "player_lookup") {
    const player = findPlayer(question);
    if (!player) return null;
    return {
      answer: `${player.name} is listed as ${player.position} (${player.year}${player.height ? `, ${player.height}` : ""}) on the loaded Purdue women’s roster.`,
      citations: ["Loaded Purdue women’s roster dataset (in-app)"],
      context: { lastIntent: intent },
    };
  }

  if (intent === "season_record") {
    const s = purdueWomenSeasonSummary2025;
    return {
      answer: `Purdue women’s 2025 record is ${s.w}-${s.l}-${s.d} overall, with a Big Ten record of ${s.confW}-${s.confL}-${s.confD}. They scored ${s.gf} and conceded ${s.ga}.`,
      citations: ["Purdue women’s 2025 season dataset (in-app)"],
      context: { lastIntent: intent },
    };
  }

  if (intent === "schedule") {
    const compact = purdueWomenGames2025
      .slice(0, 10)
      .map((g) => `${g.date} ${g.homeAway === "home" ? "vs" : "at"} ${g.opponent} (${g.result} ${g.goalsFor}-${g.goalsAgainst})`)
      .join(" | ");
    return {
      answer: `Purdue 2025 match list sample: ${compact}. Ask for a specific opponent/date for exact sourced details.`,
      citations: ["Purdue women’s 2025 match dataset (in-app)"],
      context: { lastIntent: intent },
    };
  }

  if (intent === "roster_size") {
    return {
      answer: `Loaded Purdue women’s roster size: ${womenRoster2026Spring.length} players.`,
      citations: ["Loaded Purdue women’s roster dataset (in-app)"],
      context: { lastIntent: intent },
    };
  }

  if (intent === "roster_role") {
    const byRole = (role: "goalkeeper" | "defender" | "midfielder" | "forward") =>
      womenRoster2026Spring
        .filter((p) => p.position.toLowerCase().includes(role))
        .map((p) => p.name);

    if (includesAny(q, ["goalkeeper", "goalkeepers", " gk "])) {
      const names = byRole("goalkeeper");
      return {
        answer: names.length ? `Purdue goalkeepers: ${names.join(", ")}.` : "No goalkeepers found in the loaded roster.",
        citations: ["Loaded Purdue women’s roster dataset (in-app)"],
        context: { lastIntent: intent },
      };
    }
    if (includesAny(q, ["defender", "defenders", "center back", "fullback", "right back", "left back"])) {
      const names = byRole("defender");
      return {
        answer: names.length ? `Purdue defenders: ${names.join(", ")}.` : "No defenders found in the loaded roster.",
        citations: ["Loaded Purdue women’s roster dataset (in-app)"],
        context: { lastIntent: intent },
      };
    }
    if (includesAny(q, ["midfielder", "midfielders", "cdm", "cm", "cam"])) {
      const names = byRole("midfielder");
      return {
        answer: names.length ? `Purdue midfielders: ${names.join(", ")}.` : "No midfielders found in the loaded roster.",
        citations: ["Loaded Purdue women’s roster dataset (in-app)"],
        context: { lastIntent: intent },
      };
    }
    if (includesAny(q, ["forward", "forwards", "striker", "winger", "lw", "rw", "st"])) {
      const names = byRole("forward");
      return {
        answer: names.length ? `Purdue forwards: ${names.join(", ")}.` : "No forwards found in the loaded roster.",
        citations: ["Loaded Purdue women’s roster dataset (in-app)"],
        context: { lastIntent: intent },
      };
    }
  }

  return null;
}

async function getBoxScoreText(url: string): Promise<string> {
  if (boxScoreCache.has(url)) return boxScoreCache.get(url) as string;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch box score: ${res.status}`);
  const buffer = new Uint8Array(await res.arrayBuffer());
  const parsed = await pdfParse(buffer as Buffer);
  const text = parsed.text || "";
  boxScoreCache.set(url, text);
  return text;
}

function extractPurdueStarters(text: string): string[] {
  const cleaned = text.replace(/\r/g, "");
  const rows: Array<{ pos: string; number: string; name: string }> = [];
  const seen = new Set<string>();

  const addRow = (posRaw: string | undefined, numberRaw: string | undefined, nameRaw: string | undefined) => {
    const pos = (posRaw || "").toUpperCase();
    const number = (numberRaw || "").trim();
    let name = (nameRaw || "").replace(/\s+/g, " ").trim();
    name = name.replace(/[|]/g, " ").replace(/\s+/g, " ").trim();
    name = name.replace(/\s+\d.*$/, "").trim();
    // Convert "Last, First" into "First Last" for cleaner output.
    if (name.includes(",")) {
      const parts = name.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length === 2) {
        name = `${parts[1]} ${parts[0]}`.trim();
      }
    }
    if (!/^(GK|DEF|MID|FWD)$/.test(pos)) return;
    if (!number || !name) return;
    const key = `${number}-${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ pos, number, name });
  };

  const parseFromBlock = (block: string) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const oneLine = line.match(/^(GK|DEF|MID|FWD)\s+([0-9]{1,2})\s+(.+?)$/i);
      if (oneLine) {
        addRow(oneLine[1], oneLine[2], oneLine[3]);
        continue;
      }
      // Handle compact PDF extraction lines like "GK26Edwards, Emily".
      const compact = line.match(/^(GK|DEF|MID|FWD)\s*([0-9]{1,2})\s*(.+?)$/i);
      if (compact) {
        addRow(compact[1], compact[2], compact[3]);
        continue;
      }
      const splitLine = line.match(/^(GK|DEF|MID|FWD)\s+([0-9]{1,2})$/i);
      if (splitLine && i + 1 < lines.length) addRow(splitLine[1], splitLine[2], lines[i + 1]);
    }
  };

  const blockMatch = cleaned.match(
    /Purdue Starters:\s*([\s\S]*?)(?:\n[A-Za-z .'-]+ Starters:|\n(?:--\s*)?Substitutes|\nTotals|\nGoalkeeping|\nPurdue - Goalie Statistics)/i,
  );
  if (blockMatch && blockMatch[1]) parseFromBlock(blockMatch[1]);

  const rowRegex =
    /\b(GK|DEF|MID|FWD)\b\s*([0-9]{1,2})\s*(?:\||\s)*(?:\2\s+)?([A-Za-z][A-Za-z .,'-]{2,}?)(?=(?:\s+\||\s{2,}|\s+\d+\b|\n|$))/gi;
  let m = rowRegex.exec(cleaned);
  while (m) {
    addRow(m[1], m[2], m[3]);
    m = rowRegex.exec(cleaned);
  }

  if (rows.length < 11) {
    const lines = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const start = lines.findIndex((line) => /Purdue Starters:/i.test(line));
    const end = lines.findIndex((line, idx) => idx > start && /Substitutes|Totals|Goalkeeping|Purdue - Goalie Statistics/i.test(line));
    const scoped = start >= 0 ? lines.slice(start + 1, end > start ? end : Math.min(start + 120, lines.length)) : lines;

    for (let i = 0; i < scoped.length; i += 1) {
      const line = scoped[i];
      const a = line.match(/^(GK|DEF|MID|FWD)\s+([0-9]{1,2})$/i);
      if (a && i + 1 < scoped.length) {
        addRow(a[1], a[2], scoped[i + 1]);
        continue;
      }
      const b = line.match(/^(GK|DEF|MID|FWD)\s+([0-9]{1,2})\s+(.+?)$/i);
      if (b) addRow(b[1], b[2], b[3]);
    }
  }

  return rows.slice(0, 11).map((s) => `${s.pos} #${s.number} ${s.name}`);
}

function formatLineupByLines(starters: string[]): string {
  const groups: Record<"GK" | "DEF" | "MID" | "ATT", string[]> = {
    GK: [],
    DEF: [],
    MID: [],
    ATT: [],
  };

  for (const starter of starters) {
    const match = starter.match(/^(GK|DEF|MID|FWD)\s+(.+)$/i);
    if (!match) continue;
    const pos = (match[1] || "").toUpperCase();
    const player = (match[2] || "").trim();
    if (pos === "GK") groups.GK.push(player);
    if (pos === "DEF") groups.DEF.push(player);
    if (pos === "MID") groups.MID.push(player);
    if (pos === "FWD") groups.ATT.push(player);
  }

  return [
    `GK: ${groups.GK.join(", ") || "N/A"}`,
    `DEF: ${groups.DEF.join(", ") || "N/A"}`,
    `MID: ${groups.MID.join(", ") || "N/A"}`,
    `ATT: ${groups.ATT.join(", ") || "N/A"}`,
  ].join("\n");
}

function extractScorers(text: string): string[] {
  const match = text.match(/Scoring summary:\s*([\s\S]*?)\nCautions and ejections:/i);
  if (!match) return [];
  const lines = match[1].split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => /PUR|Purdue/i.test(l));
}

function extractTeamStat(text: string, key: string): { purdue: string; opponent: string } | null {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => new RegExp(`\\b${key}\\b`, "i").test(l));
  if (!line) return null;
  const nums = line.match(/(\d+%?)/g);
  if (!nums || nums.length < 2) return null;
  return { purdue: nums[0], opponent: nums[1] };
}

async function gameIntentAnswer(intent: ChatIntent, game: PurdueWomenGame2025, context: ChatContext): Promise<ChatResponse> {
  const citations = game.boxScoreUrl
    ? [`Official match box score PDF: ${game.boxScoreUrl}`, "Purdue women’s 2025 match dataset (in-app)"]
    : ["Purdue women’s 2025 match dataset (in-app)"];

  if (intent === "game_result") {
    return {
      answer: `${game.date}: Purdue ${game.result} ${game.goalsFor}-${game.goalsAgainst} ${game.homeAway === "home" ? "vs" : "at"} ${game.opponent}.`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  if (intent === "game_venue") {
    return {
      answer: `${game.date} vs ${game.opponent}: ${game.homeAway === "home" ? "home match" : "away match"} at ${game.venue || "unknown venue"} with reported attendance ${game.attendance ?? "unknown"}.`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  if (intent === "game_quality") {
    return {
      answer: `${game.opponent} opponent-quality tier is ${game.opponentQualityTier}. Recorded opponent season record: ${game.opponentOverallRecord}.`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  if (!game.boxScoreUrl) {
    return {
      answer: `I found the match (${game.date} vs ${game.opponent}) but no official box score link is available in the current dataset for this question type.`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  const text = await getBoxScoreText(game.boxScoreUrl);

  if (intent === "game_lineup") {
    const starters = extractPurdueStarters(text);
    if (starters.length < 11) {
      return {
        answer: `I could not confidently extract the full Purdue starting 11 from the official box score text for ${game.date} vs ${game.opponent}. I extracted ${starters.length} starters, so I’m withholding a partial lineup.`,
        citations,
        context: { ...context, lastGameId: game.gameId, lastIntent: intent },
      };
    }
    const lineupByLines = formatLineupByLines(starters);
    return {
      answer: `Purdue starting lineup vs ${game.opponent} (${game.date}):\n${lineupByLines}`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  if (intent === "game_scorers") {
    const scorers = extractScorers(text);
    if (scorers.length === 0) {
      return {
        answer: `I could not extract confirmed Purdue scoring lines from the official box score for ${game.date} vs ${game.opponent}.`,
        citations,
        context: { ...context, lastGameId: game.gameId, lastIntent: intent },
      };
    }
    return {
      answer: `Purdue scoring lines vs ${game.opponent} (${game.date}): ${scorers.join(" | ")}.`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  const shots = extractTeamStat(text, "TOTAL SHOTS");
  const possession = extractTeamStat(text, "POSSESSION TOTAL");
  const corners = extractTeamStat(text, "CORNERS");
  const yellows = extractTeamStat(text, "YELLOW CARDS");
  const reds = extractTeamStat(text, "RED CARDS");
  const saves = extractTeamStat(text, "SAVES");

  const bits: string[] = [];
  if (shots) bits.push(`shots ${shots.purdue}-${shots.opponent}`);
  if (possession) bits.push(`possession ${possession.purdue}-${possession.opponent}`);
  if (corners) bits.push(`corners ${corners.purdue}-${corners.opponent}`);
  if (saves) bits.push(`saves ${saves.purdue}-${saves.opponent}`);
  if (yellows) bits.push(`yellow cards ${yellows.purdue}-${yellows.opponent}`);
  if (reds) bits.push(`red cards ${reds.purdue}-${reds.opponent}`);

  if (bits.length === 0) {
    return {
      answer: `I found the game but could not extract a reliable stat line for that metric from the official box score text.`,
      citations,
      context: { ...context, lastGameId: game.gameId, lastIntent: intent },
    };
  }

  return {
    answer: `Purdue vs ${game.opponent} (${game.date}) stats: ${bits.join("; ")}.`,
    citations,
    context: { ...context, lastGameId: game.gameId, lastIntent: intent },
  };
}

async function answerQuestion(message: string, context: ChatContext): Promise<ChatResponse> {
  const intent = detectIntent(message);
  const roster = rosterAnswer(intent, message);
  if (roster) return roster;

  if (!requiresGame(intent)) {
    return {
      answer:
        "I can answer accurately for Purdue women’s roster, season record, schedule, and game-specific questions (lineup/scorers/stats/result/venue). Ask one of those directly.",
      citations: ["Purdue women’s roster + 2025 match dataset (in-app)"],
      context: { ...context, lastIntent: intent },
    };
  }

  const candidates = findGameCandidates(message);
  const top = candidates[0];
  const second = candidates[1];

  if (!top) {
    const contextualGame = gameById(context.lastGameId);
    if (contextualGame) {
      return gameIntentAnswer(intent, contextualGame, context);
    }
    return {
      answer: "I need a specific match to answer that accurately.",
      citations: ["Purdue women’s 2025 match dataset (in-app)"],
      context: { ...context, lastIntent: intent },
      needsClarification: true,
      clarificationPrompt: "Tell me the opponent or date (example: `vs Ball State on 2025-08-17`).",
      clarificationOptions: purdueWomenGames2025.slice(0, 3).map((g) => ({
        label: `${g.date} ${g.homeAway === "home" ? "vs" : "at"} ${g.opponent}`,
        value: `${g.date} ${g.homeAway === "home" ? "vs" : "at"} ${g.opponent}`,
      })),
    };
  }

  if (second && top.score - second.score < 3) {
    return {
      ...clarificationForGames(intent, candidates),
      context: { ...context, lastIntent: intent },
    };
  }

  return gameIntentAnswer(intent, top.game, context);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { message?: string; context?: ChatContext };
    const message = (body.message || "").trim();
    const context: ChatContext = body.context || {};
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
    const reply = await answerQuestion(message, context);
    return NextResponse.json(reply);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown chat error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
