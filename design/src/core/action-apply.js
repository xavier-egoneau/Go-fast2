import { applyComposablePatchToItem, applyFlatParamsPatchToItem, createStructuredStates } from './composable-state.js'

function uid(prefix = 'item') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function applyActionSetToScene(scene, actionSet, getEntryById = () => null) {
  const next = JSON.parse(JSON.stringify(scene))

  for (const action of actionSet.actions || []) {
    switch (action.type) {
      case 'update-params': {
        next.items = next.items.map(item => {
          if (item.id !== action.targetId) return item
          const entry = getEntryById(item.ref, item.kind)
          if (!entry) return { ...item, params: { ...item.params, ...(action.patch || {}) } }
          return applyFlatParamsPatchToItem(item, entry, action.patch || {}, getEntryById)
        })
        break
      }
      case 'update-part-params':
      case 'update-collection-params':
      case 'update-family-params':
      case 'update-instance-params':
      case 'update-layout-group-params': {
        next.items = next.items.map(item => {
          if (item.id !== action.targetId) return item
          const entry = getEntryById(item.ref, item.kind)
          if (!entry) return item
          if (action.type === 'update-part-params') {
            return applyComposablePatchToItem(item, entry, 'part', action.partId, action.patch || {}, getEntryById)
          }
          if (action.type === 'update-collection-params') {
            return applyComposablePatchToItem(item, entry, 'collection', action.collectionId, action.patch || {}, getEntryById)
          }
          if (action.type === 'update-family-params') {
            return applyComposablePatchToItem(item, entry, 'family', action.familyId, action.patch || {}, getEntryById)
          }
          if (action.type === 'update-instance-params') {
            return applyComposablePatchToItem(item, entry, 'instance', action.instanceId, action.patch || {}, getEntryById)
          }
          return applyComposablePatchToItem(item, entry, 'layoutGroup', action.layoutGroupId, action.patch || {}, getEntryById)
        })
        break
      }
      case 'update-item': {
        next.items = next.items.map(item => item.id === action.targetId ? { ...item, ...(action.patch || {}) } : item)
        break
      }
      case 'duplicate-item': {
        const source = next.items.find(item => item.id === action.targetId)
        if (!source) break
        const sourceEntry = getEntryById(source.ref, source.kind)
        const baseName = source.label || sourceEntry?.name || source.ref
        const sameRefCount = next.items.filter(item => item.ref === source.ref).length
        const autoLabel = `${baseName} ${sameRefCount + 1}`
        next.items.push({
          ...source,
          id: action.newId || uid('item'),
          label: action.label || autoLabel,
          x: source.x + (action.offset?.x ?? 40),
          y: source.y + (action.offset?.y ?? 40)
        })
        break
      }
      case 'add-item': {
        const entry = getEntryById(action.ref, action.kind)
        const structuredState = entry ? createStructuredStates(entry, getEntryById) : { partsState: {}, collectionsState: {}, familiesState: {}, instancesState: {}, layoutGroupsState: {} }
        next.items.push({
          id: uid('item'),
          kind: action.kind,
          ref: action.ref,
          x: action.x ?? 80,
          y: action.y ?? 80,
          width: action.width ?? 420,
          height: action.height ?? 260,
          viewport: action.viewport || next.viewport || 'desktop',
          params: action.params || {},
          partsState: structuredState.partsState,
          collectionsState: structuredState.collectionsState,
          familiesState: structuredState.familiesState,
          instancesState: structuredState.instancesState,
          layoutGroupsState: structuredState.layoutGroupsState
        })
        break
      }
      case 'remove-item': {
        next.items = next.items.filter(item => item.id !== action.targetId)
        next.notes = (next.notes || []).filter(note => note.id !== action.targetId)
        break
      }
      case 'add-note': {
        next.notes = next.notes || []
        next.notes.push({
          id: uid('note'),
          x: action.x ?? 100,
          y: action.y ?? 100,
          text: action.text || ''
        })
        break
      }
    }
  }

  return next
}
