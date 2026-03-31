import { ACTION_TYPES } from './action-schema.js'
import { normalizeBrainOutput } from './brain-output.js'

const ITEM_PATCH_KEYS = new Set(['x', 'y', 'width', 'height', 'viewport'])
const VIEWPORTS = new Set(['mobile', 'tablet', 'desktop'])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasSceneTarget(state, targetId) {
  return state.scene.items.some(item => item.id === targetId) || state.scene.notes?.some(note => note.id === targetId)
}

function hasItemTarget(state, targetId) {
  return state.scene.items.some(item => item.id === targetId)
}

function validateCoordinates(action, index, errors, keys = ['x', 'y']) {
  for (const key of keys) {
    if (action[key] !== undefined && !isFiniteNumber(action[key])) {
      errors.push(`Action ${index}: ${key} doit être un nombre fini`)
    }
  }
}

function validateDimensions(action, index, errors, keys = ['width', 'height']) {
  for (const key of keys) {
    if (action[key] !== undefined && (!isFiniteNumber(action[key]) || action[key] <= 0)) {
      errors.push(`Action ${index}: ${key} doit être un nombre > 0`)
    }
  }
}

function validateViewport(value, index, errors) {
  if (value !== undefined && !VIEWPORTS.has(value)) {
    errors.push(`Action ${index}: viewport invalide (${value})`)
  }
}

export function validateActionSet(actionSet, state, getEntryById) {
  const errors = []
  if (!actionSet || typeof actionSet !== 'object' || Array.isArray(actionSet)) {
    return { valid: false, errors: ['Action set invalide'], normalized: null }
  }

  const normalized = normalizeBrainOutput(actionSet)

  normalized.actions.forEach((action, index) => {
    if (!isPlainObject(action)) {
      errors.push(`Action ${index}: format invalide`)
      return
    }

    if (!ACTION_TYPES.includes(action.type)) {
      errors.push(`Action ${index}: type inconnu ${action.type}`)
      return
    }

    if (['update-params', 'update-item', 'duplicate-item', 'remove-item'].includes(action.type)) {
      const targetId = action.targetId
      if (!targetId || !hasSceneTarget(state, targetId)) errors.push(`Action ${index}: targetId introuvable (${targetId})`)
    }

    if (['update-params', 'update-item', 'duplicate-item'].includes(action.type) && action.targetId && !hasItemTarget(state, action.targetId)) {
      errors.push(`Action ${index}: targetId doit référencer un item (${action.targetId})`)
    }

    if (action.type === 'update-params') {
      if (!isPlainObject(action.patch)) {
        errors.push(`Action ${index}: patch params invalide`)
      } else if (Object.keys(action.patch).length === 0) {
        errors.push(`Action ${index}: patch params vide`)
      }
    }

    if (action.type === 'update-item') {
      if (!isPlainObject(action.patch)) {
        errors.push(`Action ${index}: patch item invalide`)
      } else {
        const keys = Object.keys(action.patch)
        if (keys.length === 0) {
          errors.push(`Action ${index}: patch item vide`)
        }
        const invalidKeys = keys.filter(key => !ITEM_PATCH_KEYS.has(key))
        if (invalidKeys.length) {
          errors.push(`Action ${index}: clés update-item non supportées (${invalidKeys.join(', ')})`)
        }
        validateCoordinates(action.patch, index, errors)
        validateDimensions(action.patch, index, errors)
        validateViewport(action.patch.viewport, index, errors)
      }
    }

    if (action.type === 'duplicate-item') {
      if (action.offset !== undefined && !isPlainObject(action.offset)) {
        errors.push(`Action ${index}: offset invalide`)
      }
      if (isPlainObject(action.offset)) {
        validateCoordinates(action.offset, index, errors)
      }
    }

    if (action.type === 'add-item') {
      const entry = getEntryById(action.ref, action.kind)
      if (!action.ref || !action.kind) errors.push(`Action ${index}: add-item incomplet`)
      if (action.kind && !['component', 'page'].includes(action.kind)) errors.push(`Action ${index}: kind invalide (${action.kind})`)
      if (!entry) errors.push(`Action ${index}: ref introuvable (${action.ref})`)
      if (action.params !== undefined && !isPlainObject(action.params)) errors.push(`Action ${index}: params invalide`)
      validateCoordinates(action, index, errors)
      validateDimensions(action, index, errors)
      validateViewport(action.viewport, index, errors)
    }

    if (action.type === 'remove-item' && action.targetId && !hasSceneTarget(state, action.targetId)) {
      errors.push(`Action ${index}: remove-item cible introuvable (${action.targetId})`)
    }

    if (action.type === 'add-note') {
      if (typeof action.text !== 'string' || !action.text.trim()) {
        errors.push(`Action ${index}: texte de note invalide`)
      }
      validateCoordinates(action, index, errors)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    normalized
  }
}
