import { ACTION_TYPES, createEmptyActionSet } from './action-schema.js'

export const BRAIN_OUTPUT_KEYS = [
  'summary',
  'diagnosis',
  'strategy',
  'actions',
  'previewNotes',
  'reuseEvidence',
  'warnings',
  'risks',
  'requiresNewComponent',
  'implementationPlan',
  'confidence',
  'unresolved'
]

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item)).filter(Boolean)
}

function normalizeWarnings(value) {
  return normalizeStringArray(value)
}

function normalizeObject(value, fallback = {}) {
  if (!isPlainObject(value)) return { ...fallback }
  return { ...fallback, ...value }
}

function normalizeConfidence(value) {
  const confidence = String(value || 'medium').toLowerCase()
  return ['high', 'medium', 'low'].includes(confidence) ? confidence : 'medium'
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
    diagnosis: {
      intent: '',
      currentState: '',
      constraints: []
    },
    strategy: {
      approach: '',
      steps: []
    },
    previewNotes: [],
    reuseEvidence: [],
    warnings: [],
    risks: [],
    requiresNewComponent: false,
    implementationPlan: [],
    confidence: 'medium',
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
    diagnosis: normalizeObject(payload.diagnosis, {
      intent: '',
      currentState: '',
      constraints: []
    }),
    strategy: normalizeObject(payload.strategy, {
      approach: '',
      steps: []
    }),
    actions,
    previewNotes: normalizeStringArray(payload.previewNotes),
    reuseEvidence: normalizeStringArray(payload.reuseEvidence),
    warnings: normalizeWarnings(payload.warnings),
    risks: normalizeStringArray(payload.risks),
    requiresNewComponent: Boolean(payload.requiresNewComponent),
    implementationPlan: normalizeStringArray(payload.implementationPlan),
    confidence: normalizeConfidence(payload.confidence),
    unresolved: normalizeUnresolved(payload.unresolved)
  }
}

export function createEmptyAgentRunPayload() {
  return {
    providerId: 'manual-json',
    intent: '',
    prompt: '',
    context: null,
    manualJson: ''
  }
}

export function normalizeAgentRunPayload(payload) {
  const base = createEmptyAgentRunPayload()
  if (!isPlainObject(payload)) return base

  return {
    providerId: String(payload.providerId || base.providerId),
    intent: String(payload.intent || ''),
    prompt: String(payload.prompt || ''),
    context: isPlainObject(payload.context) ? payload.context : null,
    manualJson: typeof payload.manualJson === 'string' ? payload.manualJson : ''
  }
}
