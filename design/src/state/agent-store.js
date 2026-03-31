const EMPTY_ACTION_JSON = '{\n  "summary": "",\n  "actions": [],\n  "warnings": [],\n  "requiresNewComponent": false,\n  "unresolved": []\n}'

let agentState = {
  open: false,
  providerId: 'manual-json',
  input: '',
  promptPreview: '',
  actionJson: EMPTY_ACTION_JSON,
  validationErrors: [],
  runtimeError: '',
  lastSummary: '',
  lastWarnings: [],
  requiresNewComponent: false,
  unresolved: [],
  previewScene: null
}

const listeners = new Set()

export function getAgentState() {
  return agentState
}

export function patchAgentState(patch) {
  agentState = { ...agentState, ...patch }
  listeners.forEach(listener => listener(agentState))
}

export function subscribeAgentState(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
