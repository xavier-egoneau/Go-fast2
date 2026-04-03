---
name: review
description: Perform a structured code review focused on correctness, consistency, maintainability, and impact. Use when evaluating code quality, detecting issues, or validating changes before completion.
---

# Review

Analyze code critically, not superficially.

---

## Mission

Evaluate code quality, correctness, and impact.

The goal of this skill is to:
- detect issues and risks
- evaluate consistency with the project
- identify dead or unnecessary code
- assess impact beyond the local file
- provide actionable feedback

This skill must not blindly refactor or rewrite code.

---

## When to use this skill

Use `review` when:

- code has been written or modified
- a feature is considered "done"
- before validation or delivery
- potential issues or inconsistencies are suspected
- code quality needs to be assessed
- after a complex implementation

---

## Do not use this skill when

- no code exists yet
- the task is purely conceptual
- the change is trivial and fully verified
- understanding is missing → use `research` first

---

## Core principles

- Review behavior, not just syntax
- Evaluate impact, not just local correctness
- Prefer evidence over intuition
- Stay proportional to the scope
- Do not over-engineer feedback
- Avoid cosmetic-only comments unless relevant
- Distinguish real issues from preferences

---

## Workflow

### 1. Define review scope

- What files are under review?
- What was changed?
- What is the intent of the change?

---

### 2. Check understanding

If unclear:
- suggest using `research`
- or perform lightweight reasoning based on available context

---

### 3. Analyze locally

For each file:

- correctness of logic
- clarity and readability
- naming consistency
- unnecessary complexity
- duplication
- unused variables / functions / imports
- obvious bugs or edge cases

---

### 4. Analyze impact

When relevant, evaluate:

- where this code is used
- whether contracts changed
- whether shared logic is affected
- whether dependencies are impacted
- potential regressions

If impact is unclear:
- recommend `research`

---

### 5. Detect structural issues

Look for:

- violation of project conventions
- inconsistent patterns
- misplaced responsibilities
- unnecessary abstractions
- missing abstractions when duplication exists

---

### 6. Identify dead or risky code

- unused code
- unreachable branches
- redundant logic
- temporary workarounds
- fragile assumptions

---

### 7. Classify findings

Each finding should be categorized:

- Critical → must fix (bug, regression risk)
- Important → should fix (maintainability, clarity)
- Minor → optional improvements
- Note → observation or suggestion

---

### 8. Suggest improvements

- propose minimal, safe improvements
- avoid full rewrites unless necessary
- avoid introducing new complexity

---

## Output structure

### Summary

- Overall assessment (good / acceptable / problematic)
- Main risks
- Confidence level

---

### Findings

For each issue:

- Type: Critical / Important / Minor / Note
- Location: file / function / component
- Description:
- Impact:
- Suggested fix:

---

### Dead code / cleanup

- list removable elements
- explain why they are safe to remove

---

### Impact analysis

- affected areas
- possible regressions
- contracts touched

---

### Validation gaps

- what could not be verified
- what requires human validation
- what requires runtime testing

---

### Recommended next step

- fix issues
- run validation
- trigger `research`
- update `PLAN.md`
- update `DECISIONS.md`
- proceed to completion

---

## Integration with other skills

### With `research`

Use `research` when:
- impact is unclear
- usage patterns are unknown
- behavior is complex or implicit

---

### With `autopilot`

- `review` provides feedback
- `autopilot` decides what to do next

---

## Interaction with project files

### PLAN.md

- suggest updates if new work appears
- mark tasks as incomplete if issues remain

---

### DECISIONS.md

- suggest updates if:
  - a decision is violated
  - a better approach is identified
  - a workaround needs to be recorded

---

### MEMORY.md

- update only if stable context changes (rare)

---

## Boundaries

This skill must NOT:

- rewrite large parts of the code automatically
- perform broad refactors
- introduce new features
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
- aware of project context
- proportional to scope
- actionable
- explicit about uncertainty
- not overly verbose

---

## Failure modes to avoid

- nitpicking without value
- ignoring impact beyond the file
- missing obvious bugs
- proposing unnecessary rewrites
- mixing opinion with fact
- reviewing without understanding

---

## Example triggers

- "review this code"
- "check if this is clean"
- "is this implementation safe?"
- "find issues in this feature"
- "validate before shipping"