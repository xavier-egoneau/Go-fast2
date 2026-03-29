const TOKENS_PATH = '/dev/assets/scss/base/_variables.scss'

let tokensCache = []

function inferCategory(name) {
  if (name.startsWith('color-')) return 'color'
  if (name.startsWith('font-size-')) return 'font-size'
  if (name.startsWith('font-weight-')) return 'font-weight'
  if (name.startsWith('line-height-')) return 'line-height'
  if (name.startsWith('font-family-')) return 'font-family'
  if (name.startsWith('spacing-')) return 'spacing'
  if (name.startsWith('radius-')) return 'radius'
  if (name.startsWith('shadow-')) return 'shadow'
  if (name.startsWith('transition-')) return 'transition'
  if (name.startsWith('breakpoint-')) return 'breakpoint'
  if (name.startsWith('z-')) return 'z-index'
  return 'other'
}

export async function loadTokens() {
  const res = await fetch(TOKENS_PATH)
  if (!res.ok) throw new Error(`Impossible de charger ${TOKENS_PATH}`)
  const source = await res.text()

  tokensCache = source
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('$') && line.includes(':'))
    .map(line => {
      const match = line.match(/^\$([a-zA-Z0-9-]+)\s*:\s*(.+);$/)
      if (!match) return null
      const [, name, value] = match
      return {
        id: name,
        scssVar: `$${name}`,
        value: value.trim(),
        category: inferCategory(name)
      }
    })
    .filter(Boolean)

  return tokensCache
}

export function getTokens() {
  return tokensCache
}

export function getTokenSummaryForEntry(entry) {
  if (!entry) return []

  const level = entry.level || ''
  const cat = (entry.category || '').toLowerCase()
  const preferredCategories = new Set(['color', 'spacing', 'radius', 'font-size', 'shadow', 'transition'])

  if (level === 'page' || level === 'organism' || cat.includes('layout') || cat.includes('navigation')) {
    preferredCategories.add('breakpoint')
  }

  if (cat.includes('forms')) {
    preferredCategories.add('font-size')
    preferredCategories.add('line-height')
  }

  return tokensCache.filter(token => preferredCategories.has(token.category)).slice(0, 18)
}
