import { buildPreviewPayload, encodePreviewPayload, PREVIEW_PAYLOAD_QUERY_KEY } from './preview-payload.js'

export function buildRenderUrl(entry, item = null, getEntryById = () => null) {
  const url = new URL(`/${entry.path}.html`, window.location.origin)
  const layout = entry.kind === 'page' || entry.level === 'organism' || entry.level === 'template'
    ? 'full'
    : 'centered'

  url.searchParams.set('_layout', layout)
  const payload = buildPreviewPayload(item, entry, getEntryById)
  url.searchParams.set(PREVIEW_PAYLOAD_QUERY_KEY, encodePreviewPayload(payload))

  return url.toString()
}
