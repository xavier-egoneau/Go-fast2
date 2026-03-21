import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

export async function generateShowcase(rootDir = ROOT) {
  const componentsDir = path.join(rootDir, 'dev', 'components')
  const pagesDir = path.join(rootDir, 'dev', 'pages')
  const dataDir = path.join(rootDir, 'dev', 'data')
  const outputFile = path.join(dataDir, 'showcase.json')

  // Crée dev/data/ si absent
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const components = []
  const pages = []

  // Scan composants
  if (fs.existsSync(componentsDir)) {
    const dirs = fs.readdirSync(componentsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const name of dirs) {
      const jsonPath = path.join(componentsDir, name, `${name}.json`)
      if (!fs.existsSync(jsonPath)) {
        console.warn(`[go-fast] Composant "${name}" : JSON manquant, ignoré.`)
        continue
      }
      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        components.push({
          id: name,
          path: `dev/components/${name}/${name}`,
          name: meta.name || name,
          level: meta.level || 'atom',
          category: meta.category || 'Général',
          description: meta.description || '',
          variants: meta.variants || {},
          content: meta.content || {}
        })
      } catch (e) {
        console.warn(`[go-fast] Composant "${name}" : JSON invalide, ignoré.`, e.message)
      }
    }
  }

  // Scan pages
  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir)
      .filter(f => f.endsWith('.twig'))

    for (const file of files) {
      const id = path.basename(file, '.twig')
      const jsonPath = path.join(pagesDir, `${id}.json`)
      let meta = {}

      if (fs.existsSync(jsonPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        } catch (e) {
          console.warn(`[go-fast] Page "${id}" : JSON invalide, ignoré.`, e.message)
        }
      }

      pages.push({
        id,
        path: `dev/pages/${id}`,
        name: meta.name || id,
        level: 'page',
        category: meta.category || 'Pages',
        description: meta.description || '',
        variants: meta.variants || {},
        content: meta.content || {}
      })
    }
  }

  const output = { components, pages }
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8')
  console.log(`[go-fast] showcase.json généré — ${components.length} composant(s), ${pages.length} page(s)`)
}

// Exécutable en direct : node scripts/generate-showcase.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateShowcase()
}
