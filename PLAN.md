# PLAN

## Phase 1 - Onboarding
- [x] Identify existing project memory files
- [x] Clarify current product priority
- [x] Rewrite project memory files into canonical structure

## Phase 2 - Design Surface feedback triage
- [x] Confirm and reproduce the current UX issues reported by the user
- [x] Turn confirmed feedback into a prioritized implementation backlog
- [x] Separate small UX fixes from larger product or architecture work

## Phase 3 - Small UX and workflow fixes
- [x] Investigate why "add note" does not add a visible note
- [x] Review whether the topbar scene selector should keep exposing the default scene
- [x] Remove or rethink the topbar viewport control if it is redundant
- [x] Improve resizing affordance for grouped atomic component boxes
- [x] Add explicit zoom handling inside the Design Surface instead of relying on browser zoom

## Phase 4 - Product direction changes
- [x] Reassess the role of semantic diffs in the designer workflow
- [x] Align change-management flow with practical Git branch usage
- [x] Rework viewport logic so component-level controls align with SCSS breakpoints
- [ ] Reassess AI-driven creation flows based on current observed limits

## Phase 5 - JSON V2 first slice
- [x] Define the canonical JSON v2 model for referenced sub-components and collections
- [x] Define binding rules for child component variants and content fields
- [x] Define collection editing rules with bulk-first behavior
- [x] Define backward compatibility rules for existing component JSON files
- [x] Implement JSON validation support for `parts` and `collections`
- [x] Extend showcase generation and registry transport for `parts` and `collections`
- [x] Add Design Surface inspector drawers for referenced sub-components and bulk collections
- [x] Migrate pilot entries `header-nav` and `listing` to JSON v2
- [x] Confirm the first slice can stay on flat query params
- [x] Update starter-kit documentation (`GUIDELINES_AI.md`) to formalize JSON v2 authoring rules
- [x] Extend agent actions to target nested `parts` / `collections` explicitly
- [ ] Evaluate whether deeper recursion or structured render payloads are needed after product validation

## Phase 5b - Explicit list semantics
- [x] Evolve the canonical JSON schema so bulk collection behavior requires an explicit list marker
- [x] Distinguish explicit `list` collections from other repeated composition patterns
- [x] Update starter-kit documentation so repeated form controls are not modeled as implicit bulk collections
- [ ] Define how future form/page schemas should split family controls, individual instances, and layout groups
  - [x] Audit `form.twig` and inventory repeated controls by family, instance, and row/grid structure
    - Inventory captured: repeated families include `input`, `select`, `radio`, `switch`, `checkbox`, `button`, and layout `grid`
    - Inventory captured: individual field instances include personal info, account access, preferences, consent, and action controls
    - Inventory captured: layout is expressed through multiple row-level `grid` includes (`2-up`, `3-up`, mixed sections) and one local switches stack
  - [x] Define the canonical JSON shape for non-list repeated composition
  - [x] Decide which parts of that shape are authoring-only vs runtime-visible in the Design Surface
    - Decision recorded: use runtime-visible `families`, `instances`, and `layoutGroups`
    - Decision recorded: keep `collections` reserved for explicit `kind: "list"` cases only
  - [x] Update validation rules to reject ambiguous non-list repetition once the new shape exists
  - [x] Extend showcase generation and registry transport for the new non-list repeated-composition nodes
  - [x] Add inspector sections for family drawers, instance drawers, and layout-group drawers
  - [x] Migrate `form` as the first pilot of the non-list repeated-composition model
  - [ ] Reassess whether other pages need the same structure or can stay simpler

## Phase 6 - Structured composable state
- [x] Define the target scene model with `params`, `partsState`, and `collectionsState`
  - [x] Define the exact item shape stored in scene JSON
  - [x] Define the minimal child-state shape for `part` and `collection`
  - [x] Define which data stays in flat `params` during transition
- [ ] Define migration rules from flat parent params to structured child state for existing scenes
  - [x] Define one-way migration for persisted local scenes
  - [x] Define one-way migration for `design/scenes/*.scene.json`
  - [x] Define fallback when a scene references stale or missing component schema
- [ ] Extend preview transport beyond flat query params with a structured render payload
  - [x] Define the payload format sent from Design Surface to preview
  - [x] Define payload serialization strategy compatible with the current preview iframe
  - [x] Decide whether payload should coexist temporarily with flat query params
- [x] Update the Twig preview middleware in `vite.config.js` to resolve structured payloads safely
  - [x] Parse the structured payload in the dev middleware
  - [x] Reconstruct Twig data from `params`, `partsState`, and `collectionsState`
  - [x] Keep legacy flat query param support during transition
- [ ] Define how parent templates receive child state during preview without duplicating child schemas
  - [x] Define parent-side variable injection for `parts`
  - [x] Define bulk/shared state injection for `collections`
  - [x] Define how explicit `binding` and `autoBind` resolve against structured state
- [ ] Refactor the Design Surface inspector to read and write structured child state directly
  - [x] Keep root `Props` editing intact
  - [x] Make `Sous-composants` drawers write into `partsState`
  - [x] Make `Collections` drawers write into `collectionsState`
- [ ] Refactor agent actions so composable edits target structured state as the primary source of truth
  - [x] Update validation and apply layers to write structured state first
  - [x] Keep temporary translation from structured state to flat params while templates are migrating
  - [x] Update agent context and prompt examples to describe the new source of truth
- [ ] Keep a temporary legacy compatibility path for existing flat bindings during migration
  - [x] Remove rendering dependencies that still assume flat-only runtime data
  - [x] Remove scene/runtime branches kept only for older scene shapes
  - [x] Remove inspector/runtime assumptions that preserve pre-structured behavior by default
- [ ] Migrate pilot components/pages to the structured model (`header-nav`, `card`, `listing`, `form`)
  - [x] Migrate `header-nav` preview resolution
  - [x] Migrate `card` preview resolution
  - [x] Migrate `listing` preview resolution
  - [x] Migrate `form` preview resolution
- [ ] Deprecate flat parent params after pilot validation and complete the migration uniformly
  - [x] Identify what still requires flat params after pilot migration
  - [x] Decide whether hybrid mode should remain
  - [x] Remove remaining flat-only preview dependencies on migrated pilots
  - [x] Define the final cleanup path for temporary flat mirrors in scene items

## Phase 7 - Validation
- [ ] Validate updated Design Surface interactions manually, especially inspector drawers on `header-nav` and `listing`
- [x] Run relevant automated checks for impacted code
- [ ] Review product coherence after the first feedback fixes

## Phase 8 - Visual child exposure from parent previews
- [ ] Define the exact product contract for hover-driven child exposure from a parent preview
  - [ ] Distinguish "edit already-exposed child bindings" from "expose this child in the parent JSON"
  - [x] Decide whether JSON authoring should happen only after an explicit "Expose and edit" action
    - Decision recorded: parent JSON authoring is allowed automatically when the user edits an unexposed child from the preview flow
- [ ] Define the preview DOM metadata contract needed to identify a child inside a parent render
  - [ ] Standardize the minimum `data-*` metadata required to map a hovered DOM node back to a composable node candidate
  - [ ] Decide where that metadata should live for pilot cases (`header-nav` -> `button`, `card` -> `button`)
- [ ] Implement a pilot hover affordance in the Design Surface preview iframe
  - [ ] Detect hovered child targets from the preview render
  - [ ] Show a contextual action near the hovered child
  - [ ] Route the action either to the existing drawer or to the new "Expose and edit" flow
- [ ] Define and implement the MVP JSON authoring flow for undeclared single-child parts
  - [ ] Restrict the first slice to simple `parts` cases, excluding collections and repeated structures
  - [ ] Decide the generated node shape (`label`, `component`, `mode`, `autoBind`) for new parent `parts`
  - [x] Decide the naming strategy for generated part ids and the corresponding parent binding keys
    - Decision recorded: generated ids should default to the child component name, with a numeric suffix when several matching children exist (`button`, `button2`, `button3`, etc.)
- [ ] Rebuild parent metadata after JSON authoring so the new drawer becomes immediately usable
  - [ ] Validate the updated parent JSON
  - [ ] Regenerate `showcase.json`
  - [ ] Refresh Design Surface registry state and reopen the newly exposed child editor
- [ ] Validate the pilot loop on simple composable entries
  - [ ] Confirm the loop works on `header-nav` -> `button`
  - [ ] Confirm the loop works on `card` -> `button`
  - [ ] Capture unsupported cases explicitly before extending to `instances`, `families`, `layoutGroups`, or `collections`
