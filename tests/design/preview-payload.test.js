import { describe, expect, it } from 'vitest'
import { applyPreviewPayloadToTwigData, buildPreviewPayload, decodePreviewPayload, encodePreviewPayload, PREVIEW_PAYLOAD_VERSION, resolvePreviewComposableData } from '../../design/src/core/preview-payload.js'

const registry = {
  'component:button': {
    id: 'button',
    kind: 'component',
    variants: {
      variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary', 'secondary'] }
    },
    content: {
      text: { label: 'Texte', type: 'text', default: 'Click' }
    }
  },
  'component:header-nav': {
    id: 'header-nav',
    kind: 'component',
    variants: {
      ctaVariant: { label: 'Variante CTA', type: 'select', default: 'auto', options: ['auto', 'primary', 'secondary'] }
    },
    content: {
      ctaText: { label: 'Texte CTA', type: 'text', default: 'Commencer' }
    },
    parts: {
      cta: {
        label: 'CTA',
        component: 'button',
        mode: 'single',
        autoBind: true
      }
    },
    collections: {}
  },
  'component:grid': {
    id: 'grid',
    kind: 'component',
    variants: {
      cols: { label: 'Colonnes', type: 'select', default: '1', options: ['1', '2'] }
    },
    content: {}
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
    },
    layoutGroups: {
      actionsRow: {
        label: 'Actions row',
        component: 'grid',
        mode: 'layout',
        autoBind: true,
        children: ['submitButton']
      }
    }
  }
}

function getEntryById(id, kind) {
  return registry[`${kind}:${id}`] || null
}

describe('preview payload', () => {
  it('serialise un item avec son structured state et ses params rendables', () => {
    const entry = registry['component:header-nav']
    const item = {
      id: 'item-1',
      kind: 'component',
      ref: 'header-nav',
      viewport: 'desktop',
      params: {
        ctaVariant: 'secondary',
        ctaText: 'Acheter'
      },
      partsState: {
        cta: {
          variants: { variant: 'secondary' },
          content: { text: 'Acheter' }
        }
      },
      collectionsState: {}
    }

    const payload = buildPreviewPayload(item, entry, getEntryById)
    expect(payload.version).toBe(PREVIEW_PAYLOAD_VERSION)
    expect(payload.params).toMatchObject({
      ctaVariant: 'secondary',
      ctaText: 'Acheter'
    })
    expect(payload.partsState.cta.content.text).toBe('Acheter')
  })

  it('encode et decode le payload sans perte', () => {
    const payload = {
      version: 1,
      params: { ctaVariant: 'secondary' },
      partsState: { cta: { variants: { variant: 'secondary' }, content: {} } },
      collectionsState: {}
    }

    expect(decodePreviewPayload(encodePreviewPayload(payload))).toEqual(payload)
  })

  it('injecte params et structured state dans les donnees Twig', () => {
    const payload = {
      ref: 'header-nav',
      kind: 'component',
      params: { ctaVariant: 'secondary' },
      partsState: { cta: { variants: { variant: 'secondary' }, content: {} } },
      collectionsState: {}
    }
    const resolvedComposableData = resolvePreviewComposableData(payload, registry['component:header-nav'], getEntryById)
    const data = applyPreviewPayloadToTwigData({ existing: true }, {
      ...payload
    }, resolvedComposableData)

    expect(data).toMatchObject({
      existing: true,
      ctaVariant: 'secondary'
    })
    expect(data.__previewPartsState.cta.variants.variant).toBe('secondary')
    expect(data.__previewParts.cta.params.variant).toBe('secondary')
  })

  it('resout les params enfant depuis le structured state et les defaults du composant', () => {
    const payload = resolvePreviewComposableData({
      ref: 'header-nav',
      kind: 'component',
      params: {},
      partsState: {
        cta: {
          variants: { variant: 'secondary' },
          content: { text: 'Acheter' }
        }
      },
      collectionsState: {}
    }, registry['component:header-nav'], getEntryById)

    expect(payload.parts.cta.params).toMatchObject({
      variant: 'secondary',
      text: 'Acheter'
    })
  })

  it('serialise et expose aussi families, instances et layoutGroups', () => {
    const payload = buildPreviewPayload({
      id: 'item-form',
      kind: 'component',
      ref: 'form-page',
      params: {},
      partsState: {},
      collectionsState: {},
      familiesState: {
        actions: {
          variants: { variant: 'secondary' },
          content: {}
        }
      },
      instancesState: {
        submitButton: {
          variants: { variant: 'secondary' },
          content: { text: 'Envoyer' }
        }
      },
      layoutGroupsState: {
        actionsRow: {
          variants: { cols: '2' },
          content: {}
        }
      }
    }, registry['component:form-page'], getEntryById)

    const resolved = resolvePreviewComposableData(payload, registry['component:form-page'], getEntryById)
    const twigData = applyPreviewPayloadToTwigData({}, payload, resolved)

    expect(resolved.families.actions.params.variant).toBe('secondary')
    expect(resolved.instances.submitButton.params.text).toBe('Envoyer')
    expect(resolved.layoutGroups.actionsRow.params.cols).toBe('2')
    expect(twigData.__previewFamilies.actions.params.variant).toBe('secondary')
    expect(twigData.__previewInstances.submitButton.params.text).toBe('Envoyer')
    expect(twigData.__previewLayoutGroups.actionsRow.params.cols).toBe('2')
  })

  it('compacte le structured state quand il ne contient que des defaults reconstructibles', () => {
    const payload = buildPreviewPayload({
      id: 'item-form',
      kind: 'component',
      ref: 'form-page',
      params: {},
      partsState: {},
      collectionsState: {},
      familiesState: {},
      instancesState: {},
      layoutGroupsState: {}
    }, registry['component:form-page'], getEntryById)

    expect(payload.familiesState).toEqual({})
    expect(payload.instancesState).toEqual({})
    expect(payload.layoutGroupsState).toEqual({})
  })
})
