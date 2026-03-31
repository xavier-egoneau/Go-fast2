import { serializeRegistryForAI } from './registry.js'
import { serializeTokensForAI } from './tokens.js'
import { ACTION_TYPES } from './action-schema.js'

const SUPPORTED_ACTIONS = [
  {
    type: 'update-params',
    purpose: 'Change existing params or content fields on an existing item.',
    requiresExistingItem: true
  },
  {
    type: 'update-item',
    purpose: 'Move, resize or change viewport on an existing item.',
    requiresExistingItem: true,
    allowedPatchKeys: ['x', 'y', 'width', 'height', 'viewport']
  },
  {
    type: 'duplicate-item',
    purpose: 'Duplicate an existing item with an optional offset.',
    requiresExistingItem: true
  },
  {
    type: 'add-item',
    purpose: 'Add an item from an existing component or page reference already present in the registry.',
    requiresExistingRef: true
  },
  {
    type: 'remove-item',
    purpose: 'Remove an existing item or note from the scene.',
    requiresExistingTarget: true
  },
  {
    type: 'add-note',
    purpose: 'Add a canvas annotation note. Notes are not production components.',
    annotationOnly: true
  }
]

const UNSUPPORTED_ACTIONS = [
  'create a brand new component',
  'invent a new include or template identifier',
  'edit Twig, SCSS or repo files directly from the scene action output',
  'nest arbitrary children inside existing components',
  'vector editing or freeform drawing',
  'unsupported action types outside the validated action schema'
]

function serializeSceneItem(item, getEntryById) {
  const entry = getEntryById(item.ref, item.kind)
  return {
    id: item.id,
    kind: item.kind,
    ref: item.ref,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    viewport: item.viewport || null,
    params: item.params || {},
    entry: entry
      ? {
          id: entry.id,
          name: entry.name,
          kind: entry.kind,
          category: entry.category || null,
          level: entry.level || null
        }
      : null
  }
}

function serializeSceneNote(note) {
  return {
    id: note.id,
    x: note.x,
    y: note.y,
    text: note.text,
    kind: 'annotation-note'
  }
}

function buildRegistrySummary(registry) {
  const summary = {
    totalEntries: registry.length,
    components: 0,
    pages: 0,
    categories: {},
    levels: {}
  }

  for (const entry of registry) {
    if (entry.kind === 'component') summary.components += 1
    if (entry.kind === 'page') summary.pages += 1
    if (entry.category) summary.categories[entry.category] = (summary.categories[entry.category] || 0) + 1
    if (entry.level) summary.levels[entry.level] = (summary.levels[entry.level] || 0) + 1
  }

  return summary
}

function buildTokenSummary(tokens) {
  const categories = {}
  for (const token of tokens) {
    categories[token.category] = (categories[token.category] || 0) + 1
  }

  return {
    totalTokens: tokens.length,
    categories
  }
}

function buildInteractionGuidance(selectedItem, selectedNote) {
  if (selectedItem) {
    return {
      focus: 'selected-item',
      designerIntentHint: 'When an item is selected, prefer modifying that selected item or deriving a variant from it before changing the whole scene.',
      selectedKind: selectedItem.kind || null,
      selectedRef: selectedItem.ref || null
    }
  }

  if (selectedNote) {
    return {
      focus: 'selected-note',
      designerIntentHint: 'When a note is selected, treat it as annotation context and not as a production component.',
      selectedKind: 'annotation-note',
      selectedRef: null
    }
  }

  return {
    focus: 'canvas',
    designerIntentHint: 'When nothing is selected, treat the request as scene-level. If the designer asks for a page, a new page, or a page variant, interpret it as a scene or page-level change rather than a component edit.',
    selectedKind: null,
    selectedRef: null
  }
}

export function buildAIContext(state, getEntryById) {
  const scene = state.scene || { items: [], notes: [] }
  const selectedItem = scene.items.find(item => item.id === state.selectedItemId) || null
  const selectedNote = scene.notes?.find(note => note.id === state.selectedItemId) || null
  const registry = serializeRegistryForAI()
  const tokens = serializeTokensForAI()

  return {
    scene: {
      id: scene.id || null,
      name: scene.name || null,
      viewport: scene.viewport || null,
      items: (scene.items || []).map(item => serializeSceneItem(item, getEntryById)),
      notes: (scene.notes || []).map(serializeSceneNote),
      summary: {
        itemCount: (scene.items || []).length,
        noteCount: (scene.notes || []).length
      }
    },
    selection: selectedItem
      ? {
          type: 'item',
          item: serializeSceneItem(selectedItem, getEntryById)
        }
      : selectedNote
        ? {
            type: 'note',
            note: serializeSceneNote(selectedNote)
          }
        : null,
    interaction: buildInteractionGuidance(selectedItem, selectedNote),
    system: {
      registry,
      registrySummary: buildRegistrySummary(registry),
      tokens,
      tokenSummary: buildTokenSummary(tokens),
      rules: {
        effectiveTruth: 'versioned-codebase',
        preferReuseOverInvention: true,
        forbidNearDuplicateBlocks: true,
        legacyCompatibilityRequired: true,
        requireExplicitEscalationForNewComponent: true,
        notesAreAnnotationsNotComponents: true
      },
      actions: {
        supportedTypes: ACTION_TYPES,
        supported: SUPPORTED_ACTIONS,
        unsupported: UNSUPPORTED_ACTIONS
      }
    }
  }
}
