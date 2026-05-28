import { SourceType } from "../types/report";

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{6,}/i;
const HUDL_REGEX = /^(https?:\/\/)?(www\.)?hudl\.com\/.+/i;
const VEO_REGEX = /^(https?:\/\/)?(www\.)?(app\.)?veo\.co\/.+/i;

export function detectSourceType(url: string): SourceType | null {
  if (YOUTUBE_REGEX.test(url)) return "youtube";
  if (HUDL_REGEX.test(url)) return "hudl";
  if (VEO_REGEX.test(url)) return "veo";
  return null;
}

export function validateSourceUrl(url: string): { ok: boolean; sourceType: SourceType | null; reason?: string } {
  const sourceType = detectSourceType(url);
  if (!sourceType) {
    return { ok: false, sourceType: null, reason: "Unsupported source URL. Use YouTube, Hudl, or Veo link." };
  }

  return { ok: true, sourceType };
}
