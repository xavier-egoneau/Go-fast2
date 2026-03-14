/**
 * showcase.js — Logique principale du showcase Go-fast
 * Gère : chargement de showcase.json, navigation, contrôles dynamiques, re-render
 */

const SHOWCASE_JSON = '/dev/data/showcase.json'

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
    search.addEventListener('input', renderNav)
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

  const allControls = {
    ...(item.variants || {}),
    ...(item.content || {})
  }

  if (description) {
    description.textContent = item.description || ''
    description.hidden = !item.description
  }

  if (Object.keys(allControls).length === 0) {
    form.innerHTML = '<p class="gf-controls__empty">Aucun contrôle disponible pour cet élément.</p>'
    return
  }

  form.innerHTML = Object.entries(allControls).map(([key, ctrl]) =>
    renderControl(key, ctrl)
  ).join('')

  // Écoute les changements
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
  renderPreview()
}

async function renderPreview() {
  const preview = document.getElementById('gf-preview')
  if (!preview || !state.activeItem) return

  const item = state.activeItem
  const params = new URLSearchParams()

  Object.entries(state.controlValues).forEach(([key, val]) => {
    params.set(key, String(val))
  })

  try {
    // Fetch le template Twig compilé avec les paramètres en query string
    const url = `/${item.path}.html?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Template introuvable : ${url}`)
    const html = await res.text()
    preview.innerHTML = html
  } catch (e) {
    preview.innerHTML = `<p class="gf-preview__error">Erreur de rendu : ${e.message}</p>`
  }
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function showError(message) {
  const content = document.getElementById('gf-content') || document.body
  const el = document.createElement('div')
  el.className = 'gf-error'
  el.innerHTML = `<strong>Erreur Go-fast</strong><br>${message}`
  content.prepend(el)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init)
