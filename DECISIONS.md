# DECISIONS

## D-001 - Prioritize the Design Surface as the main product direction
- Status: accepted
- Context:
  The repository includes both a starter-kit layer and a Design Surface layer. User clarification during onboarding established that the Design Surface piloted by an agent is the active priority.
- Decision:
  Product work should optimize for the Design Surface first, with the starter-kit aspects treated as supporting infrastructure unless directly relevant.
- Consequences:
  Backlog, validation, and implementation priorities should be driven by Design Surface usability and agent workflow quality.
- Alternatives considered:
  Continue treating the starter kit and Design Surface as equal priorities.

## D-002 - Keep real agent execution behind a local runtime bridge
- Status: accepted
- Context:
  Existing product documentation states that the browser must not call an external CLI directly and that real execution must pass through a dedicated local bridge.
- Decision:
  Preserve the runtime-bridge architecture for real agent execution.
- Consequences:
  New provider work and execution flows should integrate through the local bridge rather than bypassing it from the browser.
- Alternatives considered:
  Direct browser-to-CLI execution.

## D-003 - Do not make semantic diffs the primary designer-facing workflow
- Status: accepted
- Context:
  Current semantic diff output is not oriented enough for designers, and the intended practical workflow is closer to using Git branches for change management.
- Decision:
  Treat semantic diffs as secondary or internal tooling rather than the main designer-facing review surface.
- Consequences:
  Future UX effort should favor practical branch-based workflows and clearer designer-facing review mechanisms over investing heavily in semantic diff presentation.
- Alternatives considered:
  Continue pushing semantic diff UX as the main review model.

## D-004 - Keep viewport control at item level and align labels with SCSS breakpoints
- Status: accepted
- Context:
  The topbar viewport control was redundant, while the per-item viewport control was still useful. The viewport vocabulary also needed to align better with the SCSS breakpoint system already used in the project.
- Decision:
  Remove the topbar viewport selector, keep viewport changes in the selected item inspector, and expose viewport labels with matching SCSS breakpoint references.
- Consequences:
  The visible canvas viewport now follows the item-level viewport choice, and the UI is simpler while remaining coherent with the design-token system.
- Alternatives considered:
  Keep two separate viewport controls or keep the topbar selector as the primary control.

## D-005 - Add native Design Surface zoom and lane resizing to support canvas work
- Status: accepted
- Context:
  Browser zoom was acting as a substitute for missing in-product zoom, and grouped lanes needed direct resizing to stay usable as the canvas evolved.
- Decision:
  Add internal zoom controls and wheel-based zoom handling, and make canvas lanes resizable from the Design Surface itself.
- Consequences:
  Canvas exploration no longer depends on browser zoom, and grouped component lanes can be widened without leaving the interface.
- Alternatives considered:
  Leave zoom to the browser and keep lane widths fixed.

## D-006 - Evolve the canonical component JSON through referenced sub-components rather than embedded duplicate schemas
- Status: accepted
- Context:
  The next feature requires editing sub-components from the Design Surface inspector, including both variants and content such as button text. The project relies on JSON as the source of truth across the starter kit, design system, showcase generation, and Design Surface. Duplicating full child JSON definitions inside parent component JSON files would create multiple conflicting sources of truth.
- Decision:
  The JSON v2 direction will model editable sub-components by reference, with local bindings from parent variables to child component variants and content fields. Collections will be modeled separately with bulk-first editing behavior.
- Consequences:
  The implementation must evolve the canonical JSON contract, showcase generation, validation, inspector rendering, and agent context together. Existing JSON files must remain valid through backward compatibility.
- Alternatives considered:
  Embedding full child component JSON schemas directly inside parent component JSON files.

## D-007 - Ship JSON v2 as a backward-compatible first slice on top of flat parent params
- Status: accepted
- Context:
  The project needed a first usable delivery of JSON v2 without rewriting the render transport or introducing recursive inspector complexity immediately. Existing Twig rendering already accepts flat query params, and current pilot cases (`header-nav`, `listing`) can map child component controls onto flat parent variables.
- Decision:
  Implement JSON v2 in a first slice where `parts` and `collections` are transported through the showcase and registry, rendered in the inspector as drawers, and bound to existing flat parent params. Keep collection editing bulk-first, keep recursion shallow, and defer structured render payloads until product validation proves they are necessary.
- Consequences:
  The starter-kit and Design Surface now support referenced sub-components and bulk collection bindings without breaking legacy JSON files. Further depth, explicit nested agent actions, and documentation hardening remain follow-up work rather than blockers for this first delivery.
- Alternatives considered:
  Block the feature until a deeper recursive model and structured render payload were implemented end to end.

## D-008 - Expose structured preview data to Twig through reserved preview objects while keeping flat params as a temporary mirror
- Status: accepted
- Context:
  Phase 6 introduced `partsState` and `collectionsState` as the real scene model, but the preview layer still needed to support existing Twig templates and non-migrated entries. The product also needed a path toward more automatic child editing without duplicating child schemas inside parents.
- Decision:
  Keep sending flat render params during the transition, but inject resolved structured preview objects into Twig under reserved keys (`__previewParts`, `__previewCollections`, plus raw payload mirrors). Migrated pilot templates should read these reserved preview objects first and fall back to legacy flat parent variables.
- Consequences:
  Preview rendering can progressively move to the structured model without breaking existing components or scenes. Parent templates keep a stable migration path, and child component contracts remain sourced from their canonical JSON definitions.
- Alternatives considered:
  Keep preview fully flat until full deprecation work is finished, or switch all Twig templates to a breaking structured-only payload in one step.

## D-009 - Complete the migration uniformly instead of keeping a long-term hybrid flat mirror
- Status: accepted
- Context:
  Phase 6 introduced a temporary double-storage model: structured state (`partsState`, `collectionsState`) as the primary model, plus flat `params` as a compatibility mirror. The remaining question was whether to keep that hybrid model long term or finish the migration cleanly.
- Decision:
  Do not keep a permanent hybrid model. Continue using flat `params` only as a temporary transition aid, then migrate components and preview flows uniformly toward the structured composable model.
- Consequences:
  Future implementation work should reduce dependency on flat parent params rather than reinforcing it. Validation and migration work must focus on removing remaining flat-only paths once the migrated pilots are stable.
- Alternatives considered:
  Keep both models indefinitely and treat flat params as a permanent compatibility layer.

## D-010 - Stop carrying old scene/runtime compatibility and make structured composable state the normal path everywhere
- Status: accepted
- Context:
  The product direction is now explicit: the team does not want to keep investing in backward compatibility for older scene shapes or old flat-only runtime paths. The goal is to move forward with one clear model instead of maintaining transition logic longer than necessary.
- Decision:
  Stop extending legacy compatibility. Treat structured composable state as the normal runtime path everywhere: scene state, inspector, agent actions, preview transport, and migrated templates. Remove remaining legacy-oriented branches as they are encountered instead of preserving them by default.
- Consequences:
  Implementation can simplify around one mental model and one runtime contract. Some older local scenes or outdated test fixtures may no longer load or behave identically unless explicitly migrated.
- Alternatives considered:
  Keep a tolerant compatibility layer for older scenes and flat-only runtime flows.

## D-011 - Treat list-style bulk editing as an explicit schema choice, not an automatic inference
- Status: accepted
- Context:
  Repeated components do not all behave the same way. A real card listing should usually expose bulk editing, while repeated form controls often need individual text, help text, and layout differences. Inferring "bulk collection" automatically from repetition would collapse these two cases into the same behavior.
- Decision:
  A repeated structure must be marked explicitly as a list in the canonical JSON schema before the Design Surface treats it as a bulk-edited collection. Repetition alone is not enough. Form-like repetition should instead be modeled through finer-grained instances, layout groups, or other non-list structures.
- Consequences:
  The schema must evolve to distinguish explicit list collections from other repeated composition patterns. Inspector behavior can remain predictable: true lists get family-level bulk controls, while non-list repetition remains individually or structurally editable.
- Alternatives considered:
  Infer bulk-editable collections automatically whenever the same component appears multiple times.

## D-012 - Model non-list repeated composition through family controls, individual instances, and layout groups
- Status: accepted
- Context:
  Pages like `form` contain repeated components such as inputs, selects, switches, and checkboxes, but these repetitions are not true list content. They need shared family styling, per-instance text and help content, and explicit row/grid layout control. A pure bulk-collection model cannot represent that cleanly.
- Decision:
  Keep explicit `collections` for true lists only. For non-list repeated composition, evolve the schema toward three distinct concepts: family-level controls for shared styling, individual instances for content and field-specific behavior, and layout groups for row/grid placement.
- Consequences:
  The next schema/runtime work must not force form-like pages into `list` semantics. Inspector design and validation will need a new model that can expose repeated controls without collapsing them into one bulk drawer.
- Alternatives considered:
  Treat all repeated components as implicit collections, or require every repeated field to be modeled only as unrelated standalone parts.

## D-013 - Use `families`, `instances`, and `layoutGroups` as the canonical non-list repeated-composition schema
- Status: accepted
- Context:
  The project now needs a concrete JSON shape for pages like `form`, where repeated controls must expose both shared styling and individual content/layout. The model must stay coherent with canonical child component JSON, structured scene state, and the Design Surface inspector.
- Decision:
  Add three explicit schema nodes for non-list repeated composition:
  - `families` for shared controls applied to a repeated component family
  - `instances` for individually editable occurrences of a component
  - `layoutGroups` for row/grid placement and grouping
  The same nodes should be runtime-visible in the Design Surface; they are not just authoring-only metadata.
- Consequences:
  Future validation, showcase transport, preview resolution, and inspector rendering will need to understand these three nodes. Pages like `form` can then expose family drawers, instance drawers, and layout-group drawers without abusing `collections`.
- Alternatives considered:
  Reuse `parts` for every repeated instance, or introduce a hidden authoring-only schema that differs from the runtime-visible Design Surface model.
