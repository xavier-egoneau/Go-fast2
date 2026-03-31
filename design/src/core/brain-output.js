import { ACTION_TYPES, createEmptyActionSet } from './action-schema.js'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeWarnings(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item)).filter(Boolean)
}

function normalizeUnresolved(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') {
      return { type: 'generic', message: item }
    }
    if (isPlainObject(item)) {
      return {
        type: String(item.type || 'generic'),
        message: String(item.message || ''),
        detail: item.detail ?? null
      }
    }
    return { type: 'generic', message: String(item) }
  })
}

function normalizeAction(action) {
  if (!isPlainObject(action)) return null
  if (!ACTION_TYPES.includes(action.type)) return null
  return { ...action }
}

export function createEmptyBrainOutput() {
  return {
    ...createEmptyActionSet(),
    warnings: [],
    requiresNewComponent: false,
    unresolved: []
  }
}

export function normalizeBrainOutput(payload) {
  if (!isPlainObject(payload)) {
    return createEmptyBrainOutput()
  }

  const actions = Array.isArray(payload.actions)
    ? payload.actions.map(normalizeAction).filter(Boolean)
    : []

  return {
    summary: String(payload.summary || ''),
    actions,
    warnings: normalizeWarnings(payload.warnings),
    requiresNewComponent: Boolean(payload.requiresNewComponent),
    unresolved: normalizeUnresolved(payload.unresolved)
  }
}
