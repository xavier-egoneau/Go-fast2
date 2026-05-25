import { describe, expect, it } from 'vitest'
import { buildBrainPrompt } from '../../design/src/core/agent-prompt.js'
import { auditBrainOutput } from '../../design/src/core/brain-audit.js'

const baseContext = {
  scene: {
    id: 'scene-agentic',
    name: 'Agentic scenarios',
    items: [
      {
        id: 'item-header-nav',
        kind: 'component',
        ref: 'header-nav',
        params: {},
        partsState: { cta: {} },
        collectionsState: {},
        familiesState: {},
        instancesState: {},
        layoutGroupsState: {},
        entry: { id: 'header-nav', name: 'Header Nav', category: 'Navigation', level: 'organism' }
      }
    ],
    notes: [],
    summary: { itemCount: 1, noteCount: 0 }
  },
  selection: {
    type: 'item',
    item: {
      id: 'item-header-nav',
      kind: 'component',
      ref: 'header-nav',
      params: {},
      partsState: { cta: {} },
      collectionsState: {},
      familiesState: {},
      instancesState: {},
      layoutGroupsState: {},
      entry: { id: 'header-nav', name: 'Header Nav', category: 'Navigation', level: 'organism' }
    }
  },
  interaction: {
    focus: 'selected-item',
    selectedId: 'item-header-nav',
    selectedRef: 'header-nav',
    selectedKind: 'component',
    designerIntentHint: 'The selected item is "header-nav".'
  },
  system: {
    rules: {
      preferReuseOverInvention: true,
      requireExplicitEscalationForNewComponent: true,
      notesAreAnnotationsNotComponents: true
    },
    registry: [
      {
        id: 'header-nav',
        kind: 'component',
        name: 'Header Nav',
        category: 'Navigation',
        level: 'organism',
        parts: { cta: { label: 'CTA', component: 'button' } },
        instances: {},
        families: {},
        collections: {},
        layoutGroups: {}
      },
      {
        id: 'button',
        kind: 'component',
        name: 'Button',
        category: 'Forms',
        level: 'atom',
        variants: { variant: {} },
        content: { label: {} }
      }
    ],
    registrySummary: { totalEntries: 2, components: 2, pages: 0 },
    tokenSummary: { totalTokens: 0, categories: {} },
    actions: { supported: [{ type: 'update-part-params' }, { type: 'add-item' }, { type: 'add-note' }] }
  }
}

describe('agentic design scenarios', () => {
  it('prompts qualitative design work as a proposal with diagnosis, strategy, evidence and risk', () => {
    const prompt = buildBrainPrompt({
      intent: 'Make this header feel more premium and closer to Claude Design',
      context: baseContext
    })

    expect(prompt).toContain('diagnosis')
    expect(prompt).toContain('strategy')
    expect(prompt).toContain('previewNotes')
    expect(prompt).toContain('reuseEvidence')
    expect(prompt).toContain('risks')
    expect(prompt).toContain('confidence')
    expect(prompt).toContain('hierarchy, density, spacing, CTA emphasis, tone, state, layout and reuse')
    expect(prompt).toContain('relevantRegistry')
    expect(prompt).toContain('rankedItems')
  })

  it('keeps impossible component requests explicit instead of silently turning them into notes', () => {
    const result = auditBrainOutput({
      summary: 'A cinematic premium hero requires a missing component.',
      diagnosis: {
        intent: 'Add a cinematic premium hero',
        currentState: 'The registry only exposes the current header and button.',
        constraints: ['No premium hero component exists.']
      },
      strategy: {
        approach: 'Escalate to a system extension instead of inventing an include.',
        steps: ['Define a reusable hero component', 'Expose variants and content controls']
      },
      actions: [{ type: 'add-item', kind: 'component', ref: 'premium-hero' }],
      previewNotes: [],
      reuseEvidence: ['registry:header-nav', 'registry:button'],
      warnings: [],
      risks: [],
      requiresNewComponent: false,
      implementationPlan: ['Create premium-hero in the component registry before scene placement.'],
      confidence: 'medium',
      unresolved: []
    }, {
      intent: 'Add a cinematic premium hero',
      context: baseContext
    })

    expect(result.requiresNewComponent).toBe(true)
    expect(result.unresolved.some(item => item.type === 'missing-registry-ref')).toBe(true)
    expect(result.risks.some(item => item.includes('not available in the registry'))).toBe(true)
  })
})
