export type OpponentQualityTier = "elite" | "strong" | "average" | "developing";

export interface PurdueWomenGame2025 {
  gameId: string;
  date: string;
  opponent: string;
  opponentAlias: string;
  homeAway: "home" | "away";
  result: "W" | "L" | "D";
  goalsFor: number;
  goalsAgainst: number;
  attendance: number | null;
  durationMinutes: number | null;
  venue: string | null;
  conferenceGame: boolean;
  boxScoreUrl: string | null;
  stream: string | null;
  opponentQualityTier: OpponentQualityTier;
  opponentOverallRecord: string;
  opponentWinPct: number;
  opponentBigTenRank: number | null;
  opponentBigTenPoints: number | null;
  opponentConfRecord: string | null;
}

export interface PurdueWomenSeasonSummary2025 {
  gp: number;
  w: number;
  l: number;
  d: number;
  gf: number;
  ga: number;
  cleanSheets: number;
  scoreless: number;
  oneGoalGames: number;
  vsElite: number;
  vsStrong: number;
  confGp: number;
  confW: number;
  confL: number;
  confD: number;
  avgGF: number;
  avgGA: number;
  winPct: number;
}

export const purdueWomenGames2025: PurdueWomenGame2025[] = [
  {
    "gameId": "23962",
    "date": "2025-08-14",
    "opponent": "Indiana State Sycamores",
    "opponentAlias": "INST",
    "homeAway": "home",
    "result": "W",
    "goalsFor": 4,
    "goalsAgainst": 0,
    "attendance": 312,
    "durationMinutes": 130,
    "venue": "Folk Field",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt0226af88ee72f283-INST_20vs__20PUR_208_14_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "8-6-6",
    "opponentWinPct": 0.55,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23951",
    "date": "2025-08-17",
    "opponent": "Ball State Cardinals",
    "opponentAlias": "BALL",
    "homeAway": "away",
    "result": "W",
    "goalsFor": 5,
    "goalsAgainst": 2,
    "attendance": 727,
    "durationMinutes": 124,
    "venue": "Briner Sports Complex",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt25344aa90dae7fdc-PUR_20vs__20BALL_208_17_25.pdf",
    "stream": "ESPN+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "10-7-3",
    "opponentWinPct": 0.575,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23938",
    "date": "2025-08-21",
    "opponent": "DePaul Blue Demons",
    "opponentAlias": "DEP",
    "homeAway": "home",
    "result": "L",
    "goalsFor": 0,
    "goalsAgainst": 2,
    "attendance": 3652,
    "durationMinutes": 122,
    "venue": "Folk Field",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt13cc576e88c914c9-DEP_20vs__20PUR_208_21_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "developing",
    "opponentOverallRecord": "4-12-2",
    "opponentWinPct": 0.278,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23922",
    "date": "2025-08-24",
    "opponent": "Butler Bulldogs",
    "opponentAlias": "BUT",
    "homeAway": "home",
    "result": "D",
    "goalsFor": 1,
    "goalsAgainst": 1,
    "attendance": 488,
    "durationMinutes": 140,
    "venue": "Folk Field",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt3efc96c6838c33cf-BUT_20vs__20PUR_208_24_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "average",
    "opponentOverallRecord": "5-4-8",
    "opponentWinPct": 0.529,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23910",
    "date": "2025-08-28",
    "opponent": "Evansville Purple Aces",
    "opponentAlias": "EVAN",
    "homeAway": "away",
    "result": "L",
    "goalsFor": 1,
    "goalsAgainst": 2,
    "attendance": 517,
    "durationMinutes": 130,
    "venue": "McCutchan Stadium",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt475dfb0a5357fb24-PUR_20vs__20EVAN_208_28_25.pdf",
    "stream": null,
    "opponentQualityTier": "average",
    "opponentOverallRecord": "7-7-2",
    "opponentWinPct": 0.5,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23890",
    "date": "2025-08-31",
    "opponent": "Loyola Chicago Ramblers",
    "opponentAlias": "L-IL",
    "homeAway": "away",
    "result": "L",
    "goalsFor": 0,
    "goalsAgainst": 1,
    "attendance": 601,
    "durationMinutes": 115,
    "venue": "Loyola Soccer Park",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt116050136d44e43c-PUR_20vs__20L-IL_208_31_25.pdf",
    "stream": "ESPN+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "9-4-6",
    "opponentWinPct": 0.632,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23881",
    "date": "2025-09-04",
    "opponent": "Dayton Flyers",
    "opponentAlias": "DAY",
    "homeAway": "away",
    "result": "D",
    "goalsFor": 0,
    "goalsAgainst": 0,
    "attendance": 501,
    "durationMinutes": 115,
    "venue": "Baujan Field",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blt4a66c85077cb62be-PUR_20vs__20DAY_209_4_25.pdf",
    "stream": null,
    "opponentQualityTier": "elite",
    "opponentOverallRecord": "15-4-3",
    "opponentWinPct": 0.75,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "24077",
    "date": "2025-09-07",
    "opponent": "Western Ill. Leathernecks",
    "opponentAlias": "WIU",
    "homeAway": "home",
    "result": "W",
    "goalsFor": 4,
    "goalsAgainst": 0,
    "attendance": 343,
    "durationMinutes": 144,
    "venue": "Folk Field",
    "conferenceGame": false,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/bltbf83e60a2e173bfd-WIU_20vs__20PUR_209_7_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "developing",
    "opponentOverallRecord": "1-17-1",
    "opponentWinPct": 0.079,
    "opponentBigTenRank": null,
    "opponentBigTenPoints": null,
    "opponentConfRecord": null
  },
  {
    "gameId": "23855",
    "date": "2025-09-12",
    "opponent": "Wisconsin Badgers",
    "opponentAlias": "WIS",
    "homeAway": "away",
    "result": "W",
    "goalsFor": 2,
    "goalsAgainst": 1,
    "attendance": 429,
    "durationMinutes": 119,
    "venue": "Dan McClimon Memorial Track/Soccer Complex",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/blta77bb33e188a88e9-PUR_20vs__20WIS_209_11_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "14-6-2",
    "opponentWinPct": 0.682,
    "opponentBigTenRank": 5,
    "opponentBigTenPoints": 20,
    "opponentConfRecord": "6-3-2"
  },
  {
    "gameId": "23850",
    "date": "2025-09-18",
    "opponent": "Iowa Hawkeyes",
    "opponentAlias": "IOWA",
    "homeAway": "home",
    "result": "L",
    "goalsFor": 1,
    "goalsAgainst": 2,
    "attendance": 248,
    "durationMinutes": 128,
    "venue": "Folk Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/IOWA vs. PUR 9_18_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "elite",
    "opponentOverallRecord": "12-5-4",
    "opponentWinPct": 0.667,
    "opponentBigTenRank": 3,
    "opponentBigTenPoints": 21,
    "opponentConfRecord": "6-2-3"
  },
  {
    "gameId": "23844",
    "date": "2025-09-21",
    "opponent": "Maryland Terrapins",
    "opponentAlias": "MD",
    "homeAway": "away",
    "result": "L",
    "goalsFor": 1,
    "goalsAgainst": 2,
    "attendance": 525,
    "durationMinutes": 120,
    "venue": "Ludwig Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/PUR vs. MD 9_21_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "developing",
    "opponentOverallRecord": "6-11-1",
    "opponentWinPct": 0.361,
    "opponentBigTenRank": 17,
    "opponentBigTenPoints": 7,
    "opponentConfRecord": "2-8-1"
  },
  {
    "gameId": "23834",
    "date": "2025-09-25",
    "opponent": "Oregon Ducks",
    "opponentAlias": "ORE",
    "homeAway": "home",
    "result": "W",
    "goalsFor": 3,
    "goalsAgainst": 0,
    "attendance": 350,
    "durationMinutes": 124,
    "venue": "Folk Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/ORE vs. PUR 9_25_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "developing",
    "opponentOverallRecord": "3-10-5",
    "opponentWinPct": 0.306,
    "opponentBigTenRank": 18,
    "opponentBigTenPoints": 7,
    "opponentConfRecord": "1-6-4"
  },
  {
    "gameId": "23821",
    "date": "2025-09-28",
    "opponent": "Washington Huskies",
    "opponentAlias": "WASH",
    "homeAway": "home",
    "result": "L",
    "goalsFor": 1,
    "goalsAgainst": 3,
    "attendance": 387,
    "durationMinutes": 157,
    "venue": "Folk Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/WASH vs. PUR 9_28_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "elite",
    "opponentOverallRecord": "15-3-7",
    "opponentWinPct": 0.74,
    "opponentBigTenRank": 1,
    "opponentBigTenPoints": 26,
    "opponentConfRecord": "8-1-2"
  },
  {
    "gameId": "23817",
    "date": "2025-10-03",
    "opponent": "Indiana Hoosiers",
    "opponentAlias": "IND",
    "homeAway": "home",
    "result": "D",
    "goalsFor": 0,
    "goalsAgainst": 0,
    "attendance": 730,
    "durationMinutes": 116,
    "venue": "Folk Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/IND vs. PUR 10_3_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "average",
    "opponentOverallRecord": "5-6-6",
    "opponentWinPct": 0.471,
    "opponentBigTenRank": 13,
    "opponentBigTenPoints": 11,
    "opponentConfRecord": "2-4-5"
  },
  {
    "gameId": "23802",
    "date": "2025-10-10",
    "opponent": "Nebraska Huskers",
    "opponentAlias": "NEB",
    "homeAway": "away",
    "result": "L",
    "goalsFor": 0,
    "goalsAgainst": 1,
    "attendance": 702,
    "durationMinutes": 122,
    "venue": "Barbara Hibner Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/PUR vs. NEB 10_9_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "8-5-5",
    "opponentWinPct": 0.583,
    "opponentBigTenRank": 12,
    "opponentBigTenPoints": 12,
    "opponentConfRecord": "3-5-3"
  },
  {
    "gameId": "23793",
    "date": "2025-10-12",
    "opponent": "Illinois Fighting Illini",
    "opponentAlias": "ILL",
    "homeAway": "away",
    "result": "L",
    "goalsFor": 0,
    "goalsAgainst": 1,
    "attendance": 1132,
    "durationMinutes": 117,
    "venue": "Demirjian Park",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/PUR vs. ILL 10_12_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "13-6-2",
    "opponentWinPct": 0.667,
    "opponentBigTenRank": 6,
    "opponentBigTenPoints": 17,
    "opponentConfRecord": "5-4-2"
  },
  {
    "gameId": "23787",
    "date": "2025-10-16",
    "opponent": "Penn State Nittany Lions",
    "opponentAlias": "PSU",
    "homeAway": "home",
    "result": "L",
    "goalsFor": 0,
    "goalsAgainst": 1,
    "attendance": 514,
    "durationMinutes": 110,
    "venue": "Folk Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/PSU vs. PUR 10_16_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "10-8-3",
    "opponentWinPct": 0.548,
    "opponentBigTenRank": 7,
    "opponentBigTenPoints": 17,
    "opponentConfRecord": "5-4-2"
  },
  {
    "gameId": "23774",
    "date": "2025-10-19",
    "opponent": "Northwestern Wildcats",
    "opponentAlias": "NU",
    "homeAway": "home",
    "result": "L",
    "goalsFor": 1,
    "goalsAgainst": 3,
    "attendance": 304,
    "durationMinutes": 117,
    "venue": "Folk Field",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/NU vs. PUR 10_19_25.pdf",
    "stream": null,
    "opponentQualityTier": "strong",
    "opponentOverallRecord": "9-4-8",
    "opponentWinPct": 0.619,
    "opponentBigTenRank": 8,
    "opponentBigTenPoints": 17,
    "opponentConfRecord": "4-2-5"
  },
  {
    "gameId": "23766",
    "date": "2025-10-26",
    "opponent": "Minnesota Golden Gophers",
    "opponentAlias": "MINN",
    "homeAway": "away",
    "result": "W",
    "goalsFor": 2,
    "goalsAgainst": 0,
    "attendance": 821,
    "durationMinutes": 122,
    "venue": "Elizabeth Lyle Robbie Stadium",
    "conferenceGame": true,
    "boxScoreUrl": "https://img.boostsport.ai/boost-cms/PUR vs. MINN 10_26_25.pdf",
    "stream": "B1G+",
    "opponentQualityTier": "average",
    "opponentOverallRecord": "6-8-3",
    "opponentWinPct": 0.441,
    "opponentBigTenRank": 15,
    "opponentBigTenPoints": 9,
    "opponentConfRecord": "2-6-3"
  }
];

export const purdueWomenSeasonSummary2025: PurdueWomenSeasonSummary2025 = {
  "gp": 19,
  "w": 6,
  "l": 10,
  "d": 3,
  "gf": 26,
  "ga": 22,
  "cleanSheets": 6,
  "scoreless": 7,
  "oneGoalGames": 8,
  "vsElite": 3,
  "vsStrong": 8,
  "confGp": 11,
  "confW": 3,
  "confL": 7,
  "confD": 1,
  "avgGF": 1.37,
  "avgGA": 1.16,
  "winPct": 0.395
};

function qualityLabel(tier: OpponentQualityTier): string {
  if (tier === "elite") return "elite";
  if (tier === "strong") return "strong";
  if (tier === "average") return "average";
  return "developing";
}

export function buildPurdueWomenSeasonModelContext(maxGames = 19): string {
  const games = purdueWomenGames2025.slice(0, Math.max(1, Math.min(maxGames, purdueWomenGames2025.length)));
  const summary = purdueWomenSeasonSummary2025;

  const lines = games.map((g) => {
    const loc = g.homeAway === "home" ? "vs" : "at";
    const score = `${g.goalsFor}-${g.goalsAgainst}`;
    const b10 = g.conferenceGame ? "BigTen" : "NonConf";
    const oppRank = g.opponentBigTenRank ? `B10#${g.opponentBigTenRank}` : "B10 n/a";
    return `${g.date} | ${loc} ${g.opponent} | ${g.result} ${score} | ${b10} | opp_record ${g.opponentOverallRecord} | opp_quality ${qualityLabel(g.opponentQualityTier)} | ${oppRank}`;
  });

  return [
    "Purdue Women's Soccer 2025 context (official schedule + results + opponent-quality)",
    `Overall: ${summary.w}-${summary.l}-${summary.d}, GF ${summary.gf}, GA ${summary.ga}, avgGF ${summary.avgGF}, avgGA ${summary.avgGA}, cleanSheets ${summary.cleanSheets}, scorelessMatches ${summary.scoreless}`,
    `Conference: ${summary.confW}-${summary.confL}-${summary.confD} across ${summary.confGp} matches`,
    `Opponent quality mix: elite ${summary.vsElite}, strong ${summary.vsStrong}, remaining average/developing ${Math.max(0, summary.gp - summary.vsElite - summary.vsStrong)}`,
    "Game-by-game:",
    ...lines,
    "Instruction: Use this only as team-context framing. Do not override direct frame evidence from the submitted video.",
  ].join("\n");
}
