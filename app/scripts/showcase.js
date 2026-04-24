/**
 * showcase.js — Go-fast Design Surface
 * SPA : machine d'états big picture ↔ focus, panneau agent, inspecteur.
 */

const SHOWCASE_JSON = '/dev/data/showcase.json'

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

const ICONS = {
  edit: `<svg class="gf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg class="gf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  comment: `<svg class="gf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  close: `<svg class="gf-icon gf-icon--xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

let zoomLevel = 1
const ZOOM_STEP = 0.1
const ZOOM_MIN  = 0.25
const ZOOM_MAX  = 2

function setZoom(next) {
  const canvas = document.getElementById('gf-bigpicture')
  const levels = document.getElementById('gf-levels')
  if (!canvas || !levels) return

  const cx = canvas.scrollLeft + canvas.clientWidth  / 2
  const cy = canvas.scrollTop  + canvas.clientHeight / 2
  const prev = zoomLevel

  zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
  levels.style.transform       = `scale(${zoomLevel})`
  levels.style.transformOrigin = 'top left'

  canvas.scrollLeft = cx * (zoomLevel / prev) - canvas.clientWidth  / 2
  canvas.scrollTop  = cy * (zoomLevel / prev) - canvas.clientHeight / 2

  const el = document.getElementById('gf-zoom-value')
  if (el) el.textContent = Math.round(zoomLevel * 100) + '%'
}

function initZoomControls() {
  document.getElementById('gf-zoom-in')?.addEventListener('click',  () => setZoom(zoomLevel + ZOOM_STEP))
  document.getElementById('gf-zoom-out')?.addEventListener('click', () => setZoom(zoomLevel - ZOOM_STEP))

  const canvas = document.getElementById('gf-bigpicture')
  canvas?.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setZoom(zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
  }, { passive: false })
}

// ─── Drag to pan ──────────────────────────────────────────────────────────────

function initCanvasDrag() {
  const canvas = document.getElementById('gf-bigpicture')
  if (!canvas) return

  let dragging = false, startX = 0, startY = 0, scrollL = 0, scrollT = 0

  canvas.addEventListener('mousedown', e => {
    if (e.target.closest('.gf-card')) return
    dragging = true
    startX   = e.pageX
    startY   = e.pageY
    scrollL  = canvas.scrollLeft
    scrollT  = canvas.scrollTop
    canvas.classList.add('is-dragging')
  })

  window.addEventListener('mousemove', e => {
    if (!dragging) return
    canvas.scrollLeft = scrollL - (e.pageX - startX)
    canvas.scrollTop  = scrollT - (e.pageY - startY)
  })

  window.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    canvas.classList.remove('is-dragging')
  })
}

// ─── Niveaux Atomic Design ────────────────────────────────────────────────────

const LEVELS = [
  { id: 'atom',     label: 'ATOMS' },
  { id: 'molecule', label: 'MOLECULES' },
  { id: 'organism', label: 'ORGANISMS' },
  { id: 'template', label: 'TEMPLATES & PAGES' },
]

// ─── État global ──────────────────────────────────────────────────────────────

const state = {
  view: 'bigpicture',       // 'bigpicture' | 'focus'
  components: [],
  pages: [],
  activeItem: null,
  activeType: 'component',  // 'component' | 'page'
  rightPanel: 'variants',   // 'variants' | 'comments'
  controlValues: {},
  comments: {},             // id → [{ author, date, body }]
  agentOpen: true,
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const res = await fetch(SHOWCASE_JSON)
    if (!res.ok) throw new Error(`Impossible de charger ${SHOWCASE_JSON}`)
    const data = await res.json()
    state.components = data.components || []
    state.pages      = data.pages      || []
  } catch (e) {
    showGlobalError(e.message)
    return
  }

  renderBigPicture()
  updateSceneInfo()
  bindTopBar()
  bindInspectorTabs()
  bindAgentPanel()
  bindHMR()
}

// ─── Big picture ──────────────────────────────────────────────────────────────

function renderBigPicture() {
  const levels = document.getElementById('gf-levels')
  if (!levels) return

  levels.innerHTML = LEVELS.map(level => {
    const items = level.id === 'template'
      ? [
          ...state.components.filter(c => c.level === 'template'),
          ...state.pages.map(p => ({ ...p, _isPage: true })),
        ]
      : state.components.filter(c => c.level === level.id)

    if (items.length === 0) return ''

    const grid = items.length > 3
    return `
      <div class="gf-level-col">
        <h2 class="gf-level-col__title">${level.label}</h2>
        <div class="gf-level-col__cards${grid ? ' gf-level-col__cards--grid' : ''}">
          ${items.map(item => renderCard(item, item._isPage ? 'page' : 'component')).join('')}
        </div>
      </div>
    `
  }).join('')

  lazyLoadCardFrames()
  bindCardActions()
}

function renderCard(item, type) {
  const level = type === 'page' ? 'template' : (item.level || 'atom')
  // atom/molecule : _layout=card (padding 1.25rem + full width, auto-height)
  // organism/page : _layout=full (scaled, hauteur fixe)
  const cardLayout = (level === 'atom' || level === 'molecule') ? 'card' : 'full'
  const frameSrc = `/${item.path}.html?_layout=${cardLayout}`

  return `
    <div class="gf-card"
         data-id="${item.id}"
         data-type="${type}"
         data-level="${level}"
         tabindex="0"
         role="button"
         aria-label="Ouvrir ${item.name}">
      <div class="gf-card__preview">
        <iframe
          class="gf-card__frame"
          data-src="${frameSrc}"
          title="${item.name}"
          aria-hidden="true"
          tabindex="-1"
        ></iframe>
      </div>
      <div class="gf-card__footer">
        <div class="gf-card__meta">
          <span class="gf-badge gf-badge--${level}">${type === 'page' ? 'page' : level}</span>
          <span class="gf-card__name">${item.name}</span>
        </div>
        <div class="gf-card__actions" aria-label="Actions sur ${item.name}">
          <button class="gf-card__action" data-action="edit" title="Modifier" aria-label="Modifier ${item.name}">${ICONS.edit}</button>
          <button class="gf-card__action" data-action="comments" title="Commentaires" aria-label="Commentaires de ${item.name}">${ICONS.comment}</button>
          <button class="gf-card__action gf-card__action--danger" data-action="delete" title="Supprimer" aria-label="Supprimer ${item.name}">${ICONS.trash}</button>
        </div>
      </div>
    </div>
  `
}

function lazyLoadCardFrames() {
  const frames = document.querySelectorAll('.gf-card__frame[data-src]')
  if (!frames.length) return

  const load = frame => {
    frame.src = frame.dataset.src
    delete frame.dataset.src

    // Auto-height pour atom/molecule (pas de scaling)
    const card = frame.closest('.gf-card')
    const level = card?.dataset.level
    if (level === 'atom' || level === 'molecule') {
      frame.addEventListener('load', () => {
        try {
          const doc     = frame.contentDocument
          const h       = doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight
          if (h && h > 20) {
            frame.style.height           = h + 'px'
            frame.parentElement.style.height = h + 'px'
          }
        } catch (_) {}
      }, { once: true })
    }
  }

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { load(e.target); obs.unobserve(e.target) } })
    }, { rootMargin: '120px' })
    frames.forEach(f => obs.observe(f))
  } else {
    frames.forEach(load)
  }
}

function bindCardActions() {
  document.querySelectorAll('.gf-card').forEach(card => {
    card.querySelectorAll('.gf-card__action').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const { action } = btn.dataset
        const item = findItem(card.dataset.id, card.dataset.type)
        if (!item) return
        if (action === 'edit')     openFocusById(card.dataset.id, card.dataset.type)
        if (action === 'comments') openFocusThenComments(item, card.dataset.type)
        if (action === 'delete')   showDeleteDialog(item, card.dataset.type)
      })
    })
  })
}

// ─── Navigation big picture ↔ focus ──────────────────────────────────────────

function openFocusById(id, type) {
  const item = findItem(id, type)
  if (!item) return
  openFocus(item, type)
}

function openFocus(item, type = 'component') {
  state.activeItem    = item
  state.activeType    = type
  state.controlValues = getDefaultValues(item)
  state.view          = 'focus'

  document.body.dataset.view = 'focus'
  document.getElementById('gf-bigpicture').hidden = true
  document.getElementById('gf-focus').hidden      = false

  document.getElementById('gf-scene-info').hidden = true
  document.getElementById('gf-tabs').hidden        = false
  renderTabs(item)

  renderPreview()
  setRightPanel('variants')
  renderInspector(item)
  setAgentContext(item)
}

function openFocusThenComments(item, type) {
  openFocus(item, type)
  setRightPanel('comments')
}

function openBigPicture() {
  state.activeItem = null
  state.view       = 'bigpicture'

  document.body.dataset.view = 'bigpicture'
  document.getElementById('gf-bigpicture').hidden = false
  document.getElementById('gf-focus').hidden      = true

  document.getElementById('gf-scene-info').hidden = false
  document.getElementById('gf-tabs').hidden        = true

  clearInspector()
  clearAgentContext()
}

// ─── Tabs (mode focus) ────────────────────────────────────────────────────────

function renderTabs(item) {
  const tabs = document.getElementById('gf-tabs')

  tabs.innerHTML = `
    <button class="gf-tab" id="gf-tab-bigpicture" type="button" aria-label="Retour vue d'ensemble">
      Design Surface
    </button>
    <div class="gf-tab gf-tab--active" role="tab" aria-selected="true">
      <span>${item.name}</span>
      <button class="gf-tab__close" id="gf-tab-close" type="button" aria-label="Fermer ${item.name}">${ICONS.close}</button>
    </div>
  `

  document.getElementById('gf-tab-bigpicture')?.addEventListener('click', openBigPicture)
  document.getElementById('gf-tab-close')?.addEventListener('click', openBigPicture)
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function bindTopBar() {
  document.getElementById('gf-scene-tab')?.addEventListener('click', () => {
    if (state.view === 'focus') openBigPicture()
  })

  document.getElementById('gf-agent-toggle')?.addEventListener('click', toggleAgent)
}

function updateSceneInfo() {
  const el = document.getElementById('gf-scene-info')
  if (!el) return
  const total = state.components.length + state.pages.length
  const notes = 0
  el.textContent = `Default scene · ${total} item(s) · ${notes} note(s) · viewport Desktop`
}

// ─── Preview iframe ───────────────────────────────────────────────────────────

function renderPreview() {
  const frame   = document.getElementById('gf-preview-frame')
  const errorEl = document.getElementById('gf-preview-error')
  if (!frame || !state.activeItem) return

  const item   = state.activeItem
  const params = new URLSearchParams()
  Object.entries(state.controlValues).forEach(([k, v]) => params.set(k, String(v)))

  const layout = (['organism', 'template', 'page'].includes(item.level)) ? 'full' : 'centered'
  params.set('_layout', layout)

  if (errorEl) errorEl.hidden = true

  const url = `/${item.path}.html?${params}`
  frame.src = url

  frame.onload = () => {
    updateViewportSize(frame)
    checkFrameError(frame, errorEl)
  }

  // "Ouvrir dans un nouvel onglet" si le bouton est là
  const newTabBtn = document.getElementById('gf-open-new-tab')
  if (newTabBtn) newTabBtn.href = url

  if (!renderPreview._obs) {
    renderPreview._obs = new ResizeObserver(() => {
      const f = document.getElementById('gf-preview-frame')
      if (f) updateViewportSize(f)
    })
    renderPreview._obs.observe(frame)
  }
}

function updateViewportSize(frame) {
  const el = document.getElementById('gf-viewport-size')
  if (!el) return
  el.textContent = `${frame.offsetWidth} × ${frame.offsetHeight}`
}

function checkFrameError(frame, errorEl) {
  if (!errorEl) return
  try {
    const meta = frame.contentDocument?.querySelector('meta[name="gf-status"]')
    if (meta?.content === 'error') {
      const pre = frame.contentDocument.querySelector('pre')
      errorEl.textContent = pre?.textContent || 'Erreur de rendu Twig'
      errorEl.hidden = false
      frame.style.display = 'none'
    } else {
      errorEl.hidden = true
      frame.style.display = ''
    }
  } catch (_) {}
}

// ─── Inspecteur (panneau droit) ───────────────────────────────────────────────

function bindInspectorTabs() {
  document.querySelectorAll('.gf-itab').forEach(btn => {
    btn.addEventListener('click', () => setRightPanel(btn.dataset.panel))
  })
}

function setRightPanel(panel) {
  state.rightPanel = panel

  document.querySelectorAll('.gf-itab').forEach(btn => {
    const active = btn.dataset.panel === panel
    btn.classList.toggle('gf-itab--active', active)
    btn.setAttribute('aria-selected', String(active))
  })

  if (panel === 'variants') renderInspector(state.activeItem)
  if (panel === 'comments') renderComments()
}

function renderInspector(item) {
  const body = document.getElementById('gf-inspector-body')
  if (!body) return

  if (!item) { clearInspector(); return }

  const variants   = item.variants || {}
  const content    = item.content  || {}
  const hasV = Object.keys(variants).length > 0
  const hasC = Object.keys(content).length  > 0

  body.innerHTML = `
    <div class="gf-insp-instance">
      <p class="gf-insp-instance__name">${item.name}</p>
      <div class="gf-insp-instance__meta">
        <span class="gf-badge gf-badge--${item.level || 'atom'}">${state.activeType === 'page' ? 'page' : (item.level || 'atom')}</span>
        ${item.category ? `<span style="font-size:0.75rem;color:var(--gf-text-muted)">${item.category}</span>` : ''}
      </div>
    </div>
    ${hasV ? renderInspSection('VARIANTES', variants) : ''}
    ${hasC ? renderInspSection('CONTENU',   content)  : ''}
    <div class="gf-insp-actions">
      <button class="gf-insp-btn gf-insp-btn--ghost" id="gf-open-newtab" type="button">
        Ouvrir dans un onglet
      </button>
    </div>
  `

  body.addEventListener('change', handleControlChange)
  body.addEventListener('input',  handleControlChange)

  document.getElementById('gf-open-newtab')?.addEventListener('click', () => {
    if (state.activeItem) window.open(`/${state.activeItem.path}.html`, '_blank', 'noopener')
  })
}

function renderInspSection(label, controls) {
  return `
    <div class="gf-insp-section">
      <h3 class="gf-insp-section__title">${label}</h3>
      ${Object.entries(controls).map(([key, ctrl]) => renderField(key, ctrl)).join('')}
    </div>
  `
}

function renderField(key, ctrl) {
  const id    = `gf-ctrl-${key}`
  const value = state.controlValues[key]

  if (ctrl.type === 'array') return '' // les arrays ne sont pas éditables ici

  if (ctrl.type === 'select') return `
    <div class="gf-field">
      <label class="gf-field__label" for="${id}">${ctrl.label}</label>
      <select class="gf-field__select" id="${id}" name="${key}" data-ctrl="${key}">
        ${(ctrl.options || []).map(opt =>
          `<option value="${opt}"${opt === value ? ' selected' : ''}>${opt}</option>`
        ).join('')}
      </select>
    </div>
  `

  if (ctrl.type === 'checkbox') return `
    <div class="gf-field gf-field--inline">
      <label class="gf-field__label" for="${id}">${ctrl.label}</label>
      <input class="gf-field__checkbox" type="checkbox" id="${id}" name="${key}" data-ctrl="${key}"${value ? ' checked' : ''}>
    </div>
  `

  if (ctrl.type === 'color') return `
    <div class="gf-field gf-field--inline">
      <label class="gf-field__label" for="${id}">${ctrl.label}</label>
      <input class="gf-field__color" type="color" id="${id}" name="${key}" data-ctrl="${key}" value="${value || '#000000'}">
    </div>
  `

  if (ctrl.type === 'number') return `
    <div class="gf-field">
      <label class="gf-field__label" for="${id}">${ctrl.label}</label>
      <input class="gf-field__input" type="number" id="${id}" name="${key}" data-ctrl="${key}" value="${value ?? 0}">
    </div>
  `

  return `
    <div class="gf-field">
      <label class="gf-field__label" for="${id}">${ctrl.label}</label>
      <input class="gf-field__input" type="text" id="${id}" name="${key}" data-ctrl="${key}" value="${value ?? ''}">
    </div>
  `
}

function handleControlChange(e) {
  const input = e.target.closest('[data-ctrl]')
  if (!input) return
  const key   = input.dataset.ctrl
  const value = input.type === 'checkbox' ? input.checked : input.value
  state.controlValues[key] = value
  closeCodePanelIfOpen()
  renderPreview()
}

function clearInspector() {
  const body = document.getElementById('gf-inspector-body')
  if (!body) return
  body.innerHTML = `
    <div class="gf-inspector__empty">
      <svg class="gf-icon gf-icon--lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <p>Sélectionne un composant pour voir ses variantes.</p>
    </div>
  `
}

// ─── Comments ─────────────────────────────────────────────────────────────────

function renderComments() {
  const body = document.getElementById('gf-inspector-body')
  if (!body || !state.activeItem) return

  const id       = state.activeItem.id
  const comments = state.comments[id] || []

  body.innerHTML = `
    <div class="gf-comments">
      <div class="gf-comments__list">
        ${comments.length === 0
          ? `<p class="gf-comments__empty">Aucun commentaire pour l'instant.</p>`
          : comments.map(c => `
              <div class="gf-comment">
                <div class="gf-comment__header">
                  <span class="gf-comment__author">${c.author}</span>
                  <span class="gf-comment__date">${c.date}</span>
                </div>
                <p class="gf-comment__body">${c.body}</p>
              </div>
            `).join('')
        }
      </div>
      <div class="gf-comments__compose">
        <textarea
          class="gf-comments__textarea"
          id="gf-comment-input"
          placeholder="Ajouter un commentaire…"
          rows="2"
        ></textarea>
        <button class="gf-comments__submit" id="gf-comment-submit" type="button">Envoyer</button>
      </div>
    </div>
  `

  document.getElementById('gf-comment-submit')?.addEventListener('click', () => {
    const input = document.getElementById('gf-comment-input')
    const body  = input?.value.trim()
    if (!body) return

    if (!state.comments[id]) state.comments[id] = []
    state.comments[id].push({
      author: 'Moi',
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      body,
    })
    renderComments()
  })
}

// ─── Code source ──────────────────────────────────────────────────────────────

function bindCodePanel() {
  document.getElementById('gf-toggle-code')?.addEventListener('click', toggleCodeView)
  document.getElementById('gf-copy-code')?.addEventListener('click', copyCode)
}

async function toggleCodeView() {
  const frame  = document.getElementById('gf-preview-frame')
  const panel  = document.getElementById('gf-code-panel')
  const btn    = document.getElementById('gf-toggle-code')
  if (!frame || !panel) return

  const open = !panel.hidden
  if (open) {
    panel.hidden = true
    frame.style.display = ''
    btn?.setAttribute('aria-pressed', 'false')
    return
  }

  const raw       = frame.contentDocument?.body?.innerHTML || ''
  const formatted = formatHTML(raw)
  const codeEl    = document.getElementById('gf-code-content')
  if (codeEl) {
    codeEl.textContent = formatted
    window.Prism?.highlightElement(codeEl)
  }
  frame.style.display = 'none'
  panel.hidden = false
  btn?.setAttribute('aria-pressed', 'true')
}

function closeCodePanelIfOpen() {
  const panel = document.getElementById('gf-code-panel')
  const frame = document.getElementById('gf-preview-frame')
  const btn   = document.getElementById('gf-toggle-code')
  if (panel && !panel.hidden) {
    panel.hidden = true
    if (frame) frame.style.display = ''
    btn?.setAttribute('aria-pressed', 'false')
  }
}

async function copyCode() {
  const code = document.getElementById('gf-code-content')?.textContent || ''
  await navigator.clipboard.writeText(code)
  const btn = document.getElementById('gf-copy-code')
  if (!btn) return
  btn.classList.add('gf-code-panel__copy--copied')
  setTimeout(() => btn.classList.remove('gf-code-panel__copy--copied'), 1500)
}

function formatHTML(html) {
  const INDENT  = '  '
  const VOIDS   = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'])
  let depth = 0, result = ''

  const lines = html.trim()
    .replace(/></g, '>\n<')
    .replace(/(<[^/!][^>]*[^/]>)([^\n<])/g, '$1\n$2')
    .split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    const isClose  = /^<\//.test(line)
    const isOpen   = /^<[^/!]/.test(line)
    const isSelf   = /\/>$/.test(line)
    const tag      = line.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/)?.[1]?.toLowerCase()
    const selfClose = isSelf || VOIDS.has(tag)

    if (isClose) depth = Math.max(0, depth - 1)
    result += INDENT.repeat(depth) + line + '\n'
    if (isOpen && !selfClose && !(tag && line.includes(`</${tag}`))) depth++
  }
  return result.trim()
}

// ─── Agent panel ──────────────────────────────────────────────────────────────

function bindAgentPanel() {
  document.getElementById('gf-agent-send')?.addEventListener('click', sendAgentMessage)
  document.getElementById('gf-agent-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendAgentMessage()
  })
}

function sendAgentMessage() {
  const input = document.getElementById('gf-agent-input')
  const text  = input?.value.trim()
  if (!text) return

  appendAgentMessage('user', text)
  if (input) input.value = ''

  // Placeholder : réponse simulée (à remplacer par l'appel API réel)
  setTimeout(() => {
    appendAgentMessage('agent', `Compris. Je vais travailler sur : "${text}". (Connecte un modèle dans .env pour activer l'agent.)`)
  }, 600)
}

function appendAgentMessage(role, content) {
  const history = document.getElementById('gf-agent-history')
  if (!history) return

  const empty = history.querySelector('.gf-agent__empty')
  if (empty) empty.remove()

  const msg = document.createElement('div')
  msg.className = `gf-agent-msg gf-agent-msg--${role}`
  msg.innerHTML = `
    <span class="gf-agent-msg__role">${role === 'user' ? 'Vous' : 'Agent'}</span>
    <p class="gf-agent-msg__content">${content}</p>
  `
  history.appendChild(msg)
  history.scrollTop = history.scrollHeight
}

function toggleAgent() {
  state.agentOpen = !state.agentOpen
  document.body.dataset.agent = state.agentOpen ? 'open' : 'closed'
  const btn = document.getElementById('gf-agent-toggle')
  btn?.setAttribute('aria-pressed', String(state.agentOpen))
}

function setAgentContext(item) {
  const ctx    = document.getElementById('gf-agent-context')
  const value  = document.getElementById('gf-context-value')
  if (!ctx) return
  ctx.hidden     = false
  if (value) value.textContent = `${item.name} · ${state.activeType === 'page' ? 'page' : (item.level || 'atom')}`
}

function clearAgentContext() {
  const ctx = document.getElementById('gf-agent-context')
  if (ctx) ctx.hidden = true
}

// ─── Suppression ──────────────────────────────────────────────────────────────

let _pendingDelete = null

function showDeleteDialog(item, type) {
  _pendingDelete = { item, type }
  const dialog = document.getElementById('gf-delete-dialog')
  const body   = document.getElementById('gf-dialog-body')
  if (!dialog) return
  if (body) body.textContent = `"${item.name}" sera définitivement supprimé. Cette action est irréversible.`
  dialog.hidden = false
  document.getElementById('gf-dialog-confirm')?.focus()
}

function hideDeleteDialog() {
  _pendingDelete = null
  const dialog = document.getElementById('gf-delete-dialog')
  if (dialog) dialog.hidden = true
}

function bindDeleteDialog() {
  document.getElementById('gf-dialog-cancel')?.addEventListener('click', hideDeleteDialog)
  document.getElementById('gf-dialog-backdrop')?.addEventListener('click', hideDeleteDialog)
  document.getElementById('gf-dialog-confirm')?.addEventListener('click', () => {
    if (!_pendingDelete) return
    // La suppression réelle est gérée via une commande IA (/delete)
    // Ici on retire seulement de l'état local pour feedback immédiat
    const { item, type } = _pendingDelete
    if (type === 'page') {
      state.pages = state.pages.filter(p => p.id !== item.id)
    } else {
      state.components = state.components.filter(c => c.id !== item.id)
    }
    hideDeleteDialog()
    renderBigPicture()
    updateSceneInfo()
  })
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function findItem(id, type) {
  return type === 'page'
    ? state.pages.find(p => p.id === id)
    : state.components.find(c => c.id === id)
}

function getDefaultValues(item) {
  const vals = {}
  const all  = { ...(item.variants || {}), ...(item.content || {}) }
  Object.entries(all).forEach(([k, ctrl]) => {
    if (ctrl.type !== 'array') vals[k] = ctrl.default
  })
  return vals
}

function showGlobalError(msg) {
  const el  = document.createElement('div')
  el.className = 'gf-error-msg'
  el.innerHTML = `<strong>Erreur Go-fast</strong><br>${msg}`
  document.getElementById('gf-surface')?.prepend(el)
}

// ─── HMR ──────────────────────────────────────────────────────────────────────

function bindHMR() {
  if (!import.meta.hot) return

  import.meta.hot.on('gofast:update', async () => {
    try {
      const res = await fetch(SHOWCASE_JSON + '?t=' + Date.now())
      if (!res.ok) return
      const data   = await res.json()
      state.components = data.components || []
      state.pages      = data.pages      || []
      updateSceneInfo()

      if (state.view === 'bigpicture') {
        renderBigPicture()
      } else {
        const frame = document.getElementById('gf-preview-frame')
        if (frame?.src) frame.src = frame.src
      }
    } catch (_) {}
  })
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init()
  bindCodePanel()
  bindDeleteDialog()
  initCanvasDrag()
  initZoomControls()
})
