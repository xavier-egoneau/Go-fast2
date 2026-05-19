let state = {
  active: false,
  itemId: null,
  component: null,       // { name: 'alert', scssPath: '...' }
  bemMap: {},            // { 'alert': { display: 'flex', ... }, 'alert__icon': { ... } }
  selectedSelector: null,
  breadcrumb: [],
  selectedEl: null,      // référence DOM dans l'iframe
  pendingChanges: {},    // { 'border-color': '$color-success' }
  addingProp: false,
  variantMode: false,
  variantName: '',
  loading: false,
  error: null
}

const listeners = new Set()

export function getCssEditorState() {
  return state
}

export function patchCssEditorState(patch) {
  state = { ...state, ...patch }
  listeners.forEach(fn => fn())
}

export function subscribeCssEditor(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resetCssEditor() {
  state = {
    active: false,
    itemId: null,
    component: null,
    bemMap: {},
    selectedSelector: null,
    breadcrumb: [],
    selectedEl: null,
    pendingChanges: {},
    addingProp: false,
    variantMode: false,
    variantName: '',
    loading: false,
    error: null
  }
  listeners.forEach(fn => fn())
}

export function buildTokenMap(tokens) {
  const map = {}
  for (const token of tokens) {
    map[token.scssVar] = token.value
  }
  return map
}

export function resolveTokenValue(scssVar, tokenMap) {
  return tokenMap[scssVar] ?? scssVar
}

export function getCssPropertyCategory(prop) {
  if (['color', 'background-color', 'border-color', 'outline-color'].includes(prop)) return 'color'
  if (['padding', 'margin', 'gap', 'width', 'height', 'min-width', 'max-width',
       'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
       'margin-top', 'margin-right', 'margin-bottom', 'margin-left'].includes(prop)) return 'spacing'
  if (['border-radius', 'border-top-left-radius', 'border-top-right-radius',
       'border-bottom-left-radius', 'border-bottom-right-radius'].includes(prop)) return 'radius'
  if (['font-size'].includes(prop)) return 'font-size'
  if (['font-weight'].includes(prop)) return 'font-weight'
  if (['font-family'].includes(prop)) return 'font-family'
  if (['line-height'].includes(prop)) return 'line-height'
  if (['transition'].includes(prop)) return 'transition'
  return 'other'
}

export const ALL_CSS_PROPERTIES = [
  // Box model
  'display', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'border-radius', 'border-width', 'border-style', 'border-color',
  // Flex/grid
  'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap',
  'flex', 'flex-shrink', 'flex-grow', 'flex-basis', 'align-self',
  // Color
  'color', 'background-color',
  // Typography
  'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration', 'text-transform', 'white-space',
  // Visual
  'opacity', 'cursor', 'transition', 'box-shadow', 'outline', 'outline-offset',
  'overflow', 'pointer-events', 'position', 'top', 'right', 'bottom', 'left',
  'z-index', 'visibility'
]
