export function buildBrainPrompt({ intent = '', context = null } = {}) {
  return [
    '=== DESIGN SURFACE BRAIN — JSON OUTPUT TASK ===',
    '',
    'OUTPUT REQUIREMENT (read this first):',
    'Your final response message must contain ONLY a single valid JSON object.',
    'No markdown, no code fences, no explanation — pure JSON only.',
    'Do NOT read any files. Do NOT run any shell commands. The complete context is in this message.',
    '',
    'JSON schema to return:',
    '{ "summary": "string", "actions": [], "warnings": [], "requiresNewComponent": false, "unresolved": [] }',
    '',
    '=== TASK ===',
    '',
    'You are the Design Surface brain. Given a designer intent and a scene context, produce a JSON action set.',
    'Only use action types from context.system.actions.supported.',
    'Never edit Twig, SCSS or repo files — output JSON actions only.',
    'Reuse existing components from the registry. Never invent new includes or identifiers.',
    '',
    '=== SCENE STATE MODEL ===',
    '',
    'Root props live in item.params → use "update-params" (only for fields in entry.variants or entry.content).',
    'Parts live in item.partsState → use "update-part-params" with partId.',
    'Collections live in item.collectionsState → use "update-collection-params" with collectionId.',
    'Families live in item.familiesState → use "update-family-params" with familyId.',
    'Instances live in item.instancesState → use "update-instance-params" with instanceId.',
    'Layout groups live in item.layoutGroupsState → use "update-layout-group-params" with layoutGroupId.',
    'NEVER use "update-params" for child controls — use the correct child action type.',
    '',
    '=== CREATING A PAGE VARIANT ===',
    '',
    'When the intent says "la même page mais avec X" or "create a variant with X":',
    '  Step 1 — duplicate-item: { "type": "duplicate-item", "targetId": "<selected-item-id>", "newId": "item-variant-1", "offset": { "x": 500, "y": 0 } }',
    '  Step 2 — modify the duplicate: use update-instance-params / update-family-params / update-part-params with "targetId": "item-variant-1"',
    '',
    'Example — "la même page mais avec l\'input prénom en disabled":',
    '  Step 1: { "type": "duplicate-item", "targetId": "<id>", "newId": "item-variant-1", "offset": { "x": 500, "y": 0 } }',
    '  Step 2: { "type": "update-instance-params", "targetId": "item-variant-1", "instanceId": "firstName", "patch": { "disabled": true } }',
    '',
    '=== ROUTING CHANGES ===',
    '',
    'Named instance (e.g. "input prénom", "firstName"): "update-instance-params" with instanceId = instance key from entry.instances.',
    'All instances of a family: "update-family-params" with familyId.',
    'A specific part: "update-part-params" with partId.',
    '',
    '=== INTERACTION CONTEXT ===',
    '',
    `interaction.focus = "${context?.interaction?.focus || 'canvas'}"`,
    context?.interaction?.designerIntentHint ? `Hint: ${context.interaction.designerIntentHint}` : '',
    '',
    '=== DESIGNER INTENT ===',
    '',
    intent || '(empty)',
    '',
    '=== CONTEXT JSON ===',
    '',
    JSON.stringify(buildFocusedContext(context), null, 2)
  ].filter(line => line !== null && line !== undefined).join('\n')
}

function buildFocusedContext(context) {
  if (!context) return {}

  // When a specific item is selected, trim the registry to avoid overwhelming the model.
  // The selected item's full entry is already embedded in context.selection.item.entry.
  const trimmedRegistry = context.system?.registry
    ? context.system.registry.map(entry => ({
        id: entry.id,
        kind: entry.kind,
        name: entry.name,
        category: entry.category || null,
        level: entry.level || null
      }))
    : []

  return {
    scene: context.scene,
    selection: context.selection,
    interaction: {
      focus: context.interaction?.focus,
      selectedId: context.interaction?.selectedId || null,
      selectedRef: context.interaction?.selectedRef || null,
      selectedKind: context.interaction?.selectedKind || null
    },
    system: {
      registrySummary: context.system?.registrySummary,
      registryIndex: trimmedRegistry,
      actions: context.system?.actions
    }
  }
}
