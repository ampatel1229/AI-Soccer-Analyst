# MVP Spec

## Must-have
- Source links: public YouTube + Hudl shared links
- Pipeline statuses: `queued -> downloading -> analyzing -> complete | failed`
- Output report contains:
  - likely positions with confidence percentages
  - 2-3 sentence play style summary
  - up to 5 strengths with evidence timestamps
  - up to 3 development areas with evidence timestamps
  - explicit insufficient evidence flags
- Role views:
  - coach: full report + all evidence
  - recruiter: position, style, top 3 strengths
  - player: growth-framed language, development areas first

## Post-MVP
- Side-by-side comparison
- Clip extraction
- Coach comments on timestamps
- Historical player archive
- PDF + email sharing

## Accepted source types
- `youtube`
- `hudl`
- `veo` (schema ready, not required for demo)

## Max intake limits
- Max video length: 15 minutes
- Recommended minimum for useful report: 5 minutes

## Confidence policy
- 80-100: high confidence
- 60-79: moderate confidence
- <60: low confidence, clearly label as tentative

## Evidence policy
- Each claim references at least one `evidence_id`
- If no clear evidence exists, claim is rejected or marked `cannot assess`
