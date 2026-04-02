---
name: plan
description: Create a practical implementation plan before execution. Use when the user says things like "plan this", "scope this", "before coding", or wants tradeoffs, acceptance criteria, sequencing, or a safer implementation path before changes are made.
---

# Plan

Turn a request into a clear, testable work plan.

## Core intent

Reduce ambiguity before implementation.

The output should help execution happen with less guesswork, less rework, and clearer verification.

## Use this skill when

- the user wants to plan before coding
- the request is broad, vague, or underspecified
- there are meaningful tradeoffs to evaluate
- the work touches multiple files or subsystems
- the user wants acceptance criteria before execution

## Do not use this skill when

- the user asks a simple factual question
- the task is a tiny obvious fix with clear scope
- the user explicitly wants direct execution now and the task is already well-scoped

## Operating rules

- Inspect local evidence before asking the user for facts you can discover yourself.
- Ask at most one focused clarification question at a time when clarification is needed.
- Prefer concrete constraints over abstract preferences.
- Produce a plan sized to the task; do not force a fixed number of steps.
- Make acceptance criteria testable.
- Include verification, not just implementation.
- Do not start implementing while in planning mode.

## Workflow

1. Judge whether the request is already specific enough.
2. If not, inspect the codebase or context first for discoverable facts.
3. Ask one focused question only if a real decision or missing constraint remains.
4. Identify the main risks, tradeoffs, and likely touchpoints.
5. Produce a plan that an executor could follow.

## Output shape

Every plan should include:

- Goal
- Scope
- Assumptions or open questions
- Acceptance criteria
- Implementation steps
- Risks / tradeoffs
- Verification steps

When useful, format the implementation plan as a markdown checklist.

## Handoff

When the plan is complete, stop at the planning boundary.

Do not silently switch into implementation. Hand off explicitly to normal execution or to `autopilot`.

## Quality bar

A good plan is:

- concrete
- proportionate to the task
- grounded in local evidence
- easy to execute
- easy to verify

## Example triggers

- "plan this auth refactor"
- "before coding, give me a plan"
- "scope this feature"
- "what's the safest implementation path?"
