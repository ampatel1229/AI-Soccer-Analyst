# Build Checklist

## Week 1
- [ ] Bootstrap Next.js app
- [ ] Connect Supabase
- [ ] Build URL submit form
- [ ] Validate source via `src/lib/source-validator.ts`
- [ ] Persist player + video rows

## Week 2
- [ ] Build worker queue
- [ ] Download with yt-dlp
- [ ] Upload to Supabase Storage
- [ ] Update status lifecycle
- [ ] Add processing status UI

## Week 3
- [ ] Call Gemini with `prompts/gemini-video-observation.md`
- [ ] Persist raw observation JSON
- [ ] Add guardrails for insufficient evidence

## Week 4
- [ ] Call Claude with `prompts/claude-report-synthesis.md`
- [ ] Enforce evidence-id linking on all claims
- [ ] Persist report + evidence records

## Week 5
- [ ] Build coach/recruiter/player views
- [ ] Build shareable report URL
- [ ] Add confidence bars + evidence chips

## Week 6
- [ ] Run evaluation checklist
- [ ] Fix prompt failures
- [ ] Demo with 2-3 known players
