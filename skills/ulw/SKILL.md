---
name: ulw
description: Run independent work lanes in parallel for maximum useful throughput. Use when the user says "ulw", "run this in parallel", or when a task can be safely decomposed into bounded subtasks that do not depend on each other.
---

# ULW

Maximum useful parallelism without pretending everything is parallel.

`ulw` is shorthand for a parallel execution mode.

## Core intent

Use this skill to speed up work by running truly independent lanes concurrently.

This skill is about fan-out and coordination of independent subtasks. It is not a persistence mode and it is not a full autonomous product workflow.

## Use this skill when

- the task can be decomposed into independent lanes
- multiple files or concerns can be worked in parallel
- parallel investigation or implementation will materially reduce completion time
- the user explicitly asks for parallel execution

## Do not use this skill when

- the task is mostly sequential
- there is only one obvious lane of work
- dependencies are unclear enough that parallel work would create churn
- the user wants full end-to-end orchestration rather than just parallel execution

## Operating rules

- Split work into bounded lanes with clear ownership.
- Run only the independent lanes in parallel.
- Keep dependent work sequential.
- Prefer a few well-formed lanes over many noisy ones.
- Do not invent parallelism where integration cost will erase the gain.
- Merge results only after lane outputs are understood.
- Finish with lightweight verification.

## Workflow

1. Decompose the task.
2. Separate independent lanes from dependent steps.
3. Launch independent lanes concurrently.
4. Monitor and collect results.
5. Resolve integration points.
6. Run lightweight verification.

## Output shape

Before execution, state:

- overall goal
- lane breakdown
- what is parallel vs sequential
- what verification will prove success

After execution, report:

- what each lane completed
- blockers or conflicts
- integration result
- verification status

## Lightweight verification

Use proportionate checks such as:

- affected tests pass
- build/typecheck passes
- expected files changed
- no obvious integration conflicts remain

## Boundaries

If the work needs persistence, retries, or long-lived orchestration, hand off to `autopilot` rather than stretching `ulw` beyond parallel execution.

## Quality bar

A good `ulw` run:

- creates real concurrency
- avoids fake parallelism on dependent work
- keeps lanes small and legible
- preserves a clean integration step

## Example triggers

- "ulw this refactor"
- "run this in parallel"
- "split this into independent lanes and execute"
