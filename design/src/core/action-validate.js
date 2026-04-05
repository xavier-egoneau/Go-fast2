import { ACTION_TYPES } from './action-schema.js'
import { normalizeBrainOutput } from './brain-output.js'
import { listComposableBindings } from './registry.js'

const ITEM_PATCH_KEYS = new Set(['x', 'y', 'width', 'height', 'viewport', 'label'])
const VIEWPORTS = new Set(['mobile', 'tablet', 'desktop'])

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasSceneTarget(state, targetId) {
  return state.scene.items.some(item => item.id === targetId) || state.scene.notes?.some(note => note.id === targetId)
}

function hasItemTarget(state, targetId) {
  return state.scene.items.some(item => item.id === targetId)
}

function getSceneItem(state, targetId) {
  return state.scene.items.find(item => item.id === targetId) || null
}

function validateRootParamsPatch(action, index, errors, state, getEntryById) {
  const item = getSceneItem(state, action.targetId)
  if (!item) {
    errors.push(`Action ${index}: targetId doit referencer un item (${action.targetId})`)
    return
  }

  const entry = getEntryById(item.ref, item.kind)
  if (!entry) {
    errors.push(`Action ${index}: targetId sans entree registry (${item.ref})`)
    return
  }

  if (!isPlainObject(action.patch)) {
    errors.push(`Action ${index}: patch params invalide`)
    return
  }

  const patchKeys = Object.keys(action.patch)
  if (patchKeys.length === 0) {
    errors.push(`Action ${index}: patch params vide`)
    return
  }

  const allowedKeys = new Set([
    ...Object.keys(entry.variants || {}),
    ...Object.keys(entry.content || {})
  ])
  const invalidKeys = patchKeys.filter(key => !allowedKeys.has(key))
  if (invalidKeys.length) {
    errors.push(`Action ${index}: update-params n'accepte que les props racine (${invalidKeys.join(', ')})`)
  }
}

function validateCoordinates(action, index, errors, keys = ['x', 'y']) {
  for (const key of keys) {
    if (action[key] !== undefined && !isFiniteNumber(action[key])) {
      errors.push(`Action ${index}: ${key} doit etre un nombre fini`)
    }
  }
}

function validateDimensions(action, index, errors, keys = ['width', 'height']) {
  for (const key of keys) {
    if (action[key] !== undefined && (!isFiniteNumber(action[key]) || action[key] <= 0)) {
      errors.push(`Action ${index}: ${key} doit etre un nombre > 0`)
    }
  }
}

function validateViewport(value, index, errors) {
  if (value !== undefined && !VIEWPORTS.has(value)) {
    errors.push(`Action ${index}: viewport invalide (${value})`)
  }
}

function getComposableNodeConfig(item, action, getEntryById) {
  const entry = getEntryById(item.ref, item.kind)
  if (!entry) return { error: `targetId sans entree registry (${item.ref})` }

  if (action.type === 'update-part-params') {
    const partId = action.partId
    const node = entry.parts?.[partId]
    if (!partId || !node) return { error: `partId introuvable (${partId})` }
    const childEntry = getEntryById(node.component, 'component')
    if (!childEntry) return { error: `part "${partId}" sans composant enfant valide (${node.component})` }
    return { entry, nodeId: partId, node, childEntry }
  }

  if (action.type === 'update-collection-params') {
    const collectionId = action.collectionId
    const node = entry.collections?.[collectionId]
    if (!collectionId || !node) return { error: `collectionId introuvable (${collectionId})` }
    const childEntry = getEntryById(node.itemComponent, 'component')
    if (!childEntry) return { error: `collection "${collectionId}" sans composant enfant valide (${node.itemComponent})` }
    return { entry, nodeId: collectionId, node, childEntry }
  }

  if (action.type === 'update-family-params') {
    const familyId = action.familyId
    const node = entry.families?.[familyId]
    if (!familyId || !node) return { error: `familyId introuvable (${familyId})` }
    const childEntry = getEntryById(node.component, 'component')
    if (!childEntry) return { error: `family "${familyId}" sans composant enfant valide (${node.component})` }
    return { entry, nodeId: familyId, node, childEntry }
  }

  if (action.type === 'update-instance-params') {
    const instanceId = action.instanceId
    const node = entry.instances?.[instanceId]
    if (!instanceId || !node) return { error: `instanceId introuvable (${instanceId})` }
    const childEntry = getEntryById(node.component, 'component')
    if (!childEntry) return { error: `instance "${instanceId}" sans composant enfant valide (${node.component})` }
    return { entry, nodeId: instanceId, node, childEntry }
  }

  if (action.type === 'update-layout-group-params') {
    const layoutGroupId = action.layoutGroupId
    const node = entry.layoutGroups?.[layoutGroupId]
    if (!layoutGroupId || !node) return { error: `layoutGroupId introuvable (${layoutGroupId})` }
    const childEntry = getEntryById(node.component, 'component')
    if (!childEntry) return { error: `layoutGroup "${layoutGroupId}" sans composant enfant valide (${node.component})` }
    return { entry, nodeId: layoutGroupId, node, childEntry }
  }

  return { error: 'type composable non supporte' }
}

function validateComposablePatch(action, index, errors, state, getEntryById, virtualItemIds = new Set()) {
  // Item virtuel (créé par duplicate-item dans ce même set) : validation détaillée impossible
  if (virtualItemIds.has(action.targetId)) return

  const item = getSceneItem(state, action.targetId)
  if (!item) {
    errors.push(`Action ${index}: targetId doit referencer un item (${action.targetId})`)
    return
  }

  const config = getComposableNodeConfig(item, action, getEntryById)
  if (config.error) {
    errors.push(`Action ${index}: ${config.error}`)
    return
  }

  if (!isPlainObject(action.patch)) {
    errors.push(`Action ${index}: patch composable invalide`)
    return
  }

  const patchKeys = Object.keys(action.patch)
  if (patchKeys.length === 0) {
    errors.push(`Action ${index}: patch composable vide`)
    return
  }

  const bindings = listComposableBindings(config.entry, config.nodeId, config.node, config.childEntry)
  const allowedKeys = new Set([...bindings.variants, ...bindings.content].map(binding => binding.childKey))
  const invalidKeys = patchKeys.filter(key => !allowedKeys.has(key))
  if (invalidKeys.length) {
    errors.push(`Action ${index}: champs non exposes pour ${action.type} (${invalidKeys.join(', ')})`)
  }
}

export function validateActionSet(actionSet, state, getEntryById) {
  const errors = []
  if (!actionSet || typeof actionSet !== 'object' || Array.isArray(actionSet)) {
    return { valid: false, errors: ['Action set invalide'], normalized: null }
  }

  const normalized = normalizeBrainOutput(actionSet)

  // IDs virtuels créés par duplicate-item dans ce même action set (via newId)
  const virtualItemIds = new Set(
    normalized.actions
      .filter(a => a.type === 'duplicate-item' && typeof a.newId === 'string' && a.newId)
      .map(a => a.newId)
  )

  const hasEffectiveSceneTarget = (id) => hasSceneTarget(state, id) || virtualItemIds.has(id)
  const hasEffectiveItemTarget = (id) => hasItemTarget(state, id) || virtualItemIds.has(id)

  normalized.actions.forEach((action, index) => {
    if (!isPlainObject(action)) {
      errors.push(`Action ${index}: format invalide`)
      return
    }

    if (!ACTION_TYPES.includes(action.type)) {
      errors.push(`Action ${index}: type inconnu ${action.type}`)
      return
    }

    if (['update-params', 'update-part-params', 'update-collection-params', 'update-family-params', 'update-instance-params', 'update-layout-group-params', 'update-item', 'duplicate-item', 'remove-item'].includes(action.type)) {
      const targetId = action.targetId
      if (!targetId || !hasEffectiveSceneTarget(targetId)) {
        errors.push(`Action ${index}: targetId introuvable (${targetId})`)
      }
    }

    if (['update-params', 'update-part-params', 'update-collection-params', 'update-family-params', 'update-instance-params', 'update-layout-group-params', 'update-item', 'duplicate-item'].includes(action.type) && action.targetId && !hasEffectiveItemTarget(action.targetId)) {
      errors.push(`Action ${index}: targetId doit referencer un item (${action.targetId})`)
    }

    if (action.type === 'update-params') {
      validateRootParamsPatch(action, index, errors, state, getEntryById)
    }

    if (['update-part-params', 'update-collection-params', 'update-family-params', 'update-instance-params', 'update-layout-group-params'].includes(action.type)) {
      validateComposablePatch(action, index, errors, state, getEntryById, virtualItemIds)
    }

    if (action.type === 'update-item') {
      if (!isPlainObject(action.patch)) {
        errors.push(`Action ${index}: patch item invalide`)
      } else {
        const keys = Object.keys(action.patch)
        if (keys.length === 0) {
          errors.push(`Action ${index}: patch item vide`)
        }
        const invalidKeys = keys.filter(key => !ITEM_PATCH_KEYS.has(key))
        if (invalidKeys.length) {
          errors.push(`Action ${index}: cles update-item non supportees (${invalidKeys.join(', ')})`)
        }
        validateCoordinates(action.patch, index, errors)
        validateDimensions(action.patch, index, errors)
        validateViewport(action.patch.viewport, index, errors)
      }
    }

    if (action.type === 'duplicate-item') {
      if (action.offset !== undefined && !isPlainObject(action.offset)) {
        errors.push(`Action ${index}: offset invalide`)
      }
      if (isPlainObject(action.offset)) {
        validateCoordinates(action.offset, index, errors)
      }
    }

    if (action.type === 'add-item') {
      const entry = getEntryById(action.ref, action.kind)
      if (!action.ref || !action.kind) errors.push(`Action ${index}: add-item incomplet`)
      if (action.kind && !['component', 'page'].includes(action.kind)) errors.push(`Action ${index}: kind invalide (${action.kind})`)
      if (!entry) errors.push(`Action ${index}: ref introuvable (${action.ref})`)
      if (action.params !== undefined && !isPlainObject(action.params)) errors.push(`Action ${index}: params invalide`)
      validateCoordinates(action, index, errors)
      validateDimensions(action, index, errors)
      validateViewport(action.viewport, index, errors)
    }

    if (action.type === 'remove-item' && action.targetId && !hasSceneTarget(state, action.targetId)) {
      errors.push(`Action ${index}: remove-item cible introuvable (${action.targetId})`)
    }

    if (action.type === 'add-note') {
      if (typeof action.text !== 'string' || !action.text.trim()) {
        errors.push(`Action ${index}: texte de note invalide`)
      }
      validateCoordinates(action, index, errors)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    normalized
  }
}
