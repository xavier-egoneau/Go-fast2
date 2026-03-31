const DEFAULT_PROVIDERS = [
  {
    id: 'manual-json',
    label: 'Manual JSON',
    description: 'Dev-only provider for manually pasting a normalized brain output JSON payload.',
    mode: 'manual',
    available: true,
    connected: true,
    authRequired: false,
    reason: ''
  },
  {
    id: 'codex-cli',
    label: 'Codex CLI',
    description: 'Local CLI bridge for Codex using non-interactive `codex exec`.',
    mode: 'external',
    available: false,
    connected: false,
    authRequired: false,
    reason: 'Bridge not implemented yet'
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    description: 'Planned local CLI bridge for Claude Code. Runtime contract only for now.',
    mode: 'external',
    available: false,
    connected: false,
    authRequired: false,
    reason: 'Bridge not implemented yet'
  }
]

let providers = DEFAULT_PROVIDERS.map(provider => ({ ...provider }))

export function listAgentProviders() {
  return providers.map(provider => ({ ...provider }))
}

export function getAgentProvider(providerId) {
  return providers.find(provider => provider.id === providerId) || providers[0]
}

export function getDefaultAgentProviderId() {
  return providers[0].id
}

export function getPreferredDesignerProviderId() {
  const connectedExternal = providers.find(provider => provider.mode === 'external' && provider.available && provider.connected)
  if (connectedExternal) return connectedExternal.id

  const availableExternal = providers.find(provider => provider.mode === 'external' && provider.available && provider.authRequired !== true)
  if (availableExternal) return availableExternal.id

  const availableProvider = providers.find(provider => provider.available)
  return (availableProvider || providers[0]).id
}

export function setAgentProviders(nextProviders) {
  if (!Array.isArray(nextProviders) || nextProviders.length === 0) {
    providers = DEFAULT_PROVIDERS.map(provider => ({ ...provider }))
    return
  }

  const merged = DEFAULT_PROVIDERS.map(provider => {
    const override = nextProviders.find(candidate => candidate?.id === provider.id)
    return override ? { ...provider, ...override } : { ...provider }
  })

  for (const provider of nextProviders) {
    if (!provider?.id || merged.some(candidate => candidate.id === provider.id)) continue
    merged.push({ ...provider })
  }

  providers = merged
}
