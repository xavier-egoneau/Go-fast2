import { loadRegistry, searchEntries, getEntryById, getDefaultParams, listEntries } from './core/registry.js'
import { buildRenderUrl } from './core/render-url.js'
import { loadTokens, getTokenSummaryForEntry } from './core/tokens.js'
import { listSceneFiles, loadSceneFile } from './core/scene-file.js'
import { saveSceneFile, deleteSceneFile } from './core/scene-api.js'
import { diffScenes } from './core/diff.js'
import { validateActionSet } from './core/action-validate.js'
import { applyActionSetToScene } from './core/action-apply.js'
import { buildAIContext } from './core/ai-context.js'
import { buildBrainPrompt } from './core/agent-prompt.js'
import { getDefaultAgentProviderId, getPreferredDesignerProviderId, loadAgentProviders, runAgentProvider } from './core/agent-runtime.js'
import { createEmptyBrainOutput } from './core/brain-contract.js'
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
let dragPointerId = null
let resizePointerId = null
let historyMuted = false
let frameInteractivityDisabled = false

const VIEWPORTS = {
  mobile: { label: 'Mobile', width: 390, height: 844 },
  tablet: { label: 'Tablet', width: 768, height: 1024 },
  desktop: { label: 'Desktop', width: 1440, height: 1024 }
}

function uid(prefix = 'item') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function getViewportConfig(viewport) {
  return VIEWPORTS[viewport] || VIEWPORTS.desktop
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
    const width = Math.max(baseLane.minWidth, widest + 32)
    laneMap.set(laneKey, {
      ...baseLane,
      key: laneKey,
      x: cursorX,
      width
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
      items: reflowSceneItems(prev.scene.items, lane.key)
    }
  }))
  commitSceneHistory()
}

function organizeCanvas() {
  setState(prev => ({
    ...prev,
    scene: {
      ...prev.scene,
      items: reflowSceneItems(prev.scene.items)
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
  return {
    id: uid(),
    kind: entry.kind,
    ref: entry.id,
    viewport,
    x: placement.x,
    y: placement.y,
    width: dimensions.width,
    height: dimensions.height,
    params: getDefaultParams(entry)
  }
}

function hydrateSceneWithRegistry(scene) {
  const baseScene = {
    ...scene,
    items: [...(scene.items || [])],
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

  baseScene.items = reflowSceneItems(baseScene.items)
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
      items: prev.scene.items.map(item => item.id === itemId ? { ...item, params: { ...item.params, ...paramsPatch } } : item)
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

function setQuery(query) {
  patchState({ query })
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
}

function selectItem(itemId) {
  const item = getState().scene.items.find(candidate => candidate.id === itemId)
  if (item) bringItemToFront(itemId)
  const state = getState()
  state.selectedItemId = itemId
  refreshSelectionUI()
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
    const hydrated = hydrateSceneWithRegistry(normalized)

    setState(prev => ({
      ...prev,
      selectedItemId: null,
      activeSceneFile: fileName,
      baseScene: hydrated,
      scene: keepWorkingScene ? hydrateSceneWithRegistry(prev.scene) : hydrated,
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

function toggleNavigatorPanel() {
  const agent = getAgentState()
  patchAgentState({ navigatorOpen: !agent.navigatorOpen })
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

    const previewScene = applyActionSetToScene(state.scene, validation.normalized)
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
    const previewScene = applyActionSetToScene(state.scene, result.normalized)
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

function renderLibrary() {
  const { query, scene } = getState()
  const entries = searchEntries(query)

  return `
    <aside class="ds-panel">
      <div class="ds-panel__header">
        <h2 class="ds-panel__title">Navigator</h2>
        <p class="ds-panel__subtitle">Recherche, filtre et focus dans le système déjà présent sur le canvas.</p>
      </div>
      <div class="ds-panel__body">
        <input class="ds-search" id="ds-search" type="search" placeholder="Rechercher un composant ou une page" value="${escapeAttr(query)}">
        <div class="ds-library-list" style="margin-top: 16px;">
          ${entries.map(entry => {
            const sceneItem = (scene.items || []).find(item => item.ref === entry.id && item.kind === entry.kind)
            return `
            <article class="ds-card">
              <div class="ds-card__top"><div class="ds-card__name">${escapeHtml(entry.name)}</div><span class="ds-badge">${escapeHtml(entry.kind)}</span></div>
              <div class="ds-card__meta">${escapeHtml(entry.level || '')} · ${escapeHtml(entry.category || '')}</div>
              <p class="ds-card__desc">${escapeHtml(entry.description || 'Sans description')}</p>
              <div class="ds-card__actions"><button class="ds-btn" data-action="focus-item" data-kind="${entry.kind}" data-id="${entry.id}" ${sceneItem ? '' : 'disabled'}>Focus on canvas</button></div>
            </article>
          `}).join('') || `<p class="ds-muted">Aucun résultat.</p>`}
        </div>
      </div>
    </aside>
  `
}

function renderFrames(scene) {
  const viewport = scene.viewport || 'desktop'
  const vp = getViewportConfig(viewport)
  const lanes = [...buildLaneLayout(scene).values()].map(lane => ({
    ...lane,
    height: Math.max(880, vp.height)
  }))

  return `
    <div class="ds-frame" style="left:64px;top:64px;width:${Math.max(vp.width + 32, (lanes[lanes.length - 1]?.x || 0) + (lanes[lanes.length - 1]?.width || 0) - 64)}px;height:${vp.height + 72}px;"><div class="ds-frame__label"><span>${escapeHtml(vp.label)}</span><span class="ds-badge">${vp.width} × ${vp.height}</span></div></div>
    ${lanes.map(lane => `<div class="ds-lane" style="left:${lane.x}px;top:${lane.y}px;width:${lane.width}px;height:${lane.height}px;"><div class="ds-lane__label">${escapeHtml(lane.label)}</div></div>`).join('')}
  `
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
      lead: agent.lastSummary || unresolved[0]?.message || warnings[0] || 'Cette demande nécessite d’étendre les composants existants.',
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
  const { selectedItemId } = getState()
  const notes = scene.notes || []

  return `
    <main class="ds-canvas-wrap">
      ${renderPreviewStatus()}
      <div class="ds-canvas" id="ds-canvas">
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
          if (!entry) return ''
          const url = buildRenderUrl(entry, item.params)
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
    </main>
  `
}

function renderDiffPanel() {
  const { baseScene } = getState()
  const diff = diffScenes(baseScene, getRenderedScene())
  const hasChanges = diff.sceneMeta.length || diff.items.length || diff.notes.length

  if (!hasChanges) {
    return `
      <div class="ds-inspector-group">
        <h3 class="ds-inspector-group__title">Diff sémantique</h3>
        <p class="ds-muted">Aucun écart avec la scène de base.</p>
      </div>
    `
  }

  return `
    <div class="ds-inspector-group">
      <h3 class="ds-inspector-group__title">Diff sémantique</h3>
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
    </div>
  `
}

function renderInspectorWrapped() {
  return `<div data-ui-region="inspector">${renderInspector()}</div>`
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
            <label class="ds-field__checkbox"><input type="checkbox" ${selectedNote.targetId ? 'checked' : ''} data-action="note-attach-selected" data-note-id="${selectedNote.id}"><span>Lier à l’élément sélectionné si possible</span></label>
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
  if (!entry) return ''
  const suggestedTokens = getTokenSummaryForEntry(entry)

  const renderControl = (key, ctrl) => {
    const value = item.params[key]
    const inputId = `ds-field-${item.id}-${key}`
    if (ctrl.type === 'select') {
      return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(ctrl.label)}</span><select class="ds-field__select" id="${inputId}" data-action="param-change" data-item-id="${item.id}" data-key="${key}">${(ctrl.options || []).map(option => `<option value="${escapeAttr(option)}"${String(option) === String(value) ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`
    }
    if (ctrl.type === 'checkbox') {
      return `<label class="ds-field__checkbox"><input type="checkbox" ${value ? 'checked' : ''} data-action="param-change" data-item-id="${item.id}" data-key="${key}"><span>${escapeHtml(ctrl.label)}</span></label>`
    }
    return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(ctrl.label)}</span><input class="ds-field__input" id="${inputId}" type="text" value="${escapeAttr(value ?? '')}" data-action="param-change" data-item-id="${item.id}" data-key="${key}"></label>`
  }

  const variants = Object.entries(entry.variants || {})
  const content = Object.entries(entry.content || {})

  return `
    <aside class="ds-panel">
      <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">${escapeHtml(entry.name)} · ${escapeHtml(entry.kind)}</p></div>
      <div class="ds-panel__body">
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Instance</h3>
          <label class="ds-field"><span class="ds-field__label">Viewport</span><select class="ds-field__select" data-action="item-viewport" data-item-id="${item.id}">${Object.entries(VIEWPORTS).map(([key, vp]) => `<option value="${key}"${key === (item.viewport || 'desktop') ? ' selected' : ''}>${escapeHtml(vp.label)}</option>`).join('')}</select></label>
          <label class="ds-field"><span class="ds-field__label">Largeur</span><input class="ds-field__input" type="number" value="${item.width}" data-action="item-prop" data-item-id="${item.id}" data-key="width"></label>
          <label class="ds-field"><span class="ds-field__label">Hauteur</span><input class="ds-field__input" type="number" value="${item.height}" data-action="item-prop" data-item-id="${item.id}" data-key="height"></label>
          <p class="ds-muted">Position : ${item.x}px × ${item.y}px</p>
        </div>
        ${variants.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Variantes</h3>${variants.map(([key, ctrl]) => renderControl(key, ctrl)).join('')}</div>` : ''}
        ${content.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Contenu</h3>${content.map(([key, ctrl]) => renderControl(key, ctrl)).join('')}</div>` : ''}
        <div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Tokens suggérés</h3><div class="ds-token-list">${suggestedTokens.map(token => `<div class="ds-token"><div class="ds-token__top"><div class="ds-token__name">${escapeHtml(token.scssVar)}</div><span class="ds-badge">${escapeHtml(token.category)}</span></div><div class="ds-token__value">${escapeHtml(token.value)}</div></div>`).join('') || '<p class="ds-muted">Aucun token suggéré.</p>'}</div></div>
        ${renderDiffPanel()}
      </div>
    </aside>
  `
}

function renderTopbar() {
  const { scene, history, historyIndex, sceneFiles, activeSceneFile } = getState()
  const agent = getAgentState()
  return `
    <header class="ds-topbar">
      <div>
        <div class="ds-topbar__title">Design Surface</div>
        <div class="ds-topbar__meta">${escapeHtml(scene.name)} · ${scene.items.length} item(s) · ${(scene.notes || []).length} note(s) · viewport ${escapeHtml(scene.viewport || 'desktop')}</div>
      </div>
      <div class="ds-topbar__actions">
        <button class="ds-btn ${agent.navigatorOpen ? 'ds-btn--active' : ''}" data-action="toggle-navigator">Navigator</button>
        <select class="ds-field__select" data-action="scene-file" style="width: 180px;">
          ${(sceneFiles || []).map(file => `<option value="${escapeAttr(file.file)}"${file.file === activeSceneFile ? ' selected' : ''}>${escapeHtml(file.name)}</option>`).join('')}
        </select>
        <select class="ds-field__select" data-action="scene-viewport" style="width: 140px;">
          ${Object.entries(VIEWPORTS).map(([key, vp]) => `<option value="${key}"${key === (scene.viewport || 'desktop') ? ' selected' : ''}>${escapeHtml(vp.label)}</option>`).join('')}
        </select>
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
  const navigator = agent.navigatorOpen ? renderLibrary() : ''
  const content = `${navigator}${renderCanvas()}${renderInspectorWrapped()}${renderAgentPanel({ selectionHint: getAgentSelectionHint() })}`
  return `<div class="ds-app">${renderTopbar()}<div class="ds-layout${agent.open ? ' ds-layout--with-agent' : ''}${!agent.navigatorOpen ? ' ds-layout--no-nav' : ''}">${content}</div></div>`
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
}

function startDrag(kind, targetId, event) {
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

function clampItemToLane(item, x, y) {
  const entry = getEntryById(item.ref, item.kind)
  if (!entry) return { x, y }
  const lane = buildLaneLayout(getRenderedScene()).get(getLaneConfig(entry).key) || getLaneConfig(entry)
  const maxX = lane.x + lane.width - item.width
  const maxY = lane.y + lane.height - Math.min(item.height, lane.height)
  return {
    x: Math.min(Math.max(x, lane.x), Math.max(lane.x, maxX)),
    y: Math.min(Math.max(y, lane.contentY), Math.max(lane.contentY, maxY))
  }
}

function onDragMove(event) {
  if (!dragState?.targetEl) return
  const deltaX = event.clientX - dragState.startMouseX
  const deltaY = event.clientY - dragState.startMouseY
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
    if (dragState.kind === 'note') updateNote(dragState.targetId, { ...patch, targetId: null })
    else updateItem(dragState.targetId, patch)
  }
  setPersistMuted(false)
  dragState = null
  dragPointerId = null
  if (!resizeState) setFramesInteractive(true)
  document.body.style.cursor = resizeState ? 'nwse-resize' : ''
  if (!resizeState) unbindGlobalPointerCleanup()
}

function startResize(itemId, event) {
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

function onResizeMove(event) {
  if (!resizeState?.targetEl) return
  const deltaX = event.clientX - resizeState.startMouseX
  const deltaY = event.clientY - resizeState.startMouseY
  const width = Math.max(220, Math.round(resizeState.startWidth + deltaX))
  const height = Math.max(140, Math.round(resizeState.startHeight + deltaY))
  resizeState.lastWidth = width
  resizeState.lastHeight = height
  resizeState.targetEl.style.width = `${width}px`
  resizeState.targetEl.style.height = `${height}px`
}

function stopResize() {
  if (resizeState) {
    updateItem(resizeState.itemId, {
      width: resizeState.lastWidth ?? resizeState.startWidth,
      height: resizeState.lastHeight ?? resizeState.startHeight
    })
  }
  resizeState = null
  resizePointerId = null
  if (!dragState) setFramesInteractive(true)
  document.body.style.cursor = dragState ? 'grabbing' : ''
  if (!dragState) unbindGlobalPointerCleanup()
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
    updateItem(select.dataset.itemId, { viewport, width: dimensions.width, height: dimensions.height })
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
}

function bindEvents() {
  rootEl.querySelector('#ds-search')?.addEventListener('input', event => setQuery(event.target.value))
  rootEl.querySelectorAll('[data-action="focus-item"]').forEach(button => button.addEventListener('click', () => {
    const { scene } = getState()
    const item = (scene.items || []).find(candidate => candidate.ref === button.dataset.id && candidate.kind === button.dataset.kind)
    if (!item) return
    selectItem(item.id)
    const canvas = rootEl.querySelector('.ds-canvas-wrap')
    const top = Math.max(0, item.y - 120)
    const left = Math.max(0, item.x - 120)
    canvas?.scrollTo({ top, left, behavior: 'smooth' })
  }))
  rootEl.querySelectorAll('[data-action="add-note"]').forEach(button => button.addEventListener('click', () => addNote()))
  rootEl.querySelectorAll('[data-action="add-note-to-item"]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation()
    addNote(button.dataset.itemId)
  }))
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
  bindSelectionDependentEvents()
  rootEl.querySelector('[data-action="scene-viewport"]')?.addEventListener('change', event => setSceneViewport(event.target.value))
  rootEl.querySelector('[data-action="scene-file"]')?.addEventListener('change', event => loadSceneFromFile(event.target.value))
  rootEl.querySelector('[data-action="undo"]')?.addEventListener('click', undoHistory)
  rootEl.querySelector('[data-action="redo"]')?.addEventListener('click', redoHistory)
  rootEl.querySelector('[data-action="organize-canvas"]')?.addEventListener('click', organizeCanvas)
  rootEl.querySelector('[data-action="toggle-agent"]')?.addEventListener('click', toggleAgentPanel)
  rootEl.querySelector('[data-action="toggle-navigator"]')?.addEventListener('click', toggleNavigatorPanel)
  bindTopbarMenus()
  bindAgentEvents()
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

  nextElement.focus()

  if (typeof nextElement.setSelectionRange === 'function' && control.selectionStart !== null && control.selectionEnd !== null) {
    nextElement.setSelectionRange(control.selectionStart, control.selectionEnd)
  }
}

function render() {
  if (!rootEl || dragState || resizeState) return
  const renderState = captureRenderState()
  rootEl.innerHTML = renderLayout()
  restorePersistentFrames(renderState)
  bindEvents()
  restoreActiveControl(renderState)
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
      const hydrated = hydrateSceneWithRegistry(getState().scene)
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
