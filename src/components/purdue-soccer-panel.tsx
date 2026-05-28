"use client";

import { useMemo } from "react";
import { purdueSourceLinks, womenProgramNotes, womenRoster2026Spring, womenStyleSnapshots } from "@/lib/purdue-soccer-data";
import { purdueWomenGames2025, purdueWomenSeasonSummary2025 } from "@/lib/purdue-women-2025-season";

interface PlayerReport {
  summary: string;
  strengths: string[];
  developmentAreas: string[];
  evidenceFlags: string[];
}

function countByPosition() {
  const counts = new Map<string, number>();
  for (const player of womenRoster2026Spring) {
    const key = player.position;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function normalizeRole(position: string): "gk" | "defender" | "midfielder" | "forward" {
  const p = position.toLowerCase();
  if (p.includes("goalkeeper")) return "gk";
  if (p.includes("defender")) return "defender";
  if (p.includes("forward")) return "forward";
  return "midfielder";
}

function buildPlayerReport(name: string, position: string): PlayerReport {
  const role = normalizeRole(position);

  const flags = [
    "no_player_specific_tape_loaded",
    "role_archetype_inference",
    "team_context_purdue_women_2025_applied",
  ];

  if (role === "gk") {
    return {
      summary: `${name} profiles as a goalkeeper role where reliability under shot pressure and command in the six-yard box are central evaluation points.`,
      strengths: [
        "Projected shot-stopping base with set-position discipline in first-contact saves.",
        "Likely value in organizing the back line and directing defensive restarts.",
        "Potential distribution utility when building out versus moderate press lines.",
        "Role fit for clean-sheet game states where game management matters late.",
      ],
      developmentAreas: [
        "Cross-claim consistency under traffic and second-phase set-piece chaos.",
        "Long distribution precision when pressed into emergency clearances.",
        "Sweeper timing and risk control when line height stretches in transition.",
      ],
      evidenceFlags: flags,
    };
  }

  if (role === "defender") {
    return {
      summary: `${name} projects as a defender profile focused on line integrity, duel timing, and first-pass security under Big Ten transition pace.`,
      strengths: [
        "Likely strength in compactness and spacing discipline inside back-line rotations.",
        "Projected 1v1 defensive timing and recovery-run commitment in open-field phases.",
        "Useful outlet passing profile for settling first pass after regain moments.",
        "Role fit for protecting narrow scorelines and defending box entries.",
      ],
      developmentAreas: [
        "Aerial second-ball control against elite direct-service opponents.",
        "Progressive pass selection under high press without forced central turnovers.",
        "Faster transition scanning to track third-run threats behind fullback channels.",
      ],
      evidenceFlags: flags,
    };
  }

  if (role === "forward") {
    return {
      summary: `${name} projects as a forward profile where chance quality, run-timing, and off-ball pressing value are the primary performance levers.`,
      strengths: [
        "Projected movement threat in channels and near-post attacks versus shifting lines.",
        "Potential pressing trigger value on center backs and recovery passes.",
        "Likely utility stretching back lines to create midfield receiving pockets.",
        "Role fit for transition attacks in one-goal game states.",
      ],
      developmentAreas: [
        "Final-third efficiency: converting medium-quality looks into stable output.",
        "Back-to-goal retention under contact before layoff and second action.",
        "Consistent weak-side timing for cutback windows and second-phase arrivals.",
      ],
      evidenceFlags: flags,
    };
  }

  return {
    summary: `${name} projects as a midfield profile balancing possession security, defensive transition support, and line-breaking progression decisions.`,
    strengths: [
      "Likely scanning and support-angle value for tempo control in build phases.",
      "Projected connection play in short combinations to progress through pressure.",
      "Role fit for linking defensive recoveries to attacking entries.",
      "Potential value in repeated transition recovery actions and counter-press shape.",
    ],
    developmentAreas: [
      "Duel robustness in central traffic against physically strong conference opponents.",
      "Final-third decision speed between carry, slip pass, and shot selection.",
      "Vertical risk calibration to avoid exposed rest-defense after turnovers.",
    ],
    evidenceFlags: flags,
  };
}

export default function PurdueSoccerPanel() {
  const positionCounts = useMemo(() => countByPosition(), []);
  const playerReports = useMemo(
    () => womenRoster2026Spring.map((player) => ({ player, report: buildPlayerReport(player.name, player.position) })),
    [],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h2 className="text-3xl font-semibold tracking-tight">Purdue Women&apos;s Soccer Intel</h2>
        <p className="mt-2 text-[#b9c3d6]">
          Team-context intelligence plus player-by-player provisional scouting-style reports. Purdue men&apos;s soccer has been removed from this tab.
        </p>
      </section>

      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h3 className="text-xl font-semibold">Women&apos;s Program Snapshot</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#c8d2e5]">
          {womenProgramNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h3 className="text-xl font-semibold">Women&apos;s Style Notes (Source-Informed)</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#c8d2e5]">
          {womenStyleSnapshots.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h3 className="text-xl font-semibold">2025 Season Results Context</h3>
        <p className="mt-2 text-sm text-[#c8d2e5]">
          Record {purdueWomenSeasonSummary2025.w}-{purdueWomenSeasonSummary2025.l}-{purdueWomenSeasonSummary2025.d}
          {" · "}
          Goals {purdueWomenSeasonSummary2025.gf}-{purdueWomenSeasonSummary2025.ga}
          {" · "}
          Big Ten {purdueWomenSeasonSummary2025.confW}-{purdueWomenSeasonSummary2025.confL}-{purdueWomenSeasonSummary2025.confD}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#c8d2e5] sm:grid-cols-4">
          <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">Clean sheets: {purdueWomenSeasonSummary2025.cleanSheets}</span>
          <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">Scoreless matches: {purdueWomenSeasonSummary2025.scoreless}</span>
          <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">Vs elite opponents: {purdueWomenSeasonSummary2025.vsElite}</span>
          <span className="rounded border border-[#334055] bg-[#111822] px-2 py-1">Vs strong opponents: {purdueWomenSeasonSummary2025.vsStrong}</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-[#d9e2f2]">
            <thead>
              <tr className="border-b border-[#2f3746] text-[#9fb0c9]">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Match</th>
                <th className="py-2 pr-4">Result</th>
                <th className="py-2 pr-4">Quality</th>
                <th className="py-2 pr-4">Opponent Record</th>
                <th className="py-2 pr-4">Venue</th>
              </tr>
            </thead>
            <tbody>
              {purdueWomenGames2025.map((game) => (
                <tr key={game.gameId} className="border-b border-[#222833]">
                  <td className="py-2 pr-4">{game.date}</td>
                  <td className="py-2 pr-4">
                    {game.homeAway === "home" ? "vs" : "at"} {game.opponent}
                  </td>
                  <td className="py-2 pr-4 font-semibold">
                    {game.result} {game.goalsFor}-{game.goalsAgainst}
                  </td>
                  <td className="py-2 pr-4">{game.opponentQualityTier}</td>
                  <td className="py-2 pr-4">
                    {game.opponentOverallRecord}
                    {game.opponentBigTenRank ? ` (B10 #${game.opponentBigTenRank})` : ""}
                  </td>
                  <td className="py-2 pr-4">
                    {game.venue || "-"}
                    {game.boxScoreUrl ? (
                      <>
                        {" "}
                        <a href={game.boxScoreUrl} target="_blank" rel="noreferrer" className="text-[#8fc0ff] hover:underline">
                          box
                        </a>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h3 className="text-xl font-semibold">Women&apos;s Roster (2026 Spring)</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {positionCounts.map(([position, count]) => (
            <span key={position} className="rounded-md border border-[#334055] bg-[#111822] px-2 py-1 text-[#c8d2e5]">
              {position}: {count}
            </span>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#d9e2f2]">
            <thead>
              <tr className="border-b border-[#2f3746] text-[#9fb0c9]">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Position</th>
                <th className="py-2 pr-4">Year</th>
                <th className="py-2 pr-4">Height</th>
              </tr>
            </thead>
            <tbody>
              {womenRoster2026Spring.map((player) => (
                <tr key={`${player.number}-${player.name}`} className="border-b border-[#222833]">
                  <td className="py-2 pr-4">{player.number}</td>
                  <td className="py-2 pr-4">{player.name}</td>
                  <td className="py-2 pr-4">{player.position}</td>
                  <td className="py-2 pr-4">{player.year}</td>
                  <td className="py-2 pr-4">{player.height || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h3 className="text-xl font-semibold">Player-By-Player Provisional Reports</h3>
        <p className="mt-2 text-sm text-[#b9c3d6]">
          Detailed projected strengths and weaknesses for every Purdue women&apos;s rostered player. These are role-based scouting projections until each player has individual tape in the Scout Report pipeline.
        </p>
        <div className="mt-4 space-y-4">
          {playerReports.map(({ player, report }) => (
            <article key={`${player.number}-${player.name}`} className="rounded-xl border border-[#2f3746] bg-[#10151d] p-4">
              <h4 className="text-lg font-semibold text-[#e9eef8]">
                #{player.number} {player.name}
              </h4>
              <p className="mt-1 text-sm text-[#b8c5db]">
                {player.position} · {player.year}
                {player.height ? ` · ${player.height}` : ""}
              </p>
              <p className="mt-3 text-sm text-[#d7e1f2]">{report.summary}</p>

              <div className="mt-3">
                <p className="text-sm font-semibold text-[#9cc7ff]">Projected strengths</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#d7e1f2]">
                  {report.strengths.map((item) => (
                    <li key={`${player.name}-s-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <p className="text-sm font-semibold text-[#ffcf9c]">Projected development areas</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#d7e1f2]">
                  {report.developmentAreas.map((item) => (
                    <li key={`${player.name}-d-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {report.evidenceFlags.map((flag) => (
                  <span key={`${player.name}-f-${flag}`} className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
                    {flag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#2c3139] bg-[#171d26] p-5">
        <h3 className="text-xl font-semibold">Sources</h3>
        <p className="mt-1 text-xs text-[#9eabc2]">Last curated: May 2, 2026</p>
        <ul className="mt-3 space-y-2 text-sm">
          {purdueSourceLinks.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="text-[#8fc0ff] hover:underline">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
