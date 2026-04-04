const SHOWCASE_JSON = '/dev/data/showcase.json'

let registry = { components: [], pages: [], all: [] }

function capitalize(value = '') {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : ''
}

function buildEntrySource(entry) {
  const basePath = entry.path || null
  const templatePath = basePath ? `${basePath}.twig` : null
  const metaPath = basePath ? `${basePath}.json` : null
  const docPath = entry.kind === 'component' && basePath ? `${basePath}.md` : null

  return {
    path: basePath,
    template: templatePath,
    meta: metaPath,
    documentation: docPath,
    includeId: templatePath
  }
}

function serializeControl([id, control]) {
  return {
    id,
    label: control?.label || id,
    type: control?.type || 'unknown',
    default: control?.default ?? null,
    options: Array.isArray(control?.options) ? [...control.options] : []
  }
}

function cloneComposableNode(node = {}) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return {}
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, { ...value }]))
}

function normalizeEntry(entry, kind) {
  return {
    ...entry,
    kind,
    parts: cloneComposableNode(entry.parts),
    collections: cloneComposableNode(entry.collections),
    families: cloneComposableNode(entry.families),
    instances: cloneComposableNode(entry.instances),
    layoutGroups: cloneComposableNode(entry.layoutGroups),
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
    variants: Object.entries(entry.variants || {}).map(serializeControl),
    content: Object.entries(entry.content || {}).map(serializeControl),
    parts: Object.entries(entry.parts || {}).map(([id, part]) => ({
      id,
      label: part.label || id,
      component: part.component || null,
      mode: part.mode || null,
      autoBind: Boolean(part.autoBind),
      exclude: {
        variants: [...(part.exclude?.variants || [])],
        content: [...(part.exclude?.content || [])]
      },
      binding: {
        variants: { ...(part.binding?.variants || {}) },
        content: { ...(part.binding?.content || {}) }
      }
    })),
    collections: Object.entries(entry.collections || {}).map(([id, collection]) => ({
      id,
      label: collection.label || id,
      kind: collection.kind || null,
      itemComponent: collection.itemComponent || null,
      mode: collection.mode || null,
      autoBind: Boolean(collection.autoBind),
      exclude: {
        variants: [...(collection.exclude?.variants || [])],
        content: [...(collection.exclude?.content || [])]
      },
      binding: {
        variants: { ...(collection.binding?.variants || {}) },
        content: { ...(collection.binding?.content || {}) }
      }
    })),
    families: Object.entries(entry.families || {}).map(([id, family]) => ({
      id,
      label: family.label || id,
      component: family.component || null,
      mode: family.mode || null,
      autoBind: Boolean(family.autoBind),
      exclude: {
        variants: [...(family.exclude?.variants || [])],
        content: [...(family.exclude?.content || [])]
      },
      binding: {
        variants: { ...(family.binding?.variants || {}) },
        content: { ...(family.binding?.content || {}) }
      }
    })),
    instances: Object.entries(entry.instances || {}).map(([id, instance]) => ({
      id,
      label: instance.label || id,
      component: instance.component || null,
      family: instance.family || null,
      mode: instance.mode || null,
      autoBind: Boolean(instance.autoBind),
      exclude: {
        variants: [...(instance.exclude?.variants || [])],
        content: [...(instance.exclude?.content || [])]
      },
      binding: {
        variants: { ...(instance.binding?.variants || {}) },
        content: { ...(instance.binding?.content || {}) }
      }
    })),
    layoutGroups: Object.entries(entry.layoutGroups || {}).map(([id, group]) => ({
      id,
      label: group.label || id,
      component: group.component || null,
      mode: group.mode || null,
      children: Array.isArray(group.children) ? [...group.children] : [],
      autoBind: Boolean(group.autoBind),
      exclude: {
        variants: [...(group.exclude?.variants || [])],
        content: [...(group.exclude?.content || [])]
      },
      binding: {
        variants: { ...(group.binding?.variants || {}) },
        content: { ...(group.binding?.content || {}) }
      }
    })),
    source: buildEntrySource(entry)
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

export function resolveComposableParentParamKey(parentEntry, nodeId, node, childKey, section) {
  const explicitKey = node?.binding?.[section]?.[childKey]
  if (explicitKey) return explicitKey
  if (!node?.autoBind) return null
  if (node.exclude?.[section]?.includes(childKey)) return null
  return `${nodeId}${capitalize(childKey)}`
}

export function listComposableBindings(parentEntry, nodeId, node, childEntry) {
  const bindings = {
    variants: [],
    content: []
  }

  for (const section of ['variants', 'content']) {
    for (const [childKey, childControl] of Object.entries(childEntry?.[section] || {})) {
      const parentKey = resolveComposableParentParamKey(parentEntry, nodeId, node, childKey, section)
      if (!parentKey) continue
      bindings[section].push({
        childKey,
        parentKey,
        childControl,
        parentControl: parentEntry?.[section]?.[parentKey] || null
      })
    }
  }

  return bindings
}
