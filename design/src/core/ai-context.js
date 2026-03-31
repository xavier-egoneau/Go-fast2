import { serializeRegistryForAI } from './registry.js'
import { serializeTokensForAI } from './tokens.js'

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
    text: note.text
  }
}

export function buildAIContext(state, getEntryById) {
  const scene = state.scene || { items: [], notes: [] }
  const selectedItem = scene.items.find(item => item.id === state.selectedItemId) || null
  const selectedNote = scene.notes?.find(note => note.id === state.selectedItemId) || null

  return {
    scene: {
      id: scene.id || null,
      name: scene.name || null,
      viewport: scene.viewport || null,
      items: (scene.items || []).map(item => serializeSceneItem(item, getEntryById)),
      notes: (scene.notes || []).map(serializeSceneNote)
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
    system: {
      registry: serializeRegistryForAI(),
      tokens: serializeTokensForAI(),
      rules: {
        effectiveTruth: 'versioned-codebase',
        preferReuseOverInvention: true,
        forbidNearDuplicateBlocks: true,
        legacyCompatibilityRequired: true,
        requireExplicitEscalationForNewComponent: true
      }
    }
  }
}
