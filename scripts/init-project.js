import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise(resolve => rl.question(q, resolve))

function rimraf(dirPath) {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true })
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function copyDir(src, dest) {
  ensureDir(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}

async function init() {
  console.log('\n🚀 Go-fast v2 — Initialisation du projet\n')

  // 1. Nom du projet
  const rawName = (await ask('Nom du projet : ')).trim()
  const projectName = rawName || 'mon-projet'
  const packageName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // 2. Stratégie CSS
  console.log('\nStratégie CSS :')
  console.log('  1. SCSS seul (défaut)')
  console.log('  2. Tailwind seul')
  console.log('  3. SCSS + Tailwind')
  const cssChoice = (await ask('Choix [1/2/3] : ')).trim() || '1'
  rl.close()

  const useScss = cssChoice !== '2'
  const useTailwind = cssChoice === '2' || cssChoice === '3'

  // 3. Scaffolding de dev/
  console.log('\n📁 Scaffolding dev/...')
  rimraf(path.join(ROOT, 'dev'))

  const dirs = [
    'dev/components',
    'dev/pages',
    'dev/data',
    'dev/assets/scss/components',
    'dev/assets/icons/unitaires',
  ]
  dirs.forEach(d => ensureDir(path.join(ROOT, d)))

  // 4. Copier les fichiers SCSS base depuis templates/ (si SCSS)
  if (useScss) {
    copyDir(
      path.join(ROOT, 'templates/scss/base'),
      path.join(ROOT, 'dev/assets/scss/base')
    )
    console.log('✓ SCSS base copié depuis templates/')
  }

  // 5. Générer le fichier de styles selon la stratégie
  // Tailwind only → style.css (Sass ne peut pas résoudre @import "tailwindcss")
  // SCSS ou hybride → style.scss
  const styleFile = useTailwind && !useScss ? 'style.css' : 'style.scss'
  const styleDir = useTailwind && !useScss
    ? 'dev/assets'
    : 'dev/assets/scss'

  ensureDir(path.join(ROOT, styleDir))

  let styleContent = useTailwind && !useScss
    ? `/* =============================================================================\n   style.css — ${projectName}\n   ============================================================================= */\n\n@import "tailwindcss";\n`
    : `// =============================================================================\n// style.scss — ${projectName}\n// =============================================================================\n\n`

  if (useScss) {
    styleContent += `// Base\n@use 'base/variables';\n@use 'base/reset';\n@use 'base/typography';\n@use 'base/mixins';\n\n`
    if (useTailwind) styleContent += `/* Tailwind */\n@import "tailwindcss";\n\n`
    styleContent += `// Components\n// @use 'components/mon-composant';\n`
  }

  fs.writeFileSync(path.join(ROOT, styleDir, styleFile), styleContent, 'utf8')
  console.log(`✓ ${styleFile} configuré`)

  // 6. showcase.json vide
  fs.writeFileSync(
    path.join(ROOT, 'dev/data/showcase.json'),
    JSON.stringify({ components: [], pages: [] }, null, 2),
    'utf8'
  )
  console.log('✓ dev/data/showcase.json initialisé')

  // 7. Mettre à jour gofast.config.json
  const styleEntry = useTailwind && !useScss
    ? '/dev/assets/style.css'
    : '/dev/assets/scss/style.scss'
  const config = { projectName, tailwind: useTailwind, scss: useScss, styleEntry }
  fs.writeFileSync(path.join(ROOT, 'gofast.config.json'), JSON.stringify(config, null, 2) + '\n', 'utf8')
  console.log('✓ gofast.config.json mis à jour')

  // 8. Mettre à jour package.json
  const pkgPath = path.join(ROOT, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkg.name = packageName
  pkg.description = projectName
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log('✓ package.json mis à jour')

  // 9. Supprimer dev/.gitignore (présent dans le repo source uniquement)
  const devGitignore = path.join(ROOT, 'dev', '.gitignore')
  if (fs.existsSync(devGitignore)) {
    fs.unlinkSync(devGitignore)
    console.log('✓ dev/.gitignore supprimé')
  }

  console.log(`\n✅ Projet "${projectName}" prêt. Lancez npm run dev pour commencer.\n`)
}

init().catch(err => {
  console.error('\n❌ Erreur :', err.message)
  process.exit(1)
})
