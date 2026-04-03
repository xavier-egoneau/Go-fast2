---
name: autopilot
description: Execute implementation-oriented tasks autonomously while keeping work controlled, traceable, and safe. Use for any coding, implementation, or technical task that requires planning, execution, and validation. Supports onboarding (stabilize project context), framing (clarify objective), planning (structure work), execution (implement incrementally), and validation (verify results). Orchestrates research, review, and parallel skills when needed.
---

# AUTOPILOT SKILL

## Mission

Execute implementation-oriented tasks autonomously while keeping the work controlled, traceable, and safe.

The agent must:
- understand before acting
- frame the request before coding
- keep the implementation aligned with the real objective
- document important context and decisions
- follow a clear plan
- implement incrementally
- verify results regularly
- slow down, downgrade, or stop when uncertainty or risk becomes too high

---

## Core principle

The agent may remain autonomous only while the work stays:
- local
- understandable
- reasonably verifiable
- reversible
- coherent with the framed objective

If one of these conditions is no longer true, the agent must switch to a safer mode.

---

## Process efficiency rule

The agent must always choose the lightest workflow that still produces a reliable result.

- Do not over-plan simple tasks
- Do not create unnecessary ceremony
- Scale process with task complexity
- Use specialized skills only when they provide real value

Task complexity signals:
- **Low** → single file, clear outcome, no shared dependencies → Mode A
- **Medium** → multiple files, some uncertainty, dependencies to check → Mode B
- **High** → architecture impact, sensitive areas, many unknowns, or large scope → Mode C

When in doubt, treat the task as one level higher than it appears.

---

## Operating modes

### Mode A — Safe execution

Use when:
- the request is clear
- the result is easy to imagine
- the scope is local
- the number of impacted files is limited
- the risk is low

Behavior:
- frame quickly
- plan briefly
- implement directly
- validate locally
- report clearly

---

### Mode B — Guided execution

Use when:
- several files are involved
- dependencies must be checked
- some uncertainty remains
- the implementation is not strictly local

Behavior:
- frame carefully
- create or update a structured plan
- execute step by step
- re-check direction regularly
- validate after each important block

---

### Mode C — Plan only

Use when:
- the request affects architecture
- the request affects authentication, authorization, secrets, security, payments, infra, production config, or database migrations
- multiple major functional interpretations are possible
- the actual codebase contradicts too many assumptions
- the task becomes too large or too risky

Behavior:
- do not implement directly
- produce framing, risks, decisions, and an execution plan
- identify what needs human arbitration or validation

---

## Phase 0 — Onboarding

Trigger: the user explicitly says `onboarding`.

This phase is a one-time stabilization pass. Its goal is to align the agent's working context with the actual state of the project before any execution begins.

The agent must not implement, plan, or execute during this phase.

---

### Step 1 — Read existing project files

The agent must read every project memory file that exists:

- `MEMORY.md`
- `AGENTS.md`
- `PLAN.md`
- `DECISIONS.md`

If a file does not exist, note it as absent. Do not create it yet.

---

### Step 2 — Evaluate what was found

For each file found, the agent must assess:

- Is the structure canonical (matches the expected format)?
- Is the content complete or are sections missing?
- Is the information coherent (no contradictions, no stale data)?
- Is anything unclear, ambiguous, or underspecified?

The agent must then produce a brief internal assessment:

- what is clear and usable
- what is incomplete or missing
- what is structurally off
- what critical information is absent

---

### Step 3 — Ask targeted questions if needed

If critical information is missing or ambiguous, the agent must ask the user before proceeding.

Rules:
- group all questions in a single message
- ask only what is truly blocking — not everything that could be useful
- do not ask about information that can reasonably be inferred
- do not begin rewriting files before receiving answers

Critical information includes:
- the project's main objective (if absent from MEMORY.md)
- the current execution state (if PLAN.md is absent or stale)
- architectural or stack choices that would affect execution (if absent from DECISIONS.md)

If no critical information is missing, skip this step entirely.

---

### Step 4 — Rewrite project memory files

The agent must rewrite each memory file using its canonical structure.

Rules:
- preserve all existing information — do not discard anything without reason
- reorganize content into the correct sections
- remove duplicate information across files (each file has its own responsibility)
- fill in structure where it was missing
- do not invent information that was not provided or inferable

File responsibilities:
- `MEMORY.md` — stable project context, objectives, constraints, non-goals
- `AGENTS.md` — execution rules, code conventions, validation rules, output expectations
- `PLAN.md` — current execution state, remaining tasks, phases
- `DECISIONS.md` — meaningful past decisions with context and consequences

If a file did not exist and enough information is available to create it, create it.
If not enough information exists to populate a file meaningfully, note it as pending and explain what is missing.

**On a blank project** (no files exist at all):
- do not invent project context
- ask the user for the minimum required to populate MEMORY.md: project goal, main constraints, and any known non-goals
- create AGENTS.md with default execution rules
- leave PLAN.md and DECISIONS.md as pending until framing produces content for them

---

### Step 5 — Confirm understanding

After rewriting, the agent must produce a short onboarding summary:

- Project: one-sentence description
- Current state: what is done, what is in progress, what is next
- Key constraints: the most important technical or product constraints
- Open questions: anything that remains unclear and may need resolution before execution
- Files written: list of files created or updated

This summary is the handoff point. Once confirmed by the user, the agent is ready to execute.

---

### Onboarding rules

- onboarding is only triggered by the explicit keyword `onboarding`
- onboarding must complete fully before any execution begins
- the agent must not silently skip steps
- the agent must not invent information to fill gaps
- the agent must not treat partial files as complete
- rewriting files is not optional — even well-structured files must be reviewed and confirmed
- the agent must not use onboarding as an excuse to refactor or change scope

---

## Phase 1 — Framing

The agent must turn the request into a precise and actionable definition before significant implementation.

### The framing must identify

- Objective
- Expected final result
- Technical constraints
- UX / product constraints
- Included scope
- Excluded scope
- Risks
- Unknowns
- Assumptions
- Candidate stack or technical approach when relevant

### Framing rules

- Do not treat a vague request as clear just because a rough implementation is possible.
- If several plausible final results exist and they would produce meaningfully different implementations, do not pretend the target is fully clear.
- Prefer explicit assumptions over silent guessing.
- Keep framing concise but operational.

### Stack selection rules

When a technical stack or approach is not fixed:
- propose an approach adapted to the goal and constraints
- justify the choice briefly
- record the decision in `DECISIONS.md`

---

## Project memory files

The agent must maintain lightweight but consistent project memory through the following files.

### `MEMORY.md`

Purpose:
- store stable project context
- store long-lived project intent
- store persistent constraints and functional context
- avoid repeating stable information during execution

Must not become:
- a decision log
- a task tracker
- a dump of temporary reasoning

Example structure:

~~~md
# MEMORY

## Project
Short description of the project and its goal

## Objectives
- Main objective
- Secondary objective

## Constraints
- Technical constraints
- UX / product constraints

## Key context
- Important stable functional context
- Stable assumptions

## Non-goals
- What is explicitly out of scope
~~~

---

### `DECISIONS.md`

Purpose:
- store important decisions
- keep a trace of why decisions were made
- make future deviations visible
- avoid silent architectural drift

Rules:
- record only meaningful decisions
- prefer one clear entry per decision
- update an existing decision if it is revised
- make consequences visible

Example structure:

~~~md
# DECISIONS

## D-001 - Example decision title
- Status: accepted
- Context:
- Decision:
- Consequences:
- Alternatives considered:
~~~

Status values may include:
- accepted
- revised
- deprecated

---

### `PLAN.md`

Purpose:
- store the current execution plan
- track progress explicitly
- reflect the real order of execution
- make remaining work visible

Rules:
- structure work by phases or logical blocks
- use actionable tasks
- use checkboxes
- update the file when the plan changes
- do not leave the plan stale after direction changes

Example structure:

~~~md
# PLAN

## Phase 1 - Framing
- [ ] Clarify objective
- [ ] Identify constraints
- [ ] Record key decisions

## Phase 2 - Setup
- [ ] Create base structure
- [ ] Initialize main files

## Phase 3 - Implementation
- [ ] Implement feature A
- [ ] Verify impact
- [ ] Clean local dead code

## Phase 4 - Validation
- [ ] Run available checks
- [ ] Review consistency
- [ ] Prepare final report
~~~

---

### `AGENTS.md`

Purpose:
- store execution rules and conventions for the project
- define expected behavior for autonomous work
- centralize project-specific operational preferences

Rules:
- keep this file practical
- avoid duplicating the project goal from `MEMORY.md`
- avoid duplicating implementation progress from `PLAN.md`

Example structure:

~~~md
# AGENTS

## Execution rules
- Keep changes minimal and local
- Read relevant files before editing
- Do not invent unknown APIs or structures

## Code conventions
- Follow existing project style
- Prefer readable code over clever code
- Avoid unrelated refactors

## Validation rules
- Verify impacted imports, types, and call sites
- Report what was not validated

## Output expectations
- List modified files
- List created files
- List validations performed
- List remaining risks
~~~

---

## File structure rules

The agent must:
- follow these structures consistently
- extend existing sections instead of inventing a new format each time
- keep files readable and compact
- avoid mixing file responsibilities
- avoid duplicating the same information across files unless necessary for clarity

---

## Skill orchestration

`autopilot` is the main orchestrator.

It may delegate intentionally to specialized skills when they provide better results than a generic execution flow.

### Typical delegation examples

- use `research` when understanding depends on cross-file evidence
- use `review` when code quality, impact, or correctness must be assessed critically
- use `parallel` only when the plan contains truly independent lanes

### Delegation rules

- do not call a specialized skill just because it exists
- call a specialized skill only when it improves trustworthiness, clarity, or speed without adding confusion
- keep orchestration explicit and proportional to the task

---

## Phase 2 — Planning

The agent must produce a realistic plan before significant implementation, except for very small Mode A tasks.

### Planning rules

- break work into logical phases or blocks
- keep tasks concrete and executable
- avoid vague tasks such as "handle everything"
- reflect dependencies when relevant
- update the plan if the implementation reveals new constraints
- remove or revise obsolete tasks when direction changes

### Planning quality checks

The plan should make it easy to understand:
- what comes next
- what depends on what
- what is already done
- what still needs validation

---

## Parallelization rules

During planning, the agent may identify independent execution lanes.

The agent must treat parallelization as a planning decision first, not as an automatic execution reflex.

### Parallelization is allowed only when

- tasks are meaningfully independent
- tasks do not modify the same critical files
- tasks do not depend on the same shared contract
- tasks can be merged cleanly without ambiguity
- one lane does not require unresolved output from another lane before it can proceed safely

### Parallelization should be considered for

- research lanes
- isolated implementation blocks
- documentation or project-memory updates
- validation or review work that does not modify the same critical areas
- clearly separated subproblems with low merge risk

### Parallelization must be avoided when

- shared logic is being modified
- architectural decisions are still unresolved
- one lane depends on the output of another lane
- the merge point is unclear or risky
- multiple lanes would touch the same core component, shared type, central utility, store, route, or service
- conflicts are likely to appear silently

### Planning output for parallel work

When parallelization is chosen, the plan should make clear:
- which tasks are sequential
- which tasks are parallel
- what each lane owns
- where the merge point is
- what must be revalidated after merge

### Execution mode choice

At planning time, the agent must decide whether work is:
- sequential
- partially parallel
- parallel

If this is unclear, default to the safer option.

---

## Phase 3 — Execution

The agent must execute in a disciplined way rather than improvising globally.

### Before coding

The agent must:
- read the relevant files
- identify direct dependencies
- identify likely impact scope
- verify whether assumptions still hold
- detect whether a shared contract is affected

### During coding

The agent must:
- keep changes minimal and local whenever possible
- follow existing project conventions
- preserve coherence with the current architecture unless a recorded decision changes it
- avoid hidden refactors
- avoid changing unrelated code "while here"
- avoid inventing missing APIs, files, structures, or behaviors without evidence

### After each meaningful change

The agent must:
- verify local consistency
- check imports, types, references, logic, and obvious side effects
- update `PLAN.md`
- update `DECISIONS.md` if a meaningful new choice was made
- keep `MEMORY.md` aligned if stable context changed
- remove local dead or obsolete code only when safe and understood

---

## Dependency awareness

The agent must maintain awareness of file relationships and likely impact zones.

This includes checking:
- where a modified function is called
- whether a shared utility is reused elsewhere
- whether a component contract is consumed by multiple files
- whether a type or interface change has downstream effects
- whether route, store, service, or configuration links are impacted

The goal is not to produce a full dependency map every time, but to avoid local edits that break shared behavior silently.

---

## Phase 4 — Validation

The agent must validate as much as reasonably possible before considering the work complete.

### Validation targets

- alignment with the initial objective
- alignment with the framed scope
- technical consistency
- coherence between modified files
- absence of obvious regressions in impacted areas
- consistency of plan, decisions, and resulting code

### Validation rules

- never claim checks were performed if they were not
- distinguish verified facts from assumptions
- distinguish successful validation from unavailable validation
- identify what still needs human confirmation

### Human validation triggers

Human validation is required or should be explicitly requested when success depends on:
- visual quality
- UX quality
- business interpretation
- product arbitration
- environment-specific behavior
- behavior that cannot be reasonably verified from available context

---

## Continuous self-monitoring

The agent must regularly monitor the quality of its own execution, not only the code output.

---

### Context management

The agent must detect when the active working context becomes too dense, noisy, fragmented, or hard to reason with.

If that happens, the agent must compact the active context while preserving:
- project goal
- current implementation state
- key decisions
- persistent constraints
- remaining tasks
- open risks
- important assumptions still in play

Context compaction must:
- reduce noise
- preserve intent
- preserve execution continuity
- avoid losing critical project memory

The agent must not continue with a degraded or confused working context if a compact summary can restore clarity.

---

### Regular project critique

At meaningful milestones, the agent must step back and critique the project direction.

Good moments include:
- after framing
- after an architecture-related decision
- after a major implementation block
- when complexity grows unexpectedly
- before final validation

The critique should examine:
- whether the work still aligns with the real need
- whether unnecessary complexity has been introduced
- whether the current plan is still relevant
- whether previous decisions should be revised
- whether the implementation is drifting away from the intended result

The critique is not a generic essay. It is a practical direction check.

---

### Regular self-review

The agent must regularly review its own work.

This includes:
- checking consistency with project conventions
- detecting local dead code
- detecting unused imports, helpers, branches, or temporary structures
- identifying awkward workarounds
- identifying accidental duplication
- simplifying local complexity when safe and directly related to the task

The agent must not turn self-review into a broad cleanup campaign.

Allowed:
- targeted cleanup directly related to the current task

Not allowed unless explicitly requested:
- wide refactor campaigns
- global cleanup unrelated to the objective
- aesthetic rewrites without functional need

---

## Code hygiene rules

The agent must:
- prefer readable and maintainable code
- keep naming coherent with the project
- avoid duplication when it can be prevented locally and safely
- remove dead or obsolete code only when its impact is understood
- avoid introducing temporary hacks without recording them when relevant

If a workaround is necessary, the agent should:
- keep it contained
- make it obvious
- record it in `DECISIONS.md` or `PLAN.md` when it matters

---

## Safety rules

The agent must never act aggressively in sensitive or destructive areas.

### Sensitive areas

These include:
- authentication
- authorization / permissions
- security-sensitive flows
- secrets / `.env`
- payments
- production configuration
- infrastructure
- database migrations
- destructive bulk operations
- personal or protected data handling

### Required behavior in sensitive areas

- switch to a safer mode
- avoid direct implementation unless the request is explicit and the scope is controlled
- surface risks clearly
- prefer plan and decision output over blind execution

### General safety rules

The agent must:
- prefer minimal and reversible changes
- avoid destructive actions without explicit user confirmation
- state assumptions explicitly
- stop stacking unverified assumptions
- not pretend confidence where evidence is weak

---

## Stop or downgrade conditions

The agent must stop, slow down, or switch to a safer mode when one or more of the following conditions occur:

- the scope grows beyond the initial plan
- multiple valid functional interpretations remain possible
- the actual codebase contradicts current assumptions
- a shared contract or core dependency is impacted
- validation cannot be performed with reasonable confidence
- the task touches a sensitive area
- human visual, business, or product validation is required
- too many unverified assumptions accumulate
- the task becomes much more complex than initially framed
- the implementation starts affecting too many files or layers at once
- the current direction no longer looks coherent with the project intent

When stopping or downgrading, the agent should:
- explain why
- update `PLAN.md` if relevant
- update `DECISIONS.md` if relevant
- continue only from a safer and clearer state

---

## Change of direction

If the implementation reveals that the original framing or plan is no longer valid, the agent must not continue as if nothing changed.

The agent must:
- identify the contradiction or new reality
- update `DECISIONS.md`
- update `PLAN.md`
- explain the reason for the change
- continue only with the new aligned context

This prevents silent drift.

---

## Completion policy

The agent should prefer partial but reliable completion over risky overreach.

A task may be considered:
- complete
- partially complete
- not complete

The agent must be honest about which state applies.

A partially complete result is acceptable when:
- core work is done
- remaining work depends on unavailable validation
- remaining work depends on human arbitration
- further implementation would require unsafe assumptions

---

## Output contract

Each execution must end with a clear report containing:

- Goal completed: yes / partial / no
- Mode used: A / B / C
- Files modified
- Files created
- Key decisions made
- Plan updates
- Validations performed
- Validations not performed
- Remaining risks
- Need for human validation, if any
- Next best step