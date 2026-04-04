---
name: review
description: Perform a structured review focused on correctness, consistency, maintainability, and impact. Use when evaluating code quality, detecting issues, or validating changes before completion. Also applies to plans, decisions, and technical documents. Can be used standalone or orchestrated by autopilot.
---

# Review

Analyze critically, not superficially.

---

## Mission

Evaluate quality, correctness, and impact.

The goal of this skill is to:
- detect issues and risks
- evaluate consistency with the project
- identify dead or unnecessary content
- assess impact beyond the local scope
- provide actionable feedback

This skill must not blindly refactor or rewrite what it reviews.

---

## Standalone vs orchestrated

This skill works in two contexts:

**Standalone** — the user calls it directly without autopilot.
- The skill runs its full workflow independently.
- It produces a self-contained review output with findings and a recommended next step.
- It does not require project memory files to operate.
- If project files exist, it may read them for context to better evaluate consistency and conventions.

**Orchestrated** — autopilot delegates to this skill.
- The skill receives a specific scope from autopilot.
- It returns structured findings for autopilot to act on.
- It may suggest updates to project memory files.

---

## What can be reviewed

This skill applies to:

- **Code** — implementation files, functions, components, modules
- **Plans** — PLAN.md, task lists, execution strategies
- **Decisions** — DECISIONS.md entries, architectural choices
- **Technical documents** — specs, API contracts, configuration files

The review workflow adapts to the subject. Code reviews focus on logic and impact. Document reviews focus on clarity, completeness, and coherence.

---

## When to use this skill

Use `review` when:

- code or a document has been written or modified
- a feature or task is considered done
- before validation or delivery
- potential issues or inconsistencies are suspected
- quality needs to be assessed
- after a complex implementation or planning session

---

## Do not use this skill when

- nothing exists yet to review
- understanding is missing → use `research` first
- the change is trivial and fully verified

---

## Core principles

- Review behavior and intent, not just syntax
- Evaluate impact, not just local correctness
- Prefer evidence over intuition
- Stay proportional to the scope
- Do not over-engineer feedback
- Avoid cosmetic-only comments unless relevant
- Distinguish real issues from preferences

---

## Workflow

### 1. Define review scope

- What is under review? (code, plan, decision, document)
- What was changed or produced?
- What is the intent?

---

### 2. Check understanding

If the intent or context is unclear:
- use `research` to gather missing context
- or perform lightweight reasoning based on available information

Do not review blindly without understanding what the subject is meant to do.

---

### 3. Analyze locally

For each file or section:

- correctness of logic or reasoning
- clarity and readability
- naming or terminology consistency
- unnecessary complexity
- duplication
- unused or dead elements
- obvious issues or edge cases

---

### 4. Analyze impact

When relevant, evaluate:

- where this code or decision is consumed
- whether contracts or interfaces changed
- whether shared logic is affected
- whether dependencies are impacted
- potential regressions or side effects

If impact is unclear, recommend `research`.

---

### 5. Detect structural issues

Look for:

- violation of project conventions
- inconsistent patterns
- misplaced responsibilities
- unnecessary abstractions
- missing abstractions where duplication exists
- incoherence between a plan and its decisions, or between decisions and the code

---

### 6. Identify dead or risky content

- unused code, sections, or decisions
- unreachable branches
- redundant logic
- temporary workarounds left in place
- fragile or unverified assumptions

---

### 7. Classify findings

Each finding must be categorized:

- **Critical** → must fix (bug, regression risk, blocking incoherence)
- **Important** → should fix (maintainability, clarity, missing coverage)
- **Minor** → optional improvement
- **Note** → observation or suggestion without urgency

---

### 8. Suggest improvements

- propose minimal, safe improvements
- avoid full rewrites unless necessary
- avoid introducing new complexity
- prefer targeted fixes over broad restructuring

---

## Output structure

### Summary

- Overall assessment: good / acceptable / problematic
- Main risks
- Confidence level

---

### Findings

For each issue:

- Type: Critical / Important / Minor / Note
- Location: file / function / section / component
- Description
- Impact
- Suggested fix

---

### Dead content / cleanup

- list removable elements
- explain why they are safe to remove

---

### Impact analysis

- affected areas
- possible regressions
- contracts or interfaces touched

---

### Validation gaps

- what could not be verified
- what requires human validation
- what requires runtime testing or external confirmation

---

### Recommended next step

Every review output must end with a clear recommended next step:

- fix critical issues before proceeding
- run validation
- trigger `research` for unclear impact zones
- update `PLAN.md`
- update `DECISIONS.md`
- proceed to completion
- escalate to autopilot

---

## Interaction with project files

### PLAN.md

- suggest updates if new work is uncovered
- mark tasks as incomplete if issues remain

### DECISIONS.md

- suggest updates if a decision is violated, revised, or missing
- suggest recording workarounds when relevant

### MEMORY.md

- update only if stable project context changed (rare)

In standalone mode, the skill suggests updates but does not apply them silently.

---

## Boundaries

This skill must NOT:

- rewrite large parts of the reviewed content automatically
- perform broad refactors
- introduce new features or scope
- make silent structural decisions

This skill may:

- suggest fixes
- highlight risks
- recommend refactoring
- propose alternatives

---

## Quality bar

A good review is:

- focused on real issues
- aware of project context and intent
- proportional to scope
- actionable
- explicit about uncertainty
- not overly verbose

---

## Failure modes to avoid

- nitpicking without value
- ignoring impact beyond the local scope
- missing obvious issues
- proposing unnecessary rewrites
- mixing opinion with fact
- reviewing without understanding the intent

---

## Example triggers

- "review this code"
- "check if this is clean"
- "is this implementation safe?"
- "find issues in this feature"
- "validate before shipping"
- "review this plan"
- "check this decision"
- "is this spec coherent?"