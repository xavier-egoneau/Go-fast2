# AGENTS.md

This project contains local workflow skills under `skills/`.

## Local skills

Before acting on a task:

1. Check whether exactly one local skill clearly applies.
2. If so, read that skill's `SKILL.md` and follow it.
3. If multiple skills could apply, choose the most specific one.
4. Do not load unrelated skills.
5. Treat local skills as project-specific operating guidance.

## Skill locations

Local skills live here:

- `skills/plan/SKILL.md`
- `skills/research/SKILL.md`
- `skills/ulw/SKILL.md`
- `skills/autopilot/SKILL.md`
- `skills/cancel/SKILL.md`
- `skills/security-review/SKILL.md`

## Intent of each skill

- `plan` — clarify scope, tradeoffs, acceptance criteria, and execution steps before implementation
- `research` — investigate deeply and return structured findings before deciding or changing code
- `ulw` — run bounded independent lanes in parallel when parallelism is genuinely useful
- `autopilot` — orchestrate a task end to end using the lightest workflow that can still produce a verified result
- `cancel` — stop the current workflow cleanly and report what remains
- `security-review` — review code or architecture for realistic security risk and return a severity-ranked report

## Operating rules

- Prefer the lightest skill that matches the task.
- Do not use `autopilot` when a simpler skill is enough.
- Do not use `ulw` unless the work has real independent lanes.
- Do not let `plan`, `research`, or `security-review` silently drift into implementation unless the user explicitly changes mode.
- When a skill completes, hand off clearly to the next step instead of blurring boundaries.

## Goal

Use these skills to improve task selection, consistency, and workflow clarity without adding unnecessary process.
