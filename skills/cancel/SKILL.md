---
name: cancel
description: Stop the current workflow or execution mode cleanly. Use when the user says "cancel", "stop", "abort", "stop autopilot", or wants to end an active process without confusion about what was completed and what remains.
---

# Cancel

Stop cleanly. Leave the state understandable.

## Core intent

Use this skill to end the current workflow in a controlled way.

A cancellation should explain what is being stopped, what has already completed, and whether anything remains resumable.

## Use this skill when

- the user says stop, cancel, or abort
- the current workflow should not continue
- autonomous or parallel execution needs to end early
- the system is looping, drifting, or no longer aligned with the request

## Do not use this skill when

- the work is already complete and only needs a normal summary
- the user is asking to pause for a small clarification while continuing the same workflow

## Operating rules

- Identify the active workflow or execution mode.
- Stop the current path first; do not keep side work running silently.
- Preserve useful context when resume is plausible.
- Report the exit state clearly.
- Do not pretend cancellation is completion.

## Workflow

1. Identify what is currently active.
2. Stop it cleanly.
3. Note what completed before cancellation.
4. Note what did not complete.
5. Say whether resume is possible and what the next re-entry point should be.

## Output shape

A cancellation report should include:

- cancelled mode or workflow
- completed portion
- incomplete portion
- preserved context, if any
- suggested next step, if useful

## Boundary

`cancel` ends the current run. It does not summarize unfinished work as if it were done.

## Quality bar

A good cancellation:

- is immediate
- is explicit
- leaves no ambiguity about status
- avoids accidental continuation

## Example triggers

- "cancel"
- "stop this"
- "abort autopilot"
- "stop the parallel run"
