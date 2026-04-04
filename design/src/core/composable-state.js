import { getDefaultParams, listComposableBindings } from './registry.js'

const STRUCTURED_NODE_DEFINITIONS = [
  { nodeType: 'part', entryKey: 'parts', stateKey: 'partsState', childStateMode: 'bucket', childEntryKey: 'component' },
  { nodeType: 'collection', entryKey: 'collections', stateKey: 'collectionsState', childStateMode: 'shared-bucket', childEntryKey: 'itemComponent' },
  { nodeType: 'family', entryKey: 'families', stateKey: 'familiesState', childStateMode: 'bucket', childEntryKey: 'component' },
  { nodeType: 'instance', entryKey: 'instances', stateKey: 'instancesState', childStateMode: 'bucket', childEntryKey: 'component' },
  { nodeType: 'layoutGroup', entryKey: 'layoutGroups', stateKey: 'layoutGroupsState', childStateMode: 'bucket', childEntryKey: 'component' }
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getRootSceneParams(item, entry) {
  const next = {}
  const source = item?.params || {}

  for (const key of Object.keys(entry?.variants || {})) {
    if (key in source) next[key] = source[key]
  }

  for (const key of Object.keys(entry?.content || {})) {
    if (key in source) next[key] = source[key]
  }

  return next
}

function createComposableBucket() {
  return {
    variants: {},
    content: {}
  }
}

function normalizeBucketState(existingState, bindings, flatParams, defaults = {}) {
  const next = createComposableBucket()

  for (const binding of bindings.variants || []) {
    const existingValue = existingState?.variants?.[binding.childKey]
    next.variants[binding.childKey] = existingValue ?? flatParams[binding.parentKey] ?? defaults?.variants?.[binding.childKey] ?? binding.childControl?.default ?? null
  }

  for (const binding of bindings.content || []) {
    const existingValue = existingState?.content?.[binding.childKey]
    next.content[binding.childKey] = existingValue ?? flatParams[binding.parentKey] ?? defaults?.content?.[binding.childKey] ?? binding.childControl?.default ?? null
  }

  return next
}

function applyBucketToFlatParams(flatParams, bindings, bucket) {
  const next = { ...flatParams }

  for (const binding of bindings.variants || []) {
    if (bucket?.variants && binding.childKey in bucket.variants) {
      next[binding.parentKey] = bucket.variants[binding.childKey]
    }
  }

  for (const binding of bindings.content || []) {
    if (bucket?.content && binding.childKey in bucket.content) {
      next[binding.parentKey] = bucket.content[binding.childKey]
    }
  }

  return next
}

export function createStructuredStates(entry, getEntryById) {
  const next = {}

  for (const definition of STRUCTURED_NODE_DEFINITIONS) {
    const state = {}
    for (const [nodeId, node] of Object.entries(entry[definition.entryKey] || {})) {
      const childEntry = getEntryById(node[definition.childEntryKey], 'component')
      if (!childEntry) continue
      const bindings = listComposableBindings(entry, nodeId, node, childEntry)
      const bucket = normalizeBucketState(null, bindings, {}, node.defaults)
      state[nodeId] = definition.childStateMode === 'shared-bucket' ? { shared: bucket } : bucket
    }
    next[definition.stateKey] = state
  }

  return next
}

export function normalizeSceneItemState(item, entry, getEntryById) {
  const baseParams = {
    ...getDefaultParams(entry),
    ...getRootSceneParams(item, entry)
  }
  const normalizedStructuredState = {}

  for (const definition of STRUCTURED_NODE_DEFINITIONS) {
    const normalizedNodeState = {}
    for (const [nodeId, node] of Object.entries(entry[definition.entryKey] || {})) {
      const childEntry = getEntryById(node[definition.childEntryKey], 'component')
      if (!childEntry) continue
      const bindings = listComposableBindings(entry, nodeId, node, childEntry)
      const existingNodeState = item[definition.stateKey]?.[nodeId]
      const bucket = normalizeBucketState(
        definition.childStateMode === 'shared-bucket' ? existingNodeState?.shared : existingNodeState,
        bindings,
        baseParams,
        node.defaults
      )
      normalizedNodeState[nodeId] = definition.childStateMode === 'shared-bucket' ? { shared: bucket } : bucket
    }
    normalizedStructuredState[definition.stateKey] = normalizedNodeState
  }

  return {
    ...item,
    params: baseParams,
    ...normalizedStructuredState
  }
}

export function applyFlatParamsPatchToItem(item, entry, patch, getEntryById) {
  const normalized = normalizeSceneItemState(item, entry, getEntryById)
  const nextItem = {
    ...normalized,
    params: {
      ...normalized.params
    },
    ...Object.fromEntries(STRUCTURED_NODE_DEFINITIONS.map(definition => [definition.stateKey, clone(normalized[definition.stateKey] || {})]))
  }

  for (const key of Object.keys(patch || {})) {
    if (entry?.variants?.[key] || entry?.content?.[key]) {
      nextItem.params[key] = patch[key]
    }
  }

  for (const definition of STRUCTURED_NODE_DEFINITIONS) {
    for (const [nodeId, node] of Object.entries(entry[definition.entryKey] || {})) {
      const childEntry = getEntryById(node[definition.childEntryKey], 'component')
      if (!childEntry) continue
      const bindings = listComposableBindings(entry, nodeId, node, childEntry)
      const targetBucket = definition.childStateMode === 'shared-bucket'
        ? nextItem[definition.stateKey][nodeId]?.shared
        : nextItem[definition.stateKey][nodeId]
      if (!targetBucket) continue

      for (const binding of bindings.variants || []) {
        if (binding.parentKey in (patch || {})) {
          targetBucket.variants[binding.childKey] = patch[binding.parentKey]
        }
      }
      for (const binding of bindings.content || []) {
        if (binding.parentKey in (patch || {})) {
          targetBucket.content[binding.childKey] = patch[binding.parentKey]
        }
      }
    }
  }

  return nextItem
}

export function applyComposablePatchToItem(item, entry, nodeType, nodeId, childPatch, getEntryById) {
  const normalized = normalizeSceneItemState(item, entry, getEntryById)
  const nextItem = {
    ...normalized,
    params: { ...normalized.params },
    ...Object.fromEntries(STRUCTURED_NODE_DEFINITIONS.map(definition => [definition.stateKey, clone(normalized[definition.stateKey] || {})]))
  }
  const definition = STRUCTURED_NODE_DEFINITIONS.find(candidate => candidate.nodeType === nodeType)
  if (!definition) return normalized

  const node = entry[definition.entryKey]?.[nodeId]
  const childEntry = node ? getEntryById(node[definition.childEntryKey], 'component') : null
  const targetBucket = definition.childStateMode === 'shared-bucket'
    ? nextItem[definition.stateKey]?.[nodeId]?.shared
    : nextItem[definition.stateKey]?.[nodeId]
  if (!node || !childEntry || !targetBucket) return normalized
  const bindings = listComposableBindings(entry, nodeId, node, childEntry)

  for (const binding of bindings.variants || []) {
    if (binding.childKey in (childPatch || {})) {
      targetBucket.variants[binding.childKey] = childPatch[binding.childKey]
    }
  }
  for (const binding of bindings.content || []) {
    if (binding.childKey in (childPatch || {})) {
      targetBucket.content[binding.childKey] = childPatch[binding.childKey]
    }
  }

  return nextItem
}

export function getRenderableItemParams(item, entry, getEntryById) {
  const normalized = normalizeSceneItemState(item, entry, getEntryById)
  let nextParams = { ...normalized.params }

  for (const definition of STRUCTURED_NODE_DEFINITIONS) {
    for (const [nodeId, node] of Object.entries(entry[definition.entryKey] || {})) {
      const childEntry = getEntryById(node[definition.childEntryKey], 'component')
      if (!childEntry) continue
      const bindings = listComposableBindings(entry, nodeId, node, childEntry)
      const bucket = definition.childStateMode === 'shared-bucket'
        ? normalized[definition.stateKey]?.[nodeId]?.shared
        : normalized[definition.stateKey]?.[nodeId]
      nextParams = applyBucketToFlatParams(nextParams, bindings, bucket)
    }
  }

  return nextParams
}
