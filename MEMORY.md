# MEMORY

## Project
Go-fast2 is currently focused on the Design Surface: a designer-facing canvas connected to the real project component system and piloted by an agent workflow.

## Objectives
- Make the Design Surface usable for real designer workflows on top of the existing component registry.
- Keep the agent loop grounded in the real system, with preference for reuse of existing components and patterns.
- Improve the scene editing experience so the canvas is practical before expanding agent power further.

## Constraints
- The browser must not call an external CLI directly; real agent execution must go through a local bridge.
- The real codebase remains the source of truth for available components, tokens, and patterns.
- `app/` is framework/showcase infrastructure and should stay isolated from user-project changes.
- Existing project conventions still apply when code is modified: Twig variables must use `|default()`, SCSS should use design-system variables, and component structure remains explicit and traceable.

## Key context
- The project contains two layers, but the active product priority is the Design Surface rather than the generic starter-kit aspects.
- The current implementation is already advanced enough to expose real UX/product feedback, not just technical scaffolding work.
- Agent-assisted creation from scratch has been explored, but current tests showed meaningful limits.
- Atomic components being grouped by type is useful, but the related UI box needs to be resizable.
- Semantic diffs are currently not designer-oriented enough for the intended workflow.
- Viewport handling exists in both top-level UI and per-component controls, but this needs simplification and better alignment with SCSS breakpoints.

## Non-goals
- Do not treat semantic diff UX as the primary designer-facing change-management workflow if Git branches will be the practical path.
- Do not optimize the generic starter-kit experience ahead of the Design Surface roadmap unless it directly supports the Design Surface.
