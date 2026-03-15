/**
 * showcase.js — Logique principale du showcase Go-fast
 * Gère : chargement de showcase.json, navigation, contrôles dynamiques, re-render
 */

const SHOWCASE_JSON = '/dev/data/showcase.json'

// ─── Stress test ──────────────────────────────────────────────────────────────

const STRESS_MODES = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'Valeurs par défaut'
  },
  {
    id: 'long',
    label: 'Long',
    description: 'Texte de 200+ caractères'
  },
  {
    id: 'empty',
    label: 'Vide',
    description: 'Contenu vide'
  },
  {
    id: 'overflow',
    label: 'Overflow',
    description: 'Texte sans espace (débordement)'
  }
]

const STRESS_LONG_TEXT = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor'

const STRESS_OVERFLOW_TEXT = 'Loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamco'

let stressModeIndex = 0

function getStressValue(ctrlType) {
  const mode = STRESS_MODES[stressModeIndex]
  if (mode.id === 'normal' || ctrlType !== 'text') return null
  if (mode.id === 'long') return STRESS_LONG_TEXT
  if (mode.id === 'empty') return ''
  if (mode.id === 'overflow') return STRESS_OVERFLOW_TEXT
  return null
}

function applyStressToControls(item) {
  if (!item) return
  const allControls = { ...(item.variants || {}), ...(item.content || {}) }
  Object.entries(allControls).forEach(([key, ctrl]) => {
    const stressVal = getStressValue(ctrl.type)
    if (stressVal !== null) {
      state.controlValues[key] = stressVal
      // Sync l'input dans le DOM si présent
      const input = document.getElementById(`gf-ctrl-${key}`)
      if (input) input.value = stressVal
    }
  })
}

function resetControlsToDefaults(item) {
  if (!item) return
  const allControls = { ...(item.variants || {}), ...(item.content || {}) }
  Object.entries(allControls).forEach(([key, ctrl]) => {
    if (ctrl.type === 'text') {
      state.controlValues[key] = ctrl.default ?? ''
      const input = document.getElementById(`gf-ctrl-${key}`)
      if (input) input.value = ctrl.default ?? ''
    }
  })
}

function updateStressModeUI() {
  const mode = STRESS_MODES[stressModeIndex]
  const label = document.getElementById('gf-stress-mode-label')
  const btn = document.getElementById('gf-toggle-stress')

  if (label) label.textContent = mode.label

  if (btn) {
    const isActive = mode.id !== 'normal'
    btn.classList.toggle('gf-btn-icon--active', isActive)
    btn.setAttribute('aria-label', `Stress test : ${mode.label} — ${mode.description}`)
  }
}

function initStressTest(item) {
  const toggleBtn = document.getElementById('gf-toggle-stress')
  const prevBtn = document.getElementById('gf-stress-prev')
  const nextBtn = document.getElementById('gf-stress-next')
  const control = document.getElementById('gf-stress-control')

  // Ne montrer le sélecteur de mode que si l'item a des champs text
  const hasTextFields = item && Object.values({ ...(item.variants || {}), ...(item.content || {}) })
    .some(ctrl => ctrl.type === 'text')

  if (!hasTextFields) {
    if (toggleBtn) toggleBtn.hidden = true
    return
  }

  if (control) control.hidden = false

  toggleBtn?.addEventListener('click', () => {
    // Cycle rapide : Normal → Long → Vide → Overflow → Normal
    stressModeIndex = (stressModeIndex + 1) % STRESS_MODES.length
    updateStressModeUI()
    if (stressModeIndex === 0) {
      resetControlsToDefaults(state.activeItem)
    } else {
      applyStressToControls(state.activeItem)
    }
    renderPreview()
  })

  prevBtn?.addEventListener('click', () => {
    stressModeIndex = (stressModeIndex - 1 + STRESS_MODES.length) % STRESS_MODES.length
    updateStressModeUI()
    if (stressModeIndex === 0) {
      resetControlsToDefaults(state.activeItem)
    } else {
      applyStressToControls(state.activeItem)
    }
    renderPreview()
  })

  nextBtn?.addEventListener('click', () => {
    stressModeIndex = (stressModeIndex + 1) % STRESS_MODES.length
    updateStressModeUI()
    if (stressModeIndex === 0) {
      resetControlsToDefaults(state.activeItem)
    } else {
      applyStressToControls(state.activeItem)
    }
    renderPreview()
  })

  updateStressModeUI()
}

// ─── État global ─────────────────────────────────────────────────────────────

let state = {
  components: [],
  pages: [],
  activeFilter: 'all',
  activeItem: null,
  controlValues: {}
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const isIndexPage = document.getElementById('gf-nav') !== null
  const isPreviewPage = document.getElementById('gf-controls-form') !== null

  try {
    const res = await fetch(SHOWCASE_JSON)
    if (!res.ok) throw new Error(`Impossible de charger ${SHOWCASE_JSON}`)
    const data = await res.json()
    state.components = data.components || []
    state.pages = data.pages || []
  } catch (e) {
    console.error('[go-fast showcase]', e)
    showError(e.message)
    return
  }

  if (isIndexPage) {
    initIndex()
  } else if (isPreviewPage) {
    initPreviewPage()
  }
}

// ─── Page index ───────────────────────────────────────────────────────────────

function initIndex() {
  renderNav()
  renderStats()

  // Filtres
  document.querySelectorAll('.gf-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.filter
      document.querySelectorAll('.gf-filter-btn').forEach(b => b.classList.remove('gf-filter-btn--active'))
      btn.classList.add('gf-filter-btn--active')
      renderNav()
    })
  })

  // Recherche
  const search = document.getElementById('gf-search')
  if (search) {
    search.addEventListener('input', debounce(renderNav, 150))
  }

  // Pages
  if (state.pages.length > 0) {
    renderPagesNav()
    const pagesSection = document.getElementById('gf-pages-section')
    if (pagesSection) pagesSection.hidden = false
  }
}

function renderNav() {
  const nav = document.getElementById('gf-nav')
  if (!nav) return

  const query = (document.getElementById('gf-search')?.value || '').toLowerCase()

  const filtered = state.components.filter(c => {
    const matchFilter = state.activeFilter === 'all' || c.level === state.activeFilter
    const matchSearch = !query || c.name.toLowerCase().includes(query) || c.category.toLowerCase().includes(query)
    return matchFilter && matchSearch
  })

  if (filtered.length === 0) {
    nav.innerHTML = '<p class="gf-nav__empty">Aucun composant trouvé.</p>'
    return
  }

  // Grouper par catégorie
  const byCategory = filtered.reduce((acc, c) => {
    const cat = c.category || 'Général'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {})

  nav.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
    <div class="gf-nav__group">
      <h2 class="gf-nav__category">${cat}</h2>
      <ul class="gf-nav__list">
        ${items.map(c => `
          <li class="gf-nav__item">
            <a href="/app/templates/page-showcase.html?id=${c.id}" class="gf-nav__link">
              <span class="gf-badge gf-badge--${c.level}">${c.level}</span>
              <span class="gf-nav__name">${c.name}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('')
}

function renderPagesNav() {
  const nav = document.getElementById('gf-pages-nav')
  if (!nav) return
  nav.innerHTML = `
    <ul class="gf-nav__list">
      ${state.pages.map(p => `
        <li class="gf-nav__item">
          <a href="/app/templates/page-showcase.html?type=page&id=${p.id}" class="gf-nav__link gf-nav__link--page">
            <span class="gf-nav__name">${p.name}</span>
          </a>
        </li>
      `).join('')}
    </ul>
  `
}

function renderStats() {
  const el = document.getElementById('gf-stats')
  if (!el) return
  const counts = state.components.reduce((acc, c) => {
    acc[c.level] = (acc[c.level] || 0) + 1
    return acc
  }, {})
  el.innerHTML = Object.entries(counts).map(([level, count]) =>
    `<span class="gf-stat"><strong>${count}</strong> ${level}${count > 1 ? 's' : ''}</span>`
  ).join('')
}

// ─── Page preview isolée ──────────────────────────────────────────────────────

function initPreviewPage() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const type = params.get('type') || 'component'
  if (!id) return

  const item = type === 'page'
    ? state.pages.find(p => p.id === id)
    : state.components.find(c => c.id === id)

  if (!item) {
    showError(`${type === 'page' ? 'Page' : 'Composant'} "${id}" introuvable dans showcase.json`)
    return
  }

  state.activeItem = item
  state.controlValues = getDefaultValues(item)

  syncPreviewShell(item, type)
  renderControls(item)
  renderPreview()
  initCopyCode()
  initStressTest(item)

  document.getElementById('gf-toggle-code')
    ?.addEventListener('click', toggleCodeView)

  // Toggle panneau de contrôles
  const toggleControls = document.getElementById('gf-toggle-controls')
  if (toggleControls) {
    toggleControls.addEventListener('click', () => {
      const panel = document.getElementById('gf-controls')
      const expanded = toggleControls.getAttribute('aria-expanded') === 'true'
      toggleControls.setAttribute('aria-expanded', String(!expanded))
      if (panel) panel.hidden = expanded
    })
  }
}

function getDefaultValues(item) {
  const values = {}
  if (item.variants) {
    Object.entries(item.variants).forEach(([key, ctrl]) => {
      values[key] = ctrl.default
    })
  }
  if (item.content) {
    Object.entries(item.content).forEach(([key, ctrl]) => {
      values[key] = ctrl.default
    })
  }
  return values
}

function syncPreviewShell(item, type) {
  document.title = `${item.name} — Go-fast`

  const badge = document.getElementById('gf-item-badge')
  const title = document.getElementById('gf-item-title')
  const category = document.getElementById('gf-item-category')
  const controlsLabel = document.getElementById('gf-controls-label')
  const previewLabel = document.getElementById('gf-preview-label')

  if (badge) {
    badge.textContent = type === 'page' ? 'page' : (item.level || 'atom')
    badge.className = `gf-badge gf-badge--${type === 'page' ? 'template' : (item.level || 'atom')}`
  }
  if (title) title.textContent = item.name || (type === 'page' ? 'Page' : 'Composant')
  if (category) category.textContent = item.category || ''
  if (controlsLabel) {
    controlsLabel.textContent = type === 'page' ? 'Contrôles de la page' : 'Contrôles du composant'
  }
  if (previewLabel) {
    previewLabel.setAttribute('aria-label', type === 'page' ? 'Aperçu de la page' : 'Aperçu du composant')
  }
}

function renderControls(item) {
  const form = document.getElementById('gf-controls-form')
  const description = document.getElementById('gf-controls-description')
  if (!form) return

  if (description) {
    description.textContent = item.description || ''
    description.hidden = !item.description
  }

  const variants = item.variants || {}
  const content = item.content || {}
  const hasVariants = Object.keys(variants).length > 0
  const hasContent = Object.keys(content).length > 0

  if (!hasVariants && !hasContent) {
    form.innerHTML = '<p class="gf-controls__empty">Aucun contrôle disponible pour cet élément.</p>'
    return
  }

  const renderFieldset = (label, controls) => `
    <fieldset class="gf-fieldset">
      <legend class="gf-fieldset__legend">${label}</legend>
      <div class="gf-fieldset__body">
        ${Object.entries(controls).map(([key, ctrl]) => renderControl(key, ctrl)).join('')}
      </div>
    </fieldset>
  `

  form.innerHTML = [
    hasVariants ? renderFieldset('Variantes', variants) : '',
    hasContent  ? renderFieldset('Contenu',   content)  : ''
  ].join('')

  form.addEventListener('change', handleControlChange)
  form.addEventListener('input', handleControlChange)
}

function renderControl(key, ctrl) {
  const id = `gf-ctrl-${key}`
  const value = state.controlValues[key]

  switch (ctrl.type) {
    case 'select':
      return `
        <div class="gf-control">
          <label class="gf-control__label" for="${id}">${ctrl.label}</label>
          <select class="gf-control__select" id="${id}" name="${key}">
            ${(ctrl.options || []).map(opt =>
              `<option value="${opt}"${opt === value ? ' selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </div>
      `
    case 'checkbox':
      return `
        <div class="gf-control gf-control--checkbox">
          <label class="gf-control__label" for="${id}">
            <input class="gf-control__checkbox" type="checkbox" id="${id}" name="${key}"${value ? ' checked' : ''}>
            ${ctrl.label}
          </label>
        </div>
      `
    case 'color':
      return `
        <div class="gf-control">
          <label class="gf-control__label" for="${id}">${ctrl.label}</label>
          <input class="gf-control__color" type="color" id="${id}" name="${key}" value="${value || '#000000'}">
        </div>
      `
    case 'number':
      return `
        <div class="gf-control">
          <label class="gf-control__label" for="${id}">${ctrl.label}</label>
          <input class="gf-control__input" type="number" id="${id}" name="${key}" value="${value ?? 0}">
        </div>
      `
    case 'text':
    default:
      return `
        <div class="gf-control">
          <label class="gf-control__label" for="${id}">${ctrl.label}</label>
          <input class="gf-control__input" type="text" id="${id}" name="${key}" value="${value ?? ''}">
        </div>
      `
  }
}

function handleControlChange(e) {
  const input = e.target
  if (!input.name) return
  const value = input.type === 'checkbox' ? input.checked : input.value
  state.controlValues[input.name] = value
  // Ferme le code panel si ouvert — le rendu va changer
  const panel = document.getElementById('gf-code-panel')
  const btn   = document.getElementById('gf-toggle-code')
  const frame = document.getElementById('gf-preview-frame')
  if (panel && !panel.hidden) {
    panel.hidden = true
    if (frame) frame.style.display = ''
    btn?.setAttribute('aria-expanded', 'false')
    btn?.classList.remove('gf-btn-icon--active')
  }
  renderPreview()
}

// ─── iframe preview ───────────────────────────────────────────────────────────


function renderPreview() {
  const frame = document.getElementById('gf-preview-frame')
  const errorEl = document.getElementById('gf-preview-error')
  if (!frame || !state.activeItem) return

  const item = state.activeItem
  const params = new URLSearchParams()

  Object.entries(state.controlValues).forEach(([key, val]) => {
    params.set(key, String(val))
  })

  if (errorEl) errorEl.hidden = true

  // _layout : indique au middleware quel style de centrage appliquer au body wrapper
  const layout = (item.level === 'organism' || item.level === 'template') ? 'full' : 'centered'
  params.set('_layout', layout)

  const url = `/${item.path}.html?${params.toString()}`
  frame.src = url

  // Lien "ouvrir dans un nouvel onglet"
  const newTabBtn = document.getElementById('gf-open-new-tab')
  if (newTabBtn) newTabBtn.href = url

  // Indicateur viewport + gestion d'erreur au chargement
  frame.onload = () => {
    updateViewportSize(frame)
    checkFrameError(frame)
  }

  // ResizeObserver : met à jour la taille affichée quand la fenêtre change
  if (!renderPreview._resizeObserver) {
    renderPreview._resizeObserver = new ResizeObserver(() => {
      const f = document.getElementById('gf-preview-frame')
      if (f) updateViewportSize(f)
    })
    renderPreview._resizeObserver.observe(frame)
  }
}

// ─── Code source ──────────────────────────────────────────────────────────────

function formatHTML(html) {
  const INDENT = '  '
  const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'])
  let depth = 0
  let result = ''

  // Sépare les tokens sur des lignes distinctes
  const lines = html
    .trim()
    .replace(/></g, '>\n<')
    .replace(/(<[^/!][^>]*[^/]>)([^\n<])/g, '$1\n$2')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    const isClose  = /^<\//.test(line)
    const isOpen   = /^<[^/!]/.test(line)
    const isSelf   = /\/>$/.test(line)
    const tagMatch = line.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/)
    const tag      = tagMatch?.[1]?.toLowerCase()
    const isVoid   = tag && voidTags.has(tag)
    const selfClose = isSelf || isVoid

    if (isClose) depth = Math.max(0, depth - 1)

    result += INDENT.repeat(depth) + line + '\n'

    if (isOpen && !selfClose) {
      // Ne pas indenter si la balise se ferme sur la même ligne
      const closeTag = tag ? `</${tag}` : null
      const closesOnSameLine = closeTag && line.includes(closeTag)
      if (!closesOnSameLine) depth++
    }
  }
  return result.trim()
}

async function toggleCodeView() {
  const frame    = document.getElementById('gf-preview-frame')
  const panel    = document.getElementById('gf-code-panel')
  const codeEl   = document.getElementById('gf-code-content')
  const btn      = document.getElementById('gf-toggle-code')
  if (!frame || !panel || !codeEl) return

  const isOpen = !panel.hidden

  if (isOpen) {
    panel.hidden = true
    frame.style.display = ''
    btn?.setAttribute('aria-expanded', 'false')
    btn?.classList.remove('gf-btn-icon--active')
    return
  }

  const raw = frame.contentDocument?.body?.innerHTML || ''
  const formatted = formatHTML(raw)

  codeEl.textContent = formatted
  window.Prism?.highlightElement(codeEl)

  frame.style.display = 'none'
  panel.hidden = false
  btn?.setAttribute('aria-expanded', 'true')
  btn?.classList.add('gf-btn-icon--active')
}

function initCopyCode() {
  const btn = document.getElementById('gf-copy-code')
  if (!btn) return
  btn.addEventListener('click', async () => {
    const code = document.getElementById('gf-code-content')?.textContent || ''
    await navigator.clipboard.writeText(code)
    btn.classList.add('gf-code-panel__copy--copied')
    setTimeout(() => btn.classList.remove('gf-code-panel__copy--copied'), 1500)
  })
}

// ─── Viewport + erreur iframe ─────────────────────────────────────────────────

function updateViewportSize(frame) {
  const el = document.getElementById('gf-viewport-size')
  if (!el) return
  const w = frame.offsetWidth
  const h = frame.offsetHeight
  el.textContent = `${w} × ${h}`
}

function checkFrameError(frame) {
  const errorEl = document.getElementById('gf-preview-error')
  if (!errorEl) return
  try {
    const meta = frame.contentDocument?.querySelector('meta[name="gf-status"]')
    if (meta?.content === 'error') {
      const pre = frame.contentDocument.querySelector('pre')
      errorEl.textContent = pre?.textContent || 'Erreur de rendu'
      errorEl.hidden = false
      frame.style.display = 'none'
    } else {
      errorEl.hidden = true
      frame.style.display = ''
    }
  } catch (e) {}
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function showError(message) {
  const content = document.getElementById('gf-content') || document.body
  const el = document.createElement('div')
  el.className = 'gf-error'
  el.innerHTML = `<strong>Erreur Go-fast</strong><br>${message}`
  content.prepend(el)
}

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── HMR : recharge l'iframe ou le nav quand un composant change ──────────────

if (import.meta.hot) {
  import.meta.hot.on('gofast:update', async () => {
    const frame = document.getElementById('gf-preview-frame')
    if (frame) {
      // Page preview : recharge l'iframe
      if (frame.src) frame.src = frame.src
    } else {
      // Page index : re-fetch showcase.json et re-render
      try {
        const res = await fetch(SHOWCASE_JSON + '?t=' + Date.now())
        if (res.ok) {
          const data = await res.json()
          state.components = data.components || []
          state.pages = data.pages || []
          renderNav()
          renderStats()
          if (state.pages.length > 0) renderPagesNav()
        }
      } catch (_) {}
    }
  })
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init)
