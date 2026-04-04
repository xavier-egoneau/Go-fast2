export const ACTION_TYPES = [
  'update-params',
  'update-part-params',
  'update-collection-params',
  'update-family-params',
  'update-instance-params',
  'update-layout-group-params',
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

export function createExampleActionSet() {
  return {
    summary: 'Add a note to explore a denser hero layout.',
    actions: [
      {
        type: 'add-note',
        x: 140,
        y: 120,
        text: 'Try a denser hero layout with stronger CTA emphasis.'
      }
    ]
  }
}
