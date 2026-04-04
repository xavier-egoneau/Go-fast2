import { describe, expect, it } from 'vitest'
import { validateActionSet } from '../../design/src/core/action-validate.js'
import { applyActionSetToScene } from '../../design/src/core/action-apply.js'

const registry = {
  'component:button': {
    id: 'button',
    kind: 'component',
    variants: {
      variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary', 'secondary'] },
      disabled: { label: 'Disabled', type: 'checkbox', default: false }
    },
    content: {
      text: { label: 'Texte', type: 'text', default: 'Click' }
    }
  },
  'component:header-nav': {
    id: 'header-nav',
    kind: 'component',
    variants: {},
    content: {},
    parts: {
      cta: {
        label: 'CTA',
        component: 'button',
        mode: 'single',
        autoBind: true,
        defaults: {
          variants: {
            variant: 'auto',
            disabled: false
          },
          content: {
            text: 'Commencer'
          }
        }
      }
    },
    collections: {}
  },
  'component:form-page': {
    id: 'form-page',
    kind: 'component',
    variants: {},
    content: {},
    parts: {},
    collections: {},
    families: {
      actions: {
        label: 'Actions',
        component: 'button',
        mode: 'shared',
        autoBind: true,
        exclude: {
          content: ['text']
        }
      }
    },
    instances: {
      submitButton: {
        label: 'Submit',
        component: 'button',
        family: 'actions',
        mode: 'single',
        autoBind: true
      }
    }
  }
}

function getEntryById(id, kind) {
  return registry[`${kind}:${id}`] || null
}

describe('composable actions', () => {
  const state = {
    scene: {
      viewport: 'desktop',
      items: [
        {
          id: 'item-header',
          kind: 'component',
          ref: 'header-nav',
          params: {}
        }
      ],
      notes: []
    }
  }

  it('valide update-part-params sur les champs exposes du sous-composant', () => {
    const result = validateActionSet({
      summary: 'Update CTA',
      actions: [
        {
          type: 'update-part-params',
          targetId: 'item-header',
          partId: 'cta',
          patch: {
            variant: 'secondary',
            disabled: true,
            text: 'Acheter'
          }
        }
      ]
    }, state, getEntryById)

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejette les champs enfant non exposes', () => {
    const result = validateActionSet({
      summary: 'Update CTA',
      actions: [
        {
          type: 'update-part-params',
          targetId: 'item-header',
          partId: 'cta',
          patch: {
            size: 'lg'
          }
        }
      ]
    }, state, getEntryById)

    expect(result.valid).toBe(false)
    expect(result.errors.some(error => error.includes('champs non exposes'))).toBe(true)
  })

  it('applique update-part-params vers les params plats du parent', () => {
    const next = applyActionSetToScene(state.scene, {
      summary: 'Update CTA',
      actions: [
        {
          type: 'update-part-params',
          targetId: 'item-header',
          partId: 'cta',
          patch: {
            variant: 'secondary',
            disabled: true,
            text: 'Acheter'
          }
        }
      ]
    }, getEntryById)

    expect(next.items[0].partsState.cta).toMatchObject({
      variants: {
        variant: 'secondary',
        disabled: true
      },
      content: {
        text: 'Acheter'
      }
    })
    expect(next.items[0].params.ctaVariant).toBeUndefined()
  })

  it('valide et applique update-instance-params', () => {
    const localState = {
      scene: {
        viewport: 'desktop',
        items: [
          {
            id: 'item-form',
            kind: 'component',
            ref: 'form-page',
            params: {}
          }
        ],
        notes: []
      }
    }

    const result = validateActionSet({
      summary: 'Update submit button',
      actions: [
        {
          type: 'update-instance-params',
          targetId: 'item-form',
          instanceId: 'submitButton',
          patch: {
            variant: 'secondary',
            text: 'Envoyer'
          }
        }
      ]
    }, localState, getEntryById)

    expect(result.valid).toBe(true)

    const next = applyActionSetToScene(localState.scene, result.normalized, getEntryById)
    expect(next.items[0].instancesState.submitButton.variants.variant).toBe('secondary')
    expect(next.items[0].instancesState.submitButton.content.text).toBe('Envoyer')
  })
})
