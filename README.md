# AI Hacker Studio

Become an AI Hacker by 2027 — a study tracker for LLM red-teaming, built for
authorized labs only: **PortSwigger Web Security Academy** (Web LLM Attacks,
7 labs) and **Lakera Gandalf Agent Breaker** (10 apps). It also carries the
Arcanum Prompt Injection Taxonomy (v1.5+), the OWASP LLM Top 10 (2025), a
decision studio, a prompt journal, and a red-team report builder.

**Ethics rule:** everything here is for authorized, intentionally-vulnerable
labs. Never use these techniques against production systems or any system
without explicit written authorization.

## What it does

- **Overview** — current mission (derived from real progress), the six-step
  kill chain (RECON → MAP → INJECT → AMPLIFY → EXFIL/IMPACT → DEFEND), level
  path (Beginner → Master → Pro → Executive), 30-day plan tracker, OWASP LLM
  Top 10, defense checklist.
- **Prompt Playbook** — the 7 PortSwigger labs with steps, lessons and
  defenses; mark each lab not started / in progress / done and keep writeup
  notes.
- **Lakera Playbook** — the 10 Gandalf apps with score entry (0–100, 75+
  passes), plus the 5-step Phase 2 playbook.
- **Technique Library** — 24 Arcanum techniques, searchable across the four
  taxonomy axes (intent, technique, evasion, input channel).
- **Decision Studio** — 8 field situations, each with what to read, what
  moves to try, and what defense to recommend.
- **Prompt Journal** — log prompts with Arcanum classification fields.
- **Report Builder** — red-team report template (scope prefilled to
  authorized labs only), with per-report Markdown export and a whole-state
  JSON backup export.

Progress keys are validated server-side: `lab-1`–`lab-7`, `lakera-1`–`lakera-10`,
`plan-1`–`plan-7`. Lakera scores must be numbers; they are rounded and clamped
to 0–100. Deletes are two-step with a 4-second auto-disarm.

## Run it

Requires Node.js 18+ (standard library only — zero dependencies, nothing to
install).

```sh
node server.js
```

Then open http://localhost:3000. To use another port:

```sh
PORT=4000 node server.js
```

## How progress is stored

State lives in `data/data.json`, created from `data/seed.json` on first run.
`data/data.json` is gitignored — it holds your progress, journal entries and
reports. The committed `data/seed.json` is **empty**: this standalone copy
starts fresh. Nothing is copied over from any hosted version; saved notes from
the hosted Studio were not carried into this repository.

To back up, use the **Download JSON backup** button in the Report Builder tab
(or `GET /api/export`). To restore, replace `data/data.json` with the backup
and restart the server.

## API

- `GET /api/state` — progress, journal entries, reports.
- `POST /api/progress` — `{key, status, score?, notes?}`.
- `POST /api/journal` — create a journal entry.
- `POST /api/journal/delete` — `{id}`.
- `POST /api/report` — create or update a report (pass `id` to update).
- `POST /api/report/delete` — `{id}`.
- `GET /api/export` — whole-state JSON backup.
- `GET /api/report/:id/markdown` — one report as Markdown.

## License

© 2026 Paris Pehlivanovic. All rights reserved. See `LICENSE`.
