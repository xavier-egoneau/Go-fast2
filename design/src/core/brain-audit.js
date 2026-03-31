import { normalizeBrainOutput } from './brain-contract.js'

function hasNonEmptyIntent(intent) {
  return typeof intent === 'string' && intent.trim().length > 0
}

function buildRegistrySet(context) {
  const registry = Array.isArray(context?.system?.registry) ? context.system.registry : []
  return new Set(registry.map(entry => `${entry.kind}:${entry.id}`))
}

function pushWarning(collection, message) {
  if (!message || collection.includes(message)) return
  collection.push(message)
}

function pushUnresolved(collection, item) {
  if (!item?.type || !item?.message) return
  if (collection.some(existing => existing.type === item.type && existing.message === item.message)) return
  collection.push(item)
}

function intentSuggestsAnnotation(intent) {
  if (!hasNonEmptyIntent(intent)) return false
  return /\b(note|annotation|comment|commentaire|annoter|annotate)\b/i.test(intent)
}

function getSelectedItemId(context) {
  return context?.selection?.type === 'item' ? context.selection.item?.id || null : null
}

function tokenizeIntent(intent) {
  if (!hasNonEmptyIntent(intent)) return []
  return intent
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
}

function scoreSceneItemMatch(item, tokens) {
  if (!item || !tokens.length) return 0
  const haystack = [
    item.ref,
    item.kind,
    item.entry?.id,
    item.entry?.name,
    item.entry?.category,
    item.entry?.level
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')

  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0)
}

function inferSceneTargetId(intent, context) {
  const items = Array.isArray(context?.scene?.items) ? context.scene.items : []
  if (items.length === 0) return null
  if (items.length === 1) return items[0].id || null

  const tokens = tokenizeIntent(intent)
  if (!tokens.length) return null

  const ranked = items
    .map(item => ({ item, score: scoreSceneItemMatch(item, tokens) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0) return null
  if (ranked.length === 1) return ranked[0].item.id || null
  if (ranked[0].score > ranked[1].score) return ranked[0].item.id || null

  return null
}

export function auditBrainOutput(payload, { intent = '', context = null } = {}) {
  const output = normalizeBrainOutput(payload)
  const warnings = [...output.warnings]
  const unresolved = [...output.unresolved]
  const registrySet = buildRegistrySet(context)
  const selectedItemId = getSelectedItemId(context)
  const inferredItemId = selectedItemId || inferSceneTargetId(intent, context)
  let requiresNewComponent = output.requiresNewComponent

  const actions = output.actions.map(action => {
    if (!inferredItemId) return action
    if (!['update-params', 'update-item', 'duplicate-item', 'remove-item'].includes(action.type)) return action
    if (action.targetId) return action

    return {
      ...action,
      targetId: inferredItemId
    }
  })

  for (const action of actions) {
    if (action.type !== 'add-item') continue
    const key = `${action.kind}:${action.ref}`
    if (!registrySet.has(key)) {
      requiresNewComponent = true
      pushWarning(warnings, `Requested ref "${action.ref}" is not present in the current registry.`)
      pushUnresolved(unresolved, {
        type: 'missing-registry-ref',
        message: `The proposed item "${action.ref}" does not exist in the current production registry.`,
        detail: {
          ref: action.ref,
          kind: action.kind || null
        }
      })
    }
  }

  if (requiresNewComponent && unresolved.length === 0) {
    pushUnresolved(unresolved, {
      type: 'system-limit',
      message: 'The request exceeds the currently reusable production system.',
      detail: null
    })
  }

  if (hasNonEmptyIntent(intent) && output.actions.length === 0 && !requiresNewComponent) {
    pushWarning(warnings, 'No applicable scene action was produced. The request may exceed current scene-action capabilities.')
  }

  if (output.actions.some(action => action.type === 'add-note') && !intentSuggestsAnnotation(intent)) {
    pushWarning(warnings, 'This proposal adds a canvas note, which is an annotation and not a production component change.')
  }

  return {
    ...output,
    actions,
    warnings,
    unresolved,
    requiresNewComponent
  }
}
