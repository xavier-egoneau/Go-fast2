export const ACTION_TYPES = [
  'update-params',
  'update-item',
  'duplicate-item',
  'add-item',
  'remove-item',
  'add-note'
]

export function createEmptyActionSet() {
  return {
    summary: '',
    actions: []
  }
}
