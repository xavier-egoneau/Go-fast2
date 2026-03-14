import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function rimraf(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function reset() {
  console.log('\n🔄 Go-fast — Reset du projet\n')

  // Supprime les composants de démo
  const componentsDir = path.join(ROOT, 'dev', 'components')
  rimraf(componentsDir)
  ensureDir(componentsDir)
  console.log('✓ dev/components/ vidé')

  // Supprime les pages de démo
  const pagesDir = path.join(ROOT, 'dev', 'pages')
  rimraf(pagesDir)
  ensureDir(pagesDir)
  console.log('✓ dev/pages/ vidé')

  // Recrée style.scss vide (sans les imports des composants de démo)
  const stylePath = path.join(ROOT, 'dev', 'assets', 'scss', 'style.scss')
  const styleContent = `// Style.scss — Point d'entrée SCSS
// Importez vos fichiers ici dans l'ordre souhaité

// Base
@use 'base/variables';
@use 'base/reset';
@use 'base/typography';
@use 'base/mixins';

// Layout
// @use 'layout/grid';
// @use 'layout/containers';

// Components
// @use 'components/my-component';
`
  fs.writeFileSync(stylePath, styleContent, 'utf8')
  console.log('✓ style.scss réinitialisé')

  // Recrée showcase.json vide
  const dataDir = path.join(ROOT, 'dev', 'data')
  ensureDir(dataDir)
  const showcasePath = path.join(dataDir, 'showcase.json')
  fs.writeFileSync(showcasePath, JSON.stringify({ components: [], pages: [] }, null, 2), 'utf8')
  console.log('✓ showcase.json vidé')

  console.log('\n✅ Projet réinitialisé. Lancez npm run dev pour commencer.\n')
}

reset()
