type EvidenceCategory = "technical" | "physical" | "tactical" | "mental";

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

export interface CalibrationSummary {
  version: "v1";
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
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreObservationConfidence(observations: GeminiObservation[]): number {
  if (observations.length === 0) return 0;
  const avg = observations.reduce((acc, obs) => acc + obs.confidence, 0) / observations.length;
  return clamp(Math.round(avg), 0, 100);
}

function scoreCoverage(
  durationSeconds: number,
  observationCount: number,
  distinctCategories: number,
  repeatedPatterns: number,
  positionEvidenceCount: number,
): number {
  const durationScore = clamp((durationSeconds / 600) * 100, 0, 100);
  const observationScore = clamp((observationCount / 16) * 100, 0, 100);
  const categoryScore = clamp((distinctCategories / 4) * 100, 0, 100);
  const repeatScore = clamp((repeatedPatterns / 8) * 100, 0, 100);
  const positionSupportScore = clamp((positionEvidenceCount / 8) * 100, 0, 100);

  return Math.round(
    durationScore * 0.18 +
      observationScore * 0.28 +
      categoryScore * 0.22 +
      repeatScore * 0.22 +
      positionSupportScore * 0.10,
  );
}

function determineConfidenceCap(frameMode: boolean, metrics: CalibrationSummary["metrics"]): { cap: number; reason: string } {
  if (!frameMode) {
    return { cap: 45, reason: "metadata_only_path" };
  }

  if (metrics.observation_count >= 14 && metrics.distinct_categories >= 3 && metrics.repeated_patterns >= 6 && metrics.duration_seconds >= 480) {
    return { cap: 92, reason: "high_evidence_density" };
  }

  if (metrics.observation_count >= 10 && metrics.distinct_categories >= 3 && metrics.repeated_patterns >= 4 && metrics.duration_seconds >= 360) {
    return { cap: 84, reason: "moderate_evidence_density" };
  }

  if (metrics.observation_count >= 8 && metrics.distinct_categories >= 2 && metrics.duration_seconds >= 300) {
    return { cap: 74, reason: "limited_multiphase_coverage" };
  }

  return { cap: 65, reason: "low_evidence_density" };
}

function countPositionEvidence(observations: GeminiObservation[]): number {
  return observations.filter((obs) => (obs.supports_positions || []).length > 0).length;
}

function calibrateTraitConfidence(
  original: number,
  evidenceIds: string[],
  observationById: Map<string, GeminiObservation>,
  traitCap: number,
): number {
  if (evidenceIds.length === 0) {
    return clamp(Math.round(original * 0.65), 30, traitCap);
  }

  const linked = evidenceIds
    .map((id) => observationById.get(id))
    .filter((obs): obs is GeminiObservation => Boolean(obs));

  if (linked.length === 0) {
    return clamp(Math.round(original * 0.7), 30, traitCap);
  }

  const avgObsConfidence = linked.reduce((acc, obs) => acc + obs.confidence, 0) / linked.length;
  const repeatBonus = linked.reduce((acc, obs) => acc + Math.max(0, (obs.pattern_count || 1) - 1), 0);

  const supportScore = clamp(avgObsConfidence + repeatBonus * 3 + linked.length * 4, 0, 100);
  const blended = Math.round(original * 0.45 + supportScore * 0.55);
  return clamp(blended, 30, traitCap);
}

export function calibrateReportConfidence(
  claude: ClaudePayload,
  observations: GeminiObservation[],
  durationSeconds: number,
  frameMode: boolean,
): CalibrationSummary {
  const distinctCategories = new Set(observations.map((o) => o.category)).size;
  const repeatedPatterns = observations.filter((o) => (o.pattern_count || 1) >= 2 || o.repeat_pattern).length;
  const positionEvidenceCount = countPositionEvidence(observations);

  const metrics: CalibrationSummary["metrics"] = {
    frame_mode: frameMode,
    duration_seconds: durationSeconds,
    observation_count: observations.length,
    distinct_categories: distinctCategories,
    repeated_patterns: repeatedPatterns,
    position_evidence_count: positionEvidenceCount,
  };

  const evidenceScore = Math.round(
    scoreCoverage(durationSeconds, observations.length, distinctCategories, repeatedPatterns, positionEvidenceCount) * 0.7 +
      scoreObservationConfidence(observations) * 0.3,
  );

  const cap = determineConfidenceCap(frameMode, metrics);
  const baseConfidence = clamp(Math.round(claude.overall_confidence || 0), 0, 100);
  const blended = Math.round(baseConfidence * 0.5 + evidenceScore * 0.5);
  const calibratedConfidence = clamp(blended, 30, cap.cap);

  const observationById = new Map(observations.map((obs) => [obs.id, obs]));
  const traitCap = Math.max(35, cap.cap - 4);

  claude.overall_confidence = calibratedConfidence;
  claude.positions = claude.positions.map((position) => ({
    ...position,
    confidence: clamp(Math.round(position.confidence * 0.6 + evidenceScore * 0.4), 30, cap.cap),
  }));

  claude.strengths = claude.strengths.map((strength) => ({
    ...strength,
    confidence: calibrateTraitConfidence(strength.confidence, strength.evidence_ids || [], observationById, traitCap),
  }));

  claude.development_areas = claude.development_areas.map((area) => ({
    ...area,
    confidence: calibrateTraitConfidence(area.confidence, area.evidence_ids || [], observationById, traitCap),
  }));

  const nextFlags = new Set(claude.evidence_flags || []);
  nextFlags.add("confidence_calibrated_v1");
  if (cap.cap < 90) {
    nextFlags.add(`confidence_capped:${cap.reason}`);
  }
  claude.evidence_flags = Array.from(nextFlags);

  return {
    version: "v1",
    base_confidence: baseConfidence,
    calibrated_confidence: calibratedConfidence,
    cap_applied: cap.cap,
    cap_reason: cap.reason,
    evidence_score: evidenceScore,
    metrics,
  };
}
