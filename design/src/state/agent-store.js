import { createEmptyBrainOutput } from '../core/brain-contract.js'

const EMPTY_ACTION_JSON = JSON.stringify(createEmptyBrainOutput(), null, 2)

let agentState = {
  open: false,
  navigatorOpen: true,
  providerId: 'manual-json',
  input: '',
  promptPreview: '',
  actionJson: EMPTY_ACTION_JSON,
  selectionHint: '',
  validationErrors: [],
  runtimeError: '',
  lastSummary: '',
  lastWarnings: [],
  requiresNewComponent: false,
  unresolved: [],
  previewScene: null,
  feedbackDismissed: false
}

const listeners = new Set()

export function getAgentState() {
  return agentState
}

export function patchAgentState(patch, options = {}) {
  agentState = { ...agentState, ...patch }
  if (options.silent) return
  listeners.forEach(listener => listener(agentState))
}

export function subscribeAgentState(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
