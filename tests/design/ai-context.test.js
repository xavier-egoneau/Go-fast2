import { describe, expect, it } from 'vitest'
import { buildAIContext } from '../../design/src/core/ai-context.js'
import { buildBrainPrompt } from '../../design/src/core/agent-prompt.js'
import { getPreferredDesignerProviderId, setAgentProviders } from '../../design/src/core/agent-providers.js'

describe('buildAIContext', () => {
  it('expose un contexte système riche avec règles et actions supportées', () => {
    const state = {
      selectedItemId: 'item-1',
      scene: {
        id: 'scene-1',
        name: 'Homepage',
        viewport: 'desktop',
        items: [
          {
            id: 'item-1',
            kind: 'component',
            ref: 'button',
            x: 10,
            y: 20,
            width: 120,
            height: 40,
            viewport: 'desktop',
            params: { variant: 'primary', text: 'Click' },
            partsState: {
              icon: {
                variants: { variant: 'outline' },
                content: {}
              }
            },
            collectionsState: {}
          }
        ],
        notes: [
          {
            id: 'note-1',
            x: 40,
            y: 50,
            text: 'Project note'
          }
        ]
      }
    }

    const getEntryById = (id, kind) => id === 'button' && kind === 'component'
      ? {
          id: 'button',
          name: 'Button',
          kind: 'component',
          category: 'Forms',
          level: 'atom'
        }
      : null

    const context = buildAIContext(state, getEntryById)

    expect(context.scene.summary).toEqual({ itemCount: 1, noteCount: 1 })
    expect(context.selection?.type).toBe('item')
    expect(context.interaction.focus).toBe('selected-item')
    expect(context.selection?.item.partsState.icon.variants.variant).toBe('outline')
    expect(context.system.rules.notesAreAnnotationsNotComponents).toBe(true)
    expect(context.system.rules.structuredSceneStatePrimary).toBe(true)
    expect(context.system.rules).not.toHaveProperty('legacyCompatibilityRequired')
    expect(context.system.actions.supportedTypes).toContain('add-note')
    expect(context.system.actions.unsupported).toContain('create a brand new component')
  })

  it('guide le brain vers une demande de page au niveau scène quand rien n’est sélectionné', () => {
    const context = buildAIContext({
      selectedItemId: null,
      scene: {
        id: 'scene-1',
        name: 'Homepage',
        viewport: 'desktop',
        items: [],
        notes: []
      }
    }, () => null)

    expect(context.interaction.focus).toBe('canvas')
    expect(context.interaction.designerIntentHint).toContain('page')
  })
})

describe('buildBrainPrompt', () => {
  it('rappelle fortement les contraintes de réutilisation et les limites du système', () => {
    const prompt = buildBrainPrompt({
      intent: 'Make this section feel more premium',
      context: {
        system: {
          actions: {
            supported: [{ type: 'update-item' }]
          }
        }
      }
    })

    expect(prompt).toContain('Reuse existing components/includes/pages before inventing anything.')
    expect(prompt).toContain('Canvas notes are annotations only, not production components.')
    expect(prompt).toContain('Only use action types explicitly listed in context.system.actions.supported.')
    expect(prompt).toContain('Structured scene state is the primary interaction model')
    expect(prompt).toContain('Never use update-params for referenced child controls')
    expect(prompt).toContain('When interaction.focus is "selected-item"')
    expect(prompt).toContain('Interaction guidance:')
  })
})

describe('agent providers', () => {
  it('préfère un provider externe connecté pour l’expérience designer', () => {
    setAgentProviders([
      { id: 'manual-json', available: true, connected: true, authRequired: false, reason: '' },
      { id: 'codex-cli', available: true, connected: true, authRequired: false, reason: '' }
    ])

    expect(getPreferredDesignerProviderId()).toBe('codex-cli')
    setAgentProviders(null)
  })
})
