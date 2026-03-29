export function buildAIContext(state, getEntryById) {
  const selectedItem = state.scene.items.find(item => item.id === state.selectedItemId) || null
  const selectedNote = state.scene.notes?.find(note => note.id === state.selectedItemId) || null

  return {
    scene: state.scene,
    selection: selectedItem
      ? {
          type: 'item',
          item: selectedItem,
          entry: getEntryById(selectedItem.ref, selectedItem.kind)
        }
      : selectedNote
        ? {
            type: 'note',
            note: selectedNote
          }
        : null
  }
}
