export function buildRenderUrl(entry, params = {}) {
  const url = new URL(`/${entry.path}.html`, window.location.origin)
  const layout = entry.kind === 'page' || entry.level === 'organism' || entry.level === 'template'
    ? 'full'
    : 'centered'

  url.searchParams.set('_layout', layout)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    url.searchParams.set(key, String(value))
  })

  return url.toString()
}
