import { listAgentProviders } from './agent-runtime.js'

export function getAgentProviderStatus() {
  return listAgentProviders().map(provider => ({
    id: provider.id,
    label: provider.label,
    available: provider.available !== false,
    reason: provider.reason || null,
    mode: provider.mode || 'external'
  }))
}
