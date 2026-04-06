import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { getWorkshopState, patchWorkshopState, resetWorkshopState } from './workshop-store.js'
import { patchState } from '../state/store.js'

// Editors are module-level singletons — persisted across re-renders
const editors = {}
let previewDebounceTimer = null

function buildExtensions(langExt) {
  return [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    lineNumbers(),
    highlightActiveLine(),
    langExt,
    oneDark,
    EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { overflow: 'auto' } }),
    EditorView.lineWrapping
  ]
}

function createEditor(container, content, langExt) {
  return new EditorView({
    state: EditorState.create({ doc: content, extensions: buildExtensions(langExt) }),
    parent: container
  })
}

function mountEditor(rootEl, key, langExt, getInitialContent, onDocChange) {
  const container = rootEl.querySelector(`#workshop-editor-${key}`)
  if (!container) return

  if (editors[key]) {
    // Reuse existing editor — move its DOM node into the new container
    container.appendChild(editors[key].dom)
    return
  }

  editors[key] = createEditor(container, getInitialContent(), langExt)

  // Sync changes back to workshop state
  editors[key].dom.addEventListener('keyup', () => {
    const value = editors[key].state.doc.toString()
    onDocChange(value)
  })
}

function schedulePreviewRefresh() {
  clearTimeout(previewDebounceTimer)
  previewDebounceTimer = setTimeout(refreshPreview, 800)
}

async function refreshPreview() {
  const { twig } = getWorkshopState()
  try {
    const res = await fetch('/__design_api/workshop/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twig })
    })
    const data = await res.json()
    if (data.html) {
      patchWorkshopState({ previewHtml: data.html })
      const frame = document.getElementById('workshop-preview-frame')
      if (frame) frame.srcdoc = data.html
    }
  } catch (err) {
    console.warn('[workshop] preview error', err)
  }
}

async function saveWorkshopComponent() {
  const state = getWorkshopState()
  if (!state.name.trim()) {
    patchWorkshopState({ saveError: 'Le nom du composant est requis' })
    return
  }

  const metaString = editors.meta ? editors.meta.state.doc.toString() : JSON.stringify(state.meta, null, 2)
  let metaParsed
  try {
    metaParsed = JSON.parse(metaString)
  } catch {
    patchWorkshopState({ saveError: 'Le JSON des params est invalide' })
    return
  }

  patchWorkshopState({ saving: true, saveError: '' })

  try {
    const res = await fetch('/__design_api/workshop/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: state.name.trim(),
        level: state.level,
        category: state.category.trim(),
        description: state.description.trim(),
        twig: editors.twig ? editors.twig.state.doc.toString() : state.twig,
        scss: editors.scss ? editors.scss.state.doc.toString() : state.scss,
        meta: metaParsed
      })
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      patchWorkshopState({ saving: false, saveError: data.error || 'Erreur inconnue' })
      return
    }
    destroyEditors()
    resetWorkshopState()
    patchState({ workshopMode: false })
  } catch (err) {
    patchWorkshopState({ saving: false, saveError: err.message })
  }
}

function destroyEditors() {
  for (const key of Object.keys(editors)) {
    editors[key]?.destroy()
    delete editors[key]
  }
}

export function bindWorkshopEvents(rootEl) {
  const ws = getWorkshopState()

  mountEditor(rootEl, 'twig', html(), () => ws.twig, value => {
    patchWorkshopState({ twig: value })
    schedulePreviewRefresh()
  })

  mountEditor(rootEl, 'scss', html(), () => ws.scss, value => {
    patchWorkshopState({ scss: value })
  })

  mountEditor(rootEl, 'meta', json(), () => JSON.stringify(ws.meta, null, 2), () => {
    // meta content read directly from editor on save — no store sync needed
  })

  // Trigger initial preview if not yet done
  if (!ws.previewHtml) {
    schedulePreviewRefresh()
  } else {
    const frame = document.getElementById('workshop-preview-frame')
    if (frame) frame.srcdoc = ws.previewHtml
  }

  // Metadata fields
  rootEl.querySelectorAll('[data-workshop]').forEach(input => {
    const handler = () => patchWorkshopState({ [input.dataset.workshop]: input.value })
    input.addEventListener('input', handler)
    input.addEventListener('change', handler)
  })

  // Tabs — update active state and show/hide panes directly without re-render
  rootEl.querySelectorAll('[data-action="workshop-tab"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab
      patchWorkshopState({ activeTab: tab })

      rootEl.querySelectorAll('[data-workshop-pane]').forEach(pane => {
        pane.classList.toggle('ds-workshop__editor-pane--hidden', pane.dataset.workshopPane !== tab)
      })
      rootEl.querySelectorAll('[data-action="workshop-tab"]').forEach(b => {
        b.classList.toggle('ds-workshop__tab--active', b.dataset.tab === tab)
      })

      // Ensure editor DOM is inside its (newly visible) container
      const container = rootEl.querySelector(`#workshop-editor-${tab}`)
      if (container && editors[tab] && !container.contains(editors[tab].dom)) {
        container.appendChild(editors[tab].dom)
      }
    })
  })

  rootEl.querySelector('[data-action="workshop-refresh-preview"]')?.addEventListener('click', refreshPreview)

  rootEl.querySelector('[data-action="workshop-agent-run"]')?.addEventListener('click', async () => {
    const ws = getWorkshopState()
    const intent = rootEl.querySelector('[data-workshop="agentIntent"]')?.value?.trim() || ws.agentIntent
    if (!intent) return

    const btn = rootEl.querySelector('[data-action="workshop-agent-run"]')
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ds-workshop__spinner"></span> Génération en cours…' }

    patchWorkshopState({ agentRunning: true, agentError: '', agentIntent: intent })

    try {
      const res = await fetch('/__design_api/workshop/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          name: ws.name,
          level: ws.level,
          category: ws.category
        })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        patchWorkshopState({ agentRunning: false, agentError: data.error || 'Erreur inconnue' })
        return
      }

      // Populate editors with generated code
      if (data.twig && editors.twig) {
        editors.twig.dispatch({ changes: { from: 0, to: editors.twig.state.doc.length, insert: data.twig } })
        patchWorkshopState({ twig: data.twig })
      }
      if (data.scss && editors.scss) {
        editors.scss.dispatch({ changes: { from: 0, to: editors.scss.state.doc.length, insert: data.scss } })
        patchWorkshopState({ scss: data.scss })
      }
      if (data.meta && editors.meta) {
        const metaStr = JSON.stringify(data.meta, null, 2)
        editors.meta.dispatch({ changes: { from: 0, to: editors.meta.state.doc.length, insert: metaStr } })
      }

      patchWorkshopState({ agentRunning: false, agentIntent: '' })

      // Clear textarea and refocus it
      const textarea = rootEl.querySelector('[data-workshop="agentIntent"]')
      if (textarea) { textarea.value = ''; textarea.focus() }

      // Switch to twig tab to show the result
      patchWorkshopState({ activeTab: 'twig' })
      rootEl.querySelectorAll('[data-workshop-pane]').forEach(pane => {
        pane.classList.toggle('ds-workshop__editor-pane--hidden', pane.dataset.workshopPane !== 'twig')
      })
      rootEl.querySelectorAll('[data-action="workshop-tab"]').forEach(b => {
        b.classList.toggle('ds-workshop__tab--active', b.dataset.tab === 'twig')
      })
      const container = rootEl.querySelector('#workshop-editor-twig')
      if (container && editors.twig && !container.contains(editors.twig.dom)) {
        container.appendChild(editors.twig.dom)
      }

      // Refresh preview with new twig
      schedulePreviewRefresh()
    } catch (err) {
      patchWorkshopState({ agentRunning: false, agentError: err.message })
      if (btn) { btn.disabled = false; btn.innerHTML = '✦ Générer le composant' }
    }
  })

  rootEl.querySelector('[data-action="workshop-cancel"]')?.addEventListener('click', () => {
    destroyEditors()
    resetWorkshopState()
    patchState({ workshopMode: false })
  })

  rootEl.querySelector('[data-action="workshop-save"]')?.addEventListener('click', saveWorkshopComponent)
}
