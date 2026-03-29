let agentState = {
  open: false,
  input: '',
  actionJson: '{\n  "summary": "",\n  "actions": []\n}',
  validationErrors: [],
  lastSummary: '',
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
