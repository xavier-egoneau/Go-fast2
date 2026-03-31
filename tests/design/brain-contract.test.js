import { describe, expect, it } from 'vitest'
import { createEmptyBrainOutput, normalizeAgentRunPayload, normalizeBrainOutput } from '../../design/src/core/brain-contract.js'
import { getAgentProvider, getDefaultAgentProviderId, listAgentProviders, setAgentProviders } from '../../design/src/core/agent-providers.js'

describe('brain contract', () => {
  it('crée une sortie vide stable pour le MVP', () => {
    expect(createEmptyBrainOutput()).toEqual({
      summary: '',
      actions: [],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    })
  })

  it('normalise la payload de run agent avec des valeurs par défaut sûres', () => {
    expect(normalizeAgentRunPayload(null)).toEqual({
      providerId: 'manual-json',
      intent: '',
      prompt: '',
      context: null,
      manualJson: ''
    })
  })

  it('conserve une shape de requête stable et compacte', () => {
    expect(normalizeAgentRunPayload({
      providerId: 'codex-cli',
      intent: 'Make this hero feel more premium',
      prompt: 'Prompt',
      context: { scene: { id: 'home' } },
      manualJson: '{"summary":"ok"}',
      ignored: true
    })).toEqual({
      providerId: 'codex-cli',
      intent: 'Make this hero feel more premium',
      prompt: 'Prompt',
      context: { scene: { id: 'home' } },
      manualJson: '{"summary":"ok"}'
    })
  })

  it('filtre les actions non supportées et normalise les warnings', () => {
    expect(normalizeBrainOutput({
      summary: 'Test',
      actions: [
        { type: 'add-note', x: 10, y: 20, text: 'Hello' },
        { type: 'unknown-action' }
      ],
      warnings: ['warning', 42],
      requiresNewComponent: 1,
      unresolved: ['missing include']
    })).toEqual({
      summary: 'Test',
      actions: [{ type: 'add-note', x: 10, y: 20, text: 'Hello' }],
      warnings: ['warning', '42'],
      requiresNewComponent: true,
      unresolved: [{ type: 'generic', message: 'missing include' }]
    })
  })
})

describe('agent providers', () => {
  it('peut fusionner des états runtime sans perdre les providers par défaut', () => {
    setAgentProviders([
      {
        id: 'codex-cli',
        available: true,
        connected: true,
        authRequired: false,
        reason: ''
      }
    ])

    const codex = getAgentProvider('codex-cli')
    const manual = getAgentProvider('manual-json')

    expect(codex.available).toBe(true)
    expect(codex.connected).toBe(true)
    expect(manual.id).toBe('manual-json')

    setAgentProviders(null)
  })

  it('retourne un provider par défaut stable', () => {
    expect(getDefaultAgentProviderId()).toBe('manual-json')
    expect(getAgentProvider('missing-id').id).toBe('manual-json')
  })

  it('expose les états de lifecycle minimum pour chaque provider', () => {
    const providers = listAgentProviders()
    expect(providers.length).toBeGreaterThan(0)
    for (const provider of providers) {
      expect(provider).toHaveProperty('available')
      expect(provider).toHaveProperty('connected')
      expect(provider).toHaveProperty('authRequired')
      expect(provider).toHaveProperty('reason')
    }
  })
})
