---
name: autopilot
description: Orchestrate a task from request to verified result with minimal back-and-forth. Use when the user says things like "autopilot this", "handle this end to end", "build this for me", or wants hands-off execution for work that may require clarification, planning, implementation, parallel execution, and verification.
---

# Autopilot

Drive the work forward end-to-end, but stay honest about uncertainty.

## Core intent

Use this skill as an orchestrator.

`autopilot` should not behave like magic. It should choose the lightest workflow that can still produce a trustworthy result.

Typical tools under this mode are:
- direct execution for small clear tasks
- `plan` when the task needs structure
- `research` when the task needs understanding first
- `ulw` when execution benefits from parallel lanes
- verification before completion

## Use this skill when

- the user wants you to handle the work from start to finish
- the task is substantial enough to need multiple phases
- the user prefers minimal supervision
- the task may need a mix of planning, implementation, and validation

## Do not use this skill when

- the user wants brainstorming only
- the task is tiny and obvious
- the task is so ambiguous that execution would mostly be guesswork
- the user wants manual control over each step

## Operating rules

- Start by assessing clarity, scope, and risk.
- If ambiguity blocks safe execution, clarify before pushing forward.
- Use `research` when the right path depends on evidence.
- Use `plan` when the work needs structure before changes.
- Use `ulw` only when there are real independent lanes.
- Keep progress updates concise and meaningful.
- Verify before claiming completion.
- Stop and surface blockers instead of bluffing.
- Use the lightest sufficient workflow; do not turn every task into a ceremony.

## Default workflow

1. Intake
   - restate the goal
   - identify scope, constraints, and obvious risks

2. Grounding
   - inspect local context
   - use `research` first if the right path is unclear

3. Planning
   - create a short execution plan when needed
   - skip heavy planning if the task is already well-scoped

4. Execution
   - execute directly for simple linear work
   - use `ulw` when independent lanes exist

5. Verification
   - run proportionate checks
   - inspect failures and iterate if needed

6. Completion
   - summarize what changed, what was verified, and any remaining risk

## Escalation rules

Pause and ask when:

- a destructive or irreversible action is required
- a major branching product decision is unresolved
- the task remains too ambiguous after reasonable grounding
- repeated verification failures indicate a deeper issue

## Composition rules

`autopilot` may call into:
- `research` to understand
- `plan` to structure
- `ulw` to accelerate execution
- `cancel` to stop cleanly if the run must end early

## Output shape

At kickoff, provide:

- goal
- chosen approach
- immediate next steps

At completion, provide:

- result
- major changes or findings
- verification evidence
- remaining risks or follow-ups

## Quality bar

A good `autopilot` run:

- picks the right level of process
- avoids unnecessary ceremony
- uses other skills intentionally
- does not hide uncertainty
- reaches a verified end state whenever possible

## Example triggers

- "autopilot this feature"
- "handle this end to end"
- "build this for me"
- "take this to completion"
