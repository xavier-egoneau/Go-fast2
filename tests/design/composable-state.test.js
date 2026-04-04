import { describe, expect, it } from 'vitest'
import { applyComposablePatchToItem, applyFlatParamsPatchToItem, getRenderableItemParams, normalizeSceneItemState } from '../../design/src/core/composable-state.js'

const registry = {
  'component:button': {
    id: 'button',
    kind: 'component',
    variants: {
      variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary', 'secondary'] },
      size: { label: 'Taille', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] }
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
            size: 'sm'
          },
          content: {
            text: 'Commencer'
          }
        }
      }
    },
    collections: {}
  },
  'component:grid': {
    id: 'grid',
    kind: 'component',
    variants: {
      cols: { label: 'Colonnes', type: 'select', default: '1', options: ['1', '2', '3'] }
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
      inputs: {
        label: 'Inputs',
        component: 'button',
        mode: 'shared',
        autoBind: true,
        exclude: {
          content: ['text']
        }
      }
    },
    instances: {
      primaryAction: {
        label: 'Primary action',
        component: 'button',
        family: 'inputs',
        mode: 'single',
        autoBind: true,
        defaults: {
          content: {
            text: 'Envoyer'
          }
        }
      }
    },
    layoutGroups: {
      actionsRow: {
        label: 'Actions row',
        component: 'grid',
        mode: 'layout',
        autoBind: true,
        defaults: {
          variants: {
            cols: '2'
          }
        }
      }
    }
  }
}

function getEntryById(id, kind) {
  return registry[`${kind}:${id}`] || null
}

describe('composable structured state', () => {
  const entry = registry['component:header-nav']

  it('ignore les anciens champs plats imbriques et garde les defaults structures', () => {
    const item = normalizeSceneItemState({
      id: 'item-1',
      kind: 'component',
      ref: 'header-nav',
      params: {
        ctaVariant: 'secondary',
        ctaSize: 'lg',
        ctaText: 'Acheter'
      }
    }, entry, getEntryById)

    expect(item.partsState.cta).toEqual({
      variants: {
        variant: 'auto',
        size: 'sm'
      },
      content: {
        text: 'Commencer'
      }
    })
  })

  it('utilise les defaults locaux du parent quand aucun flat param legacy n existe', () => {
    const item = normalizeSceneItemState({
      id: 'item-1',
      kind: 'component',
      ref: 'header-nav',
      params: {}
    }, entry, getEntryById)

    expect(item.partsState.cta).toEqual({
      variants: {
        variant: 'auto',
        size: 'sm'
      },
      content: {
        text: 'Commencer'
      }
    })
  })

  it('synchronise un patch flat vers le structured state', () => {
    const item = applyFlatParamsPatchToItem({
      id: 'item-1',
      kind: 'component',
      ref: 'header-nav',
      params: {
        ctaVariant: 'auto',
        ctaSize: 'sm',
        ctaText: 'Commencer'
      }
    }, entry, { ctaVariant: 'secondary' }, getEntryById)

    expect(item.partsState.cta.variants.variant).toBe('secondary')
    expect(item.params.ctaVariant).toBeUndefined()
    expect(getRenderableItemParams(item, entry, getEntryById).ctaVariant).toBe('secondary')
  })

  it('synchronise un patch structured vers le miroir flat', () => {
    const item = applyComposablePatchToItem({
      id: 'item-1',
      kind: 'component',
      ref: 'header-nav',
      params: {
        ctaVariant: 'auto',
        ctaSize: 'sm',
        ctaText: 'Commencer'
      }
    }, entry, 'part', 'cta', { variant: 'secondary', text: 'Acheter' }, getEntryById)

    expect(item.partsState.cta.variants.variant).toBe('secondary')
    expect(item.partsState.cta.content.text).toBe('Acheter')
    expect(item.params.ctaVariant).toBeUndefined()
    expect(getRenderableItemParams(item, entry, getEntryById)).toMatchObject({
      ctaVariant: 'secondary',
      ctaText: 'Acheter'
    })
  })

  it('gere families, instances et layoutGroups dans le structured state', () => {
    const entry = registry['component:form-page']
    const item = normalizeSceneItemState({
      id: 'item-form',
      kind: 'component',
      ref: 'form-page',
      params: {}
    }, entry, getEntryById)

    expect(item.familiesState.inputs.variants.variant).toBe('primary')
    expect(item.instancesState.primaryAction.content.text).toBe('Envoyer')
    expect(item.layoutGroupsState.actionsRow.variants.cols).toBe('2')
  })

  it('applique un patch sur instance et layout group', () => {
    const entry = registry['component:form-page']
    const updatedInstance = applyComposablePatchToItem({
      id: 'item-form',
      kind: 'component',
      ref: 'form-page',
      params: {}
    }, entry, 'instance', 'primaryAction', { text: 'Valider', variant: 'secondary' }, getEntryById)

    expect(updatedInstance.instancesState.primaryAction.content.text).toBe('Valider')
    expect(updatedInstance.instancesState.primaryAction.variants.variant).toBe('secondary')

    const updatedLayout = applyComposablePatchToItem(updatedInstance, entry, 'layoutGroup', 'actionsRow', { cols: '3' }, getEntryById)
    expect(updatedLayout.layoutGroupsState.actionsRow.variants.cols).toBe('3')
    expect(getRenderableItemParams(updatedLayout, entry, getEntryById).actionsRowCols).toBe('3')
  })
})
