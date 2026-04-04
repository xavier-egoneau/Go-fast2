import { getRenderableItemParams, normalizeSceneItemState } from './composable-state.js'
import { getDefaultParams, listComposableBindings } from './registry.js'

export const PREVIEW_PAYLOAD_QUERY_KEY = '__gf_payload'
export const PREVIEW_PAYLOAD_VERSION = 1

function buildBucketFromState(nodeState, bindings, flatParams, defaults = {}) {
  const bucket = {
    variants: {},
    content: {}
  }

  for (const binding of bindings.variants || []) {
    bucket.variants[binding.childKey] =
      nodeState?.variants?.[binding.childKey] ??
      flatParams?.[binding.parentKey] ??
      defaults?.variants?.[binding.childKey] ??
      binding.childControl?.default ??
      null
  }

  for (const binding of bindings.content || []) {
    bucket.content[binding.childKey] =
      nodeState?.content?.[binding.childKey] ??
      flatParams?.[binding.parentKey] ??
      defaults?.content?.[binding.childKey] ??
      binding.childControl?.default ??
      null
  }

  return bucket
}

function buildChildParams(childEntry, bucket, defaults = {}) {
  return {
    ...getDefaultParams(childEntry),
    ...(defaults?.variants || {}),
    ...(defaults?.content || {}),
    ...(bucket?.variants || {}),
    ...(bucket?.content || {})
  }
}

function compactBucketState(bucket, bindings, defaults = {}) {
  if (!bucket) return null

  const compacted = {
    variants: {},
    content: {}
  }

  for (const binding of bindings.variants || []) {
    const value = bucket.variants?.[binding.childKey]
    const fallback = defaults?.variants?.[binding.childKey] ?? binding.childControl?.default ?? null
    if (value !== fallback) {
      compacted.variants[binding.childKey] = value
    }
  }

  for (const binding of bindings.content || []) {
    const value = bucket.content?.[binding.childKey]
    const fallback = defaults?.content?.[binding.childKey] ?? binding.childControl?.default ?? null
    if (value !== fallback) {
      compacted.content[binding.childKey] = value
    }
  }

  if (!Object.keys(compacted.variants).length && !Object.keys(compacted.content).length) {
    return null
  }

  return compacted
}

function compactStructuredPayloadState(entry, normalizedItem, getEntryById) {
  const result = {
    partsState: {},
    collectionsState: {},
    familiesState: {},
    instancesState: {},
    layoutGroupsState: {}
  }

  for (const [partId, part] of Object.entries(entry.parts || {})) {
    const childEntry = getEntryById(part.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(entry, partId, part, childEntry)
    const compacted = compactBucketState(normalizedItem?.partsState?.[partId], bindings, part.defaults)
    if (compacted) result.partsState[partId] = compacted
  }

  for (const [collectionId, collection] of Object.entries(entry.collections || {})) {
    const childEntry = getEntryById(collection.itemComponent, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(entry, collectionId, collection, childEntry)
    const compacted = compactBucketState(normalizedItem?.collectionsState?.[collectionId]?.shared, bindings, collection.defaults)
    if (compacted) result.collectionsState[collectionId] = { shared: compacted }
  }

  for (const [familyId, family] of Object.entries(entry.families || {})) {
    const childEntry = getEntryById(family.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(entry, familyId, family, childEntry)
    const compacted = compactBucketState(normalizedItem?.familiesState?.[familyId], bindings, family.defaults)
    if (compacted) result.familiesState[familyId] = compacted
  }

  for (const [instanceId, instance] of Object.entries(entry.instances || {})) {
    const childEntry = getEntryById(instance.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(entry, instanceId, instance, childEntry)
    const compacted = compactBucketState(normalizedItem?.instancesState?.[instanceId], bindings, instance.defaults)
    if (compacted) result.instancesState[instanceId] = compacted
  }

  for (const [layoutGroupId, layoutGroup] of Object.entries(entry.layoutGroups || {})) {
    const childEntry = getEntryById(layoutGroup.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(entry, layoutGroupId, layoutGroup, childEntry)
    const compacted = compactBucketState(normalizedItem?.layoutGroupsState?.[layoutGroupId], bindings, layoutGroup.defaults)
    if (compacted) result.layoutGroupsState[layoutGroupId] = compacted
  }

  return result
}

export function buildPreviewPayload(item, entry, getEntryById) {
  const normalizedItem = item && entry
    ? normalizeSceneItemState(item, entry, getEntryById)
    : item
  const compactedStructuredState = entry && normalizedItem
    ? compactStructuredPayloadState(entry, normalizedItem, getEntryById)
    : {
        partsState: normalizedItem?.partsState || {},
        collectionsState: normalizedItem?.collectionsState || {},
        familiesState: normalizedItem?.familiesState || {},
        instancesState: normalizedItem?.instancesState || {},
        layoutGroupsState: normalizedItem?.layoutGroupsState || {}
      }

  return {
    version: PREVIEW_PAYLOAD_VERSION,
    ref: normalizedItem?.ref || entry?.id || null,
    kind: normalizedItem?.kind || entry?.kind || null,
    viewport: normalizedItem?.viewport || null,
    params: getRenderableItemParams(normalizedItem, entry, getEntryById),
    partsState: compactedStructuredState.partsState,
    collectionsState: compactedStructuredState.collectionsState,
    familiesState: compactedStructuredState.familiesState,
    instancesState: compactedStructuredState.instancesState,
    layoutGroupsState: compactedStructuredState.layoutGroupsState
  }
}

export function encodePreviewPayload(payload) {
  return JSON.stringify(payload || {})
}

export function decodePreviewPayload(value) {
  if (!value || typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function resolvePreviewComposableData(payload, parentEntry, getEntryById) {
  if (!payload || typeof payload !== 'object' || !parentEntry) {
    return { parts: {}, collections: {} }
  }

  const flatParams = payload.params || {}
  const parts = {}
  const collections = {}
  const families = {}
  const instances = {}
  const layoutGroups = {}

  for (const [partId, part] of Object.entries(parentEntry.parts || {})) {
    const childEntry = getEntryById(part.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(parentEntry, partId, part, childEntry)
    const bucket = buildBucketFromState(payload.partsState?.[partId], bindings, flatParams, part.defaults)
    parts[partId] = {
      id: partId,
      label: part.label || partId,
      component: childEntry.id,
      params: buildChildParams(childEntry, bucket, part.defaults),
      variants: bucket.variants,
      content: bucket.content
    }
  }

  for (const [collectionId, collection] of Object.entries(parentEntry.collections || {})) {
    const childEntry = getEntryById(collection.itemComponent, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(parentEntry, collectionId, collection, childEntry)
    const bucket = buildBucketFromState(payload.collectionsState?.[collectionId]?.shared, bindings, flatParams, collection.defaults)
    collections[collectionId] = {
      id: collectionId,
      label: collection.label || collectionId,
      itemComponent: childEntry.id,
      shared: {
        params: buildChildParams(childEntry, bucket, collection.defaults),
        variants: bucket.variants,
        content: bucket.content
      }
    }
  }

  for (const [familyId, family] of Object.entries(parentEntry.families || {})) {
    const childEntry = getEntryById(family.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(parentEntry, familyId, family, childEntry)
    const bucket = buildBucketFromState(payload.familiesState?.[familyId], bindings, flatParams, family.defaults)
    families[familyId] = {
      id: familyId,
      label: family.label || familyId,
      component: childEntry.id,
      params: buildChildParams(childEntry, bucket, family.defaults),
      variants: bucket.variants,
      content: bucket.content
    }
  }

  for (const [instanceId, instance] of Object.entries(parentEntry.instances || {})) {
    const childEntry = getEntryById(instance.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(parentEntry, instanceId, instance, childEntry)
    const bucket = buildBucketFromState(payload.instancesState?.[instanceId], bindings, flatParams, instance.defaults)
    instances[instanceId] = {
      id: instanceId,
      label: instance.label || instanceId,
      component: childEntry.id,
      family: instance.family || null,
      params: buildChildParams(childEntry, bucket, instance.defaults),
      variants: bucket.variants,
      content: bucket.content
    }
  }

  for (const [layoutGroupId, layoutGroup] of Object.entries(parentEntry.layoutGroups || {})) {
    const childEntry = getEntryById(layoutGroup.component, 'component')
    if (!childEntry) continue
    const bindings = listComposableBindings(parentEntry, layoutGroupId, layoutGroup, childEntry)
    const bucket = buildBucketFromState(payload.layoutGroupsState?.[layoutGroupId], bindings, flatParams, layoutGroup.defaults)
    layoutGroups[layoutGroupId] = {
      id: layoutGroupId,
      label: layoutGroup.label || layoutGroupId,
      component: childEntry.id,
      children: Array.isArray(layoutGroup.children) ? [...layoutGroup.children] : [],
      params: buildChildParams(childEntry, bucket, layoutGroup.defaults),
      variants: bucket.variants,
      content: bucket.content
    }
  }

  return { parts, collections, families, instances, layoutGroups }
}

export function applyPreviewPayloadToTwigData(data, payload, resolvedComposableData = null) {
  if (!payload || typeof payload !== 'object') return data

  return {
    ...data,
    ...(payload.params || {}),
    __previewPayload: payload,
    __previewPartsState: payload.partsState || {},
    __previewCollectionsState: payload.collectionsState || {},
    __previewFamiliesState: payload.familiesState || {},
    __previewInstancesState: payload.instancesState || {},
    __previewLayoutGroupsState: payload.layoutGroupsState || {},
    __previewParts: resolvedComposableData?.parts || {},
    __previewCollections: resolvedComposableData?.collections || {},
    __previewFamilies: resolvedComposableData?.families || {},
    __previewInstances: resolvedComposableData?.instances || {},
    __previewLayoutGroups: resolvedComposableData?.layoutGroups || {}
  }
}
