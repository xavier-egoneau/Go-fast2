import { loadRegistry, searchEntries, getEntryById, getDefaultParams } from './core/registry.js'
import { buildRenderUrl } from './core/render-url.js'
import { loadTokens, getTokens, getTokenSummaryForEntry } from './core/tokens.js'
import { listSceneFiles, loadSceneFile } from './core/scene-file.js'
import { saveSceneFile, deleteSceneFile, scaffoldComponent } from './core/scene-api.js'
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
  addSceneFile
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
let openNoteId = null
let lastDragEndTime = 0
let lastDragDidMove = false
let spacePressed = false
let libraryOpen = true
let inspectorOpen = true
let newComponentFormOpen = false
let panState = null
let zoomLevel = 1

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

let autoSaveTimer = null
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(async () => {
    try {
      const { scene, activeSceneFile } = getState()
      await saveSceneFile(activeSceneFile || 'default.scene.json', scene)
    } catch {}
  }, 2000)
}

function commitSceneHistory() {
  if (historyMuted) return
  pushHistory(getState().scene)
  scheduleAutoSave()
}

function addItem(entry) {
  const state = getState()
  const viewport = state.scene.viewport || 'desktop'
  const offset = state.scene.items.length * 24
  const dimensions = getItemDimensions(entry, viewport)
  const item = {
    id: uid(),
    kind: entry.kind,
    ref: entry.id,
    viewport,
    x: 80 + offset,
    y: 80 + offset,
    width: dimensions.width,
    height: dimensions.height,
    params: getDefaultParams(entry)
  }

  setState(prev => ({
    ...prev,
    selectedItemId: item.id,
    scene: { ...prev.scene, items: [...prev.scene.items, item] }
  }))
  commitSceneHistory()
}

function addNote() {
  const state = getState()
  const offset = (state.scene.notes || []).length * 20
  const note = { id: uid('note'), x: 120 + offset, y: 120 + offset, text: 'Nouvelle note…' }

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
  removeItemById(state.selectedItemId)
}

function removeItemById(id) {
  setState(prev => ({
    ...prev,
    selectedItemId: prev.selectedItemId === id ? null : prev.selectedItemId,
    scene: {
      ...prev.scene,
      items: prev.scene.items.filter(item => item.id !== id),
      notes: (prev.scene.notes || []).filter(note => note.id !== id)
    }
  }))
  if (openNoteId === id) openNoteId = null
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

function selectItem(itemId) {
  if (getState().selectedItemId === itemId) return
  patchState({ selectedItemId: itemId })
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

    setState(prev => ({
      ...prev,
      selectedItemId: null,
      activeSceneFile: fileName,
      baseScene: normalized,
      scene: keepWorkingScene ? prev.scene : normalized,
      history: keepWorkingScene ? prev.history : [normalized],
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
  const ok = confirm(`Supprimer le fichier scène "${activeSceneFile}" ?\n\nCette action supprime définitivement ce fichier du projet. Les composants qu'il contient ne seront plus accessibles via cette scène.`)
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

const LEVEL_ORDER = ['atom', 'molecule', 'organism', 'template', 'page']

const TOKEN_BENTO_HEIGHT = 520 // hauteur estimée du bento tokens en px

function autoArrangeAll() {
  const entries = searchEntries('')
  const viewport = getState().scene.viewport || 'desktop'
  const PADDING = 48
  const GAP_X = 24
  const GAP_Y = 48

  const byLevel = {}
  entries.forEach(entry => {
    const level = entry.level || entry.kind || 'other'
    if (!byLevel[level]) byLevel[level] = []
    byLevel[level].push(entry)
  })

  const levels = LEVEL_ORDER.filter(l => byLevel[l]?.length)
  Object.keys(byLevel).forEach(l => { if (!LEVEL_ORDER.includes(l)) levels.push(l) })

  let x = PADDING
  const items = []

  levels.forEach(level => {
    const group = byLevel[level] || []
    if (!group.length) return
    let y = PADDING
    let maxW = 0
    group.forEach(entry => {
      const dims = getItemDimensions(entry, viewport)
      items.push({
        id: uid(),
        kind: entry.kind,
        ref: entry.id,
        viewport,
        x,
        y,
        width: dims.width,
        height: dims.height,
        params: getDefaultParams(entry)
      })
      y += dims.height + GAP_Y
      maxW = Math.max(maxW, dims.width)
    })
    x += maxW + GAP_X
  })

  setState(prev => ({ ...prev, selectedItemId: null, scene: { ...prev.scene, items } }))
  commitSceneHistory()
}

function startPan(event) {
  const wrap = rootEl?.querySelector('.ds-canvas-wrap')
  if (!wrap) return
  panState = {
    startMouseX: event.clientX,
    startMouseY: event.clientY,
    startScrollLeft: wrap.scrollLeft,
    startScrollTop: wrap.scrollTop,
    wrap
  }
  document.body.classList.add('ds-panning')
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', stopPan)
  window.addEventListener('pointercancel', stopPan)
}

function onPanMove(event) {
  if (!panState) return
  const dx = event.clientX - panState.startMouseX
  const dy = event.clientY - panState.startMouseY
  panState.wrap.scrollLeft = panState.startScrollLeft - dx
  panState.wrap.scrollTop = panState.startScrollTop - dy
}

function stopPan() {
  panState = null
  document.body.classList.remove('ds-panning')
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', stopPan)
  window.removeEventListener('pointercancel', stopPan)
}

function setZoom(next) {
  zoomLevel = Math.max(0.25, Math.min(4, Math.round(next * 100) / 100))
  render()
}

function handleKeyDown(event) {
  if (event.target.matches('input, textarea, select')) return
  if (event.code === 'Space') {
    event.preventDefault()
    if (!spacePressed) {
      spacePressed = true
      document.body.classList.add('ds-pan-mode')
    }
  }
  if (event.metaKey || event.ctrlKey) {
    if (event.key === '=' || event.key === '+') { event.preventDefault(); setZoom(zoomLevel + 0.1) }
    if (event.key === '-') { event.preventDefault(); setZoom(zoomLevel - 0.1) }
    if (event.key === '0') { event.preventDefault(); setZoom(1) }
  }
}

function handleKeyUp(event) {
  if (event.code === 'Space') {
    spacePressed = false
    document.body.classList.remove('ds-pan-mode')
    if (panState) stopPan()
  }
}

function toggleNoteOpen(noteId) {
  openNoteId = openNoteId === noteId ? null : noteId
  rootEl?.querySelectorAll('.ds-note-pin').forEach(el => {
    el.classList.toggle('ds-note-pin--open', el.dataset.noteId === openNoteId)
  })
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
    replaceWorkingScene(previewScene)
    patchAgentState({
      ...nextPatch,
      previewScene: null
    })
  } catch (error) {
    patchAgentState({ runtimeError: error.message || 'Runtime error' })
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
      patchAgentState({ validationErrors: result.errors, runtimeError: '', previewScene: null, promptPreview: buildAgentPromptPreview() })
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
  const { query } = getState()
  const entries = searchEntries(query)

  return `
    <aside class="ds-panel">
      <div class="ds-panel__header">
        <h2 class="ds-panel__title">Library</h2>
        <p class="ds-panel__subtitle">Palette de composition</p>
      </div>
      <div class="ds-panel__body">
        <button class="ds-btn${newComponentFormOpen ? ' ds-btn--active' : ''}" style="width:100%;margin-bottom:10px;" data-action="toggle-new-component">+ Nouveau composant / page</button>
        ${newComponentFormOpen ? `
          <form class="ds-new-component-form" data-action="new-component-form">
            <input class="ds-field__input" name="name" placeholder="Nom (kebab-case)" required autocomplete="off">
            <select class="ds-field__select" name="level">
              <option value="atom">Atom</option>
              <option value="molecule">Molecule</option>
              <option value="organism">Organism</option>
              <option value="page">Page</option>
            </select>
            <input class="ds-field__input" name="category" placeholder="Catégorie (ex: Forms)" autocomplete="off">
            <input class="ds-field__input" name="description" placeholder="Description courte" autocomplete="off">
            <button type="submit" class="ds-btn ds-btn--primary" style="width:100%;">Créer</button>
            <div class="ds-new-component-form__status" data-new-component-status></div>
          </form>
        ` : ''}
        <input class="ds-search" id="ds-search" type="search" placeholder="Rechercher…" value="${escapeAttr(query)}">
        <div class="ds-library-list" style="margin-top: 16px;">
          ${entries.map(entry => `
            <article class="ds-card">
              <div class="ds-card__top"><div class="ds-card__name">${escapeHtml(entry.name)}</div><span class="ds-badge">${escapeHtml(entry.kind)}</span></div>
              <div class="ds-card__meta">${escapeHtml(entry.level || '')} · ${escapeHtml(entry.category || '')}</div>
              <p class="ds-card__desc">${escapeHtml(entry.description || 'Sans description')}</p>
            </article>
          `).join('') || `<p class="ds-muted">Aucun résultat.</p>`}
        </div>
      </div>
    </aside>
  `
}

function renderFrames(scene) {
  const viewport = scene.viewport || 'desktop'
  const vp = getViewportConfig(viewport)
  return `<div class="ds-frame" style="left:64px;top:64px;width:${vp.width + 32}px;height:${vp.height + 72}px;"><div class="ds-frame__label"><span>${escapeHtml(vp.label)}</span><span class="ds-badge">${vp.width} × ${vp.height}</span></div></div>`
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

  if (!hasContent) return ''

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
          <button class="ds-btn ds-btn--danger" data-agent-action="clear-preview">Clear</button>
          <button class="ds-preview-banner__close" data-agent-action="close-feedback" title="Fermer">×</button>
        </div>
      </div>
      ${!agent.previewScene ? `<div class="ds-preview-banner__callout${feedback.tone === 'warn' ? ' ds-preview-banner__callout--warn' : ''}${feedback.tone === 'error' ? ' ds-preview-banner__callout--error' : ''}">${escapeHtml(feedback.lead)}</div>` : ''}
      ${feedback.details.length ? `<details class="ds-preview-banner__details"><summary>Voir les détails</summary><div class="ds-preview-banner__group">${feedback.details.map(detail => `<div class="ds-preview-banner__item${feedback.tone === 'error' ? ' ds-preview-banner__item--error' : ''}">${escapeHtml(detail)}</div>`).join('')}</div></details>` : ''}
    </section>
  `
}

const CANVAS_MIN_W = 1800
const CANVAS_MIN_H = 1200

function renderCanvas() {
  const scene = getRenderedScene()
  const { selectedItemId } = getState()
  const notes = scene.notes || []
  const scaledW = Math.round(CANVAS_MIN_W * zoomLevel)
  const scaledH = Math.round(CANVAS_MIN_H * zoomLevel)

  return `
    <main class="ds-canvas-wrap">
      ${renderPreviewStatus()}
      <div class="ds-canvas-stack" style="min-width:${scaledW}px;">
        <div class="ds-canvas" id="ds-canvas" style="transform:scale(${zoomLevel});transform-origin:0 0;min-width:${CANVAS_MIN_W}px;">
          ${renderTokenBento()}
          <div class="ds-canvas-stage" style="min-width:${CANVAS_MIN_W}px;min-height:${CANVAS_MIN_H}px;">
            ${renderFrames(scene)}
            ${scene.items.length === 0 && notes.length === 0 ? '<div class="ds-empty">Canvas vide — utilise "Réorganiser" pour recharger tous les composants, ou ajoute une note.</div>' : ''}
            ${notes.map(note => `
              <div class="ds-note-pin ${selectedItemId === note.id ? 'ds-note-pin--selected' : ''} ${openNoteId === note.id ? 'ds-note-pin--open' : ''}" data-note-id="${note.id}" style="left:${note.x}px;top:${note.y}px;">
                <div class="ds-note-pin__dot" data-note-drag-handle="${note.id}"></div>
                <div class="ds-note-pin__popup">
                  <textarea class="ds-note-pin__input" rows="3" data-action="note-text" data-note-id="${note.id}">${escapeHtml(note.text)}</textarea>
                  <button class="ds-note-pin__delete" data-action="note-delete-popup" data-note-id="${note.id}" title="Supprimer cette note">×</button>
                </div>
              </div>
            `).join('')}
            ${scene.items.map(item => {
              const entry = getEntryById(item.ref, item.kind)
              if (!entry) return ''
              const url = buildRenderUrl(entry, item.params)
              const agentOpen = getAgentState().open
              return `
                <section class="ds-item ${selectedItemId === item.id ? 'ds-item--selected' : ''}" data-item-id="${item.id}" style="left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;">
                  <div class="ds-item__toolbar" data-drag-handle="${item.id}">
                    <div><div class="ds-item__title">${escapeHtml(entry.name)}</div><div class="ds-item__meta">${escapeHtml(item.viewport || 'desktop')} · ${escapeHtml(entry.kind)} · ${escapeHtml(entry.level || '')}</div></div>
                    <div style="display:flex;gap:6px;align-items:center;">
                      ${agentOpen && selectedItemId === item.id ? `<span class="ds-item__ai-badge" title="Contexte IA actif">IA</span>` : ''}
                      <a class="ds-badge" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">ouvrir</a>
                      <button class="ds-item__delete" data-action="remove-item" data-item-id="${item.id}" title="Supprimer du canvas">×</button>
                    </div>
                  </div>
                  <iframe class="ds-item__frame" src="${escapeAttr(url)}" title="${escapeAttr(entry.name)}" style="height: calc(100% - 41px);"></iframe>
                  <div class="ds-item__resize" data-resize-handle="${item.id}" title="Redimensionner"></div>
                </section>
              `
            }).join('')}
          </div>
        </div>
      </div>
    </main>
  `
}

function renderTokenBento() {
  const tokens = getTokens()

  const hasTokens = tokens.length > 0
  if (!hasTokens) return ''

  const isHex = v => /^#[0-9a-fA-F]{3,8}$/.test(v.trim())
  const pickEvenly = (items, limit) => {
    if (!items.length) return []
    if (items.length <= limit) return items
    const step = (items.length - 1) / Math.max(limit - 1, 1)
    return Array.from({ length: limit }, (_, index) => items[Math.round(index * step)]).filter(Boolean)
  }

  let tokensSection = ''
  if (hasTokens) {
    const byCategory = {}
    tokens.forEach(t => {
      if (!byCategory[t.category]) byCategory[t.category] = []
      byCategory[t.category].push(t)
    })
    const findTokenByVar = scssVar => tokens.find(token => token.scssVar === scssVar) || null

    const colorTokens = byCategory['color'] || []
    const colorDots = pickEvenly(colorTokens, 12).map(t => {
      const val = t.value.trim()
      const hex = isHex(val) ? val : null
      if (!hex) return ''
      return `<span class="ds-frieze__dot" style="background:${hex};" title="${escapeHtml(t.id)}"></span>`
    }).join('')

    const fontSizes = byCategory['font-size'] || []
    const typeSamples = pickEvenly(fontSizes, 4)
      .map(t => `<span class="ds-frieze__type-sample" style="font-size:${t.value.trim()}" title="${escapeHtml(t.id)}">Aa</span>`)
      .join('')

    const spacings = pickEvenly(byCategory['spacing'] || [], 5).map(t => {
      const px = Math.min(parseFloat(t.value) * 16, 40)
      return `<span class="ds-frieze__space-bar" style="width:${Math.max(px, 3)}px;" title="${escapeHtml(t.id)}"></span>`
    }).join('')

    const radii = pickEvenly(byCategory['radius'] || [], 4).map(t => {
      const val = t.value.trim()
      return `<span class="ds-frieze__radius-box" style="border-radius:${val};" title="${escapeHtml(t.id)}"></span>`
    }).join('')

    const tokenHighlights = [
      { label: 'Couleurs', value: colorTokens.length },
      { label: 'Typo', value: fontSizes.length },
      { label: 'Espaces', value: (byCategory['spacing'] || []).length },
      { label: 'Breakpoints', value: (byCategory['breakpoint'] || []).length }
    ].filter(item => item.value > 0)

    const usageExamples = [
      {
        token: findTokenByVar('$color-primary'),
        title: 'Couleur primaire',
        valuePreview: 'swatch',
        usages: ['`.btn--primary` background', '`.card__tag` background']
      },
      {
        token: findTokenByVar('$spacing-md'),
        title: 'Espacement moyen',
        valuePreview: 'space',
        usages: ['`.btn--md` padding', '`.input--lg` padding']
      },
      {
        token: findTokenByVar('$radius-md'),
        title: 'Rayon standard',
        valuePreview: 'radius',
        usages: ['`.btn` border-radius', 'champs et contrôles']
      },
      {
        token: findTokenByVar('$font-size-base'),
        title: 'Corps de texte',
        valuePreview: 'type',
        usages: ['`.btn` font-size', '`.card__text` font-size']
      },
      {
        token: findTokenByVar('$shadow-md'),
        title: 'Ombre intermédiaire',
        valuePreview: 'shadow',
        usages: ['`.card--default:hover` shadow', 'relief de cartes']
      },
      {
        token: findTokenByVar('$color-danger'),
        title: 'Couleur danger',
        valuePreview: 'swatch',
        usages: ['`.btn--danger` background', '`.input--error` border']
      }
    ].filter(example => example.token)

    tokensSection = `
      <section class="ds-frieze__section ds-frieze__section--tokens">
        <div class="ds-frieze__step">
          <span class="ds-frieze__index">01</span>
          <div>
            <div class="ds-frieze__eyebrow">Fondation</div>
            <div class="ds-frieze__label">Tokens</div>
          </div>
        </div>
        <p class="ds-frieze__intro">Palette, rythme, typo et points de rupture pour tout le système.</p>
        <div class="ds-frieze__metrics">
          ${tokenHighlights.map(item => `<span class="ds-frieze__metric">${escapeHtml(item.label)} <strong>${item.value}</strong></span>`).join('')}
        </div>
        <div class="ds-frieze__practice">
          ${usageExamples.map(example => `
            <article class="ds-frieze__usage">
              <div class="ds-frieze__usage-top">
                <div>
                  <div class="ds-frieze__usage-title">${escapeHtml(example.title)}</div>
                  <div class="ds-frieze__usage-token">${escapeHtml(example.token.scssVar || example.token.id)}</div>
                </div>
                <div class="ds-frieze__usage-preview ds-frieze__usage-preview--${escapeAttr(example.valuePreview)}"${example.valuePreview === 'swatch' ? ` style="--usage-color:${escapeAttr(example.token.value)}"` : ''}${example.valuePreview === 'space' ? ` style="--usage-space:${escapeAttr(example.token.value)}"` : ''}${example.valuePreview === 'radius' ? ` style="--usage-radius:${escapeAttr(example.token.value)}"` : ''}${example.valuePreview === 'type' ? ` style="--usage-font-size:${escapeAttr(example.token.value)}"` : ''}${example.valuePreview === 'shadow' ? ` style="--usage-shadow:${escapeAttr(example.token.value)}"` : ''}></div>
              </div>
              <div class="ds-frieze__usage-value">${escapeHtml(String(example.token.value))}</div>
              <div class="ds-frieze__usage-list">
                ${example.usages.map(usage => `<span>${escapeHtml(usage)}</span>`).join('')}
              </div>
            </article>
          `).join('')}
        </div>
        <div class="ds-frieze__body">
          ${colorDots ? `<div class="ds-frieze__dots">${colorDots}</div>` : ''}
          ${typeSamples ? `<div class="ds-frieze__types">${typeSamples}</div>` : ''}
          ${spacings ? `<div class="ds-frieze__spaces">${spacings}</div>` : ''}
          ${radii ? `<div class="ds-frieze__radii">${radii}</div>` : ''}
        </div>
      </section>`
  }

  return `
    <div class="ds-token-bento">
      ${tokensSection}
    </div>`
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

function renderInspector() {
  const state = getState()
  const scene = getRenderedScene()
  const selectedNote = (scene.notes || []).find(note => note.id === state.selectedItemId)
  if (selectedNote) {
    return `
      <aside class="ds-panel">
        <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">Annotation</p></div>
        <div class="ds-panel__body">
          <div class="ds-inspector-group">
            <h3 class="ds-inspector-group__title">Note</h3>
            <label class="ds-field"><span class="ds-field__label">Texte</span><textarea class="ds-field__input" rows="8" data-action="note-text" data-note-id="${selectedNote.id}">${escapeHtml(selectedNote.text)}</textarea></label>
            <p class="ds-muted">Position : ${selectedNote.x}px × ${selectedNote.y}px</p>
            <button class="ds-btn ds-btn--danger" style="margin-top:8px;width:100%;" data-action="remove-note" data-note-id="${selectedNote.id}">Supprimer la note</button>
          </div>
        </div>
      </aside>
    `
  }

  const item = scene.items.find(candidate => candidate.id === state.selectedItemId)
  if (!item) {
    return `
      <aside class="ds-panel">
        <div class="ds-panel__header"><h2 class="ds-panel__title">Inspector</h2><p class="ds-panel__subtitle">Sélectionne un item du canvas</p></div>
        <div class="ds-panel__body"><p class="ds-muted">Aucun élément sélectionné.</p></div>
      </aside>
    `
  }

  const entry = getEntryById(item.ref, item.kind)
  if (!entry) return ''
  const suggestedTokens = getTokenSummaryForEntry(entry)

  const renderControl = (key, ctrl) => {
    const value = item.params[key]
    const inputId = `ds-field-${item.id}-${key}`

    if (ctrl.type === 'component-params') {
      const refEntry = getEntryById(ctrl.ref, 'component')
      if (!refEntry) return `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">${escapeHtml(ctrl.label)}</h3><p class="ds-muted">Composant introuvable : ${escapeHtml(ctrl.ref)}</p></div>`
      const subParams = (typeof value === 'object' && value !== null) ? value : (ctrl.default || {})
      const renderSubControl = (subKey, subCtrl) => {
        const subValue = subParams[subKey] ?? subCtrl.default ?? ''
        const subInputId = `ds-field-${item.id}-${key}-${subKey}`
        if (subCtrl.type === 'select') {
          return `<label class="ds-field" for="${subInputId}"><span class="ds-field__label">${escapeHtml(subCtrl.label)}</span><select class="ds-field__select" id="${subInputId}" data-action="param-change-nested" data-item-id="${item.id}" data-key="${key}" data-sub-key="${subKey}">${(subCtrl.options || []).map(opt => `<option value="${escapeAttr(opt)}"${String(opt) === String(subValue) ? ' selected' : ''}>${escapeHtml(opt)}</option>`).join('')}</select></label>`
        }
        if (subCtrl.type === 'checkbox') {
          return `<label class="ds-field__checkbox"><input type="checkbox" ${subValue ? 'checked' : ''} data-action="param-change-nested" data-item-id="${item.id}" data-key="${key}" data-sub-key="${subKey}"><span>${escapeHtml(subCtrl.label)}</span></label>`
        }
        if (subCtrl.type === 'array') {
          const jsonStr = JSON.stringify(Array.isArray(subValue) ? subValue : (subCtrl.default ?? []), null, 2)
          return `<label class="ds-field" for="${subInputId}"><span class="ds-field__label">${escapeHtml(subCtrl.label)}</span><textarea class="ds-field__input ds-field__input--mono" id="${subInputId}" rows="4" data-action="param-change-nested" data-item-id="${item.id}" data-key="${key}" data-sub-key="${subKey}" data-param-type="array">${escapeHtml(jsonStr)}</textarea></label>`
        }
        return `<label class="ds-field" for="${subInputId}"><span class="ds-field__label">${escapeHtml(subCtrl.label)}</span><input class="ds-field__input" id="${subInputId}" type="text" value="${escapeAttr(String(subValue ?? ''))}" data-action="param-change-nested" data-item-id="${item.id}" data-key="${key}" data-sub-key="${subKey}"></label>`
      }
      const subVariants = Object.entries(refEntry.variants || {})
      const subContent = Object.entries(refEntry.content || {})
      return `
        <details class="ds-inspector-group ds-inspector-group--nested" open>
          <summary class="ds-inspector-group__title">▸ ${escapeHtml(ctrl.label)} <span class="ds-badge">${escapeHtml(refEntry.name)}</span></summary>
          ${subVariants.map(([k, c]) => renderSubControl(k, c)).join('')}
          ${subContent.map(([k, c]) => renderSubControl(k, c)).join('')}
        </details>
      `
    }

    if (ctrl.type === 'select') {
      return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(ctrl.label)}</span><select class="ds-field__select" id="${inputId}" data-action="param-change" data-item-id="${item.id}" data-key="${key}">${(ctrl.options || []).map(option => `<option value="${escapeAttr(option)}"${String(option) === String(value) ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`
    }
    if (ctrl.type === 'checkbox') {
      return `<label class="ds-field__checkbox"><input type="checkbox" ${value ? 'checked' : ''} data-action="param-change" data-item-id="${item.id}" data-key="${key}"><span>${escapeHtml(ctrl.label)}</span></label>`
    }
    if (ctrl.type === 'array') {
      const jsonStr = JSON.stringify(Array.isArray(value) ? value : (ctrl.default ?? []), null, 2)
      return `<label class="ds-field" for="${inputId}"><span class="ds-field__label">${escapeHtml(ctrl.label)}</span><textarea class="ds-field__input ds-field__input--mono" id="${inputId}" rows="6" data-action="param-change" data-item-id="${item.id}" data-key="${key}" data-param-type="array">${escapeHtml(jsonStr)}</textarea></label>`
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
      </div>
    </aside>
  `
}

function renderTopbarMenu(label, items = [], options = {}) {
  const danger = options.danger ? ' ds-menu__button--danger' : ''
  const active = options.active ? ' ds-menu__button--active' : ''
  return `
    <details class="ds-menu">
      <summary class="ds-btn ds-menu__button${danger}${active}">${escapeHtml(label)}</summary>
      <div class="ds-menu__content">
        ${items.map(item => {
          if (item.type === 'file') {
            return `<label class="ds-menu__item">${escapeHtml(item.label)}<input type="file" accept="application/json,.json" data-action="${escapeAttr(item.action)}" hidden></label>`
          }
          if (item.type === 'select') {
            return `<div class="ds-menu__item ds-menu__item--select"><span>${escapeHtml(item.label)}</span><select class="ds-field__select" data-action="${escapeAttr(item.action)}">${(item.options || []).map(opt => `<option value="${escapeAttr(opt.value)}"${opt.selected ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}</select></div>`
          }
          if (item.disabled) {
            return `<div class="ds-menu__item ds-menu__item--info">${escapeHtml(item.label)}</div>`
          }
          return `<button class="ds-menu__item${item.danger ? ' ds-menu__item--danger' : ''}" data-action="${escapeAttr(item.action)}">${escapeHtml(item.label)}</button>`
        }).join('')}
      </div>
    </details>
  `
}

function renderTopbar() {
  const { scene, tokensLoaded, history, historyIndex } = getState()
  const agent = getAgentState()
  return `
    <header class="ds-topbar">
      <div>
        <div class="ds-topbar__title">Design Surface</div>
        <div class="ds-topbar__meta">${escapeHtml(scene.name)} · ${scene.items.length} item(s) · ${(scene.notes || []).length} note(s) · viewport ${escapeHtml(scene.viewport || 'desktop')} · tokens ${tokensLoaded ? 'chargés' : 'indisponibles'}</div>
      </div>
      <div class="ds-topbar__actions">
        <div class="ds-history">
          <button class="ds-btn" data-action="undo" ${historyIndex <= 0 ? 'disabled' : ''}>Undo</button>
          <button class="ds-btn" data-action="redo" ${historyIndex >= history.length - 1 ? 'disabled' : ''}>Redo</button>
        </div>
        <div class="ds-history">
          <button class="ds-btn" data-action="zoom-out" title="Ctrl+−">−</button>
          <span class="ds-muted" style="font-size:12px;min-width:38px;text-align:center;">${Math.round(zoomLevel * 100)}%</span>
          <button class="ds-btn" data-action="zoom-in" title="Ctrl++">+</button>
        </div>
        ${renderTopbarMenu('Canvas', [
          { label: 'Réorganiser (bento)', action: 'auto-arrange' },
          { label: 'Ajouter une note', action: 'add-note' }
        ])}
        <button class="ds-btn ${libraryOpen ? 'ds-btn--active' : ''}" data-action="toggle-library" title="Librairie">☰</button>
        <button class="ds-btn ${inspectorOpen ? 'ds-btn--active' : ''}" data-action="toggle-inspector" title="Inspector">⊞</button>
        <button class="ds-btn ${agent.open ? 'ds-btn--active' : ''}" data-action="toggle-agent">Agent</button>
      </div>
    </header>
  `
}

function renderLayout() {
  const agent = getAgentState()
  const state = getState()
  const hasSelection = !!state.selectedItemId
  const showInspector = inspectorOpen && hasSelection
  const layoutClasses = [
    'ds-layout',
    !libraryOpen ? 'ds-layout--no-library' : '',
    !showInspector ? 'ds-layout--no-inspector' : '',
    agent.open ? 'ds-layout--with-agent' : ''
  ].filter(Boolean).join(' ')
  const content = `${libraryOpen ? renderLibrary() : ''}${renderCanvas()}${showInspector ? renderInspector() : ''}${agent.open ? renderAgentPanel({ selectionHint: getAgentSelectionHint() }) : ''}`
  return `<div class="ds-app">${renderTopbar()}<div class="${layoutClasses}">${content}</div></div>`
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
  if (spacePressed) return
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
  setFramesInteractive(false)
  document.body.style.cursor = 'grabbing'
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {}
  bindGlobalPointerCleanup()
}

const DRAG_GRID = 24

function onDragMove(event) {
  if (!dragState?.targetEl) return
  const deltaX = event.clientX - dragState.startMouseX
  const deltaY = event.clientY - dragState.startMouseY
  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragState.didMove = true
  const rawX = dragState.startX + deltaX
  const rawY = dragState.startY + deltaY
  const x = Math.max(0, Math.round(rawX / DRAG_GRID) * DRAG_GRID)
  const y = Math.max(0, Math.round(rawY / DRAG_GRID) * DRAG_GRID)
  dragState.lastX = x
  dragState.lastY = y
  dragState.targetEl.style.left = `${x}px`
  dragState.targetEl.style.top = `${y}px`
}

function stopDrag() {
  const didMove = dragState?.didMove ?? false
  const patch = didMove ? { x: dragState.lastX, y: dragState.lastY } : null
  const targetId = dragState?.targetId
  const kind = dragState?.kind
  lastDragEndTime = Date.now()
  lastDragDidMove = didMove
  dragState = null
  dragPointerId = null
  if (!resizeState) setFramesInteractive(true)
  document.body.style.cursor = resizeState ? 'nwse-resize' : ''
  if (!resizeState) unbindGlobalPointerCleanup()
  if (patch && targetId) {
    if (kind === 'note') updateNote(targetId, patch)
    else updateItem(targetId, patch)
  } else if (!targetId) {
    render()
  }
  // Si pas de mouvement : pas de re-render → click event fire sur l'élément vivant
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
  const itemId = resizeState?.itemId
  const width = resizeState?.lastWidth ?? resizeState?.startWidth
  const height = resizeState?.lastHeight ?? resizeState?.startHeight
  resizeState = null
  resizePointerId = null
  if (!dragState) setFramesInteractive(true)
  document.body.style.cursor = dragState ? 'grabbing' : ''
  if (!dragState) unbindGlobalPointerCleanup()
  if (itemId) {
    updateItem(itemId, { width, height })
  } else {
    render()
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
  rootEl.querySelector('[data-agent-action="close-feedback"]')?.addEventListener('click', () => {
    patchAgentState({ validationErrors: [], runtimeError: '', lastSummary: '', lastWarnings: [], requiresNewComponent: false, unresolved: [], previewScene: null })
    render()
  })

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

function bindEvents() {
  rootEl.querySelector('#ds-search')?.addEventListener('input', event => setQuery(event.target.value))
  rootEl.querySelector('[data-action="toggle-new-component"]')?.addEventListener('click', () => { newComponentFormOpen = !newComponentFormOpen; render() })
  rootEl.querySelector('[data-action="new-component-form"]')?.addEventListener('submit', async event => {
    event.preventDefault()
    const form = event.target
    const status = form.querySelector('[data-new-component-status]')
    const btn = form.querySelector('[type="submit"]')
    const data = { name: form.name.value, level: form.level.value, category: form.category.value, description: form.description.value }
    btn.disabled = true
    status.textContent = 'Création en cours…'
    try {
      const result = await scaffoldComponent(data)
      await loadRegistry()
      status.textContent = `✓ "${result.name}" créé avec succès.`
      form.reset()
      setTimeout(() => { newComponentFormOpen = false; render() }, 1200)
    } catch (error) {
      status.textContent = `Erreur : ${error.message}`
      btn.disabled = false
    }
  })
  rootEl.querySelector('[data-action="auto-arrange"]')?.addEventListener('click', autoArrangeAll)
  rootEl.querySelector('#ds-canvas')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) patchState({ selectedItemId: null })
  })
  rootEl.querySelector('.ds-canvas-wrap')?.addEventListener('pointerdown', event => {
    if (spacePressed && !dragState && !resizeState) {
      event.preventDefault()
      startPan(event)
    }
  })
  rootEl.querySelector('.ds-canvas-wrap')?.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      setZoom(zoomLevel - event.deltaY * 0.001)
    }
  }, { passive: false })
  rootEl.querySelectorAll('[data-action="add-item"]').forEach(button => button.addEventListener('click', () => {
    const entry = getEntryById(button.dataset.id, button.dataset.kind)
    if (entry) addItem(entry)
  }))
  rootEl.querySelectorAll('[data-action="add-note"]').forEach(button => button.addEventListener('click', addNote))
  rootEl.querySelectorAll('.ds-item').forEach(element => element.addEventListener('click', () => { if (element.dataset.itemId) selectItem(element.dataset.itemId) }))
  rootEl.querySelectorAll('[data-action="remove-note"]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Supprimer cette note de la scène ?')) removeItemById(btn.dataset.noteId)
  }))
  rootEl.querySelectorAll('[data-action="note-delete-popup"]').forEach(btn => btn.addEventListener('click', event => {
    event.stopPropagation()
    if (confirm('Supprimer cette note ?')) removeItemById(btn.dataset.noteId)
  }))
  rootEl.querySelectorAll('[data-action="remove-item"]').forEach(btn => btn.addEventListener('click', event => {
    event.stopPropagation()
    if (!confirm('Supprimer cet élément de la scène ?\n\nAttention : supprimer un élément de la scène le retire définitivement du projet. Cette action est réversible via Undo.')) return
    removeItemById(btn.dataset.itemId)
  }))
  rootEl.querySelectorAll('.ds-note-pin').forEach(element => element.addEventListener('click', () => { if (element.dataset.noteId) selectItem(element.dataset.noteId) }))
  rootEl.querySelectorAll('[data-drag-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); startDrag('item', handle.dataset.dragHandle, event) }))
  rootEl.querySelectorAll('[data-note-drag-handle]').forEach(handle => {
    handle.addEventListener('pointerdown', event => { event.preventDefault(); startDrag('note', handle.dataset.noteDragHandle, event) })
    handle.addEventListener('click', () => {
      if (!lastDragDidMove) toggleNoteOpen(handle.dataset.noteDragHandle)
    })
  })
  rootEl.querySelectorAll('[data-resize-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); startResize(handle.dataset.resizeHandle, event) }))
  rootEl.querySelectorAll('[data-action="param-change"]').forEach(input => {
    const handler = () => {
      let value
      if (input.type === 'checkbox') {
        value = input.checked
      } else if (input.dataset.paramType === 'array') {
        try { value = JSON.parse(input.value) } catch { return }
      } else {
        value = input.value
      }
      updateItemParams(input.dataset.itemId, { [input.dataset.key]: value })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="param-change-nested"]').forEach(input => {
    const handler = () => {
      const itemId = input.dataset.itemId
      const key = input.dataset.key
      const subKey = input.dataset.subKey
      let subValue
      if (input.type === 'checkbox') {
        subValue = input.checked
      } else if (input.dataset.paramType === 'array') {
        try { subValue = JSON.parse(input.value) } catch { return }
      } else {
        subValue = input.value
      }
      const current = getRenderedScene().items.find(i => i.id === itemId)
      if (!current) return
      const existing = (typeof current.params[key] === 'object' && current.params[key] !== null) ? current.params[key] : {}
      updateItemParams(itemId, { [key]: { ...existing, [subKey]: subValue } })
    }
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler)
    if (input.type === 'checkbox') input.addEventListener('change', handler)
  })
  rootEl.querySelectorAll('[data-action="item-prop"]').forEach(input => input.addEventListener('input', () => {
    const value = Number(input.value)
    if (Number.isFinite(value) && value > 0) updateItem(input.dataset.itemId, { [input.dataset.key]: value })
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
  rootEl.querySelectorAll('[data-action="note-text"]').forEach(textarea => textarea.addEventListener('blur', () => updateNote(textarea.dataset.noteId, { text: textarea.value })))
  rootEl.querySelector('[data-action="scene-viewport"]')?.addEventListener('change', event => setSceneViewport(event.target.value))
  rootEl.querySelector('[data-action="scene-file"]')?.addEventListener('change', event => loadSceneFromFile(event.target.value))
  rootEl.querySelector('[data-action="apply-viewport-selected"]')?.addEventListener('click', applyViewportToSelected)
  rootEl.querySelector('[data-action="undo"]')?.addEventListener('click', undoHistory)
  rootEl.querySelector('[data-action="redo"]')?.addEventListener('click', redoHistory)
  rootEl.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => setZoom(zoomLevel + 0.1))
  rootEl.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => setZoom(zoomLevel - 0.1))
  rootEl.querySelector('[data-action="export-scene"]')?.addEventListener('click', exportCurrentScene)
  rootEl.querySelector('[data-action="save-scene-file"]')?.addEventListener('click', () => { saveCurrentSceneToFile().catch(error => alert(error.message)) })
  rootEl.querySelector('[data-action="save-scene-as"]')?.addEventListener('click', () => { saveCurrentSceneAsNewFile().catch(error => alert(error.message)) })
  rootEl.querySelector('[data-action="delete-scene-file"]')?.addEventListener('click', () => { deleteCurrentSceneFile().catch(error => alert(error.message)) })
  rootEl.querySelector('[data-action="save-as-base"]')?.addEventListener('click', saveCurrentAsBase)
  rootEl.querySelector('[data-action="reset-to-base"]')?.addEventListener('click', resetToBaseScene)
  rootEl.querySelector('[data-action="new-working-scene"]')?.addEventListener('click', createNewWorkingScene)
  rootEl.querySelector('[data-action="duplicate-scene"]')?.addEventListener('click', duplicateCurrentScene)
  rootEl.querySelectorAll('[data-action="import-scene"]').forEach(input => input.addEventListener('change', importSceneFromFile))
  rootEl.querySelector('[data-action="remove-selected"]')?.addEventListener('click', removeSelectedItem)
  rootEl.querySelector('[data-action="clear-scene"]')?.addEventListener('click', clearScene)
  rootEl.querySelector('[data-action="reset-storage"]')?.addEventListener('click', () => resetState())
  rootEl.querySelector('[data-action="toggle-library"]')?.addEventListener('click', () => { libraryOpen = !libraryOpen; render() })
  rootEl.querySelector('[data-action="toggle-inspector"]')?.addEventListener('click', () => { inspectorOpen = !inspectorOpen; render() })
  rootEl.querySelector('[data-action="toggle-agent"]')?.addEventListener('click', toggleAgentPanel)
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
  const wrap = rootEl.querySelector('.ds-canvas-wrap')
  const scrollLeft = wrap?.scrollLeft ?? 0
  const scrollTop = wrap?.scrollTop ?? 0
  const renderState = captureRenderState()
  rootEl.innerHTML = renderLayout()
  restorePersistentFrames(renderState)
  bindEvents()
  restoreActiveControl(renderState)
  const nextWrap = rootEl.querySelector('.ds-canvas-wrap')
  if (nextWrap) {
    nextWrap.scrollLeft = scrollLeft
    nextWrap.scrollTop = scrollTop
  }
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

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)

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
    if (!hasWorkingScene()) autoArrangeAll()
    render()
  } catch (error) {
    console.error('[design-surface]', error)
    rootEl.innerHTML = `<div style="padding:24px;color:white;">
      <strong>Erreur au chargement du Design Surface</strong><br>
      ${escapeHtml(error?.message || 'Erreur inconnue')}
    </div>`
  }
}
