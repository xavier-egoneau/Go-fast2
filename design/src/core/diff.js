function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort(), 2)
}

function diffObject(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  const changes = []

  for (const key of keys) {
    const prev = before?.[key]
    const next = after?.[key]
    if (stableStringify(prev) !== stableStringify(next)) {
      changes.push({ key, before: prev, after: next })
    }
  }

  return changes
}

export function diffScenes(baseScene, currentScene) {
  const baseItems = new Map((baseScene?.items || []).map(item => [item.id, item]))
  const currentItems = new Map((currentScene?.items || []).map(item => [item.id, item]))
  const baseNotes = new Map((baseScene?.notes || []).map(note => [note.id, note]))
  const currentNotes = new Map((currentScene?.notes || []).map(note => [note.id, note]))

  const itemDiffs = []
  const noteDiffs = []

  for (const [id, item] of currentItems) {
    if (!baseItems.has(id)) {
      itemDiffs.push({ type: 'added', id, ref: item.ref, kind: item.kind, changes: [] })
      continue
    }
    const before = baseItems.get(id)
    const changes = [
      ...diffObject(
        { x: before.x, y: before.y, width: before.width, height: before.height, viewport: before.viewport },
        { x: item.x, y: item.y, width: item.width, height: item.height, viewport: item.viewport }
      ).map(change => ({ scope: 'instance', ...change })),
      ...diffObject(before.params || {}, item.params || {}).map(change => ({ scope: 'params', ...change }))
    ]
    if (changes.length) itemDiffs.push({ type: 'updated', id, ref: item.ref, kind: item.kind, changes })
  }

  for (const [id, item] of baseItems) {
    if (!currentItems.has(id)) itemDiffs.push({ type: 'removed', id, ref: item.ref, kind: item.kind, changes: [] })
  }

  for (const [id, note] of currentNotes) {
    if (!baseNotes.has(id)) {
      noteDiffs.push({ type: 'added', id, changes: [] })
      continue
    }
    const before = baseNotes.get(id)
    const changes = diffObject(before, note)
    if (changes.length) noteDiffs.push({ type: 'updated', id, changes })
  }

  for (const [id] of baseNotes) {
    if (!currentNotes.has(id)) noteDiffs.push({ type: 'removed', id, changes: [] })
  }

  return {
    sceneMeta: diffObject(
      { viewport: baseScene?.viewport, name: baseScene?.name },
      { viewport: currentScene?.viewport, name: currentScene?.name }
    ),
    items: itemDiffs,
    notes: noteDiffs
  }
}
