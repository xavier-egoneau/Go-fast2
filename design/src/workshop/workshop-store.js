const DEFAULT_TWIG = `{# Remplace "my-component" par le nom de ton composant #}
{% set variant = variant|default('default') %}
{% set label = label|default('Mon composant') %}

<div class="my-component my-component--{{ variant }}" data-gf-component="my-component">
  {{ label }}
</div>`

const DEFAULT_META = {
  variants: {
    variant: {
      label: 'Variante',
      type: 'select',
      default: 'default',
      options: ['default']
    }
  },
  content: {
    label: {
      label: 'Label',
      type: 'text',
      default: 'Mon composant'
    }
  }
}

let workshopState = createInitial()
const listeners = new Set()

function createInitial() {
  return {
    name: '',
    level: 'atom',
    category: '',
    description: '',
    twig: DEFAULT_TWIG,
    scss: '.my-component {\n  // styles\n}',
    meta: DEFAULT_META,
    activeTab: 'agent',
    agentIntent: '',
    agentRunning: false,
    agentError: '',
    previewHtml: '',
    saveError: '',
    saving: false
  }
}

export function getWorkshopState() {
  return workshopState
}

export function patchWorkshopState(patch) {
  workshopState = { ...workshopState, ...patch }
  listeners.forEach(l => l(workshopState))
}

export function resetWorkshopState() {
  workshopState = createInitial()
  listeners.forEach(l => l(workshopState))
}

export function subscribeWorkshop(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
