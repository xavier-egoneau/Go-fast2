import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function normalizeComposableNode(node = {}) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return {}

  const normalized = {}
  for (const [key, value] of Object.entries(node)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    normalized[key] = { ...value }
  }

  return normalized
}

function buildShowcaseEntry(id, entryPath, meta, fallback) {
  return {
    id,
    path: entryPath,
    name: meta.name || fallback.name,
    level: meta.level || fallback.level,
    category: meta.category || fallback.category,
    description: meta.description || '',
    variants: meta.variants || {},
    content: meta.content || {},
    parts: normalizeComposableNode(meta.parts),
    collections: normalizeComposableNode(meta.collections),
    families: normalizeComposableNode(meta.families),
    instances: normalizeComposableNode(meta.instances),
    layoutGroups: normalizeComposableNode(meta.layoutGroups)
  }
}

export async function generateShowcase(rootDir = ROOT) {
  const componentsDir = path.join(rootDir, 'dev', 'components')
  const pagesDir = path.join(rootDir, 'dev', 'pages')
  const dataDir = path.join(rootDir, 'dev', 'data')
  const outputFile = path.join(dataDir, 'showcase.json')

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const components = []
  const pages = []

  if (fs.existsSync(componentsDir)) {
    const dirs = fs.readdirSync(componentsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)

    for (const name of dirs) {
      const jsonPath = path.join(componentsDir, name, `${name}.json`)
      if (!fs.existsSync(jsonPath)) {
        console.warn(`[go-fast] Composant "${name}" : JSON manquant, ignore.`)
        continue
      }

      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        components.push(buildShowcaseEntry(name, `dev/components/${name}/${name}`, meta, {
          name,
          level: 'atom',
          category: 'General'
        }))
      } catch (error) {
        console.warn(`[go-fast] Composant "${name}" : JSON invalide, ignore.`, error.message)
      }
    }
  }

  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir)
      .filter(file => file.endsWith('.twig'))

    for (const file of files) {
      const id = path.basename(file, '.twig')
      const jsonPath = path.join(pagesDir, `${id}.json`)
      let meta = {}

      if (fs.existsSync(jsonPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        } catch (error) {
          console.warn(`[go-fast] Page "${id}" : JSON invalide, ignore.`, error.message)
        }
      }

      pages.push(buildShowcaseEntry(id, `dev/pages/${id}`, meta, {
        name: id,
        level: 'page',
        category: 'Pages'
      }))
    }
  }

  const output = { components, pages }
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8')
  console.log(`[go-fast] showcase.json genere - ${components.length} composant(s), ${pages.length} page(s)`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateShowcase()
}
