import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

type YtMetadata = {
  title?: string;
};

function parseTeamsFromTitle(title: string): string[] {
  const cleaned = title.replace(/\s+/g, " ").trim();
  const separators = [
    /\s+vs\.?\s+/i,
    /\s+v\s+/i,
    /\s+at\s+/i,
    /\s+@\s+/i,
    /\s*-\s*/i,
  ];

  for (const sep of separators) {
    const parts = cleaned.split(sep).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const left = parts[0].replace(/\(.*?\)/g, "").trim();
      const right = parts[1].replace(/\(.*?\)/g, "").trim();
      if (left.length >= 2 && right.length >= 2) {
        return [left, right];
      }
    }
  }

  return [];
}

async function fetchYtMetadata(url: string): Promise<YtMetadata> {
  const bin = process.env.YT_DLP_BIN || "yt-dlp";
  const { stdout } = await execFileAsync(bin, ["--dump-single-json", "--no-warnings", url], {
    maxBuffer: 12 * 1024 * 1024,
  });
  return JSON.parse(stdout) as YtMetadata;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sourceUrl?: string };
    const sourceUrl = String(body.sourceUrl || "").trim();
    if (!sourceUrl) {
      return NextResponse.json({ error: "Source URL is required" }, { status: 400 });
    }

    const metadata = await fetchYtMetadata(sourceUrl);
    const title = metadata.title || "";
    const teams = parseTeamsFromTitle(title);

    if (teams.length < 2) {
      return NextResponse.json({
        teams: [],
        title,
        warning: "Could not confidently detect both teams from title. Enter team name manually.",
      });
    }

    return NextResponse.json({ teams, title });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to detect teams from URL metadata.",
      },
      { status: 500 },
    );
  }
}

