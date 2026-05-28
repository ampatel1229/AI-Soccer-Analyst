# Evaluation Plan

## Pass 1: Accuracy (internal)
Run 8-10 labeled highlights.

Score each report on:
- Position prediction: correct / partially correct / wrong
- Strength precision: relevant / borderline / hallucinated
- Timestamp relevance: evidence actually supports claim

Targets:
- Position correct or adjacent >= 75%
- Hallucinated strengths < 1 per report
- Relevant timestamps >= 85%

## Pass 2: Coach usefulness
Review 2-3 reports on known players.

Questions (1-5):
- Position identification reasonable?
- Strengths align with scouting notes?
- Saves time vs manual first-pass review?

Target:
- Time-saving score >= 4.0 average

## Failure actions
- If position accuracy fails: re-tune positional cues prompt
- If hallucinations fail: tighten synthesis claim-rejection logic
- If timestamp relevance fails: drop low-clarity observations before synthesis
