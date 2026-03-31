import { runAgentRequest } from './agent-api.js'
import { normalizeAgentRunPayload, normalizeBrainOutput } from './brain-contract.js'
import { fetchAgentProviders } from './agent-api.js'
import { getAgentProvider, getDefaultAgentProviderId, getPreferredDesignerProviderId, listAgentProviders, setAgentProviders } from './agent-providers.js'
import { auditBrainOutput } from './brain-audit.js'

export { listAgentProviders, getAgentProvider, getDefaultAgentProviderId, getPreferredDesignerProviderId }

export async function loadAgentProviders() {
  const providers = await fetchAgentProviders()
  setAgentProviders(providers)
  return listAgentProviders()
}

export async function runAgentProvider(providerId, input) {
  const provider = getAgentProvider(providerId)
  const request = normalizeAgentRunPayload({
    providerId: provider.id,
    ...input
  })

  const response = await runAgentRequest(request)

  return {
    provider: response?.provider ? { ...provider, ...response.provider } : provider,
    output: auditBrainOutput(normalizeBrainOutput(response?.output || {}), {
      intent: request.intent,
      context: request.context
    })
  }
}
