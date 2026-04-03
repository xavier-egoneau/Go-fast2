---
name: parallel
description: Execute work through clearly separated parallel lanes when the plan proves they are independent enough to reduce execution time without added risk. Use only after autopilot planning has established ownership, boundaries, and merge points. Not designed for standalone use.
---

# Parallel

Parallelize only when independence is real.

---

## Mission

Execute multiple independent work lanes in parallel while preserving overall coherence, safety, and merge quality.

This skill is an execution accelerator, not a planning substitute.

The goal of this skill is to:
- speed up work only when parallelism is justified
- keep lane boundaries clear
- avoid hidden conflicts between lanes
- make merge points explicit
- surface risks early
- return a clean combined result to autopilot

---

## Core principle

Parallel execution is allowed only when it improves speed without degrading trustworthiness.

If independence is doubtful, do not parallelize.

Default to the safer option.

---

## Relationship with autopilot

This skill is designed to be orchestrated by `autopilot`. It is not intended for standalone use.

`autopilot` decides whether work should be:
- sequential
- partially parallel
- parallel

`parallel` does not decide strategy by itself. It executes the parallel part once the lane split has been justified by planning.

If lane independence becomes questionable during execution, `parallel` must surface the issue immediately and return control to `autopilot`.

---

## Use this skill when

Use `parallel` only when autopilot planning has already established that:

- tasks are meaningfully independent
- ownership per lane is clear
- merge points are identifiable
- conflicts are unlikely or manageable
- each lane can make progress without unresolved output from another lane

Typical good cases:
- one lane investigates while another prepares isolated documentation
- one lane updates project memory while another performs isolated validation
- one lane handles a self-contained UI area while another handles unrelated tests
- one lane performs review while another prepares non-overlapping documentation
- several independent research subquestions must be explored

---

## Do not use this skill when

Do not use `parallel` when:

- planning is incomplete
- architecture is still uncertain
- tasks share central contracts
- tasks touch the same critical files
- tasks depend on each other to proceed safely
- merge strategy is unclear
- the task is small enough that parallelism adds more overhead than value
- the only motivation is "go faster"

---

## Preconditions

Before using this skill, the following must already be clear:

- overall objective
- lane definitions
- lane ownership
- lane boundaries
- merge point
- revalidation needs after merge

If these are not clear, stop and return to autopilot for planning.

---

## Lane design rules

Each lane must have:

- a clear purpose
- a clear scope
- a clear owner or responsibility
- explicit boundaries
- explicit expected output

A lane must not:
- silently expand into another lane's territory
- change shared contracts without explicit coordination
- introduce new structural decisions on behalf of the whole run
- assume another lane has already completed work unless that dependency was planned

---

## Independence rules

Lanes may be considered independent only if most of the following are true:

- different primary files or areas
- no shared core component under modification
- no shared type or interface under active change
- no shared service, route, store, or central utility under active change
- no unresolved dependency ordering
- no ambiguous merge behavior

Independence is weaker if lanes touch:
- related components
- shared state
- shared contracts
- adjacent architecture boundaries

When in doubt, downgrade to sequential or partially parallel execution.

---

## Workflow

### 1. Confirm lane validity

Before execution:
- restate each lane
- restate boundaries
- restate expected outputs
- restate merge point
- restate known risks

If one lane is not clearly separable, stop and return to autopilot.

---

### 2. Execute lanes with discipline

For each lane:
- stay within assigned scope
- avoid opportunistic expansion
- avoid assumptions about other lanes
- keep changes local to that lane's ownership
- record issues that affect merge safety

---

### 3. Monitor cross-lane risk

During execution, watch for:
- overlapping file ownership
- emerging shared-contract changes
- conflicting assumptions
- duplicated work
- invalidated merge strategy
- one lane blocking another unexpectedly

If these appear, surface the issue immediately and pause execution.

---

### 4. Prepare merge

Before combining results:
- restate what each lane produced
- identify affected files
- identify affected contracts
- identify possible collisions
- identify required revalidation

---

### 5. Merge carefully

When merging:
- prefer explicit conflict awareness over silent blending
- preserve the framed objective
- preserve consistency with project rules
- note any compromise introduced at merge time
- recommend follow-up review if merge complexity increased risk

---

### 6. Revalidate after merge

After merge:
- review impacted areas together
- verify that no lane invalidated another
- verify contracts, imports, references, and assumptions
- update plan or decisions if merge changed execution reality

---

## Lane output format

Each lane must be summarized with:

- Lane name
- Goal
- Owned scope
- Files touched
- Key findings or changes
- Risks discovered
- Merge notes

Example:

~~~md
## Lane A - Research config usage
- Goal: map where config X is used
- Owned scope: usage analysis only
- Files touched: none
- Key findings:
- Risks discovered:
- Merge notes:
~~~

---

## Handoff output format

After merge and revalidation, the skill must return a structured handoff to autopilot:

~~~md
## Parallel handoff to autopilot
- Lanes completed:
  - Lane A
  - Lane B
- Lanes blocked:
  - none
- Files touched:
  - src/components/A.tsx
  - PLAN.md
- Merge risks resolved:
  - shared type assumptions verified — no conflict
- Merge risks remaining:
  - none
- Revalidation performed:
  - import consistency checked
  - shared contract not modified
- Recommended next step for autopilot:
  - run review on merged output
  - continue with Phase 3 execution
~~~

This handoff is mandatory. autopilot uses it to decide whether to continue, revalidate further, or escalate.

---

## Allowed lane types

Good candidates for parallel lanes include:

- research + documentation
- isolated implementation + isolated validation
- independent sub-feature analysis
- review + project-memory maintenance
- separate non-overlapping UI areas
- separate evidence gathering tracks

---

## Dangerous lane combinations

Avoid or heavily restrict combinations such as:

- two lanes modifying the same component tree
- one lane changing types while another consumes them
- one lane changing API shape while another builds against it
- one lane refactoring shared utilities while another depends on them
- one lane making architectural choices while another implements against the old architecture
- one lane assuming completion of another without explicit sequencing

---

## Partial parallelization

Full parallelization is not always required.

Use partial parallelization when:
- some blocks are independent
- some blocks must remain sequential
- one lane can prepare while another finishes

This often provides the best balance between speed and safety.

When partial parallelization is used, the plan must clearly separate:
- parallel-start tasks
- sequential follow-up tasks
- merge-gated tasks

---

## Failure handling

If a lane fails, the skill must not hide it.

The skill must:
- identify which lane failed
- explain whether the failure is local or cross-lane
- explain whether merge is still possible
- return control to autopilot with a clear failure report
- suggest whether to:
  - continue with partial results
  - downgrade to sequential execution
  - trigger `research`
  - trigger `review`

---

## Interaction with project files

### `PLAN.md`
- may be updated to reflect lane split
- may be updated to reflect completed or blocked lanes
- must reflect merge-dependent follow-up work when relevant

### `DECISIONS.md`
- should be updated if merge introduces a meaningful structural choice
- should be updated if lane assumptions were invalidated

### `MEMORY.md`
- update only if stable project context changed

### `AGENTS.md`
- do not change unless project execution conventions themselves changed

---

## Safety rules

This skill must not be used to bypass safety.

Parallel execution must not be used when the task touches:
- auth
- permissions
- security-sensitive flows
- secrets
- payments
- production config
- infrastructure
- database migrations
- destructive bulk operations

Unless autopilot explicitly frames a controlled and safe partial use case, parallel execution must be avoided in these areas.

---

## Boundaries

This skill must NOT:

- invent lanes that planning did not justify
- assume merge will be easy without evidence
- hide overlap or conflicts
- silently rewrite lane boundaries
- convert a risky task into a parallel task just for speed
- override autopilot orchestration
- operate without a structured handoff back to autopilot

This skill may:

- execute justified lanes
- monitor overlap risk
- recommend stopping or downgrading
- suggest revalidation or review after merge

---

## Quality bar

A good parallel run is:

- justified by actual independence
- clearly split into lanes
- explicit about boundaries
- honest about conflicts
- careful at merge time
- followed by proportionate revalidation
- closed with a clean handoff to autopilot

---

## Failure modes to avoid

- fake independence
- parallelizing shared-contract work
- lane sprawl
- duplicate work across lanes
- unsafe merges
- using speed as the only reason for parallelization
- losing overall coherence
- returning to autopilot without a structured handoff

---

## Example triggers

- "run these independent tasks in parallel"
- "split the work into separate lanes"
- "parallelize research and documentation"
- "handle the isolated parts at the same time"
- "execute the independent validation tracks together"