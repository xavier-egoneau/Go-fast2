import { describe, expect, it } from 'vitest'
import { auditBrainOutput } from '../../design/src/core/brain-audit.js'

describe('auditBrainOutput', () => {
  it('escalates when an add-item ref is not present in the registry', () => {
    const result = auditBrainOutput({
      summary: 'Add a premium hero',
      actions: [
        {
          type: 'add-item',
          kind: 'component',
          ref: 'premium-hero'
        }
      ],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    }, {
      intent: 'Add a premium hero section',
      context: {
        system: {
          registry: [
            { kind: 'component', id: 'button' }
          ]
        }
      }
    })

    expect(result.requiresNewComponent).toBe(true)
    expect(result.warnings.some(message => message.includes('premium-hero'))).toBe(true)
    expect(result.unresolved.some(item => item.type === 'missing-registry-ref')).toBe(true)
  })

  it('warns when the brain returns no actionable scene change for a non-empty intent', () => {
    const result = auditBrainOutput({
      summary: 'No-op',
      actions: [],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    }, {
      intent: 'Make this section more premium',
      context: {
        system: {
          registry: []
        }
      }
    })

    expect(result.warnings).toContain('No applicable scene action was produced. The request may exceed current scene-action capabilities.')
  })

  it('warns when a note is used as an annotation fallback for a non-note intent', () => {
    const result = auditBrainOutput({
      summary: 'Add note',
      actions: [
        {
          type: 'add-note',
          text: 'Try a premium version'
        }
      ],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    }, {
      intent: 'Make this header more premium',
      context: {
        system: {
          registry: []
        }
      }
    })

    expect(result.warnings.some(message => message.includes('canvas note'))).toBe(true)
  })

  it('injects the selected item targetId when a selected-item action omits it', () => {
    const result = auditBrainOutput({
      summary: 'Set header CTA to outline',
      actions: [
        {
          type: 'update-part-params',
          partId: 'cta',
          patch: {
            variant: 'outline'
          }
        }
      ],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    }, {
      intent: 'Change the header button to outline',
      context: {
        selection: {
          type: 'item',
          item: {
            id: 'item-header-nav'
          }
        },
        system: {
          registry: [
            { kind: 'component', id: 'header-nav' }
          ]
        }
      }
    })

    expect(result.actions[0].targetId).toBe('item-header-nav')
  })

  it('injects the selected item targetId for part-level actions too', () => {
    const result = auditBrainOutput({
      summary: 'Set CTA to secondary',
      actions: [
        {
          type: 'update-part-params',
          partId: 'cta',
          patch: {
            variant: 'secondary'
          }
        }
      ],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    }, {
      intent: 'Change the header CTA to secondary',
      context: {
        selection: {
          type: 'item',
          item: {
            id: 'item-header-nav'
          }
        },
        system: {
          registry: [
            { kind: 'component', id: 'header-nav' }
          ]
        }
      }
    })

    expect(result.actions[0].targetId).toBe('item-header-nav')
  })

  it('infers a likely scene target from intent when selection is missing', () => {
    const result = auditBrainOutput({
      summary: 'Set header CTA to outline',
      actions: [
        {
          type: 'update-part-params',
          partId: 'cta',
          patch: {
            variant: 'outline'
          }
        }
      ],
      warnings: [],
      requiresNewComponent: false,
      unresolved: []
    }, {
      intent: 'Change the header nav button to outline',
      context: {
        scene: {
          items: [
            {
              id: 'item-card',
              ref: 'card',
              kind: 'component',
              entry: { id: 'card', name: 'Card', category: 'Layout', level: 'molecule' }
            },
            {
              id: 'item-header-nav',
              ref: 'header-nav',
              kind: 'component',
              entry: { id: 'header-nav', name: 'Header Nav', category: 'Navigation', level: 'organism' }
            }
          ]
        },
        system: {
          registry: [
            { kind: 'component', id: 'header-nav' }
          ]
        }
      }
    })

    expect(result.actions[0].targetId).toBe('item-header-nav')
  })
})
