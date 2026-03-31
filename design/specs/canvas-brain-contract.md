# Canvas ↔ Brain Contract

## Purpose

This document defines the contract between the **Design Surface canvas** and the **brain** (a real user-owned CLI agent such as Codex, Claude Code, Copilot-compatible runtime, or another compatible local agent).

The goal is not to let an AI freely hallucinate UI. The goal is to let a brain operate on a scene **inside the constraints of the real production system**.

Core principle:

**The design system is the conceptual source of truth, but the versioned code is the effective source of truth.**

---

## Product framing

The Design Surface is:

- a designer-facing visual workspace
- connected to real production components
- connected to real includes / templates / tokens
- intended to support design exploration without losing alignment with the repo

The brain is:

- not a generic image generator
- not a freestyle UI composer
- not allowed to invent near-duplicates of existing blocks
- an operator of the real system

---

## Primary responsibilities

### Canvas responsibilities

The canvas is responsible for:

- presenting the current scene visually
- exposing the current selection and scene structure
- serializing a compact, usable context for the brain
- previewing proposed changes before application
- applying accepted structured changes
- preserving undo/history semantics
- keeping designer-facing UI simple and non-technical

### Brain responsibilities

The brain is responsible for:

- interpreting a designer intent in context
- reasoning over the existing production system
- preferring reuse over invention
- returning structured, explainable proposals
- signaling when a request exceeds what can be done with the current system
- never silently drifting away from the real component/include inventory

---

## Non-negotiable system rules

The brain must follow these rules in order:

1. **Reuse existing includes/components/patterns first**
2. **Reconfigure or rearrange existing blocks before proposing new ones**
3. **Compose existing blocks before inventing a new pattern**
4. **If the system cannot satisfy the request, say so explicitly**
5. **Never create a "close enough" fake replacement when a real block exists**

This rule ordering is more important than stylistic cleverness.

---

## High-level interaction model

1. The designer expresses an intent.
2. The canvas builds a context package.
3. The brain receives:
   - the designer intent
   - the current scene context
   - the current selection context
   - the production-system context
   - the reuse constraints
4. The brain returns a structured proposal.
5. The canvas validates it.
6. The canvas previews the result.
7. The designer accepts, rejects, or branches.

---

## Input contract: what the brain receives

The brain input must be explicit, compact, and deterministic enough to be testable.

## 1. Designer intent

A natural language instruction, for example:

- “Make this hero feel more premium.”
- “Add a more editorial variation of this section.”
- “Reorganize this area to give more emphasis to the CTA.”
- “Create a mobile variation of this scene.”
- “Tighten spacing across this block.”

This is the primary user-facing input.

## 2. Scene context

The serialized current scene.

Must include at minimum:

- scene id
- scene name
- viewport
- list of items
- list of notes
- item coordinates / dimensions
- item refs to real component/page entries
- current params/variants/content values

Example shape:

```json
{
  "id": "homepage-hero-exploration",
  "name": "Homepage hero exploration",
  "viewport": "desktop",
  "items": [],
  "notes": []
}
```

## 3. Selection context

When a selection exists, it should be sent explicitly.

Possible forms:

- selected item
- selected note
- selected group / multiple items (future)
- null when no selection exists

This matters because many natural-language requests are local rather than global.

## 4. Production-system context

This is the critical part.

The brain must know what the real system contains.

At minimum this context should include:

- available components
- available pages
- entry ids
- kinds (`component`, `page`, future block types)
- category / level metadata
- exposed params / variants / content metadata
- known tokens or token categories
- logical mapping to real source files when available
- known include/template identifiers when available

The exact transport shape may evolve, but the semantics must stay stable.

## 5. Constraint pack

A machine-readable or prompt-readable rule block describing operational limits.

Must include statements equivalent to:

- prefer reuse over invention
- do not create fake components that mimic existing ones
- stay compatible with legacy includes/templates
- if new component work is required, mark it explicitly
- only output supported structured actions

## 6. Optional repo context (later phase)

Not mandatory for the first pass, but important later:

- relevant file paths
- include ancestry or composition chains
- token source locations
- branch/worktree context
- repo state hints

This enables stronger scene → implementation projection.

---

## Output contract: what the brain returns

The brain must return a structured proposal, not raw prose only.

## Core output shape

Minimal internal target shape:

```json
{
  "summary": "Short explanation of what is being proposed",
  "actions": [],
  "warnings": [],
  "requiresNewComponent": false,
  "unresolved": []
}
```

The canvas may initially only require `summary` + `actions`, but the full contract should evolve toward the richer shape above.

## Field semantics

### `summary`

Human-readable explanation of the proposed transformation.

Should state:

- what is being changed
- whether existing components were reused
- whether any limitations were encountered

### `actions`

Structured operations the canvas can validate, preview, and apply.

Examples of internal action families:

- update item params
- update item layout
- duplicate item
- add item from existing ref
- remove item
- add note
- adjust scene metadata
- adjust scene token overrides (future)

### `warnings`

Human-readable caution messages.

Examples:

- “No exact existing hero variant matches this request; reused the closest allowed pattern.”
- “Spacing adjustments are approximate because token mapping is incomplete.”

### `requiresNewComponent`

Boolean indicator that the requested transformation cannot be satisfied within the current system.

This is essential to avoid silent hallucination.

### `unresolved`

Structured list of unmet constraints or blocked expectations.

Examples:

- missing block type
- no compatible mobile variant
- requested layout requires a component not present in registry

---

## Decision categories the brain must distinguish

The brain should distinguish between four outcomes:

### 1. Fully satisfiable within existing system

The request can be fulfilled by reusing and rearranging real blocks.

Expected output:

- valid actions
- no new component requirement
- clear summary

### 2. Partially satisfiable within existing system

The request can be approximated using current building blocks, but with tradeoffs.

Expected output:

- valid actions
- warnings
- no silent overclaiming

### 3. Not satisfiable without new component work

The request exceeds what the existing registry/include system supports.

Expected output:

- either no actions or partial safe actions
- `requiresNewComponent: true`
- explicit unresolved reasons

### 4. Ambiguous request requiring clarification

The intent is too vague to safely convert into a meaningful proposal.

Expected output:

- no destructive or misleading actions
- explicit clarification need
- optionally a small set of candidate interpretations

---

## Preview / apply semantics

The brain does not mutate the scene directly.

The contract assumes a pipeline:

1. brain proposes actions
2. canvas validates action shape and references
3. canvas computes preview scene
4. designer reviews the preview
5. designer applies or rejects

This preserves:

- control
- undoability
- inspectability
- future diffing
- safety against brain drift

---

## Validation expectations

Before any apply, the canvas layer must validate:

- action types are supported
- all target references exist when required
- all added refs exist in the real registry
- patches have valid shapes
- layout values are coherent
- token references are known when token actions exist

Validation belongs to the canvas-side engine, not to trust in the brain.

---

## Supported action philosophy

The structured action contract should stay intentionally narrow at first.

Good first actions are:

- low ambiguity
- easy to validate
- reversible
- previewable
- tied to real existing refs

Bad first actions are:

- vague “make it nicer” operations with no decomposition
- hidden imperative code execution
- actions that imply creation of new real source files without explicit escalation
- actions that bypass the registry/include system

---

## Anti-hallucination policy

The following must be treated as failures:

- creating an unregistered pseudo-header instead of reusing a real header include
- inventing params that are not exposed by the system
- referring to components not present in the registry as if they existed
- claiming success on a request that actually requires new system work

The brain should be rewarded for honesty and explicit limits, not for bluffing.

---

## Separation between designer UX and internal machinery

The designer should not be forced to see raw JSON contracts as a primary mode.

The structured action contract is an **internal system interface**, useful for:

- validation
- preview
- application
- debugging
- integration with agent runtimes

The designer-facing UX should stay focused on:

- intent
- alternatives
- preview
- apply / reject / branch

Not on the transport format itself.

---

## Provider/runtime abstraction

The contract should remain independent from the selected agent runtime.

Whether the user chooses:

- Codex CLI
- Claude Code
- Copilot-compatible runtime
- OpenCode
- another compatible agent

The canvas should still speak a stable internal contract.

Meaning:

- provider-specific auth and invocation should live below the contract layer
- the returned data should be normalized into a common structure
- provider swapping should not change canvas semantics

---

## Failure and refusal contract

The brain must be allowed to refuse or escalate.

Legitimate refusal / escalation cases include:

- request requires a new component not present in the system
- request conflicts with explicit reuse constraints
- scene context is insufficient
- selection/reference cannot be resolved
- request asks for a transformation outside current action vocabulary

Refusal is preferable to fake compliance.

---

## Future expansion points

The contract should leave room for later additions:

- token override actions
- multi-select aware actions
- board/frame-level actions
- scene branching and alternative generation
- file-level implementation projections
- git-aware change proposals
- richer unresolved/diagnostic payloads
- traceability metadata linking scene changes to source locations

---

## Suggested first implementation slice

A realistic first slice of this contract could be:

- natural-language designer intent
- current scene context
- current selection context
- compact registry context
- strict reuse instruction block
- normalized response with:
  - `summary`
  - `actions`
  - `warnings`
  - `requiresNewComponent`
- local validation + preview + apply

This is enough to prove the core loop without overbuilding the system.

---

## Final principle

The canvas is not the source of truth.
The brain is not the source of truth.
The design system alone is not the effective source of truth.

**The versioned codebase is the effective source of truth.**

The job of the Design Surface and the brain is to make that truth explorable, transformable, and usable by designers without drifting away from it.
