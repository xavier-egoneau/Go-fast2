function uid(prefix = 'item') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function applyActionSetToScene(scene, actionSet) {
  const next = JSON.parse(JSON.stringify(scene))

  for (const action of actionSet.actions || []) {
    switch (action.type) {
      case 'update-params': {
        next.items = next.items.map(item => item.id === action.targetId ? { ...item, params: { ...item.params, ...(action.patch || {}) } } : item)
        break
      }
      case 'update-item': {
        next.items = next.items.map(item => item.id === action.targetId ? { ...item, ...(action.patch || {}) } : item)
        break
      }
      case 'duplicate-item': {
        const source = next.items.find(item => item.id === action.targetId)
        if (!source) break
        next.items.push({
          ...source,
          id: uid('item'),
          x: source.x + (action.offset?.x ?? 40),
          y: source.y + (action.offset?.y ?? 40),
          params: action.params ? { ...source.params, ...action.params } : { ...source.params }
        })
        break
      }
      case 'add-item': {
        next.items.push({
          id: uid('item'),
          kind: action.kind,
          ref: action.ref,
          x: action.x ?? 80,
          y: action.y ?? 80,
          width: action.width ?? 420,
          height: action.height ?? 260,
          viewport: action.viewport || next.viewport || 'desktop',
          params: action.params || {}
        })
        break
      }
      case 'remove-item': {
        next.items = next.items.filter(item => item.id !== action.targetId)
        next.notes = (next.notes || []).filter(note => note.id !== action.targetId)
        break
      }
      case 'add-note': {
        next.notes = next.notes || []
        next.notes.push({
          id: uid('note'),
          x: action.x ?? 100,
          y: action.y ?? 100,
          text: action.text || ''
        })
        break
      }
    }
  }

  return next
}
