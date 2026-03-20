// =============================================================================
// list-components.js — Liste tous les composants Go-fast avec niveau et statut
// Usage : node scripts/list-components.js
// =============================================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const COMPONENTS_DIR = path.join(ROOT, 'dev/components')
const SCSS_DIR = path.join(ROOT, 'dev/assets/scss/components')
const STYLE_FILE = path.join(ROOT, 'dev/assets/scss/style.scss')

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'gofast.config.json'), 'utf8'))
  } catch {
    return { scss: true }
  }
}

function getStyleImports() {
  try {
    return fs.readFileSync(STYLE_FILE, 'utf8')
  } catch {
    return ''
  }
}

function auditComponent(name, config, styleContent) {
  const dir = path.join(COMPONENTS_DIR, name)
  const missing = []

  const hasJson = fs.existsSync(path.join(dir, `${name}.json`))
  const hasTwig = fs.existsSync(path.join(dir, `${name}.twig`))
  const hasMd = fs.existsSync(path.join(dir, `${name}.md`))
  const hasScss = config.scss
    ? fs.existsSync(path.join(SCSS_DIR, `_${name}.scss`))
    : true
  const hasImport = config.scss
    ? styleContent.includes(`@use 'components/${name}'`) || styleContent.includes(`@use "components/${name}"`)
    : true

  if (!hasJson) missing.push('.json')
  if (!hasTwig) missing.push('.twig')
  if (!hasMd) missing.push('.md')
  if (config.scss && !hasScss) missing.push('_scss')
  if (config.scss && !hasImport) missing.push('import style.scss')

  let level = '?'
  let category = '—'
  let description = ''

  if (hasJson) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'))
      level = data.level || '?'
      category = data.category || '—'
      description = data.description || ''
    } catch {
      missing.push('JSON invalide')
    }
  }

  const totalRequired = 3 + (config.scss ? 2 : 0)
  const totalPresent = (hasJson ? 1 : 0) + (hasTwig ? 1 : 0) + (hasMd ? 1 : 0) +
    (config.scss ? (hasScss ? 1 : 0) + (hasImport ? 1 : 0) : 0)

  let status
  if (totalPresent === 0) status = 'empty'
  else if (missing.length === 0) status = 'complete'
  else status = 'incomplete'

  return { name, level, category, description, status, missing }
}

function list() {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    console.log('\n❌ dev/components/ introuvable. Lancez npm run init pour initialiser le projet.\n')
    process.exit(1)
  }

  const config = getConfig()
  const styleContent = getStyleImports()

  const entries = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => auditComponent(e.name, config, styleContent))

  if (entries.length === 0) {
    console.log('\nAucun composant trouvé dans dev/components/.\n')
    return
  }

  // Groupe par niveau
  const levels = ['atom', 'molecule', 'organism', 'template', 'page', '?']
  const byLevel = {}
  for (const level of levels) byLevel[level] = []
  for (const c of entries) {
    const key = levels.includes(c.level) ? c.level : '?'
    byLevel[key].push(c)
  }

  const ICONS = { complete: '✅', incomplete: '⚠️ ', empty: '❌' }

  let total = 0, complete = 0, incomplete = 0, empty = 0

  console.log(`\nComposants Go-fast — ${entries.length} composant(s)\n`)

  for (const level of levels) {
    const group = byLevel[level]
    if (group.length === 0) continue

    console.log(`${level.toUpperCase()} (${group.length})`)
    for (const c of group) {
      const icon = ICONS[c.status]
      const name = c.name.padEnd(30)
      const cat = c.category.padEnd(16)
      const desc = c.description.slice(0, 50)

      console.log(`  ${icon} ${name} ${cat} ${desc}`)
      if (c.status === 'incomplete') {
        console.log(`     └─ manque : ${c.missing.join(', ')}`)
      }

      total++
      if (c.status === 'complete') complete++
      else if (c.status === 'incomplete') incomplete++
      else empty++
    }
    console.log()
  }

  console.log(`─────────────────────────────────────────`)
  console.log(`Total : ${total} · ✅ ${complete} complets · ⚠️  ${incomplete} incomplets · ❌ ${empty} vides`)
  console.log()
}

list()
