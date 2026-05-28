export const POSITION_TAXONOMY = [
  "GK",
  "CB",
  "FB/WB",
  "CDM",
  "CM",
  "CAM",
  "WM",
  "SS",
  "CF",
] as const;

export const OBSERVABLE_SKILLS = [
  "first_touch_under_pressure",
  "ball_striking",
  "passing_range",
  "through_ball_timing",
  "dribbling_in_isolation",
  "press_resistance",
  "off_ball_movement",
  "pressing_triggers",
  "recovery_runs",
  "defensive_positioning",
  "aerial_ability",
  "duel_success",
  "transition_decision_making",
  "scan_before_receiving",
  "switch_of_play",
  "finishing_composure",
  "crossing_quality",
  "set_piece_delivery",
  "goalkeeper_distribution",
  "goalkeeper_shot_stopping",
] as const;

export type Position = (typeof POSITION_TAXONOMY)[number];
export type ObservableSkill = (typeof OBSERVABLE_SKILLS)[number];
