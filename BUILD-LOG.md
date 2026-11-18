# AI Hacker Studio — Build Log (standalone v1.0.0)

Built 2026-11-18 from the hosted fullstack artifact `ai-hacker-studio`
(probed via its published actions only — source not read, no export used).

## What was built

Node.js, standard library only, zero dependencies. `server.js` serves
`public/` plus a JSON API; state persists to `data/data.json`, seeded empty
from `data/seed.json` (the hosted Studio's saved Lab 1 notes were NOT copied
— they failed a safety check; this copy starts fresh, as noted in README.md).

- 7 tabs: Overview (mission derived from progress, kill chain, 30-day plan
  tracker, OWASP LLM Top 10, defense checklist), Prompt Playbook (7 labs),
  Lakera Playbook (10 apps, score 0–100, 75+ passes, 5-step playbook),
  Technique Library (24 techniques, searchable across 4 Arcanum axes),
  Decision Studio (8 situations with read/moves/defense), Prompt Journal,
  Report Builder (JSON backup + per-report Markdown export).
- Hardening reproduced: server-side progress-key validation
  (lab-1..7, lakera-1..10, plan-1..7), Lakera scores rounded + clamped
  0–100, two-step delete confirms with 4s auto-disarm, tablist/tab
  semantics with arrow-key navigation.

## Smoke test (2026-11-18 ~16:23 EST, port 3210)

- `node --check` passed for server.js and public/app.js.
- `GET /` 200, title "AI Hacker Studio"; `GET /app.js` 200; `GET /styles.css` 200.
- `GET /api/state` on a fresh start returned empty progress/journal/reports.
- Invalid progress key `app-1` → 400; invalid status `finished` → 400.
- `POST /api/progress` lab-1 in_progress saved; lakera-1 score 142 clamped
  to 100 and saved; journal entry created (id 1); report created (id 1);
  `GET /api/report/1/markdown` and `GET /api/export` both returned content.
- Server restarted: `GET /api/state` returned all four writes intact.
  Smoke-test `data/data.json` was then deleted so the next start re-seeds
  empty (it is gitignored and not part of the push).

## Notes / deliberate differences vs the hosted artifact

- Progress keys use the `lakera-` prefix, matching the hosted artifact's
  live action schema (`^(lab|lakera|plan)-([1-9]|10)$`), not the `app-`
  prefix in the build brief.
- Report `tests` are stored as a JSON array (the hosted action schema takes
  a JSON string); the API accepts either form.
- The hosted app's Decision Studio content was rebuilt as 8 written
  situations; the original single-file Studio's 4 quick-pick buttons are
  kept as a "Quick fix picks" row.
- No exploit payload strings anywhere; techniques and lessons are described
  in general terms only.

## Self-score

1) Goal hit? Yes — standalone codebase built, smoke-tested end to end
   (including persistence across restart), pushed to pehlivanovicparis-cloud/ai-hacker-studio.
2) Tools right? Yes — artifact action probe gave the exact data model,
   snapshot-push guide followed, validation + persistence verified live.
3) Waste — what I'd skip next time? Reading the full report file for
   content I mostly already had in studio.html; next time skim the report
   for deltas only.
