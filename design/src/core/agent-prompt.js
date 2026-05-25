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
    '{ "summary": "string", "diagnosis": { "intent": "string", "currentState": "string", "constraints": [] }, "strategy": { "approach": "string", "steps": [] }, "actions": [], "previewNotes": [], "reuseEvidence": [], "warnings": [], "risks": [], "requiresNewComponent": false, "implementationPlan": [], "confidence": "high|medium|low", "unresolved": [] }',
    '',
    '=== ROLE ===',
    '',
    'You are the Design Surface brain. Behave like a design agent, not a mechanical JSON patch generator.',
    'First understand the designer intent, inspect the scene state, choose the safest reusable system path, then produce a concrete JSON action set.',
    'The output must be useful for a designer reviewing a proposal: include what you understood, why the proposed direction is appropriate, what will visibly change, and what cannot be done with the current system.',
    '',
    '=== NON-NEGOTIABLE SYSTEM RULES ===',
    '',
    'Reuse existing components/includes/pages before inventing anything.',
    'Only use action types explicitly listed in context.system.actions.supported.',
    'Never edit Twig, SCSS or repo files — output JSON actions only.',
    'Never invent new includes, component ids, page ids, part ids, instance ids, family ids, layout group ids or token names.',
    'Canvas notes are annotations only, not production components.',
    'Do not use a canvas note as a substitute for a production design change unless the designer explicitly asks for a note or annotation.',
    'If the request needs a component or capability missing from the registry/action set, set requiresNewComponent=true, explain it in unresolved, and provide an implementationPlan instead of faking scene actions.',
    'If confidence is low or the target is ambiguous, prefer fewer safe actions plus unresolved items over guessing.',
    '',
    '=== DESIGN AGENT QUALITY BAR ===',
    '',
    'For qualitative intents like "premium", "editorial", "clearer", "more Claude Design", translate the intent into visible design levers before acting: hierarchy, density, spacing, CTA emphasis, tone, state, layout and reuse.',
    'Prefer meaningful, inspectable changes over cosmetic churn.',
    'When creating a variant, preserve the original and make the delta obvious enough to compare.',
    'When modifying an existing item, keep the result compatible with its exposed variants/content/child controls only.',
    'Populate previewNotes with short designer-facing notes about expected visual impact.',
    'Populate reuseEvidence with the exact existing refs, ids or controls used to prove the proposal is grounded in the registry.',
    'Populate risks when the change might be visually weak, ambiguous, constrained by available controls or needs human review.',
    '',
    '=== SCENE STATE MODEL ===',
    '',
    'Structured scene state is the primary interaction model; do not infer hidden DOM or source files.',
    'Root props live in item.params → use "update-params" (only for fields in entry.variants or entry.content).',
    'Parts live in item.partsState → use "update-part-params" with partId.',
    'Collections live in item.collectionsState → use "update-collection-params" with collectionId.',
    'Families live in item.familiesState → use "update-family-params" with familyId.',
    'Instances live in item.instancesState → use "update-instance-params" with instanceId.',
    'Layout groups live in item.layoutGroupsState → use "update-layout-group-params" with layoutGroupId.',
    'Never use update-params for referenced child controls; use the correct child action type.',
    '',
    '=== INTERACTION ROUTING ===',
    '',
    'When interaction.focus is "selected-item", treat vague requests like "make it", "this", "selected" or "same page" as applying to context.selection.item.id.',
    'When interaction.focus is "selected-note", treat the note as annotation context only, not as a production component.',
    'When interaction.focus is "canvas", treat the request as scene-level and select existing registry/page refs only when the intent clearly names or implies them.',
    'Named instance (e.g. "input prénom", "firstName"): use "update-instance-params" with instanceId = instance key from entry.instances.',
    'All instances of a family: use "update-family-params" with familyId.',
    'A specific part: use "update-part-params" with partId.',
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
    '=== INTERACTION CONTEXT ===',
    '',
    `interaction.focus = "${context?.interaction?.focus || 'canvas'}"`,
    context?.interaction?.designerIntentHint ? `Interaction guidance: ${context.interaction.designerIntentHint}` : 'Interaction guidance: none',
    '',
    '=== DESIGNER INTENT ===',
    '',
    intent || '(empty)',
    '',
    '=== CONTEXT JSON ===',
    '',
    JSON.stringify(buildFocusedContext(context, intent), null, 2)
  ].filter(line => line !== null && line !== undefined).join('\n')
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
}

function tokenizeIntent(intent) {
  return normalizeText(intent)
    .split(/[^a-z0-9]+/g)
    .filter(token => token.length > 2)
}

function rankRegistryEntries(registry = [], intent = '', selection = null) {
  const tokens = tokenizeIntent(intent)
  const selectedRef = selection?.item?.ref || null

  return registry
    .map(entry => {
      const haystack = normalizeText([
        entry.id,
        entry.name,
        entry.kind,
        entry.category,
        entry.level,
        ...(entry.tags || [])
      ].filter(Boolean).join(' '))
      const tokenScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0)
      const selectionScore = selectedRef && entry.id === selectedRef ? 8 : 0
      const structureScore = Object.keys(entry.parts || {}).length + Object.keys(entry.instances || {}).length + Object.keys(entry.families || {}).length
      return { entry, score: tokenScore + selectionScore + Math.min(structureScore, 4) }
    })
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(candidate => summarizeRegistryEntry(candidate.entry))
}

function summarizeRegistryEntry(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    category: entry.category || null,
    level: entry.level || null,
    variants: entry.variants ? Object.keys(entry.variants) : [],
    content: entry.content ? Object.keys(entry.content) : [],
    parts: Object.entries(entry.parts || {}).map(([id, part]) => ({ id, label: part.label || id, component: part.component || null, mode: part.mode || null })),
    collections: Object.entries(entry.collections || {}).map(([id, collection]) => ({ id, label: collection.label || id, itemComponent: collection.itemComponent || null, mode: collection.mode || null })),
    families: Object.entries(entry.families || {}).map(([id, family]) => ({ id, label: family.label || id, component: family.component || null, mode: family.mode || null })),
    instances: Object.entries(entry.instances || {}).map(([id, instance]) => ({ id, label: instance.label || id, component: instance.component || null, family: instance.family || null, mode: instance.mode || null })),
    layoutGroups: Object.entries(entry.layoutGroups || {}).map(([id, group]) => ({ id, label: group.label || id, component: group.component || null, mode: group.mode || null, children: Array.isArray(group.children) ? [...group.children] : [] }))
  }
}

function summarizeSceneItems(items = [], intent = '') {
  const tokens = tokenizeIntent(intent)
  return items.map(item => {
    const haystack = normalizeText([item.id, item.ref, item.kind, item.entry?.name, item.entry?.category, item.entry?.level].filter(Boolean).join(' '))
    return {
      id: item.id,
      kind: item.kind,
      ref: item.ref,
      viewport: item.viewport || null,
      matchScore: tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0),
      editable: {
        rootParams: Object.keys(item.params || {}),
        parts: Object.keys(item.partsState || {}),
        collections: Object.keys(item.collectionsState || {}),
        families: Object.keys(item.familiesState || {}),
        instances: Object.keys(item.instancesState || {}),
        layoutGroups: Object.keys(item.layoutGroupsState || {})
      }
    }
  })
}

function buildFocusedContext(context, intent = '') {
  if (!context) return {}

  const registry = Array.isArray(context.system?.registry) ? context.system.registry : []
  const trimmedRegistry = registry.map(entry => ({
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    category: entry.category || null,
    level: entry.level || null
  }))

  return {
    scene: {
      ...context.scene,
      rankedItems: summarizeSceneItems(context.scene?.items || [], intent)
    },
    selection: context.selection,
    interaction: {
      focus: context.interaction?.focus,
      selectedId: context.interaction?.selectedId || null,
      selectedRef: context.interaction?.selectedRef || null,
      selectedKind: context.interaction?.selectedKind || null,
      designerIntentHint: context.interaction?.designerIntentHint || null
    },
    system: {
      rules: context.system?.rules,
      registrySummary: context.system?.registrySummary,
      tokenSummary: context.system?.tokenSummary,
      registryIndex: trimmedRegistry,
      relevantRegistry: rankRegistryEntries(registry, intent, context.selection),
      actions: context.system?.actions
    }
  }
}
