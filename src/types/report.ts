export type SourceType = "youtube" | "hudl" | "veo";
export type VideoStatus = "queued" | "downloading" | "analyzing" | "complete" | "failed";
export type EvidenceCategory = "technical" | "physical" | "tactical" | "mental";

export interface EvidenceItem {
  id: string;
  timeSeconds: number;
  timeLabel: string;
  category: EvidenceCategory;
  description: string;
  confidence: number;
}

export interface ReportTrait {
  category: string;
  description: string;
  confidence: number;
  evidenceIds: string[];
}

export interface PlayerReport {
  reportId: string;
  playerId: string;
  videoId: string;
  positions: Array<{ label: string; confidence: number }>;
  overallConfidence: number;
  styleSummary: string;
  strengths: ReportTrait[];
  developmentAreas: ReportTrait[];
  evidenceFlags: string[];
  evidence: EvidenceItem[];
}

export type RoleView = "coach" | "recruiter" | "player";
