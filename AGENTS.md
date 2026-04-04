# AGENTS

## Execution rules
- Check whether exactly one local skill clearly applies before acting.
- If one local skill clearly applies, read its `SKILL.md` and follow it.
- If multiple local skills could apply, choose the most specific one and do not load unrelated skills.
- Prefer the lightest workflow that can still produce a reliable result.
- Do not let planning, research, or review work drift into implementation unless the user explicitly changes mode.
- Hand off clearly between investigation, planning, implementation, and review instead of blurring boundaries.

## Code conventions
- Preserve the existing project architecture: `dev/` is the product workspace, `app/` is framework/showcase infrastructure, and `design/` is the current product focus area.
- Follow the established component rules when touching Twig and SCSS: `|default()` on exposed Twig variables, explicit includes, design-token-driven SCSS, and readable conventions over cleverness.
- Avoid unrelated refactors while working on Design Surface tasks.
- Keep agent-facing behavior grounded in the real component system rather than inventing fake system abstractions.

## Validation rules
- Validate the directly impacted area, not just the edited file.
- Prefer verifying scene behavior, agent flow behavior, and UI interactions when changing the Design Surface.
- Be explicit about what was validated and what still needs human confirmation.
- Treat designer-facing UX issues as requiring practical validation, not just code-level confidence.

## Output expectations
- List modified files.
- List created files.
- List validations performed.
- List validations not performed.
- List remaining risks or open questions.

## Local skills
- Treat local workflow skills under `skills/` as project-specific operating guidance.
- Current local skills present in the repository:
- `skills/autopilot/SKILL.md`
- `skills/parallel/SKILL.md`
- `skills/research/SKILL.md`
- `skills/review/SKILL.md`
