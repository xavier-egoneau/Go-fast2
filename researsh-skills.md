---
name: research
description: Investigate a codebase, feature, bug, or technical question and produce a structured, evidence-based synthesis. Use when understanding is required before planning, reviewing, or implementing.
---

# Research

Investigate deeply, then synthesize clearly.

---

## Mission

Understand before acting.

The goal of this skill is to:
- explore relevant parts of the codebase
- identify how things actually work
- separate facts from assumptions
- produce a structured synthesis usable for decisions, planning, review, or implementation

This skill must not drift into implementation.

---

## When to use this skill

Use `research` when:

- the correct implementation path is unclear
- a feature requires understanding existing logic first
- a bug cause is unknown
- multiple files or dependencies are involved
- a code review requires context beyond a single file
- a decision depends on evidence rather than intuition

---

## Do not use this skill when

- the task is trivial and fully understood
- the user explicitly wants immediate implementation
- a simple file read is enough
- no uncertainty or ambiguity exists

---

## Core principles

- Start broad, then narrow
- Follow real code paths (imports, calls, dependencies)
- Distinguish facts from interpretation
- Keep hypotheses separate until evidence confirms them
- Do not assume missing behavior
- Do not invent structure not observed in code
- Be explicit about uncertainty
- Prefer clarity over exhaustiveness

---

## Workflow

### 1. Define the question

- What exactly are we trying to understand?
- What is unclear?
- What needs to be proven or explained?

---

### 2. Identify investigation scope

- Entry points (files, components, functions)
- Related files
- Dependencies
- Upstream and downstream usage

---

### 3. Explore the codebase

- Read relevant files
- Follow imports and call chains
- Track how data flows
- Identify patterns and inconsistencies

---

### 4. Map relationships

When relevant, identify:

- where a function is called
- what depends on a module
- how a component is reused
- which contracts are shared
- where side effects may exist

---

### 5. Build hypotheses (if needed)

When causality or bugs are involved:

- list plausible explanations
- keep them separate
- attach evidence to each

Example:

- Hypothesis A:
  - Evidence for:
  - Evidence against:

- Hypothesis B:
  - Evidence for:
  - Evidence against:

---

### 6. Synthesize findings

Produce a clear, decision-ready output.

---

## Output structure

### When mapping a system

- Primary locations
- Related files
- Key relationships
- Data flow (if relevant)
- Key insights

---

### When analyzing a problem or bug

- Observed issue
- Hypotheses (ranked if possible)
- Evidence for / against each
- Best current explanation
- Remaining unknowns

---

### Always include

- concrete references (files, functions, components)
- explicit uncertainty
- what is confirmed vs inferred

---

## Integration with autopilot

This skill must actively help the global workflow.

### After research, suggest the next step:

- proceed with implementation
- switch to `plan`
- trigger a code review
- update `DECISIONS.md` if assumptions are invalidated
- escalate to `autopilot` for orchestration

---

## Interaction with project files

### If research reveals structural insights:

- may update `MEMORY.md` (stable context only)

### If research invalidates assumptions:

- must suggest updating `DECISIONS.md`

### If research impacts execution:

- must suggest updating `PLAN.md`

---

## Boundaries

This skill must NOT:

- implement code
- modify files directly
- refactor
- make silent decisions

This skill may:

- recommend actions
- highlight risks
- propose alternatives
- identify missing information

---

## Quality bar

A good research output is:

- grounded in actual code
- cross-file when necessary
- structured and readable
- explicit about uncertainty
- useful for decision-making
- directly actionable (clear next step)

---

## Failure modes to avoid

- jumping to conclusions too early
- focusing on one file while ignoring the system
- mixing facts and assumptions
- producing vague summaries without evidence
- drifting into implementation

---

## Example triggers

- "research how this feature works"
- "investigate this bug"
- "where is this function used?"
- "why does this behavior happen?"
- "analyze this part of the codebase before modifying it"