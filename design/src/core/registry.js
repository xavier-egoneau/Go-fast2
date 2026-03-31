const SHOWCASE_JSON = '/dev/data/showcase.json'

let registry = { components: [], pages: [], all: [] }

function normalizeEntry(entry, kind) {
  return {
    ...entry,
    kind,
    renderMode: kind === 'page' ? 'twig-page' : 'twig-fragment'
  }
}

export async function loadRegistry() {
  const res = await fetch(SHOWCASE_JSON)
  if (!res.ok) throw new Error(`Impossible de charger ${SHOWCASE_JSON}`)
  const data = await res.json()
  registry.components = (data.components || []).map(entry => normalizeEntry(entry, 'component'))
  registry.pages = (data.pages || []).map(entry => normalizeEntry(entry, 'page'))
  registry.all = [...registry.components, ...registry.pages]
  return registry
}

export function getRegistry() {
  return registry
}

export function getEntryById(id, kind = null) {
  if (kind === 'component') return registry.components.find(entry => entry.id === id) || null
  if (kind === 'page') return registry.pages.find(entry => entry.id === id) || null
  return registry.all.find(entry => entry.id === id) || null
}

export function listEntries() {
  return registry.all
}

export function serializeRegistryForAI() {
  return registry.all.map(entry => ({
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    category: entry.category || null,
    level: entry.level || null,
    description: entry.description || null,
    renderMode: entry.renderMode || null,
    variants: Object.keys(entry.variants || {}),
    content: Object.keys(entry.content || {}),
    source: {
      path: entry.path || null,
      template: entry.template || null
    }
  }))
}

export function searchEntries(query = '') {
  const q = query.trim().toLowerCase()
  if (!q) return registry.all
  return registry.all.filter(entry => {
    return [entry.name, entry.category, entry.level, entry.id]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(q))
  })
}

export function getDefaultParams(entry) {
  const params = {}
  for (const collection of [entry.variants || {}, entry.content || {}]) {
    for (const [key, ctrl] of Object.entries(collection)) {
      params[key] = ctrl.default
    }
  }
  return params
}
