---
name: research
description: Investigate a codebase, feature, bug, pattern, or technical question and return a structured synthesis. Use when the user says things like "research", "investigate", "why does", "how does this work", or wants evidence-backed findings before deciding or changing code.
---

# Research

Investigate deeply, then synthesize clearly.

## Core intent

Use this skill when the job is to understand, not immediately implement.

This skill combines two behaviors:
- deep search through relevant code or context
- structured analysis of findings, hypotheses, and evidence

## Use this skill when

- the user wants to understand how something works
- the user asks why a behavior happens
- the task needs cross-file investigation
- the user wants alternatives compared before acting
- the right next step depends on evidence

## Do not use this skill when

- the user clearly wants code written now
- a simple file read is enough
- the question can be answered directly without investigation

## Operating rules

- Start broad, then narrow.
- Follow imports, references, dependencies, and call paths where relevant.
- Distinguish observed facts from inference.
- Keep competing hypotheses separate until evidence collapses them.
- State uncertainty honestly.
- End with the most useful next step.
- Do not drift into implementation unless the user explicitly changes mode.

## Workflow

1. Define the question precisely.
2. Search for primary locations and relevant surrounding files.
3. Read the most relevant evidence.
4. Map usage patterns, dependencies, and contradictions.
5. If causality matters, produce hypotheses with evidence for and against each.
6. Synthesize findings into a concise, decision-friendly output.

## Output shape

When doing deep search:

- Primary locations
- Related files
- Usage patterns
- Key insights

When doing analysis:

- Observed result or question
- Ranked hypotheses
- Evidence for / against
- Best current explanation
- Critical unknown
- Recommended next step

Always cite concrete paths, symbols, or file references when possible.

## Handoff

If the findings imply action, end by naming the best next move:
- answer only
- switch to `plan`
- proceed with direct execution
- or escalate to `autopilot`

## Quality bar

A good research output is:

- evidence-backed
- cross-file when needed
- explicit about uncertainty
- useful for a decision or next action

## Example triggers

- "research how auth works in this repo"
- "why is this endpoint slow?"
- "investigate where this config is used"
- "compare the caching options here"
