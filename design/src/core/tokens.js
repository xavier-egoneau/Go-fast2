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
  const res = await fetch('/__design_api/tokens')
  if (!res.ok) throw new Error('Impossible de charger les tokens')
  const { tokens } = await res.json()
  tokensCache = tokens
  return tokensCache
}

export function getTokens() {
  return tokensCache
}

export function serializeTokensForAI() {
  return tokensCache.map(token => ({
    id: token.id,
    scssVar: token.scssVar,
    category: token.category,
    value: token.value
  }))
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
