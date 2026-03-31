import { normalizeBrainOutput } from './brain-output.js'
import { runAgentRequest } from './agent-api.js'

const PROVIDERS = [
  {
    id: 'manual-json',
    label: 'Manual JSON',
    description: 'Dev-only provider for manually pasting a normalized brain output JSON payload.',
    mode: 'manual'
  },
  {
    id: 'codex-cli',
    label: 'Codex CLI',
    description: 'Planned local CLI bridge for Codex. Runtime contract only for now.',
    mode: 'external',
    available: false,
    reason: 'Bridge not implemented yet'
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    description: 'Planned local CLI bridge for Claude Code. Runtime contract only for now.',
    mode: 'external',
    available: false,
    reason: 'Bridge not implemented yet'
  }
]

export function listAgentProviders() {
  return PROVIDERS.map(provider => ({ ...provider }))
}

export function getAgentProvider(providerId) {
  return PROVIDERS.find(provider => provider.id === providerId) || PROVIDERS[0]
}

export function getDefaultAgentProviderId() {
  return PROVIDERS[0].id
}

export async function runAgentProvider(providerId, input) {
  const provider = getAgentProvider(providerId)

  const response = await runAgentRequest({
    providerId: provider.id,
    ...input
  })

  return {
    provider,
    output: normalizeBrainOutput(response?.output || {})
  }
}
