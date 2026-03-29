import { ACTION_TYPES } from './action-schema.js'

export function validateActionSet(actionSet, state, getEntryById) {
  const errors = []
  if (!actionSet || typeof actionSet !== 'object') {
    return { valid: false, errors: ['Action set invalide'], normalized: null }
  }

  const normalized = {
    summary: String(actionSet.summary || ''),
    actions: Array.isArray(actionSet.actions) ? actionSet.actions : []
  }

  normalized.actions.forEach((action, index) => {
    if (!ACTION_TYPES.includes(action.type)) {
      errors.push(`Action ${index}: type inconnu ${action.type}`)
      return
    }

    if (['update-params', 'update-item', 'duplicate-item', 'remove-item'].includes(action.type)) {
      const targetId = action.targetId
      const exists = state.scene.items.some(item => item.id === targetId) || state.scene.notes?.some(note => note.id === targetId)
      if (!exists) errors.push(`Action ${index}: targetId introuvable (${targetId})`)
    }

    if (action.type === 'add-item') {
      const entry = getEntryById(action.ref, action.kind)
      if (!entry) errors.push(`Action ${index}: ref introuvable (${action.ref})`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    normalized
  }
}
