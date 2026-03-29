const STORAGE_KEY = 'gofast-design-surface:v1'

function createEmptyScene() {
  return {
    id: 'default-scene',
    name: 'Default scene',
    version: 1,
    viewport: 'desktop',
    notes: [],
    items: []
  }
}

function createInitialState() {
  return {
    registryLoaded: false,
    tokensLoaded: false,
    query: '',
    selectedItemId: null,
    history: [],
    historyIndex: -1,
    sceneFiles: [],
    activeSceneFile: 'default.scene.json',
    baseScene: createEmptyScene(),
    scene: createEmptyScene()
  }
}

let state = normalizeState(loadState()) || createInitialState()
const listeners = new Set()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function emit() {
  persist()
  listeners.forEach(listener => listener(state))
}

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return null
  const initial = createInitialState()
  return {
    ...initial,
    ...raw,
    history: Array.isArray(raw.history) ? raw.history : [],
    historyIndex: Number.isInteger(raw.historyIndex) ? raw.historyIndex : -1,
    sceneFiles: Array.isArray(raw.sceneFiles) ? raw.sceneFiles : [],
    activeSceneFile: raw.activeSceneFile || 'default.scene.json',
    baseScene: { ...createEmptyScene(), ...(raw.baseScene || {}) },
    scene: { ...createEmptyScene(), ...(raw.scene || {}) }
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeState(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function getState() {
  return state
}

export function setState(updater) {
  const next = typeof updater === 'function' ? updater(state) : updater
  state = next
  emit()
}

export function patchState(patch) {
  state = { ...state, ...patch }
  emit()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function pushHistory(scene) {
  const snapshot = clone(scene)
  const nextHistory = state.history.slice(0, state.historyIndex + 1)
  nextHistory.push(snapshot)
  state = {
    ...state,
    history: nextHistory.slice(-50),
    historyIndex: Math.min(nextHistory.length, 50) - 1
  }
  emit()
}

export function undoHistory() {
  if (state.historyIndex <= 0) return
  const nextIndex = state.historyIndex - 1
  state = {
    ...state,
    historyIndex: nextIndex,
    scene: clone(state.history[nextIndex]),
    selectedItemId: null
  }
  emit()
}

export function redoHistory() {
  if (state.historyIndex >= state.history.length - 1) return
  const nextIndex = state.historyIndex + 1
  state = {
    ...state,
    historyIndex: nextIndex,
    scene: clone(state.history[nextIndex]),
    selectedItemId: null
  }
  emit()
}

export function setSceneFiles(sceneFiles) {
  state = { ...state, sceneFiles }
  emit()
}

export function setActiveSceneFile(activeSceneFile) {
  state = { ...state, activeSceneFile }
  emit()
}

export function setBaseScene(baseScene) {
  state = { ...state, baseScene: clone(baseScene) }
  emit()
}

export function replaceScene(scene) {
  state = {
    ...state,
    selectedItemId: null,
    scene: clone(scene)
  }
  emit()
}

export function resetState() {
  state = createInitialState()
  emit()
}

export function rehydrateState() {
  state = normalizeState(state) || createInitialState()
  emit()
}

export function hasWorkingScene() {
  const scene = state?.scene
  if (!scene) return false
  return (scene.items?.length || 0) > 0 || (scene.notes?.length || 0) > 0 || scene.viewport !== 'desktop'
}

export function replaceWorkingScene(scene) {
  state = {
    ...state,
    selectedItemId: null,
    scene: clone(scene),
    history: [clone(scene)],
    historyIndex: 0
  }
  emit()
}

export function promoteSceneToBase() {
  state = {
    ...state,
    baseScene: clone(state.scene)
  }
  emit()
}

export function addSceneFile(sceneFile) {
  const existing = state.sceneFiles || []
  state = {
    ...state,
    sceneFiles: [...existing, sceneFile]
  }
  emit()
}
