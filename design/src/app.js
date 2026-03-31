import { loadRegistry, searchEntries, getEntryById, getDefaultParams } from './core/registry.js'
import { buildRenderUrl } from './core/render-url.js'
import { loadTokens, getTokenSummaryForEntry } from './core/tokens.js'
import { listSceneFiles, loadSceneFile } from './core/scene-file.js'
import { saveSceneFile, deleteSceneFile } from './core/scene-api.js'
import { diffScenes } from './core/diff.js'
import { validateActionSet } from './core/action-validate.js'
import { applyActionSetToScene } from './core/action-apply.js'
import { buildAIContext } from './core/ai-context.js'
import { buildBrainPrompt } from './core/agent-prompt.js'
import { getDefaultAgentProviderId, runAgentProvider } from './core/agent-runtime.js'
import { createEmptyActionSet } from './core/action-schema.js'
import { normalizeBrainOutput } from './core/brain-output.js'
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

function commitSceneHistory() {
  if (historyMuted) return
  pushHistory(getState().scene)
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
  patchAgentState({ open: !agent.open })
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

function handleAgentFillContext() {
  const context = buildAIContext(getState(), getEntryById)
  patchAgentState({ input: stringifyAgentJson(context), promptPreview: buildAgentPromptPreview(), runtimeError: '' })
  render()
}

function handleAgentFillTemplate() {
  patchAgentState({
    actionJson: stringifyAgentJson(normalizeBrainOutput(createEmptyActionSet())),
    validationErrors: [],
    runtimeError: '',
    lastSummary: '',
    lastWarnings: [],
    requiresNewComponent: false,
    unresolved: [],
    previewScene: null,
    promptPreview: buildAgentPromptPreview()
  })
  render()
}

function handleAgentRefreshPrompt() {
  patchAgentState({ promptPreview: buildAgentPromptPreview(), runtimeError: '' })
  render()
}

async function handleAgentRun() {
  try {
    const agent = getAgentState()
    const promptPreview = buildAgentPromptPreview()
    const { output } = await runAgentProvider(agent.providerId, {
      intent: agent.input,
      context: buildAIContext(getState(), getEntryById),
      prompt: promptPreview,
      manualJson: agent.actionJson
    })

    patchAgentState({
      promptPreview,
      actionJson: stringifyAgentJson(output),
      runtimeError: '',
      validationErrors: [],
      lastSummary: output.summary || '',
      lastWarnings: output.warnings || [],
      requiresNewComponent: output.requiresNewComponent || false,
      unresolved: output.unresolved || []
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
        <p class="ds-panel__subtitle">Composants et pages exposés par le showcase</p>
      </div>
      <div class="ds-panel__body">
        <input class="ds-search" id="ds-search" type="search" placeholder="Rechercher un composant ou une page" value="${escapeAttr(query)}">
        <div class="ds-library-list" style="margin-top: 16px;">
          <article class="ds-card">
            <div class="ds-card__top"><div class="ds-card__name">Annotation</div><span class="ds-badge">note</span></div>
            <div class="ds-card__meta">collaboration · canvas</div>
            <p class="ds-card__desc">Ajoute une note libre sur le canvas.</p>
            <div class="ds-card__actions"><button class="ds-btn" data-action="add-note">Ajouter une note</button></div>
          </article>
          ${entries.map(entry => `
            <article class="ds-card">
              <div class="ds-card__top"><div class="ds-card__name">${escapeHtml(entry.name)}</div><span class="ds-badge">${escapeHtml(entry.kind)}</span></div>
              <div class="ds-card__meta">${escapeHtml(entry.level || '')} · ${escapeHtml(entry.category || '')}</div>
              <p class="ds-card__desc">${escapeHtml(entry.description || 'Sans description')}</p>
              <div class="ds-card__actions"><button class="ds-btn" data-action="add-item" data-kind="${entry.kind}" data-id="${entry.id}">Ajouter au canvas</button></div>
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

function renderCanvas() {
  const scene = getRenderedScene()
  const { selectedItemId } = getState()
  const notes = scene.notes || []

  return `
    <main class="ds-canvas-wrap">
      <div class="ds-canvas" id="ds-canvas">
        ${renderFrames(scene)}
        ${scene.items.length === 0 && notes.length === 0 ? '<div class="ds-empty">Ajoute un composant, une page ou une note depuis la library.</div>' : ''}
        ${notes.map(note => `
          <section class="ds-note ${selectedItemId === note.id ? 'ds-note--selected' : ''}" data-note-id="${note.id}" style="left:${note.x}px;top:${note.y}px;">
            <div class="ds-note__title" data-note-drag-handle="${note.id}">Annotation</div>
            <div class="ds-note__text">${escapeHtml(note.text)}</div>
          </section>
        `).join('')}
        ${scene.items.map(item => {
          const entry = getEntryById(item.ref, item.kind)
          if (!entry) return ''
          const url = buildRenderUrl(entry, item.params)
          return `
            <section class="ds-item ${selectedItemId === item.id ? 'ds-item--selected' : ''}" data-item-id="${item.id}" style="left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;">
              <div class="ds-item__toolbar" data-drag-handle="${item.id}">
                <div><div class="ds-item__title">${escapeHtml(entry.name)}</div><div class="ds-item__meta">${escapeHtml(item.viewport || 'desktop')} · ${escapeHtml(entry.kind)} · ${escapeHtml(entry.level || '')}</div></div>
                <a class="ds-badge" href="${escapeAttr(url)}" target="_blank" rel="noreferrer">ouvrir</a>
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
          return `<button class="ds-menu__item${item.danger ? ' ds-menu__item--danger' : ''}" data-action="${escapeAttr(item.action)}">${escapeHtml(item.label)}</button>`
        }).join('')}
      </div>
    </details>
  `
}

function renderTopbar() {
  const { scene, tokensLoaded, history, historyIndex, sceneFiles, activeSceneFile } = getState()
  const agent = getAgentState()
  return `
    <header class="ds-topbar">
      <div>
        <div class="ds-topbar__title">Design Surface</div>
        <div class="ds-topbar__meta">${escapeHtml(scene.name)} · ${scene.items.length} item(s) · ${(scene.notes || []).length} note(s) · viewport ${escapeHtml(scene.viewport || 'desktop')} · tokens ${tokensLoaded ? 'chargés' : 'indisponibles'}</div>
      </div>
      <div class="ds-topbar__actions">
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
        ${renderTopbarMenu('Scene', [
          { label: 'Exporter', action: 'export-scene' },
          { label: 'Save scene file', action: 'save-scene-file' },
          { label: 'Save scene as…', action: 'save-scene-as' },
          { label: 'Import scene', action: 'import-scene', type: 'file' },
          { label: 'Delete scene file', action: 'delete-scene-file', danger: true }
        ])}
        ${renderTopbarMenu('Workspace', [
          { label: 'Save current as base', action: 'save-as-base' },
          { label: 'Reset to base', action: 'reset-to-base' },
          { label: 'New working scene', action: 'new-working-scene' },
          { label: 'Duplicate scene', action: 'duplicate-scene' },
          { label: 'Reset local', action: 'reset-storage', danger: true }
        ])}
        ${renderTopbarMenu('Canvas', [
          { label: 'Ajouter une note', action: 'add-note' },
          { label: 'Appliquer à la sélection', action: 'apply-viewport-selected' },
          { label: 'Vider la scène', action: 'clear-scene', danger: true },
          { label: 'Supprimer la sélection', action: 'remove-selected', danger: true }
        ], { danger: false })}
        <button class="ds-btn ${agent.open ? 'ds-btn--active' : ''}" data-action="toggle-agent">Agent</button>
      </div>
    </header>
  `
}

function renderLayout() {
  const agent = getAgentState()
  const content = `${renderLibrary()}${renderCanvas()}${renderInspector()}${renderAgentPanel()}`
  return `<div class="ds-app">${renderTopbar()}<div class="ds-layout${agent.open ? ' ds-layout--with-agent' : ''}">${content}</div></div>`
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
  setFramesInteractive(false)
  document.body.style.cursor = 'grabbing'
  try {
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  } catch {}
  bindGlobalPointerCleanup()
}

function onDragMove(event) {
  if (!dragState?.targetEl) return
  const deltaX = event.clientX - dragState.startMouseX
  const deltaY = event.clientY - dragState.startMouseY
  const x = Math.max(0, Math.round(dragState.startX + deltaX))
  const y = Math.max(0, Math.round(dragState.startY + deltaY))
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
    if (dragState.kind === 'note') updateNote(dragState.targetId, patch)
    else updateItem(dragState.targetId, patch)
  }
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
  const agent = getAgentState()
  rootEl.querySelector('[data-agent-action="provider"]')?.addEventListener('change', event => {
    patchAgentState({ providerId: event.target.value, runtimeError: '', promptPreview: buildAgentPromptPreview() })
  })
  rootEl.querySelector('[data-agent-action="input"]')?.addEventListener('input', event => {
    patchAgentState({ input: event.target.value, runtimeError: '' })
  })
  rootEl.querySelector('[data-agent-action="json"]')?.addEventListener('input', event => {
    patchAgentState({ actionJson: event.target.value, runtimeError: '' })
  })
  rootEl.querySelector('[data-agent-action="fill-context"]')?.addEventListener('click', handleAgentFillContext)
  rootEl.querySelector('[data-agent-action="fill-template"]')?.addEventListener('click', handleAgentFillTemplate)
  rootEl.querySelector('[data-agent-action="refresh-prompt"]')?.addEventListener('click', handleAgentRefreshPrompt)
  rootEl.querySelector('[data-agent-action="run"]')?.addEventListener('click', () => { handleAgentRun().catch(error => patchAgentState({ runtimeError: error.message || 'Runtime error' })) })
  rootEl.querySelector('[data-agent-action="validate"]')?.addEventListener('click', handleAgentValidate)
  rootEl.querySelector('[data-agent-action="preview"]')?.addEventListener('click', handleAgentPreview)
  rootEl.querySelector('[data-agent-action="apply"]')?.addEventListener('click', handleAgentApply)
  rootEl.querySelector('[data-agent-action="clear-preview"]')?.addEventListener('click', handleAgentClearPreview)

  if (agent.open) {
    const context = buildAIContext(getState(), getEntryById)
    rootEl.querySelector('[data-agent-action="input"]')?.setAttribute('placeholder', stringifyAgentJson(context.selection || context.scene).slice(0, 120))
  }
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
  rootEl.querySelectorAll('[data-action="add-item"]').forEach(button => button.addEventListener('click', () => {
    const entry = getEntryById(button.dataset.id, button.dataset.kind)
    if (entry) addItem(entry)
  }))
  rootEl.querySelectorAll('[data-action="add-note"]').forEach(button => button.addEventListener('click', addNote))
  rootEl.querySelectorAll('.ds-item').forEach(element => element.addEventListener('click', () => { if (element.dataset.itemId) selectItem(element.dataset.itemId) }))
  rootEl.querySelectorAll('.ds-note').forEach(element => element.addEventListener('click', () => { if (element.dataset.noteId) selectItem(element.dataset.noteId) }))
  rootEl.querySelectorAll('[data-drag-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); startDrag('item', handle.dataset.dragHandle, event) }))
  rootEl.querySelectorAll('[data-note-drag-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); startDrag('note', handle.dataset.noteDragHandle, event) }))
  rootEl.querySelectorAll('[data-resize-handle]').forEach(handle => handle.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); startResize(handle.dataset.resizeHandle, event) }))
  rootEl.querySelectorAll('[data-action="param-change"]').forEach(input => {
    const handler = () => {
      const value = input.type === 'checkbox' ? input.checked : input.value
      updateItemParams(input.dataset.itemId, { [input.dataset.key]: value })
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
  rootEl.querySelectorAll('[data-action="note-text"]').forEach(textarea => textarea.addEventListener('input', () => updateNote(textarea.dataset.noteId, { text: textarea.value })))
  rootEl.querySelector('[data-action="scene-viewport"]')?.addEventListener('change', event => setSceneViewport(event.target.value))
  rootEl.querySelector('[data-action="scene-file"]')?.addEventListener('change', event => loadSceneFromFile(event.target.value))
  rootEl.querySelector('[data-action="apply-viewport-selected"]')?.addEventListener('click', applyViewportToSelected)
  rootEl.querySelector('[data-action="undo"]')?.addEventListener('click', undoHistory)
  rootEl.querySelector('[data-action="redo"]')?.addEventListener('click', redoHistory)
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
  rootEl.querySelector('[data-action="toggle-agent"]')?.addEventListener('click', toggleAgentPanel)
  bindTopbarMenus()
  bindAgentEvents()
}

function render() {
  if (!rootEl || dragState || resizeState) return
  rootEl.innerHTML = renderLayout()
  bindEvents()
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

    const agentTemplate = stringifyAgentJson(normalizeBrainOutput(createEmptyActionSet()))
    patchAgentState({
      providerId: getDefaultAgentProviderId(),
      actionJson: agentTemplate,
      promptPreview: buildBrainPrompt({ intent: '', context: buildAIContext(getState(), getEntryById) })
    })

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
    render()
  } catch (error) {
    console.error('[design-surface]', error)
    rootEl.innerHTML = `<div style="padding:24px;color:white;">
      <strong>Erreur au chargement du Design Surface</strong><br>
      ${escapeHtml(error?.message || 'Erreur inconnue')}
    </div>`
  }
}
