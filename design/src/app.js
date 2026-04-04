import { loadRegistry, getEntryById, getDefaultParams, listEntries, listComposableBindings, resolveComposableParentParamKey } from './core/registry.js'
import { buildRenderUrl } from './core/render-url.js'
import { applyComposablePatchToItem, applyFlatParamsPatchToItem, createStructuredStates, getRenderableItemParams, normalizeSceneItemState } from './core/composable-state.js'
import { loadTokens, getTokenSummaryForEntry, getTokenById } from './core/tokens.js'
import { listSceneFiles, loadSceneFile } from './core/scene-file.js'
import { saveSceneFile, deleteSceneFile } from './core/scene-api.js'
import { diffScenes } from './core/diff.js'
import { validateActionSet } from './core/action-validate.js'
import { applyActionSetToScene } from './core/action-apply.js'
import { buildAIContext } from './core/ai-context.js'
import { buildBrainPrompt } from './core/agent-prompt.js'
import { getDefaultAgentProviderId, getPreferredDesignerProviderId, loadAgentProviders, runAgentProvider } from './core/agent-runtime.js'
import { createEmptyBrainOutput } from './core/brain-contract.js'
import { exposeComposableChildPart } from './core/composable-authoring.js'
import {
  getState,
  patchState,
  setState,
  subscribe,
  resetState,
  pushHistory,
  undoHistory,
  redoHistory,
  setSceneFiles,
  hasWorkingScene,
  replaceWorkingScene,
  promoteSceneToBase,
  addSceneFile,
  setPersistMuted
} from './state/store.js'
import { getAgentState, patchAgentState, subscribeAgentState } from './state/agent-store.js'
import { renderAgentPanel } from './ui/agent-panel.js'

let rootEl = null
let dragState = null
let resizeState = null
let panState = null
let dragPointerId = null
let resizePointerId = null
let historyMuted = false
let frameInteractivityDisabled = false
let canvasWheelAbortController = null
let canvasPanAbortController = null
let keyboardAbortController = null
let spacePanPressed = false
let suppressNextClickUntil = 0
let previewComposableTarget = null
let pendingComposableDrawerFocus = null
let activeComposableDrawer = null
let previewComposableClearTimeout = null
let previewComposableActionHovered = false
let composablePopoverState = null
let gridCellOverlayState = null
let gridCellClearTimeout = null

const VIEWPORT_SPECS = {
  mobile: { label: 'Mobile', breakpointId: 'breakpoint-sm', fallbackWidth: 640, height: 844 },
  tablet: { label: 'Tablette', breakpointId: 'breakpoint-md', fallbackWidth: 768, height: 1024 },
  desktop: { label: 'Desktop', breakpointId: 'breakpoint-lg', fallbackWidth: 1024, height: 1024 }
}

const INSPECTOR_NODE_DEFINITIONS = {
  part: { stateKey: 'partsState', actionName: 'part-param-change', idAttr: 'dataPartId', stateMode: 'bucket' },
  collection: { stateKey: 'collectionsState', actionName: 'collection-param-change', idAttr: 'dataCollectionId', stateMode: 'shared-bucket' },
  family: { stateKey: 'familiesState', actionName: 'family-param-change', idAttr: 'dataFamilyId', stateMode: 'bucket' },
  instance: { stateKey: 'instancesState', actionName: 'instance-param-change', idAttr: 'dataInstanceId', stateMode: 'bucket' },
  layoutGroup: { stateKey: 'layoutGroupsState', actionName: 'layout-group-param-change', idAttr: 'dataLayoutGroupId', stateMode: 'bucket' }
}

const SUPPORTED_PREVIEW_NODE_TYPES = new Set(['part', 'collection', 'family', 'instance', 'layoutGroup'])

function uid(prefix = 'item') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function parsePxValue(value, fallback) {
  const match = String(value || '').match(/([0-9]+(?:\.[0-9]+)?)px/)
  return match ? Number(match[1]) : fallback
}

function getViewportDefinitions() {
  return Object.fromEntries(Object.entries(VIEWPORT_SPECS).map(([key, spec]) => {
    const token = getTokenById(spec.breakpointId)
    const width = parsePxValue(token?.value, spec.fallbackWidth)
    return [key, {
      label: spec.label,
      width,
      height: spec.height,
      breakpoint: token?.scssVar || `$${spec.breakpointId}`,
      breakpointValue: token?.value || `${spec.fallbackWidth}px`
    }]
  }))
}

function getViewportConfig(viewport) {
  const definitions = getViewportDefinitions()
  return definitions[viewport] || definitions.desktop
}

function getItemDimensions(entry, viewport) {
  const vp = getViewportConfig(viewport)
  if (entry.kind === 'page') return { width: vp.width, height: vp.height }
  if (entry.level === 'organism' || entry.level === 'template') return { width: Math.min(1100, vp.width), height: 360 }
  return { width: Math.min(420, vp.width), height: 260 }
}

function getEntryRank(entry) {
  if (entry.kind === 'page') return 4
  const level = entry.level || ''
  if (level === 'template') return 3
  if (level === 'organism') return 2
  if (level === 'molecule') return 1
  return 0
}

function getLaneConfig(entry) {
  const rank = getEntryRank(entry)
  const lanes = [
    { key: 'atom', label: 'Atoms', x: 96, y: 120, contentY: 188, minWidth: 260, height: 1400, columns: 1 },
    { key: 'molecule', label: 'Molecules', x: 0, y: 120, contentY: 188, minWidth: 420, height: 1400, columns: 1 },
    { key: 'organism', label: 'Organisms', x: 0, y: 120, contentY: 188, minWidth: 640, height: 1400, columns: 1 },
    { key: 'template', label: 'Templates & Pages', x: 0, y: 120, contentY: 188, minWidth: 1280, height: 1400, columns: 1 }
  ]

  if (rank === 0) return { ...lanes[0] }
  if (rank === 1) return { ...lanes[1] }
  if (rank === 2) return { ...lanes[2] }
  return { ...lanes[3] }
}

function buildLaneLayout(scene) {
  const orderedLaneKeys = ['atom', 'molecule', 'organism', 'template']
  const laneMap = new Map()
  let cursorX = 96
  const gap = 32
  const laneWidthOverrides = scene?.laneWidths || {}

  for (const laneKey of orderedLaneKeys) {
    const sampleEntry = (scene.items || [])
      .map(item => getEntryById(item.ref, item.kind))
      .find(entry => entry && getLaneConfig(entry).key === laneKey)

    const baseLane = sampleEntry
      ? getLaneConfig(sampleEntry)
      : getLaneConfig({ kind: laneKey === 'template' ? 'page' : 'component', level: laneKey === 'atom' ? 'atom' : laneKey === 'molecule' ? 'molecule' : laneKey === 'organism' ? 'organism' : 'template' })

    const laneItems = (scene.items || []).filter(item => {
      const entry = getEntryById(item.ref, item.kind)
      return entry && getLaneConfig(entry).key === laneKey
    })

    const widest = laneItems.reduce((max, item) => Math.max(max, item.width || 0), 0)
    const occupiedWidth = laneItems.reduce((max, item) => {
      const relativeRight = Math.max(0, ((item.x || 0) - cursorX) + (item.width || 0))
      return Math.max(max, relativeRight)
    }, 0)
    const occupiedHeight = laneItems.reduce((max, item) => {
      const relativeBottom = Math.max(0, ((item.y || 0) - baseLane.y) + (item.height || 0))
      return Math.max(max, relativeBottom)
    }, 0)
    const width = Math.max(baseLane.minWidth, widest + 32, occupiedWidth + 32, laneWidthOverrides[laneKey] || 0)
    laneMap.set(laneKey, {
      ...baseLane,
      key: laneKey,
      x: cursorX,
      width,
      height: Math.max(baseLane.height, occupiedHeight + 96)
    })
    cursorX += width + gap
  }

  return laneMap
}

function computeAutoPlacement(scene, entry, dimensions) {
  const lane = buildLaneLayout(scene).get(getLaneConfig(entry).key) || getLaneConfig(entry)
  const sameLaneItems = (scene.items || [])
    .filter(item => {
      const itemEntry = getEntryById(item.ref, item.kind)
      if (!itemEntry) return false
      const itemLane = getLaneConfig(itemEntry)
      return itemLane.key === lane.key
    })
    .sort((a, b) => a.y - b.y)

  const gap = 32
  const last = sameLaneItems[sameLaneItems.length - 1]
  const x = lane.x
  const y = last ? snapToGrid(last.y + last.height + gap) : lane.contentY

  return { x: snapToGrid(x), y: snapToGrid(y), lane }
}

function reflowSceneItems(items, targetLaneKey = null) {
  const nextItems = JSON.parse(JSON.stringify(items || []))
  const laneKeys = targetLaneKey ? [targetLaneKey] : ['atom', 'molecule', 'organism', 'template']
  const gap = 32
  const laneLayout = buildLaneLayout({ items: nextItems })

  for (const laneKey of laneKeys) {
    const laneItems = nextItems
      .filter(item => {
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return false
        return getLaneConfig(entry).key === laneKey
      })
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))

    if (!laneItems.length) continue
    const lane = laneLayout.get(laneKey) || getLaneConfig(getEntryById(laneItems[0].ref, laneItems[0].kind))

    laneItems.forEach((item, index) => {
      item.x = snapToGrid(lane.x)
      item.y = snapToGrid(lane.contentY + (index * (Math.max(item.height, 220) + gap)))
    })
  }

  return nextItems
}

function snapSceneItemsToGrid(items, targetLaneKey = null) {
  return JSON.parse(JSON.stringify(items || [])).map(item => {
    const entry = getEntryById(item.ref, item.kind)
    if (!entry) return item
    const laneKey = getLaneConfig(entry).key
    if (targetLaneKey && laneKey !== targetLaneKey) return item

    return {
      ...item,
      x: snapToGrid(item.x || 0),
      y: snapToGrid(item.y || 0),
      width: Math.max(220, snapToGrid(item.width || 220, 4)),
      height: Math.max(140, snapToGrid(item.height || 140, 4))
    }
  })
}

function alignSceneItemsToGrid(items, targetLaneKey = null) {
  const nextItems = JSON.parse(JSON.stringify(items || []))
  const laneKeys = targetLaneKey ? [targetLaneKey] : ['atom', 'molecule', 'organism', 'template']
  const gap = 32
  const rowThreshold = 120

  for (const laneKey of laneKeys) {
    const laneItems = nextItems
      .filter(item => {
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return false
        return getLaneConfig(entry).key === laneKey
      })
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))

    if (!laneItems.length) continue

    const rows = []

    for (const item of laneItems) {
      const itemTop = item.y || 0
      let row = rows.find(candidate => Math.abs(candidate.anchorY - itemTop) <= rowThreshold)

      if (!row) {
        row = { anchorY: itemTop, items: [] }
        rows.push(row)
      }

      row.items.push(item)
      row.anchorY = Math.round((row.anchorY + itemTop) / 2)
    }

    rows.sort((a, b) => a.anchorY - b.anchorY)

    let cursorY = snapToGrid(Math.min(...rows.map(row => row.anchorY)))

    rows.forEach(row => {
      row.items.sort((a, b) => a.x - b.x)

      const originalMinX = Math.min(...row.items.map(item => item.x || 0))
      let cursorX = snapToGrid(originalMinX)
      const rowHeight = Math.max(...row.items.map(item => item.height || 0), 140)

      row.items.forEach(item => {
        item.x = cursorX
        item.y = cursorY
        cursorX = snapToGrid(item.x + (item.width || 0) + gap)
      })

      cursorY = snapToGrid(cursorY + rowHeight + gap)
    })
  }

  return nextItems
}

function organizeSelectedLane() {
  const selectedItem = getSelectedSceneItem()
  if (!selectedItem) return
  const entry = getEntryById(selectedItem.ref, selectedItem.kind)
  if (!entry) return
  const lane = getLaneConfig(entry)
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: alignSceneItemsToGrid(prev.scene.items, lane.key)
    }
  }))
  commitSceneHistory()
}

function organizeCanvas() {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: alignSceneItemsToGrid(prev.scene.items)
    }
  }))
  commitSceneHistory()
}

function commitSceneHistory() {
  if (historyMuted) return
  pushHistory(getState().scene)
}

function createSceneItemFromEntry(entry, scene) {
  const viewport = scene.viewport || 'desktop'
  const dimensions = getItemDimensions(entry, viewport)
  const placement = computeAutoPlacement(scene, entry, dimensions)
  const structuredState = createStructuredStates(entry, getEntryById)
  return {
    id: uid(),
    kind: entry.kind,
    ref: entry.id,
    viewport,
    x: placement.x,
    y: placement.y,
    width: dimensions.width,
    height: dimensions.height,
    params: getDefaultParams(entry),
    partsState: structuredState.partsState,
    collectionsState: structuredState.collectionsState,
    familiesState: structuredState.familiesState,
    instancesState: structuredState.instancesState,
    layoutGroupsState: structuredState.layoutGroupsState
  }
}

function hydrateSceneWithRegistry(scene, options = {}) {
  const preserveExistingLayout = options.preserveExistingLayout ?? true
  const baseScene = {
    ...scene,
    items: [...(scene.items || [])].map(item => {
      const entry = getEntryById(item.ref, item.kind)
      if (!entry) return item
      return normalizeSceneItemState(item, entry, getEntryById)
    }),
    notes: scene.notes || []
  }

  const existingRefs = new Set(baseScene.items.map(item => `${item.kind}:${item.ref}`))
  const orderedEntries = [...listEntries()].sort((a, b) => {
    const rankDiff = getEntryRank(a) - getEntryRank(b)
    if (rankDiff !== 0) return rankDiff
    return String(a.name || a.id).localeCompare(String(b.name || b.id))
  })

  for (const entry of orderedEntries) {
    const key = `${entry.kind}:${entry.id}`
    if (existingRefs.has(key)) continue
    const item = createSceneItemFromEntry(entry, baseScene)
    baseScene.items.push(item)
    existingRefs.add(key)
  }

  if (!preserveExistingLayout) {
    baseScene.items = reflowSceneItems(baseScene.items)
  }
  return baseScene
}

function addItem(entry) {
  setState(prev => {
    const item = createSceneItemFromEntry(entry, prev.scene)
    return {
      ...prev,
      selectedItemId: item.id,
      scene: { ...prev.scene, items: reflowSceneItems([...prev.scene.items, item]) }
    }
  })
  commitSceneHistory()
}

function getSelectedSceneItem() {
  const state = getState()
  return state.scene.items.find(item => item.id === state.selectedItemId) || null
}

function bringItemToFront(itemId) {
  setState(prev => {
    const index = prev.scene.items.findIndex(item => item.id === itemId)
    if (index === -1) return prev
    const item = prev.scene.items[index]
    const remaining = prev.scene.items.filter(candidate => candidate.id !== itemId)
    return {
      ...prev,
      scene: {
        ...prev.scene,
        items: [...remaining, item]
      }
    }
  })
}

function addNote(targetItemId = null) {
  const selectedItem = targetItemId
    ? getState().scene.items.find(item => item.id === targetItemId) || null
    : getSelectedSceneItem()
  const note = {
    id: uid('note'),
    targetId: selectedItem?.id || null,
    x: selectedItem ? selectedItem.x + Math.max(16, selectedItem.width - 24) : 120,
    y: selectedItem ? Math.max(24, selectedItem.y - 12) : 120,
    text: 'Nouvelle note…',
    open: true
  }

  setState(prev => ({
    ...prev,
    selectedItemId: note.id,
    scene: { ...prev.scene, notes: [...(prev.scene.notes || []), note] }
  }))
  commitSceneHistory()
}

function updateItem(itemId, patch, options = {}) {
  setState(prev => ({
    ...prev,
    scene: { ...prev.scene, items: prev.scene.items.map(item => item.id === itemId ? { ...item, ...patch } : item) }
  }))
  if (!options.silent) commitSceneHistory()
}

function updateItemParams(itemId, paramsPatch) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return { ...item, params: { ...item.params, ...paramsPatch } }
        return applyFlatParamsPatchToItem(item, entry, paramsPatch, getEntryById)
      })
    }
  }))
  commitSceneHistory()
}

function updatePartParams(itemId, partId, paramsPatch) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return item
        return applyComposablePatchToItem(item, entry, 'part', partId, paramsPatch, getEntryById)
      })
    }
  }))
  commitSceneHistory()
}

function updateCollectionParams(itemId, collectionId, paramsPatch) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return item
        return applyComposablePatchToItem(item, entry, 'collection', collectionId, paramsPatch, getEntryById)
      })
    }
  }))
  commitSceneHistory()
}

function updateFamilyParams(itemId, familyId, paramsPatch) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return item
        return applyComposablePatchToItem(item, entry, 'family', familyId, paramsPatch, getEntryById)
      })
    }
  }))
  commitSceneHistory()
}

function updateInstanceParams(itemId, instanceId, paramsPatch) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return item
        return applyComposablePatchToItem(item, entry, 'instance', instanceId, paramsPatch, getEntryById)
      })
    }
  }))
  commitSceneHistory()
}

function updateLayoutGroupParams(itemId, layoutGroupId, paramsPatch) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return item
        return applyComposablePatchToItem(item, entry, 'layoutGroup', layoutGroupId, paramsPatch, getEntryById)
      })
    }
  }))
  commitSceneHistory()
}

function updateNote(noteId, patch, options = {}) {
  setState(prev => ({
    ...prev,
    scene: { ...prev.scene, notes: (prev.scene.notes || []).map(note => note.id === noteId ? { ...note, ...patch } : note) }
  }))
  if (!options.silent) commitSceneHistory()
}

function removeSelectedItem() {
  const state = getState()
  if (!state.selectedItemId) return
  setState(prev => ({
    ...prev,
    selectedItemId: null,
    scene: {
      ...prev.scene,
      items: prev.scene.items.filter(item => item.id !== prev.selectedItemId),
      notes: (prev.scene.notes || []).filter(note => note.id !== prev.selectedItemId)
    }
  }))
  commitSceneHistory()
}

function removeNote(noteId) {
  if (!noteId) return
  setState(prev => ({
    ...prev,
    selectedItemId: prev.selectedItemId === noteId ? null : prev.selectedItemId,
    scene: {
      ...prev.scene,
      notes: (prev.scene.notes || []).filter(note => note.id !== noteId)
    }
  }))
  commitSceneHistory()
}

function clearScene() {
  setState(prev => ({
    ...prev,
    selectedItemId: null,
    scene: { ...prev.scene, items: [], notes: [] }
  }))
  commitSceneHistory()
}

function refreshSelectionUI() {
  if (!rootEl) return
  const { selectedItemId } = getState()

  rootEl.querySelectorAll('.ds-item[data-item-id]').forEach(element => {
    element.classList.toggle('ds-item--selected', element.dataset.itemId === selectedItemId)
  })
  rootEl.querySelectorAll('.ds-note[data-note-id]').forEach(element => {
    element.classList.toggle('ds-note--selected', element.dataset.noteId === selectedItemId)
  })

  const inspectorHost = rootEl.querySelector('[data-ui-region="inspector"]')
  if (inspectorHost) inspectorHost.outerHTML = renderInspectorWrapped()
  bindSelectionDependentEvents()
  restorePendingComposableDrawerFocus()
}

function selectItem(itemId) {
  const item = getState().scene.items.find(candidate => candidate.id === itemId)
  if (item) bringItemToFront(itemId)
  const state = getState()
  if (activeComposableDrawer?.itemId && activeComposableDrawer.itemId !== itemId) {
    activeComposableDrawer = null
  }
  state.selectedItemId = itemId
  refreshSelectionUI()
}

function isSamePreviewComposableTarget(left, right) {
  if (!left && !right) return true
  if (!left || !right) return false

  return left.itemId === right.itemId &&
    left.nodeType === right.nodeType &&
    left.nodeId === right.nodeId &&
    left.childComponent === right.childComponent &&
    left.exposed === right.exposed
}

function setPreviewComposableTarget(target) {
  const normalized = target ? {
    ...target,
    x: Math.round(target.x),
    y: Math.round(target.y),
    width: Math.round(target.width || 0),
    height: Math.round(target.height || 0)
  } : null

  if (isSamePreviewComposableTarget(previewComposableTarget, normalized)) return
  if (previewComposableClearTimeout) {
    clearTimeout(previewComposableClearTimeout)
    previewComposableClearTimeout = null
  }
  previewComposableTarget = normalized
  updatePreviewComposableOverlay()
}

function clearPreviewComposableTarget() {
  if (previewComposableActionHovered) return
  if (!previewComposableTarget) return
  if (previewComposableClearTimeout) {
    clearTimeout(previewComposableClearTimeout)
    previewComposableClearTimeout = null
  }
  previewComposableTarget = null
  updatePreviewComposableOverlay()
}

function scheduleClearPreviewComposableTarget() {
  if (previewComposableActionHovered) return
  if (previewComposableClearTimeout) clearTimeout(previewComposableClearTimeout)
  previewComposableClearTimeout = setTimeout(() => {
    previewComposableClearTimeout = null
    if (previewComposableActionHovered) return
    clearPreviewComposableTarget()
  }, 180)
}

function syncSceneItemsWithRegistry() {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        const entry = getEntryById(item.ref, item.kind)
        return entry ? normalizeSceneItemState(item, entry, getEntryById) : item
      })
    }
  }))
}

function buildComposableDrawerSelector(itemId, nodeType, nodeId) {
  return `[data-composable-drawer="${nodeType}:${nodeId}"][data-item-id="${itemId}"]`
}

function findComposableDrawer(itemId, nodeType, nodeId) {
  if (!rootEl) return null
  const drawerKey = `${nodeType}:${nodeId}`
  const drawers = [...rootEl.querySelectorAll('[data-composable-drawer][data-item-id]')]

  return drawers.find(drawer =>
    drawer.getAttribute('data-item-id') === String(itemId) &&
    drawer.getAttribute('data-composable-drawer') === drawerKey
  ) || drawers.find(drawer => drawer.getAttribute('data-composable-drawer') === drawerKey) || null
}

function restorePendingComposableDrawerFocus() {
  if (!pendingComposableDrawerFocus || !rootEl) return
  const { itemId, nodeType, nodeId } = pendingComposableDrawerFocus
  const drawer = findComposableDrawer(itemId, nodeType, nodeId)
  if (!drawer) return

  drawer.setAttribute('open', '')
  drawer.scrollIntoView({ block: 'nearest' })
  drawer.querySelector('summary')?.focus?.({ preventScroll: true })
  pendingComposableDrawerFocus = null
}

function openComposableDrawer(itemId, nodeType, nodeId) {
  pendingComposableDrawerFocus = { itemId, nodeType, nodeId }
  activeComposableDrawer = { itemId, nodeType, nodeId }
  const item = getState().scene.items.find(candidate => candidate.id === itemId)
  if (item) bringItemToFront(itemId)
  getState().selectedItemId = itemId
  render()
  restorePendingComposableDrawerFocus()
  window.requestAnimationFrame(() => restorePendingComposableDrawerFocus())
}

function ensurePreviewComposableOverlayElement() {
  if (!rootEl) return null
  let button = rootEl.querySelector('[data-preview-composable-overlay]')
  if (button) return button

  button = document.createElement('button')
  button.type = 'button'
  button.className = 'ds-preview-composable-action'
  button.dataset.previewComposableOverlay = 'true'
  button.hidden = true
  const triggerPreviewComposableEdit = event => {
    event.preventDefault()
    event.stopPropagation()
    handlePreviewComposableEdit().catch(error => {
      console.error('[design-surface] preview composable edit failed', error)
      window.alert(error?.message || "Impossible d'éditer ce sous-composant.")
    })
  }
  button.addEventListener('pointerdown', triggerPreviewComposableEdit)
  button.addEventListener('mouseenter', () => {
    previewComposableActionHovered = true
    if (previewComposableClearTimeout) {
      clearTimeout(previewComposableClearTimeout)
      previewComposableClearTimeout = null
    }
  })
  button.addEventListener('mouseleave', () => {
    previewComposableActionHovered = false
    scheduleClearPreviewComposableTarget()
  })
  rootEl.appendChild(button)
  return button
}

function updatePreviewComposableOverlay() {
  const button = ensurePreviewComposableOverlayElement()
  if (!button) return

  if (!previewComposableTarget || dragState || resizeState || frameInteractivityDisabled) {
    button.hidden = true
    button.textContent = ''
    return
  }

  const buttonLabel = previewComposableTarget.exposed
    ? 'Modifier le composant'
    : 'Modifier le composant'

  button.hidden = false
  button.textContent = buttonLabel
  const viewportPadding = 12
  const maxLeft = Math.max(viewportPadding, window.innerWidth - button.offsetWidth - viewportPadding)
  const maxTop = Math.max(viewportPadding, window.innerHeight - button.offsetHeight - viewportPadding)
  const nextLeft = Math.min(maxLeft, Math.max(viewportPadding, previewComposableTarget.x))
  const nextTop = Math.min(maxTop, Math.max(viewportPadding, previewComposableTarget.y))
  button.style.left = `${nextLeft}px`
  button.style.top = `${nextTop}px`
}

function setSceneViewport(viewport) {
  setState(prev => ({ ...prev, scene: { ...prev.scene, viewport } }))
  commitSceneHistory()
}

function applyViewportToSelected() {
  const state = getState()
  const selected = state.scene.items.find(item => item.id === state.selectedItemId)
  if (!selected) return
  const entry = getEntryById(selected.ref, selected.kind)
  if (!entry) return
  const viewport = state.scene.viewport || 'desktop'
  const dimensions = getItemDimensions(entry, viewport)
  updateItem(selected.id, { viewport, width: dimensions.width, height: dimensions.height })
}

async function loadSceneFromFile(fileName, options = {}) {
  historyMuted = true
  try {
    const scene = await loadSceneFile(fileName)
    const normalized = { ...scene, notes: scene.notes || [], items: scene.items || [] }
    const keepWorkingScene = options.keepWorkingScene ?? false
    const hydrated = hydrateSceneWithRegistry(normalized, {
      preserveExistingLayout: normalized.items.length > 0
    })

    setState(prev => ({
      ...prev,
      selectedItemId: null,
      activeSceneFile: fileName,
      baseScene: hydrated,
      scene: keepWorkingScene ? hydrateSceneWithRegistry(prev.scene, { preserveExistingLayout: true }) : hydrated,
      history: keepWorkingScene ? prev.history : [hydrated],
      historyIndex: keepWorkingScene ? prev.historyIndex : 0
    }))
  } finally {
    historyMuted = false
  }
}

async function exportCurrentScene() {
  const scene = getState().scene
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${scene.id || 'scene'}.scene.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function refreshSceneFiles() {
  const sceneFiles = await listSceneFiles()
  patchState({ sceneFiles })
}

async function saveCurrentSceneToFile() {
  const { scene, activeSceneFile } = getState()
  await saveSceneFile(activeSceneFile || `${scene.id || 'scene'}.scene.json`, scene)
  await refreshSceneFiles()
}

async function saveCurrentSceneAsNewFile() {
  const { scene } = getState()
  const baseName = prompt('Nom de fichier de scène', `${scene.id || 'scene'}.scene.json`)
  if (!baseName) return
  const fileName = baseName.endsWith('.json') ? baseName : `${baseName}.json`
  await saveSceneFile(fileName, scene)
  patchState({ activeSceneFile: fileName })
  await refreshSceneFiles()
}

async function deleteCurrentSceneFile() {
  const { activeSceneFile } = getState()
  if (!activeSceneFile || activeSceneFile === 'default.scene.json') {
    alert('La scène par défaut ne peut pas être supprimée.')
    return
  }
  const ok = confirm(`Supprimer ${activeSceneFile} ?`)
  if (!ok) return
  await deleteSceneFile(activeSceneFile)
  await refreshSceneFiles()
  await loadSceneFromFile('default.scene.json', { keepWorkingScene: false })
}

function resetToBaseScene() {
  const { baseScene } = getState()
  replaceWorkingScene(baseScene)
}

function saveCurrentAsBase() {
  promoteSceneToBase()
}

function createNewWorkingScene() {
  const { baseScene } = getState()
  const nextScene = {
    ...baseScene,
    id: `${baseScene.id || 'scene'}-working`,
    name: `${baseScene.name || 'Scene'} working copy`,
    items: [],
    notes: []
  }
  replaceWorkingScene(nextScene)
}

function duplicateCurrentScene() {
  const { scene } = getState()
  const duplicated = {
    ...scene,
    id: `${scene.id || 'scene'}-copy`,
    name: `${scene.name || 'Scene'} copy`
  }
  replaceWorkingScene(duplicated)
}

function importSceneFromFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'))
      const imported = {
        id: parsed.id || `imported-${Date.now()}`,
        name: parsed.name || 'Imported scene',
        version: parsed.version || 1,
        viewport: parsed.viewport || 'desktop',
        notes: parsed.notes || [],
        items: parsed.items || []
      }
      replaceWorkingScene(imported)
      addSceneFile({ id: imported.id, name: imported.name, file: `${imported.id}.scene.json` })
    } catch (error) {
      alert(`Import impossible: ${error.message}`)
    } finally {
      event.target.value = ''
    }
  }
  reader.readAsText(file)
}

function toggleAgentPanel() {
  const agent = getAgentState()
  const nextOpen = !agent.open
  patchAgentState({ open: nextOpen })
  if (nextOpen) {
    loadAgentProviders().then(() => render()).catch(() => {})
  }
  render()
}

function stringifyAgentJson(value) {
  return JSON.stringify(value, null, 2)
}

function buildAgentPromptPreview() {
  return buildBrainPrompt({
    intent: getAgentState().input,
    context: buildAIContext(getState(), getEntryById)
  })
}

function getAgentSelectionHint() {
  const state = getState()
  const scene = getRenderedScene()
  const selectedItem = scene.items.find(item => item.id === state.selectedItemId)
  const selectedNote = (scene.notes || []).find(note => note.id === state.selectedItemId)

  if (selectedItem) {
    const entry = getEntryById(selectedItem.ref, selectedItem.kind)
    return `Élément sélectionné : ${entry?.name || selectedItem.ref}. La demande sera interprétée comme une modification de cet élément, ou comme une variante de page basée sur lui si tu le demandes explicitement.`
  }

  if (selectedNote) {
    return 'Annotation sélectionnée : la demande utilisera cette note comme contexte, pas comme composant de prod.'
  }

  return 'Aucun élément sélectionné : la demande sera interprétée au niveau de la scène ou de la page.'
}

function resetAgentFeedback() {
  patchAgentState({
    validationErrors: [],
    runtimeError: '',
    lastSummary: '',
    lastWarnings: [],
    requiresNewComponent: false,
    unresolved: [],
    previewScene: null,
    feedbackDismissed: false,
    promptPreview: buildAgentPromptPreview(),
    selectionHint: getAgentSelectionHint()
  })
}

function handleAgentFillTemplate() {
  patchAgentState({
    actionJson: stringifyAgentJson(createEmptyBrainOutput())
  })
  resetAgentFeedback()
  render()
}

async function handleAgentSubmit() {
  try {
    await loadRegistry()
    try {
      await loadTokens()
    } catch {}

    const state = getState()
    const agent = getAgentState()
    const context = buildAIContext(state, getEntryById)
    const promptPreview = buildAgentPromptPreview()
    const { output } = await runAgentProvider(agent.providerId, {
      intent: agent.input,
      context,
      prompt: promptPreview,
      manualJson: agent.actionJson
    })
    const validation = validateActionSet(output, state, getEntryById)
    const nextPatch = {
      promptPreview,
      actionJson: stringifyAgentJson(output),
      runtimeError: '',
      validationErrors: validation.errors,
      lastSummary: output.summary || '',
      lastWarnings: output.warnings || [],
      requiresNewComponent: output.requiresNewComponent || false,
      unresolved: output.unresolved || [],
      feedbackDismissed: false,
      selectionHint: getAgentSelectionHint()
    }

    if (!validation.valid) {
      patchAgentState({
        ...nextPatch,
        previewScene: null
      })
      render()
      return
    }

    const previewScene = applyActionSetToScene(state.scene, validation.normalized, getEntryById)
    patchAgentState({
      ...nextPatch,
      previewScene
    })
  } catch (error) {
    patchAgentState({ runtimeError: error.message || 'Runtime error', feedbackDismissed: false })
  }
  render()
}

function handleAgentValidate() {
  const state = getState()
  const agent = getAgentState()
  try {
    const parsed = JSON.parse(agent.actionJson || '{}')
    const result = validateActionSet(parsed, state, getEntryById)
    patchAgentState({
      validationErrors: result.errors,
      runtimeError: '',
      lastSummary: result.normalized?.summary || '',
      lastWarnings: result.normalized?.warnings || [],
      requiresNewComponent: result.normalized?.requiresNewComponent || false,
      unresolved: result.normalized?.unresolved || [],
      previewScene: null,
      feedbackDismissed: false,
      promptPreview: buildAgentPromptPreview()
    })
  } catch (error) {
    patchAgentState({
      validationErrors: [error.message],
      runtimeError: '',
      lastWarnings: [],
      requiresNewComponent: false,
      unresolved: [],
      previewScene: null,
      feedbackDismissed: false,
      promptPreview: buildAgentPromptPreview()
    })
  }
  render()
}

function handleAgentPreview() {
  const state = getState()
  const agent = getAgentState()
  try {
    const parsed = JSON.parse(agent.actionJson || '{}')
    const result = validateActionSet(parsed, state, getEntryById)
    if (!result.valid) {
      patchAgentState({ validationErrors: result.errors, runtimeError: '', previewScene: null, feedbackDismissed: false, promptPreview: buildAgentPromptPreview() })
      render()
      return
    }
    const previewScene = applyActionSetToScene(state.scene, result.normalized, getEntryById)
    patchAgentState({
      validationErrors: [],
      runtimeError: '',
      lastSummary: result.normalized.summary || '',
      lastWarnings: result.normalized.warnings || [],
      requiresNewComponent: result.normalized.requiresNewComponent || false,
      unresolved: result.normalized.unresolved || [],
      previewScene,
      feedbackDismissed: false,
      promptPreview: buildAgentPromptPreview()
    })
    render()
  } catch (error) {
    patchAgentState({
      validationErrors: [error.message],
      runtimeError: '',
      lastWarnings: [],
      requiresNewComponent: false,
      unresolved: [],
      previewScene: null,
      promptPreview: buildAgentPromptPreview()
    })
    render()
  }
}

function handleAgentApply() {
  const agent = getAgentState()
  if (!agent.previewScene) {
    handleAgentPreview()
    if (!getAgentState().previewScene) return
  }
  replaceWorkingScene(getAgentState().previewScene)
  patchAgentState({ previewScene: null, validationErrors: [], runtimeError: '' })
  render()
}

function handleAgentClearPreview() {
  patchAgentState({
    previewScene: null,
    validationErrors: [],
    runtimeError: '',
    lastWarnings: [],
    requiresNewComponent: false,
    unresolved: []
  })
  render()
}

function getRenderedScene() {
  const agent = getAgentState()
  return agent.previewScene || getState().scene
}

function renderFrames(scene) {
  const viewport = scene.viewport || 'desktop'
  const lanes = [...buildLaneLayout(scene).values()].map(lane => ({
    ...lane,
    height: Math.max(lane.height || 0, 880)
  }))

  return `
    ${lanes.map(lane => `<div class="ds-lane" style="left:${lane.x}px;top:${lane.y}px;width:${lane.width}px;height:${lane.height}px;"><div class="ds-lane__label">${escapeHtml(lane.label)}</div><div class="ds-lane__resize" data-lane-resize-handle="${lane.key}" title="Agrandir la colonne ${escapeAttr(lane.label)}"></div></div>`).join('')}
  `
}

function getCanvasMetrics(scene) {
  const viewport = scene.viewport || 'desktop'
  const vp = getViewportConfig(viewport)
  const lanes = [...buildLaneLayout(scene).values()]
  const itemBounds = (scene.items || []).reduce((acc, item) => ({
    right: Math.max(acc.right, (item.x || 0) + (item.width || 0)),
    bottom: Math.max(acc.bottom, (item.y || 0) + (item.height || 0))
  }), { right: 0, bottom: 0 })
  const noteBounds = (scene.notes || []).reduce((acc, note) => ({
    right: Math.max(acc.right, (note.x || 0) + 280),
    bottom: Math.max(acc.bottom, (note.y || 0) + 180)
  }), { right: 0, bottom: 0 })
  const lanesRight = lanes.length ? Math.max(...lanes.map(lane => lane.x + lane.width)) : 0
  const lanesBottom = lanes.length ? Math.max(...lanes.map(lane => lane.y + lane.height)) : 0

  return {
    width: Math.max(1800, vp.width + 160, lanesRight + 160, itemBounds.right + 160, noteBounds.right + 160),
    height: Math.max(1200, vp.height + 180, lanesBottom + 160, itemBounds.bottom + 160, noteBounds.bottom + 160)
  }
}

function buildAgentFeedbackModel() {
  const agent = getAgentState()
  const warnings = agent.lastWarnings || []
  const unresolved = agent.unresolved || []
  const validationErrors = agent.validationErrors || []

  if (validationErrors.length) {
    return {
      tone: 'error',
      title: 'La demande ne peut pas encore être appliquée',
      lead: validationErrors[0],
      details: [...validationErrors.slice(1), ...warnings, ...unresolved.map(item => `${item.type} — ${item.message}`)]
    }
  }

  if (agent.requiresNewComponent) {
    return {
      tone: 'warn',
      title: 'La demande dépasse le système actuel',
      lead: agent.lastSummary || unresolved[0]?.message || warnings[0] || "Cette demande nécessite d'étendre les composants existants.",
      details: [...warnings, ...unresolved.map(item => `${item.type} — ${item.message}`)]
    }
  }

  if (warnings.length || unresolved.length) {
    return {
      tone: 'info',
      title: 'La demande a des limites',
      lead: agent.lastSummary || warnings[0] || unresolved[0]?.message || '',
      details: [...warnings.slice(1), ...unresolved.map(item => `${item.type} — ${item.message}`)]
    }
  }

  return {
    tone: 'success',
    title: 'Demande interprétée',
    lead: agent.lastSummary || 'La machine a produit une proposition exploitable.',
    details: []
  }
}

function renderPreviewStatus() {
  const agent = getAgentState()
  const warnings = agent.lastWarnings || []
  const unresolved = agent.unresolved || []
  const validationErrors = agent.validationErrors || []
  const hasContent = agent.previewScene || agent.lastSummary || warnings.length || unresolved.length || validationErrors.length || agent.requiresNewComponent

  if (!hasContent || agent.feedbackDismissed) return ''

  const feedback = buildAgentFeedbackModel()

  return `
    <section class="ds-preview-banner${agent.previewScene ? ' ds-preview-banner--active' : ''}${validationErrors.length ? ' ds-preview-banner--error' : ''}">
      <div class="ds-preview-banner__top">
        <div>
          <div class="ds-preview-banner__eyebrow">${agent.previewScene ? 'Preview active' : 'Agent feedback'}</div>
          <div class="ds-preview-banner__title">${escapeHtml(agent.previewScene ? 'Aperçu prêt à être appliqué' : feedback.title)}</div>
        </div>
        <div class="ds-preview-banner__actions">
          <button class="ds-btn" data-agent-action="preview">Preview</button>
          <button class="ds-btn" data-agent-action="apply" ${agent.previewScene ? '' : 'disabled'}>Apply</button>
          <button class="ds-btn ds-btn--danger" data-agent-action="clear-preview">Dismiss</button>
        </div>
      </div>
      ${!agent.previewScene ? `<div class="ds-preview-banner__callout${feedback.tone === 'warn' ? ' ds-preview-banner__callout--warn' : ''}${feedback.tone === 'error' ? ' ds-preview-banner__callout--error' : ''}">${escapeHtml(feedback.lead)}</div>` : ''}
      ${feedback.details.length ? `<details class="ds-preview-banner__details"><summary>Voir les détails</summary><div class="ds-preview-banner__group">${feedback.details.map(detail => `<div class="ds-preview-banner__item${feedback.tone === 'error' ? ' ds-preview-banner__item--error' : ''}">${escapeHtml(detail)}</div>`).join('')}</div></details>` : ''}
    </section>
  `
}

function renderCanvas() {
  const scene = getRenderedScene()
  const { selectedItemId, zoom } = getState()
  const notes = scene.notes || []
  const metrics = getCanvasMetrics(scene)

  return `
    <main class="ds-canvas-wrap">
      ${renderPreviewStatus()}
      <div class="ds-canvas-stage" style="width:${Math.round(metrics.width * zoom)}px;height:${Math.round(metrics.height * zoom)}px;">
        <div class="ds-canvas" id="ds-canvas" style="width:${metrics.width}px;height:${metrics.height}px;transform: scale(${zoom});">
          ${renderFrames(scene)}
          ${scene.items.length === 0 && notes.length === 0 ? '<div class="ds-empty">Ajoute un composant, une page ou une note depuis la library.</div>' : ''}
          ${notes.map(note => {
            const attachedItem = note.targetId ? scene.items.find(item => item.id === note.targetId) : null
            const noteX = attachedItem ? attachedItem.x + Math.max(16, attachedItem.width - 24) : note.x
            const noteY = attachedItem ? Math.max(24, attachedItem.y - 12) : note.y
            return `
            <section class="ds-note ${selectedItemId === note.id ? 'ds-note--selected' : ''}${note.open ? ' ds-note--open' : ''}" data-note-id="${note.id}" style="left:${noteX}px;top:${noteY}px;">
              <button class="ds-note__pin" data-note-drag-handle="${note.id}" data-action="toggle-note" data-note-id="${note.id}" title="Ouvrir ou fermer la note"></button>
              ${note.open ? `<div class="ds-note__popover"><div class="ds-note__title">Annotation</div><button class="ds-note__delete" data-action="delete-note-inline" data-note-id="${note.id}" title="Supprimer la note">×</button><div class="ds-note__text">${escapeHtml(note.text)}</div></div>` : ''}
            </section>
          `}).join('')}
          ${scene.items.map(item => {
            const entry = getEntryById(item.ref, item.kind)
            if (!entry) {
              return `
              <section class="ds-item ${selectedItemId === item.id ? 'ds-item--selected' : ''}" data-item-id="${item.id}" style="left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;">
                <div class="ds-item__toolbar" data-drag-handle="${item.id}">
                  <div><div class="ds-item__title">${escapeHtml(item.ref || 'Entrée inconnue')}</div><div class="ds-item__meta">missing registry entry</div></div>
                  <div class="ds-item__toolbar-actions"><button class="ds-badge ds-badge--button" data-action="add-note-to-item" data-item-id="${item.id}">note</button></div>
                </div>
                <div class="ds-item__frame" style="height: calc(100% - 41px); display:flex; align-items:center; justify-content:center; padding:16px; color:#94a3b8; text-align:center; background:rgba(15,23,42,0.08);">Référence introuvable dans le registry.<br>${escapeHtml(item.kind || 'item')} · ${escapeHtml(item.ref || 'unknown')}</div>
                <div class="ds-item__resize" data-resize-handle="${item.id}" title="Redimensionner"></div>
              </section>
            `
            }
            const url = buildRenderUrl(entry, item, getEntryById)
            return `
              <section class="ds-item ${selectedItemId === item.id ? 'ds-item--selected' : ''}" data-item-id="${item.id}" style="left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;">
                <div class="ds-item__toolbar" data-drag-handle="${item.id}">
                  <div><div class="ds-item__title">${escapeHtml(entry.name)}</div><div class="ds-item__meta">${escapeHtml(item.viewport || 'desktop')} · ${escapeHtml(entry.kind)} · ${escapeHtml(entry.level || '')}</div></div>
                  <div class="ds-item__toolbar-actions"><button class="ds-badge ds-badge--button" data-action="add-note-to-item" data-item-id="${item.id}">note</button><a class="ds-badge" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">ouvrir</a></div>
                </div>
                <iframe class="ds-item__frame" src="${escapeAttr(url)}" title="${escapeAttr(entry.name)}" style="height: calc(100% - 41px);"></iframe>
                <div class="ds-item__resize" data-resize-handle="${item.id}" title="Redimensionner"></div>
              </section>
            `
          }).join('')}
        </div>
      </div>
    </main>
  `
}

function renderDiffPanel() {
  const { baseScene } = getState()
  const diff = diffScenes(baseScene, getRenderedScene())
  const hasChanges = diff.sceneMeta.length || diff.items.length || diff.notes.length
  const summary = []

  if (diff.sceneMeta.length) summary.push(`${diff.sceneMeta.length} changement(s) de scène`)
  if (diff.items.length) summary.push(`${diff.items.length} item(s) modifié(s)`)
  if (diff.notes.length) summary.push(`${diff.notes.length} note(s) modifiée(s)`)

  if (!hasChanges) {
    return `
      <div class="ds-inspector-group">
        <h3 class="ds-inspector-group__title">État de travail</h3>
        <p class="ds-muted">Aucun écart avec la scène de base.</p>
      </div>
    `
  }

  return `
    <div class="ds-inspector-group">
      <h3 class="ds-inspector-group__title">État de travail</h3>
      <div class="ds-callout">
        <div class="ds-callout__title">Résumé</div>
        <div class="ds-callout__text">${escapeHtml(summary.join(' · '))}</div>
        <div class="ds-callout__text">Pour relire et partager les changements, privilégie une branche Git. Le détail technique reste disponible ci-dessous si besoin.</div>
      </div>
      <details class="ds-details">
        <summary class="ds-details__summary">Voir le détail technique</summary>
        <div class="ds-diff-list">
          ${diff.sceneMeta.length ? `
            <div class="ds-diff-card">
              <div class="ds-diff-card__title">Scène</div>
              ${diff.sceneMeta.map(change => `<div class="ds-diff-change"><code>${escapeHtml(change.key)}</code> : ${escapeHtml(String(change.before))} → ${escapeHtml(String(change.after))}</div>`).join('')}
            </div>
          ` : ''}
          ${diff.items.map(item => `
            <div class="ds-diff-card">
              <div class="ds-diff-card__title">Item ${escapeHtml(item.ref || item.id)}</div>
              <div class="ds-diff-card__meta">${escapeHtml(item.type)} · ${escapeHtml(item.kind || 'item')}</div>
              ${item.changes.map(change => `<div class="ds-diff-change"><code>${escapeHtml(change.scope || 'meta')}.${escapeHtml(change.key)}</code> : ${escapeHtml(String(change.before))} → ${escapeHtml(String(change.after))}</div>`).join('') || '<div class="ds-diff-change">Aucun détail.</div>'}
            </div>
          `).join('')}
          ${diff.notes.map(note => `
            <div class="ds-diff-card">
              <div class="ds-diff-card__title">Note ${escapeHtml(note.id)}</div>
              <div class="ds-diff-card__meta">${escapeHtml(note.type)}</div>
              ${note.changes.map(change => `<div class="ds-diff-change"><code>${escapeHtml(change.key)}</code> : ${escapeHtml(String(change.before))} → ${escapeHtml(String(change.after))}</div>`).join('') || '<div class="ds-diff-change">Aucun détail.</div>'}
            </div>
          `).join('')}
        </div>
      </details>
    </div>
  `
}

function renderInspectorWrapped() {
  return `<div data-ui-region="inspector">${renderInspector()}</div>`
}

function renderInspectorControl(item, key, ctrl, options = {}) {
  const value = options.value ?? item.params[key]
  const inputId = `ds-field-${item.id}-${options.scope || 'root'}-${key}`
  const label = options.label || ctrl.label
  const actionName = options.actionName || 'param-change'
  const extraAttrs = [
    `data-action="${actionName}"`,
    `data-item-id="${item.id}"`,
    options.dataPartId ? `data-part-id="${options.dataPartId}"` : '',
    options.dataCollectionId ? `data-collection-id="${options.dataCollectionId}"` : '',
    options.dataFamilyId ? `data-family-id="${options.dataFamilyId}"` : '',
    options.dataInstanceId ? `data-instance-id="${options.dataInstanceId}"` : '',
    options.dataLayoutGroupId ? `data-layout-group-id="${options.dataLayoutGroupId}"` : '',
    options.dataSection ? `data-section="${options.dataSection}"` : '',
    options.dataChildKey ? `data-child-key="${options.dataChildKey}"` : '',
    `data-key="${key}"`
  ].filter(Boolean).join(' ')
  if (ctrl.type === 'select') {
    return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(label)}</span><select class="ds-field__select" id="${inputId}" ${extraAttrs}>${(ctrl.options || []).map(option => `<option value="${escapeAttr(option)}"${String(option) === String(value) ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`
  }
  if (ctrl.type === 'checkbox') {
    return `<label class="ds-field__checkbox"><input type="checkbox" ${value ? 'checked' : ''} ${extraAttrs}><span>${escapeHtml(label)}</span></label>`
  }
  return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(label)}</span><input class="ds-field__input" id="${inputId}" type="text" value="${escapeAttr(value ?? '')}" ${extraAttrs}></label>`
}

function resolveAutoBoundParentKey(nodeId, node, parentEntry, childKey, section) {
  return resolveComposableParentParamKey(parentEntry, nodeId, node, childKey, section)
}

function collectNestedParentKeys(parentEntry) {
  const keys = {
    variants: new Set(),
    content: new Set()
  }

  const collectFromNode = (nodeId, node, childEntry) => {
    if (!childEntry) return
    for (const section of ['variants', 'content']) {
      for (const childKey of Object.keys(childEntry?.[section] || {})) {
        const explicitKey = node.binding?.[section]?.[childKey]
        if (explicitKey) {
          keys[section].add(explicitKey)
          continue
        }
        const autoBoundKey = resolveAutoBoundParentKey(nodeId, node, parentEntry, childKey, section)
        if (autoBoundKey) keys[section].add(autoBoundKey)
      }
    }
  }

  Object.entries(parentEntry.parts || {}).forEach(([partKey, part]) => {
    collectFromNode(partKey, part, getEntryById(part.component, 'component'))
  })

  Object.entries(parentEntry.collections || {}).forEach(([collectionKey, collection]) => {
    collectFromNode(collectionKey, collection, getEntryById(collection.itemComponent, 'component'))
  })

  Object.entries(parentEntry.families || {}).forEach(([familyKey, family]) => {
    collectFromNode(familyKey, family, getEntryById(family.component, 'component'))
  })

  Object.entries(parentEntry.instances || {}).forEach(([instanceKey, instance]) => {
    collectFromNode(instanceKey, instance, getEntryById(instance.component, 'component'))
  })

  Object.entries(parentEntry.layoutGroups || {}).forEach(([groupKey, group]) => {
    collectFromNode(groupKey, group, getEntryById(group.component, 'component'))
  })

  return keys
}

function getInspectorNodeBucket(item, nodeType, nodeId) {
  const definition = INSPECTOR_NODE_DEFINITIONS[nodeType]
  if (!definition) return null
  const rawState = item[definition.stateKey]?.[nodeId]
  return definition.stateMode === 'shared-bucket' ? rawState?.shared : rawState
}

function resolveBoundControls(item, parentEntry, childEntry, nodeType, nodeId, node = {}, section) {
  const bucket = getInspectorNodeBucket(item, nodeType, nodeId)
  return listComposableBindings(parentEntry, nodeId, node, childEntry)[section]
    .map(({ childKey, parentKey, childControl, parentControl }) => {
      return {
        childKey,
        parentKey,
        ctrl: parentControl || childControl,
        value: section === 'variants'
          ? bucket?.variants?.[childKey] ?? item.params?.[parentKey]
          : bucket?.content?.[childKey] ?? item.params?.[parentKey]
      }
    })
    .filter(Boolean)
}

function renderInspectorDrawer(item, parentEntry, nodeType, nodeId, node, label, childEntry, scopeId, emptyLabel) {
  const definition = INSPECTOR_NODE_DEFINITIONS[nodeType]
  if (!childEntry || !definition) return ''
  const drawerAttrs = `data-composable-drawer="${escapeAttr(`${nodeType}:${nodeId}`)}" data-item-id="${escapeAttr(item.id)}"`
  const shouldOpen = (
    pendingComposableDrawerFocus?.itemId === item.id &&
    pendingComposableDrawerFocus?.nodeType === nodeType &&
    pendingComposableDrawerFocus?.nodeId === nodeId
  ) || (
    activeComposableDrawer?.itemId === item.id &&
    activeComposableDrawer?.nodeType === nodeType &&
    activeComposableDrawer?.nodeId === nodeId
  )
  const variantControls = resolveBoundControls(item, parentEntry, childEntry, nodeType, nodeId, node, 'variants')
  const contentControls = resolveBoundControls(item, parentEntry, childEntry, nodeType, nodeId, node, 'content')
  if (!variantControls.length && !contentControls.length) {
    return `
      <details class="ds-inspector-group" ${drawerAttrs}${shouldOpen ? ' open' : ''}>
        <summary class="ds-inspector-group__title">${escapeHtml(label)}</summary>
        <p class="ds-muted">${escapeHtml(emptyLabel)}</p>
      </details>
    `
  }

  return `
    <details class="ds-inspector-group" ${drawerAttrs}${shouldOpen ? ' open' : ''}>
      <summary class="ds-inspector-group__title">${escapeHtml(label)} · ${escapeHtml(childEntry.name || childEntry.id)}</summary>
      ${variantControls.length ? `<div class="ds-inspector-group"><h4 class="ds-inspector-group__title">Variantes</h4>${variantControls.map(({ parentKey, ctrl, childKey, value }) => renderInspectorControl(item, parentKey, ctrl, {
        scope: scopeId,
        label: ctrl.label || childKey,
        value,
        actionName: definition.actionName,
        [definition.idAttr]: nodeId,
        dataSection: 'variants',
        dataChildKey: childKey
      })).join('')}</div>` : ''}
      ${contentControls.length ? `<div class="ds-inspector-group"><h4 class="ds-inspector-group__title">Contenu</h4>${contentControls.map(({ parentKey, ctrl, childKey, value }) => renderInspectorControl(item, parentKey, ctrl, {
        scope: scopeId,
        label: ctrl.label || childKey,
        value,
        actionName: definition.actionName,
        [definition.idAttr]: nodeId,
        dataSection: 'content',
        dataChildKey: childKey
      })).join('')}</div>` : ''}
      ${nodeType === 'layoutGroup' && Array.isArray(node.children) && node.children.length ? `<p class="ds-muted">Enfants : ${node.children.map(childId => escapeHtml(childId)).join(', ')}</p>` : ''}
    </details>
  `
}

function renderInspector() {
  const state = getState()
  const scene = getRenderedScene()
  const selectedNote = (scene.notes || []).find(note => note.id === state.selectedItemId)
  if (selectedNote) {
    return `
      <aside class="ds-panel">
        <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">Annotation liée au canvas</p></div>
        <div class="ds-panel__body">
          <div class="ds-inspector-group">
            <h3 class="ds-inspector-group__title">Note</h3>
            <label class="ds-field"><span class="ds-field__label">Texte</span><textarea class="ds-field__input" rows="8" data-action="note-text" data-note-id="${selectedNote.id}">${escapeHtml(selectedNote.text)}</textarea></label>
            <label class="ds-field__checkbox"><input type="checkbox" ${selectedNote.open ? 'checked' : ''} data-action="note-open" data-note-id="${selectedNote.id}"><span>Note ouverte</span></label>
            <label class="ds-field__checkbox"><input type="checkbox" ${selectedNote.targetId ? 'checked' : ''} data-action="note-attach-selected" data-note-id="${selectedNote.id}"><span>Lier à l'élément sélectionné si possible</span></label>
            <button class="ds-btn ds-btn--danger" data-action="delete-note" data-note-id="${selectedNote.id}">Supprimer la note</button>
            <p class="ds-muted">Position : ${selectedNote.x}px × ${selectedNote.y}px${selectedNote.targetId ? ` · liée à ${escapeHtml(selectedNote.targetId)}` : ''}</p>
          </div>
          ${renderDiffPanel()}
        </div>
      </aside>
    `
  }

  const item = scene.items.find(candidate => candidate.id === state.selectedItemId)
  if (!item) {
    return `
      <aside class="ds-panel">
        <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">Sélectionne un item du canvas</p></div>
        <div class="ds-panel__body"><p class="ds-muted">Aucun élément sélectionné.</p>${renderDiffPanel()}</div>
      </aside>
    `
  }

  const entry = getEntryById(item.ref, item.kind)
  if (!entry) {
    return `
      <aside class="ds-panel">
        <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">Référence introuvable</p></div>
        <div class="ds-panel__body">
          <div class="ds-inspector-group">
            <h3 class="ds-inspector-group__title">Item stale</h3>
            <p class="ds-muted">Cette scène référence un item absent du registry courant.</p>
            <p class="ds-muted">Kind : ${escapeHtml(item.kind || 'unknown')}</p>
            <p class="ds-muted">Ref : ${escapeHtml(item.ref || 'unknown')}</p>
            <p class="ds-muted">Position : ${item.x}px × ${item.y}px</p>
            <p class="ds-muted">Format : ${item.width}px × ${item.height}px</p>
          </div>
          ${renderDiffPanel()}
        </div>
      </aside>
    `
  }
  const suggestedTokens = getTokenSummaryForEntry(entry)
  const nestedParentKeys = collectNestedParentKeys(entry)

  const variants = Object.entries(entry.variants || {}).filter(([key]) => !nestedParentKeys.variants.has(key))
  const content = Object.entries(entry.content || {}).filter(([key]) => !nestedParentKeys.content.has(key))
  const parts = Object.entries(entry.parts || {})
  const collections = Object.entries(entry.collections || {})
  const families = Object.entries(entry.families || {})
  const instances = Object.entries(entry.instances || {})
  const layoutGroups = Object.entries(entry.layoutGroups || {})

  return `
    <aside class="ds-panel">
      <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">${escapeHtml(entry.name)} · ${escapeHtml(entry.kind)}</p></div>
      <div class="ds-panel__body">
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Instance</h3>
          <label class="ds-field"><span class="ds-field__label">Viewport</span><select class="ds-field__select" data-action="item-viewport" data-item-id="${item.id}">${Object.entries(getViewportDefinitions()).map(([key, vp]) => `<option value="${key}"${key === (item.viewport || 'desktop') ? ' selected' : ''}>${escapeHtml(vp.label)} · ${vp.breakpointValue} · ${escapeHtml(vp.breakpoint || '')}</option>`).join('')}</select></label>
          <p class="ds-muted">Format : ${item.width}px × ${item.height}px</p>
        </div>
        ${(variants.length || content.length) ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Props</h3>${variants.map(([key, ctrl]) => renderInspectorControl(item, key, ctrl)).join('')}${content.map(([key, ctrl]) => renderInspectorControl(item, key, ctrl)).join('')}</div>` : ''}
        ${parts.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Sous-composants</h3>${parts.map(([partKey, part]) => renderInspectorDrawer(item, entry, 'part', partKey, part, part.label || partKey, getEntryById(part.component, 'component'), `part-${partKey}`, 'Aucun champ editable mappe sur cette part.')).join('')}</div>` : ''}
        ${collections.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Collections</h3>${collections.map(([collectionKey, collection]) => renderInspectorDrawer(item, entry, 'collection', collectionKey, collection, collection.label || collectionKey, getEntryById(collection.itemComponent, 'component'), `collection-${collectionKey}`, 'Aucun champ bulk mappe sur cette collection.')).join('')}</div>` : ''}
        <div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Tokens suggérés</h3><div class="ds-token-list">${suggestedTokens.map(token => `<div class="ds-token"><div class="ds-token__top"><div class="ds-token__name">${escapeHtml(token.scssVar)}</div><span class="ds-badge">${escapeHtml(token.category)}</span></div><div class="ds-token__value">${escapeHtml(token.value)}</div></div>`).join('') || '<p class="ds-muted">Aucun token suggéré.</p>'}</div></div>
        ${renderDiffPanel()}
      </div>
    </aside>
  `
}

function renderTopbar() {
  const { scene, history, historyIndex, sceneFiles, activeSceneFile } = getState()
  const agent = getAgentState()
  const viewport = getViewportConfig(scene.viewport || 'desktop')
  const showSceneSelector = (sceneFiles || []).length > 1
  const zoomPercent = Math.round(getState().zoom * 100)
  return `
    <header class="ds-topbar">
      <div>
        <div class="ds-topbar__title">Design Surface</div>
        <div class="ds-topbar__meta">${escapeHtml(scene.name)} · ${scene.items.length} item(s) · ${(scene.notes || []).length} note(s) · viewport ${escapeHtml(viewport.label)} (${escapeHtml(viewport.breakpointValue || '')}, ${escapeHtml(viewport.breakpoint || '')})</div>
      </div>
      <div class="ds-topbar__actions">
        ${showSceneSelector ? `<select class="ds-field__select" data-action="scene-file" style="width: 180px;">${(sceneFiles || []).map(file => `<option value="${escapeAttr(file.file)}"${file.file === activeSceneFile ? ' selected' : ''}>${escapeHtml(file.name)}</option>`).join('')}</select>` : ''}
        <div class="ds-zoom-controls">
          <button class="ds-btn" data-action="zoom-out" title="Zoom arrière">−</button>
          <button class="ds-btn" data-action="zoom-reset" title="Réinitialiser le zoom">${zoomPercent}%</button>
          <button class="ds-btn" data-action="zoom-in" title="Zoom avant">+</button>
        </div>
        <div class="ds-history">
          <button class="ds-btn" data-action="undo" ${historyIndex <= 0 ? 'disabled' : ''}>Undo</button>
          <button class="ds-btn" data-action="redo" ${historyIndex >= history.length - 1 ? 'disabled' : ''}>Redo</button>
        </div>
        <button class="ds-btn" data-action="organize-canvas">Organize canvas</button>
        <button class="ds-btn ${agent.open ? 'ds-btn--active' : ''}" data-action="toggle-agent">Agent</button>
      </div>
    </header>
  `
}

function renderLayout() {
  const agent = getAgentState()
  const content = `${renderInspectorWrapped()}${renderCanvas()}${renderAgentPanel({ selectionHint: getAgentSelectionHint() })}`
  return `<div class="ds-app">${renderTopbar()}<div class="ds-layout ds-layout--no-nav${agent.open ? ' ds-layout--with-agent' : ''}">${content}</div></div>`
}

function setFramesInteractive(interactive) {
  if (!rootEl || frameInteractivityDisabled === !interactive) return
  frameInteractivityDisabled = !interactive
  rootEl.querySelectorAll('.ds-item__frame').forEach(frame => {
    frame.classList.toggle('ds-item__frame--inactive', !interactive)
  })
}

function bindGlobalPointerCleanup() {
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', handleGlobalPointerEnd)
  window.addEventListener('pointercancel', handleGlobalPointerEnd)
  window.addEventListener('blur', handleGlobalPointerEnd)
}

function unbindGlobalPointerCleanup() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', handleGlobalPointerEnd)
  window.removeEventListener('pointercancel', handleGlobalPointerEnd)
  window.removeEventListener('blur', handleGlobalPointerEnd)
}

function handleGlobalPointerEnd(event) {
  if (dragState && (!event || dragPointerId === null || event.pointerId === dragPointerId)) stopDrag()
  if (resizeState && (!event || resizePointerId === null || event.pointerId === resizePointerId)) stopResize()
  if (panState && (!event || panState.pointerId === null || event.pointerId === panState.pointerId)) stopPan()
}

function startDrag(kind, targetId, event) {
  if (spacePanPressed) {
    startPan(event)
    return
  }

  const state = getState()
  const scene = getRenderedScene()
  const collection = kind === 'note' ? (scene.notes || []) : scene.items
  const target = collection.find(candidate => candidate.id === targetId)
  if (!target) return

  dragPointerId = event.pointerId ?? null
  dragState = {
    kind,
    targetId,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startX: target.x,
    startY: target.y,
    targetEl: kind === 'note'
      ? rootEl?.querySelector(`[data-note-id="${targetId}"]`)
      : rootEl?.querySelector(`[data-item-id="${targetId}"]`)
  }

  selectItem(targetId)
  setPersistMuted(true)
  setFramesInteractive(false)
  document.body.style.cursor = 'grabbing'
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {}
  bindGlobalPointerCleanup()
}

function snapToGrid(value, size = 24) {
  return Math.round(value / size) * size
}

function setSpacePanPressed(nextValue) {
  spacePanPressed = Boolean(nextValue)
  rootEl?.querySelector('.ds-canvas-wrap')?.classList.toggle('ds-canvas-wrap--space-pan', spacePanPressed)
}

function getZoomFactor() {
  return getState().zoom || 1
}

function setCanvasZoom(nextZoom) {
  patchState({ zoom: Math.min(Math.max(Number(nextZoom) || 1, 0.5), 2) })
}

function shiftZoom(step) {
  const current = getZoomFactor()
  setCanvasZoom(Math.round((current + step) * 100) / 100)
}

function updateSceneLaneWidth(laneKey, width) {
  const currentScene = getRenderedScene()
  const previousLayout = buildLaneLayout(currentScene)
  const nextScene = {
    ...currentScene,
    laneWidths: {
      ...(currentScene.laneWidths || {}),
      [laneKey]: width
    }
  }
  const nextLayout = buildLaneLayout(nextScene)

  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      laneWidths: {
        ...(prev.scene.laneWidths || {}),
        [laneKey]: width
      },
      items: prev.scene.items.map(item => {
        const entry = getEntryById(item.ref, item.kind)
        if (!entry) return item
        const key = getLaneConfig(entry).key
        if (key === laneKey) return item

        const prevLane = previousLayout.get(key)
        const nextLane = nextLayout.get(key)
        if (!prevLane || !nextLane) return item
        const shiftX = nextLane.x - prevLane.x
        if (!shiftX) return item

        return {
          ...item,
          x: item.x + shiftX
        }
      })
    }
  }))
  commitSceneHistory()
}

function maybeExpandLaneForItem(itemId, nextX, itemWidth) {
  const scene = getRenderedScene()
  const item = scene.items.find(candidate => candidate.id === itemId)
  if (!item) return
  const entry = getEntryById(item.ref, item.kind)
  if (!entry) return

  const laneKey = getLaneConfig(entry).key
  const lane = buildLaneLayout(scene).get(laneKey)
  if (!lane) return

  const requiredWidth = Math.max(lane.width, (nextX - lane.x) + itemWidth + 32)
  if (requiredWidth > lane.width) {
    updateSceneLaneWidth(laneKey, snapToGrid(requiredWidth))
  }
}

function clampItemToLane(item, x, y) {
  const entry = getEntryById(item.ref, item.kind)
  if (!entry) return { x, y }
  const lane = buildLaneLayout(getRenderedScene()).get(getLaneConfig(entry).key) || getLaneConfig(entry)
  const maxY = lane.y + lane.height - Math.min(item.height, lane.height)
  return {
    x: Math.max(x, lane.x),
    y: Math.min(Math.max(y, lane.contentY), Math.max(lane.contentY, maxY))
  }
}

function startPan(event) {
  const canvasWrap = rootEl?.querySelector('.ds-canvas-wrap')
  if (!canvasWrap) return

  event.preventDefault()
  event.stopPropagation()

  panState = {
    pointerId: event.pointerId ?? null,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startScrollLeft: canvasWrap.scrollLeft,
    startScrollTop: canvasWrap.scrollTop,
    targetEl: canvasWrap
  }

  setFramesInteractive(false)
  document.body.style.cursor = 'grab'
  canvasWrap.classList.add('ds-canvas-wrap--panning')
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {}
  bindGlobalPointerCleanup()
}

function onDragMove(event) {
  if (panState?.targetEl) {
    const deltaX = event.clientX - panState.startMouseX
    const deltaY = event.clientY - panState.startMouseY
    panState.targetEl.scrollLeft = panState.startScrollLeft - deltaX
    panState.targetEl.scrollTop = panState.startScrollTop - deltaY
    return
  }
  if (!dragState?.targetEl) return
  const zoom = getZoomFactor()
  const deltaX = (event.clientX - dragState.startMouseX) / zoom
  const deltaY = (event.clientY - dragState.startMouseY) / zoom
  let x = Math.max(0, snapToGrid(dragState.startX + deltaX))
  let y = Math.max(0, snapToGrid(dragState.startY + deltaY))

  if (dragState.kind === 'item') {
    const item = getRenderedScene().items.find(candidate => candidate.id === dragState.targetId)
    if (item) {
      const clamped = clampItemToLane(item, x, y)
      x = clamped.x
      y = clamped.y
    }
  }

  dragState.lastX = x
  dragState.lastY = y
  dragState.targetEl.style.left = `${x}px`
  dragState.targetEl.style.top = `${y}px`
}

function stopDrag() {
  if (dragState) {
    const patch = {
      x: dragState.lastX ?? dragState.startX,
      y: dragState.lastY ?? dragState.startY
    }
    if (dragState.kind === 'note') {
      updateNote(dragState.targetId, { ...patch, targetId: null })
    } else {
      updateItem(dragState.targetId, patch)
      const item = getRenderedScene().items.find(candidate => candidate.id === dragState.targetId)
      if (item) maybeExpandLaneForItem(item.id, patch.x, item.width)
    }
  }
  setPersistMuted(false)
  dragState = null
  dragPointerId = null
  if (!resizeState) setFramesInteractive(true)
  document.body.style.cursor = resizeState ? 'nwse-resize' : ''
  if (!resizeState) unbindGlobalPointerCleanup()
  render()
}

function stopPan() {
  if (!panState) return
  panState.targetEl?.classList.remove('ds-canvas-wrap--panning')
  panState = null
  suppressNextClickUntil = Date.now() + 150
  if (!dragState && !resizeState) setFramesInteractive(true)
  document.body.style.cursor = ''
  if (!dragState && !resizeState) unbindGlobalPointerCleanup()
}

function preserveCanvasScroll(left, top) {
  const canvasWrap = rootEl?.querySelector('.ds-canvas-wrap')
  if (!canvasWrap) return

  const apply = () => {
    canvasWrap.scrollLeft = left
    canvasWrap.scrollTop = top
  }

  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

function startResize(itemId, event) {
  if (spacePanPressed) {
    startPan(event)
    return
  }

  const item = getRenderedScene().items.find(candidate => candidate.id === itemId)
  if (!item) return

  resizePointerId = event.pointerId ?? null
  resizeState = {
    itemId,
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startWidth: item.width,
    startHeight: item.height,
    targetEl: rootEl?.querySelector(`[data-item-id="${itemId}"]`)
  }

  selectItem(itemId)
  setFramesInteractive(false)
  document.body.style.cursor = 'nwse-resize'
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {}
  bindGlobalPointerCleanup()
}

function startLaneResize(laneKey, event) {
  if (spacePanPressed) {
    startPan(event)
    return
  }

  const lane = buildLaneLayout(getRenderedScene()).get(laneKey)
  if (!lane) return

  resizePointerId = event.pointerId ?? null
  resizeState = {
    kind: 'lane',
    laneKey,
    startMouseX: event.clientX,
    startWidth: lane.width,
    targetEl: rootEl?.querySelector(`[data-lane-resize-handle="${laneKey}"]`)?.closest('.ds-lane')
  }

  document.body.style.cursor = 'ew-resize'
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {}
  bindGlobalPointerCleanup()
}

function onResizeMove(event) {
  if (!resizeState?.targetEl) return
  const zoom = getZoomFactor()
  const deltaX = (event.clientX - resizeState.startMouseX) / zoom

  if (resizeState.kind === 'lane') {
    const width = Math.max(220, snapToGrid(resizeState.startWidth + deltaX))
    resizeState.lastWidth = width
    resizeState.targetEl.style.width = `${width}px`
    return
  }

  const deltaY = (event.clientY - resizeState.startMouseY) / zoom
  const width = Math.max(220, Math.round(resizeState.startWidth + deltaX))
  const height = Math.max(140, Math.round(resizeState.startHeight + deltaY))
  resizeState.lastWidth = width
  resizeState.lastHeight = height
  resizeState.targetEl.style.width = `${width}px`
  resizeState.targetEl.style.height = `${height}px`
}

function stopResize() {
  if (resizeState) {
    if (resizeState.kind === 'lane') {
      updateSceneLaneWidth(resizeState.laneKey, resizeState.lastWidth ?? resizeState.startWidth)
    } else {
      updateItem(resizeState.itemId, {
        width: resizeState.lastWidth ?? resizeState.startWidth,
        height: resizeState.lastHeight ?? resizeState.startHeight
      })
    }
  }
  resizeState = null
  resizePointerId = null
  if (!dragState) setFramesInteractive(true)
  document.body.style.cursor = dragState ? 'grabbing' : ''
  if (!dragState) unbindGlobalPointerCleanup()
  render()
}

function extractPreviewComposableTarget(frame, candidate, pointerEvent = null) {
  const itemId = frame.closest('.ds-item')?.dataset.itemId
  if (!itemId || !candidate) return null

  const item = getRenderedScene().items.find(entry => entry.id === itemId)
  const parentEntry = item ? getEntryById(item.ref, item.kind) : null
  if (!parentEntry) return null

  // Cas 1 : wrapper annoté explicitement par le parent (data-gf-child-component)
  // Cas 2 : composant auto-détecté via son propre data-gf-component (pas de wrapper parent)
  const isAutoDetected = !candidate.dataset.gfChildComponent && !!candidate.dataset.gfComponent
  const nodeType = isAutoDetected ? 'part' : (candidate.dataset.gfNodeType || 'part')
  const childComponent = isAutoDetected
    ? candidate.dataset.gfComponent
    : (candidate.dataset.gfChildComponent || '')

  if (!SUPPORTED_PREVIEW_NODE_TYPES.has(nodeType) || !childComponent) return null

  // Pour les composants auto-détectés, ignorer ceux qui correspondent au composant parent lui-même
  if (isAutoDetected && childComponent === item.ref) return null

  const frameRect = frame.getBoundingClientRect()
  const candidateRect = candidate.getBoundingClientRect()
  const scaleX = frame.clientWidth ? frameRect.width / frame.clientWidth : 1
  const scaleY = frame.clientHeight ? frameRect.height / frame.clientHeight : 1
  const pointerX = pointerEvent
    ? (frameRect.left + (pointerEvent.clientX * scaleX))
    : (frameRect.left + (candidateRect.left * scaleX))
  const pointerY = pointerEvent
    ? (frameRect.top + (pointerEvent.clientY * scaleY))
    : (frameRect.top + (candidateRect.top * scaleY))

  const closestGrid = candidate.parentElement?.closest?.('[data-gf-component="grid"]')
  const gridCellEl = closestGrid
    ? [...closestGrid.children].find(c => c === candidate || c.contains(candidate))
    : null
  const gridCellIndex = (gridCellEl && closestGrid)
    ? [...closestGrid.children].indexOf(gridCellEl)
    : null
  const gridTotalCells = closestGrid ? closestGrid.children.length : null

  return {
    itemId,
    nodeType,
    nodeId: isAutoDetected ? null : (candidate.dataset.gfNodeId || null),
    childComponent,
    label: isAutoDetected ? childComponent : (candidate.dataset.gfNodeLabel || childComponent),
    exposed: isAutoDetected ? false : (candidate.dataset.gfExposed !== 'false'),
    metaPath: `${parentEntry.path}.json`,
    x: pointerX + 12,
    y: pointerY + 12,
    width: candidateRect.width,
    height: candidateRect.height,
    gridCellIndex,
    gridTotalCells
  }
}

function bindPreviewComposableHoverDocument(frame) {
  const doc = frame.contentDocument
  if (!doc || doc.documentElement.dataset.gfComposableHoverBound === 'true') return

  const onPointerMove = event => {
    if (frameInteractivityDisabled) {
      clearPreviewComposableTarget()
      return
    }

    // Priorité 1 : wrapper annoté explicitement par le parent
    let candidate = event.target?.closest?.('[data-gf-child-component]')

    // Priorité 2 : composant auto-détecté via son propre attribut racine
    if (!candidate) {
      const componentRoot = event.target?.closest?.('[data-gf-component]')
      if (componentRoot) {
        // Si un wrapper parent annoté existe au-dessus, l'utiliser à la place
        const parentWrapper = componentRoot.parentElement?.closest?.('[data-gf-child-component]')
        candidate = parentWrapper || componentRoot
      }
    }

    // Détection grille : cellule survolée dans un [data-gf-component="grid"]
    const gridEl = event.target?.closest?.('[data-gf-component="grid"]')
    if (gridEl && gridEl.children.length > 0) {
      const children = [...gridEl.children]
      const hoveredCell = children.find(c => c === event.target || c.contains(event.target))
      const hoveredIndex = hoveredCell ? children.indexOf(hoveredCell) : 0
      let needsUpdate = false
      if (gridCellOverlayState?.gridEl !== gridEl) {
        const frameRect = frame.getBoundingClientRect()
        const scaleX = frame.clientWidth ? frameRect.width / frame.clientWidth : 1
        const scaleY = frame.clientHeight ? frameRect.height / frame.clientHeight : 1
        const itemId = frame.closest('.ds-item')?.dataset.itemId
        const cells = children.map(child => {
          const r = child.getBoundingClientRect()
          return {
            vLeft: Math.round(frameRect.left + r.left * scaleX),
            vTop: Math.round(frameRect.top + r.top * scaleY),
            vWidth: Math.round(r.width * scaleX),
            vHeight: Math.round(r.height * scaleY),
            childComponent: child.dataset.gfComponent || null
          }
        })
        gridCellOverlayState = { gridEl, cells, hoveredIndex, itemId }
        needsUpdate = true
      } else if (gridCellOverlayState.hoveredIndex !== hoveredIndex) {
        gridCellOverlayState = { ...gridCellOverlayState, hoveredIndex }
        needsUpdate = true
      }
      if (needsUpdate) updateGridCellOverlay()
      if (!candidate) return
    } else if (gridCellOverlayState) {
      clearGridCellOverlay()
    }

    if (!candidate) {
      if (previewComposableTarget?.itemId === frame.closest('.ds-item')?.dataset.itemId) {
        scheduleClearPreviewComposableTarget()
      }
      return
    }

    const target = extractPreviewComposableTarget(frame, candidate, event)
    if (target) setPreviewComposableTarget(target)
  }

  const onPointerLeave = () => {
    if (previewComposableTarget?.itemId === frame.closest('.ds-item')?.dataset.itemId) {
      scheduleClearPreviewComposableTarget()
    }
    scheduleClearGridCellOverlay()
  }

  doc.addEventListener('pointermove', onPointerMove)
  doc.addEventListener('pointerleave', onPointerLeave)
  doc.documentElement.dataset.gfComposableHoverBound = 'true'
}

function bindPreviewComposableHoverEvents() {
  rootEl.querySelectorAll('.ds-item__frame').forEach(frame => {
    if (frame.dataset.gfComposableHoverFrameBound !== 'true') {
      frame.addEventListener('load', () => {
        bindPreviewComposableHoverDocument(frame)
        const itemId = frame.closest('.ds-item')?.dataset.itemId
        if (itemId) applyGridCellStyles(itemId)
      })
      frame.addEventListener('mouseleave', () => {
        if (previewComposableTarget?.itemId === frame.closest('.ds-item')?.dataset.itemId) {
          scheduleClearPreviewComposableTarget()
        }
        scheduleClearGridCellOverlay()
      })
      frame.dataset.gfComposableHoverFrameBound = 'true'
    }

    bindPreviewComposableHoverDocument(frame)
  })
}

function applyGridCellStyles(itemId) {
  const item = getState().scene.items.find(i => i.id === itemId)
  if (!item) return
  const gridCells = item.gridCells || {}
  const frame = rootEl?.querySelector(`.ds-item[data-item-id="${CSS.escape(itemId)}"] .ds-item__frame`)
  if (!frame?.contentDocument) return
  frame.contentDocument.querySelectorAll('[data-gf-component="grid"]').forEach(gridEl => {
    ;[...gridEl.children].forEach((child, index) => {
      const span = gridCells[index]?.span
      child.style.gridColumn = span ? `span ${span}` : ''
    })
  })
}

function updateGridCellSpan(itemId, cellIndex, span) {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: prev.scene.items.map(item => {
        if (item.id !== itemId) return item
        const gridCells = { ...(item.gridCells || {}) }
        if (!span || span === 'auto') {
          delete gridCells[cellIndex]
        } else {
          gridCells[cellIndex] = { span: parseInt(span, 10) }
        }
        return { ...item, gridCells }
      })
    }
  }))
  applyGridCellStyles(itemId)
  commitSceneHistory()
}

function ensureGridOverlayEl() {
  let el = document.getElementById('ds-grid-overlay')
  if (el) return el
  el = document.createElement('div')
  el.id = 'ds-grid-overlay'
  el.className = 'ds-grid-overlay'
  el.hidden = true
  document.body.appendChild(el)
  return el
}

function clearGridCellOverlay() {
  if (gridCellClearTimeout) { clearTimeout(gridCellClearTimeout); gridCellClearTimeout = null }
  gridCellOverlayState = null
  const el = document.getElementById('ds-grid-overlay')
  if (el) el.hidden = true
}

function scheduleClearGridCellOverlay() {
  if (gridCellClearTimeout) clearTimeout(gridCellClearTimeout)
  gridCellClearTimeout = setTimeout(() => {
    gridCellClearTimeout = null
    clearGridCellOverlay()
  }, 180)
}

function updateGridCellOverlay() {
  if (!gridCellOverlayState) { clearGridCellOverlay(); return }
  const { cells, hoveredIndex } = gridCellOverlayState
  const el = ensureGridOverlayEl()

  el.innerHTML = cells.map((cell, i) => {
    const isHovered = i === hoveredIndex
    const style = `left:${cell.vLeft}px;top:${cell.vTop}px;width:${cell.vWidth}px;height:${cell.vHeight}px`
    return `<div class="ds-grid-cell${isHovered ? ' ds-grid-cell--hovered' : ''}" style="${style}"></div>`
  }).join('')

  el.hidden = false
}

function ensureComposablePopoverElement() {
  let el = document.getElementById('ds-composable-popover')
  if (el) return el
  el = document.createElement('div')
  el.id = 'ds-composable-popover'
  el.className = 'ds-composable-popover'
  el.hidden = true
  document.body.appendChild(el)
  return el
}

function closeComposablePopover() {
  composablePopoverState = null
  const el = document.getElementById('ds-composable-popover')
  if (el) el.hidden = true
}

function openComposablePopover(itemId, nodeId, anchorX, anchorY, gridContext = null) {
  const item = getState().scene.items.find(i => i.id === itemId)
  const parentEntry = item ? getEntryById(item.ref, item.kind) : null
  const node = parentEntry?.parts?.[nodeId]
  const childEntry = node ? getEntryById(node.component, 'component') : null
  if (!item || !parentEntry || !node || !childEntry) return

  composablePopoverState = { itemId, nodeId, anchorX, anchorY, gridContext }
  renderComposablePopover()
}

function renderComposablePopover() {
  if (!composablePopoverState) { closeComposablePopover(); return }
  const { itemId, nodeId, anchorX, anchorY, gridContext } = composablePopoverState
  const item = getState().scene.items.find(i => i.id === itemId)
  const parentEntry = item ? getEntryById(item.ref, item.kind) : null
  const node = parentEntry?.parts?.[nodeId]
  const childEntry = node ? getEntryById(node.component, 'component') : null
  if (!item || !node || !childEntry) { closeComposablePopover(); return }

  const el = ensureComposablePopoverElement()
  const bucket = item.partsState?.[nodeId] || { variants: {}, content: {} }

  const buildControl = (key, ctrl, section) => {
    const value = bucket[section]?.[key] ?? ctrl.default ?? ''
    const inputId = `ds-popover-${escapeAttr(nodeId)}-${section}-${key}`
    const attrs = `data-action="composable-popover-change" data-item-id="${escapeAttr(itemId)}" data-node-id="${escapeAttr(nodeId)}" data-child-key="${escapeAttr(key)}" data-section="${section}"`
    if (ctrl.type === 'select') {
      return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(ctrl.label)}</span><select class="ds-field__select" id="${inputId}" ${attrs}>${(ctrl.options || []).map(opt => `<option value="${escapeAttr(opt)}"${String(opt) === String(value) ? ' selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`
    }
    if (ctrl.type === 'checkbox') {
      return `<label class="ds-field__checkbox"><input type="checkbox" ${value ? 'checked' : ''} ${attrs}><span>${escapeHtml(ctrl.label)}</span></label>`
    }
    return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(ctrl.label)}</span><input class="ds-field__input" id="${inputId}" type="text" value="${escapeAttr(value ?? '')}" ${attrs}></label>`
  }

  const variantControls = Object.entries(childEntry.variants || {}).map(([key, ctrl]) => buildControl(key, ctrl, 'variants')).join('')
  const contentControls = Object.entries(childEntry.content || {}).map(([key, ctrl]) => buildControl(key, ctrl, 'content')).join('')

  const currentSpan = gridContext !== null
    ? (item.gridCells?.[gridContext.cellIndex]?.span ?? 'auto')
    : null
  const spanOptions = ['auto', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .map(v => {
      const label = v === 'auto' ? 'Auto' : `${v} / 12`
      const selected = String(currentSpan) === String(v) ? ' selected' : ''
      return `<option value="${v}"${selected}>${label}</option>`
    }).join('')
  const gridSection = gridContext !== null
    ? `<div class="ds-composable-popover__group">
        <h4 class="ds-composable-popover__group-title">Grille — cellule ${gridContext.cellIndex + 1} / ${gridContext.totalCells}</h4>
        <label class="ds-field">
          <span class="ds-field__label">Colonnes</span>
          <select class="ds-field__select" data-action="grid-cell-span-change" data-item-id="${escapeAttr(itemId)}" data-cell-index="${gridContext.cellIndex}">${spanOptions}</select>
        </label>
       </div>`
    : ''

  el.innerHTML = `
    <div class="ds-composable-popover__header">
      <span class="ds-composable-popover__title">
        ${escapeHtml(childEntry.name || node.component)}
        <span class="ds-composable-popover__node">${escapeHtml(node.label || nodeId)}</span>
      </span>
      <button type="button" class="ds-composable-popover__close" aria-label="Fermer">✕</button>
    </div>
    <div class="ds-composable-popover__body">
      ${gridSection}
      ${variantControls ? `<div class="ds-composable-popover__group"><h4 class="ds-composable-popover__group-title">Variantes</h4>${variantControls}</div>` : ''}
      ${contentControls ? `<div class="ds-composable-popover__group"><h4 class="ds-composable-popover__group-title">Contenu</h4>${contentControls}</div>` : ''}
    </div>
  `
  el.hidden = false

  const pad = 12
  const elW = el.offsetWidth || 280
  const elH = el.offsetHeight || 300
  const left = Math.min(Math.max(pad, anchorX), window.innerWidth - elW - pad)
  const top = Math.min(Math.max(pad, anchorY), window.innerHeight - elH - pad)
  el.style.left = `${left}px`
  el.style.top = `${top}px`

  el.querySelectorAll('[data-action="composable-popover-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updatePartParams(input.dataset.itemId, input.dataset.nodeId, { [input.dataset.childKey]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  el.querySelectorAll('[data-action="grid-cell-span-change"]').forEach(select => {
    select.addEventListener('change', () => {
      updateGridCellSpan(select.dataset.itemId, parseInt(select.dataset.cellIndex, 10), select.value)
    })
  })
  el.querySelector('.ds-composable-popover__close')?.addEventListener('click', closeComposablePopover)
}

async function handlePreviewComposableEdit() {
  const target = previewComposableTarget
  if (!target) return

  clearPreviewComposableTarget()

  const gridContext = (target.gridCellIndex !== null && target.gridCellIndex !== undefined)
    ? { cellIndex: target.gridCellIndex, totalCells: target.gridTotalCells }
    : null

  if (target.exposed && target.nodeId) {
    openComposablePopover(target.itemId, target.nodeId, target.x, target.y, gridContext)
    return
  }

  try {
    const result = await exposeComposableChildPart({
      metaPath: target.metaPath,
      childComponent: target.childComponent,
      preferredNodeId: target.childComponent,
      label: target.label
    })
    await loadRegistry()
    syncSceneItemsWithRegistry()
    openComposablePopover(target.itemId, result.nodeId, target.x, target.y, gridContext)
  } catch (error) {
    console.error('[design-surface] preview child exposure failed', error)
    window.alert(error?.message || 'Impossible d\'exposer ce sous-composant.')
  }
}

function bindAgentEvents() {
  rootEl.querySelector('[data-agent-action="input"]')?.addEventListener('input', event => {
    patchAgentState({ input: event.target.value, runtimeError: '' }, { silent: true })
  })
  rootEl.querySelector('[data-agent-action="input"]')?.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleAgentSubmit().catch(error => patchAgentState({ runtimeError: error.message || 'Runtime error' }))
    }
  })
  rootEl.querySelector('[data-agent-action="submit-request"]')?.addEventListener('click', () => { handleAgentSubmit().catch(error => patchAgentState({ runtimeError: error.message || 'Runtime error' })) })
  rootEl.querySelector('[data-agent-action="preview"]')?.addEventListener('click', handleAgentPreview)
  rootEl.querySelector('[data-agent-action="apply"]')?.addEventListener('click', handleAgentApply)
  rootEl.querySelector('[data-agent-action="clear-preview"]')?.addEventListener('click', handleAgentClearPreview)

  rootEl.querySelector('[data-agent-action="input"]')?.setAttribute('aria-label', getAgentSelectionHint())
}

function bindTopbarMenus() {
  const menus = [...rootEl.querySelectorAll('.ds-menu')]
  menus.forEach(menu => {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return
      menus.forEach(other => {
        if (other !== menu) other.removeAttribute('open')
      })
    })
  })
}

function bindSelectionDependentEvents() {
  rootEl.querySelectorAll('[data-action="note-text"]').forEach(textarea => {
    textarea.addEventListener('change', () => updateNote(textarea.dataset.noteId, { text: textarea.value }))
    textarea.addEventListener('blur', () => updateNote(textarea.dataset.noteId, { text: textarea.value }))
  })
  rootEl.querySelectorAll('[data-action="note-open"]').forEach(input => input.addEventListener('change', () => updateNote(input.dataset.noteId, { open: input.checked })))
  rootEl.querySelectorAll('[data-action="delete-note"]').forEach(button => button.addEventListener('click', () => removeNote(button.dataset.noteId)))
  rootEl.querySelectorAll('[data-action="note-attach-selected"]').forEach(input => input.addEventListener('change', () => {
    const selectedItem = getSelectedSceneItem()
    updateNote(input.dataset.noteId, { targetId: input.checked ? (selectedItem?.id || null) : null })
  }))
  rootEl.querySelectorAll('[data-action="item-viewport"]').forEach(select => select.addEventListener('change', () => {
    const item = getRenderedScene().items.find(candidate => candidate.id === select.dataset.itemId)
    if (!item) return
    const entry = getEntryById(item.ref, item.kind)
    if (!entry) return
    const viewport = select.value
    const dimensions = getItemDimensions(entry, viewport)
    setState(prev => ({
      ...prev,
      scene: {
        ...prev.scene,
        viewport,
        items: prev.scene.items.map(candidate => candidate.id === select.dataset.itemId ? {
          ...candidate,
          viewport,
          width: dimensions.width,
          height: dimensions.height
        } : candidate)
      }
    }))
    commitSceneHistory()
  }))
  rootEl.querySelectorAll('[data-action="item-prop"]').forEach(input => input.addEventListener('input', () => {
    const value = Number(input.value)
    if (Number.isFinite(value) && value > 0) updateItem(input.dataset.itemId, { [input.dataset.key]: value })
  }))
  rootEl.querySelectorAll('[data-action="param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updateItemParams(input.dataset.itemId, { [input.dataset.key]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="part-param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updatePartParams(input.dataset.itemId, input.dataset.partId, { [input.dataset.childKey]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="collection-param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updateCollectionParams(input.dataset.itemId, input.dataset.collectionId, { [input.dataset.childKey]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="family-param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updateFamilyParams(input.dataset.itemId, input.dataset.familyId, { [input.dataset.childKey]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="instance-param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updateInstanceParams(input.dataset.itemId, input.dataset.instanceId, { [input.dataset.childKey]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="layout-group-param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updateLayoutGroupParams(input.dataset.itemId, input.dataset.layoutGroupId, { [input.dataset.childKey]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
}

function bindEvents() {
  rootEl.addEventListener('click', event => {
    if (Date.now() <= suppressNextClickUntil) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, true)
  rootEl.querySelectorAll('[data-action="add-note-to-item"]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation()
    addNote(button.dataset.itemId)
  }))
  rootEl.querySelectorAll('.ds-item__toolbar-actions button, .ds-item__toolbar-actions a').forEach(control => {
    control.addEventListener('pointerdown', event => event.stopPropagation())
  })
  rootEl.querySelectorAll('.ds-item').forEach(element => element.addEventListener('click', () => { if (element.dataset.itemId) selectItem(element.dataset.itemId) }))
  rootEl.querySelectorAll('.ds-note').forEach(element => element.addEventListener('click', () => { if (element.dataset.noteId) selectItem(element.dataset.noteId) }))
  rootEl.querySelectorAll('[data-action="toggle-note"]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation()
    const noteId = button.dataset.noteId
    const note = getRenderedScene().notes?.find(candidate => candidate.id === noteId)
    if (!note) return
    updateNote(noteId, { open: !note.open })
  }))
  rootEl.querySelectorAll('[data-action="delete-note-inline"]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation()
    removeNote(button.dataset.noteId)
  }))
  rootEl.querySelectorAll('[data-drag-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); startDrag('item', handle.dataset.dragHandle, event) }))
  rootEl.querySelectorAll('[data-note-drag-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); startDrag('note', handle.dataset.noteDragHandle, event) }))
  rootEl.querySelectorAll('[data-resize-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); startResize(handle.dataset.resizeHandle, event) }))
  rootEl.querySelectorAll('[data-lane-resize-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); startLaneResize(handle.dataset.laneResizeHandle, event) }))
  bindSelectionDependentEvents()
  rootEl.querySelector('[data-action="scene-file"]')?.addEventListener('change', event => loadSceneFromFile(event.target.value))
  rootEl.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => shiftZoom(-0.1))
  rootEl.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => shiftZoom(0.1))
  rootEl.querySelector('[data-action="zoom-reset"]')?.addEventListener('click', () => setCanvasZoom(1))
  rootEl.querySelector('[data-action="undo"]')?.addEventListener('click', undoHistory)
  rootEl.querySelector('[data-action="redo"]')?.addEventListener('click', redoHistory)
  rootEl.querySelector('[data-action="organize-canvas"]')?.addEventListener('click', organizeCanvas)
  rootEl.querySelector('[data-action="toggle-agent"]')?.addEventListener('click', toggleAgentPanel)
  rootEl.querySelector('[data-action="preview-composable-edit"]')?.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    handlePreviewComposableEdit().catch(error => {
      console.error('[design-surface] preview composable edit failed', error)
      window.alert(error?.message || "Impossible d'éditer ce sous-composant.")
    })
  })
  rootEl.querySelector('[data-action="preview-composable-edit"]')?.addEventListener('mouseenter', () => {
    previewComposableActionHovered = true
    if (previewComposableClearTimeout) {
      clearTimeout(previewComposableClearTimeout)
      previewComposableClearTimeout = null
    }
  })
  rootEl.querySelector('[data-action="preview-composable-edit"]')?.addEventListener('mouseleave', () => {
    previewComposableActionHovered = false
    scheduleClearPreviewComposableTarget()
  })
  bindTopbarMenus()
  bindAgentEvents()
  bindCanvasZoomInteractions()
  bindCanvasPanInteractions()
  bindPreviewComposableHoverEvents()
}

function bindCanvasZoomInteractions() {
  canvasWheelAbortController?.abort()
  canvasWheelAbortController = new AbortController()

  rootEl.querySelector('.ds-canvas-wrap')?.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    shiftZoom(event.deltaY > 0 ? -0.1 : 0.1)
  }, { passive: false, signal: canvasWheelAbortController.signal })
}

function bindCanvasPanInteractions() {
  canvasPanAbortController?.abort()
  keyboardAbortController?.abort()
  canvasPanAbortController = new AbortController()
  keyboardAbortController = new AbortController()

  window.addEventListener('keydown', event => {
    if (event.repeat) return
    if (event.code !== 'Space') return
    const targetTag = event.target?.tagName
    const isEditable = event.target?.isContentEditable
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || isEditable) return
    event.preventDefault()
    event.stopPropagation()
    setSpacePanPressed(true)
  }, { capture: true, signal: keyboardAbortController.signal })

  window.addEventListener('keypress', event => {
    if (event.code !== 'Space') return
    event.preventDefault()
    event.stopPropagation()
  }, { capture: true, signal: keyboardAbortController.signal })

  window.addEventListener('keyup', event => {
    if (event.code !== 'Space') return
    const canvasWrap = rootEl?.querySelector('.ds-canvas-wrap')
    const scrollLeft = canvasWrap?.scrollLeft ?? 0
    const scrollTop = canvasWrap?.scrollTop ?? 0
    event.preventDefault()
    event.stopPropagation()
    setSpacePanPressed(false)
    if (panState) stopPan()
    preserveCanvasScroll(scrollLeft, scrollTop)
  }, { capture: true, signal: keyboardAbortController.signal })

  window.addEventListener('blur', () => {
    setSpacePanPressed(false)
    if (panState) stopPan()
  }, { signal: keyboardAbortController.signal })

  rootEl.querySelector('.ds-canvas-wrap')?.addEventListener('pointerdown', event => {
    if (!spacePanPressed) return
    startPan(event)
  }, { signal: canvasPanAbortController.signal })
}

function buildElementRestoreSelector(element) {
  if (!element) return null
  if (element.id) return `#${element.id}`

  const selectors = []
  const agentAction = element.getAttribute('data-agent-action')
  const action = element.getAttribute('data-action')
  const itemId = element.getAttribute('data-item-id')
  const noteId = element.getAttribute('data-note-id')
  const key = element.getAttribute('data-key')

  if (agentAction) selectors.push(`[data-agent-action="${agentAction}"]`)
  if (action) selectors.push(`[data-action="${action}"]`)
  if (itemId) selectors.push(`[data-item-id="${itemId}"]`)
  if (noteId) selectors.push(`[data-note-id="${noteId}"]`)
  if (key) selectors.push(`[data-key="${key}"]`)

  return selectors.length ? selectors.join('') : null
}

function captureRenderState() {
  const activeElement = document.activeElement
  const selector = buildElementRestoreSelector(activeElement)
  const canvasWrap = rootEl.querySelector('.ds-canvas-wrap')
  const activeControl = selector
    ? {
        selector,
        value: 'value' in activeElement ? activeElement.value : null,
        selectionStart: typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null,
        selectionEnd: typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null
      }
    : null

  const frameEntries = [...rootEl.querySelectorAll('.ds-item[data-item-id] .ds-item__frame')].map(frame => {
    const itemEl = frame.closest('.ds-item')
    const itemId = itemEl?.getAttribute('data-item-id')
    if (!itemId) return null
    return {
      itemId,
      src: frame.getAttribute('src') || '',
      frame
    }
  }).filter(Boolean)

  return {
    activeControl,
    canvasScroll: canvasWrap
      ? {
          left: canvasWrap.scrollLeft,
          top: canvasWrap.scrollTop
        }
      : null,
    frames: new Map(frameEntries.map(entry => [entry.itemId, entry]))
  }
}

function restorePersistentFrames(renderState) {
  if (!renderState?.frames?.size) return

  rootEl.querySelectorAll('.ds-item[data-item-id]').forEach(itemEl => {
    const itemId = itemEl.getAttribute('data-item-id')
    const nextFrame = itemEl.querySelector('.ds-item__frame')
    const previous = renderState.frames.get(itemId)
    if (!nextFrame || !previous) return
    if ((nextFrame.getAttribute('src') || '') !== previous.src) return

    previous.frame.className = nextFrame.className
    previous.frame.style.cssText = nextFrame.style.cssText
    previous.frame.setAttribute('title', nextFrame.getAttribute('title') || '')
    nextFrame.replaceWith(previous.frame)
  })
}

function restoreActiveControl(renderState) {
  const control = renderState?.activeControl
  if (!control?.selector) return
  const nextElement = rootEl.querySelector(control.selector)
  if (!nextElement) return

  if (control.value !== null && 'value' in nextElement) {
    nextElement.value = control.value
  }

  try {
    nextElement.focus({ preventScroll: true })
  } catch {
    nextElement.focus()
  }

  if (typeof nextElement.setSelectionRange === 'function' && control.selectionStart !== null && control.selectionEnd !== null) {
    nextElement.setSelectionRange(control.selectionStart, control.selectionEnd)
  }
}

function restoreCanvasScroll(renderState) {
  const canvasScroll = renderState?.canvasScroll
  const canvasWrap = rootEl.querySelector('.ds-canvas-wrap')
  if (!canvasWrap || !canvasScroll) return

  canvasWrap.scrollLeft = canvasScroll.left
  canvasWrap.scrollTop = canvasScroll.top
}

function render() {
  if (!rootEl || dragState || resizeState) return
  const renderState = captureRenderState()
  rootEl.innerHTML = renderLayout()
  restorePersistentFrames(renderState)
  bindEvents()
  ensurePreviewComposableOverlayElement()
  updatePreviewComposableOverlay()
  restoreCanvasScroll(renderState)
  restoreActiveControl(renderState)
  restorePendingComposableDrawerFocus()
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value)
}

export async function renderApp(root) {
  rootEl = root
  rootEl.innerHTML = '<div style="padding:24px;color:white;">Chargement du Design Surface…</div>'

  try {
    await loadRegistry()

    const agentTemplate = stringifyAgentJson(createEmptyBrainOutput())
    patchAgentState({
      providerId: getDefaultAgentProviderId(),
      actionJson: agentTemplate,
      promptPreview: buildBrainPrompt({ intent: '', context: buildAIContext(getState(), getEntryById) }),
      selectionHint: getAgentSelectionHint()
    })

    try {
      await loadAgentProviders()
      patchAgentState({ providerId: getPreferredDesignerProviderId() })
    } catch {}

    let tokensLoaded = false
    try {
      await loadTokens()
      tokensLoaded = true
    } catch {
      tokensLoaded = false
    }

    const sceneFiles = await listSceneFiles()
    patchState({ registryLoaded: true, tokensLoaded, sceneFiles })
    subscribe(render)
    subscribeAgentState(() => render())
    await loadSceneFromFile('default.scene.json', { keepWorkingScene: hasWorkingScene() })
    if (!hasWorkingScene()) {
      const hydrated = hydrateSceneWithRegistry(getState().scene, { preserveExistingLayout: false })
      replaceWorkingScene(hydrated)
    }
    render()
  } catch (error) {
    console.error('[design-surface]', error)
    rootEl.innerHTML = `<div style="padding:24px;color:white;">
      <strong>Erreur au chargement du Design Surface</strong><br>
      ${escapeHtml(error?.message || 'Erreur inconnue')}
    </div>`
  }
}
