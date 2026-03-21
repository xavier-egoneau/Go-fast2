import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { spawnSync } from 'child_process'
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

export function scaffoldProject(config, rootDir = ROOT) {
  const { projectName, scss: useScss, tailwind: useTailwind } = config
  const packageName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // 1. Scaffolding de dev/
  rimraf(path.join(rootDir, 'dev'))

  const dirs = [
    'dev/components',
    'dev/pages',
    'dev/data',
    'dev/assets/scss/components',
    'dev/assets/icons/unitaires',
  ]
  dirs.forEach(d => ensureDir(path.join(rootDir, d)))

  // 2. Copier les fichiers SCSS base depuis templates/ (si SCSS)
  if (useScss) {
    copyDir(
      path.join(rootDir, 'templates/scss/base'),
      path.join(rootDir, 'dev/assets/scss/base')
    )
  }

  // 3. Générer le fichier de styles selon la stratégie
  const styleFile = useTailwind && !useScss ? 'style.css' : 'style.scss'
  const styleDir = useTailwind && !useScss ? 'dev/assets' : 'dev/assets/scss'

  ensureDir(path.join(rootDir, styleDir))

  let styleContent = useTailwind && !useScss
    ? `/* =============================================================================\n   style.css — ${projectName}\n   ============================================================================= */\n\n@import "tailwindcss";\n`
    : `// =============================================================================\n// style.scss — ${projectName}\n// =============================================================================\n\n`

  if (useScss) {
    styleContent += `// Base\n@use 'base/variables';\n@use 'base/reset';\n@use 'base/typography';\n@use 'base/mixins';\n\n`
    if (useTailwind) styleContent += `/* Tailwind */\n@import "tailwindcss";\n\n`
    styleContent += `// Components\n// @use 'components/mon-composant';\n`
  }

  fs.writeFileSync(path.join(rootDir, styleDir, styleFile), styleContent, 'utf8')

  // 4. showcase.json vide
  fs.writeFileSync(
    path.join(rootDir, 'dev/data/showcase.json'),
    JSON.stringify({ components: [], pages: [] }, null, 2),
    'utf8'
  )

  // 5. Mettre à jour gofast.config.json
  const styleEntry = useTailwind && !useScss ? '/dev/assets/style.css' : '/dev/assets/scss/style.scss'
  fs.writeFileSync(
    path.join(rootDir, 'gofast.config.json'),
    JSON.stringify({ projectName, tailwind: useTailwind, scss: useScss, styleEntry }, null, 2) + '\n',
    'utf8'
  )

  // 6. Mettre à jour package.json
  const pkgPath = path.join(rootDir, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    pkg.name = packageName
    pkg.description = projectName
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  }

  // 7. Supprimer dev/.gitignore (présent dans le repo source uniquement)
  const devGitignore = path.join(rootDir, 'dev', '.gitignore')
  if (fs.existsSync(devGitignore)) fs.unlinkSync(devGitignore)

  return { projectName, packageName, useScss, useTailwind, styleFile, styleEntry }
}

async function init() {
  console.log('\n🚀 Go-fast v2 — Initialisation du projet\n')

  // 1. Nom du projet
  const rawName = (await ask('Nom du projet : ')).trim()
  const projectName = rawName || 'mon-projet'

  // 2. Stratégie CSS
  console.log('\nStratégie CSS :')
  console.log('  1. SCSS seul (défaut)')
  console.log('  2. Tailwind seul')
  console.log('  3. SCSS + Tailwind')
  const cssChoice = (await ask('Choix [1/2/3] : ')).trim() || '1'
  rl.close()

  const useScss = cssChoice !== '2'
  const useTailwind = cssChoice === '2' || cssChoice === '3'

  console.log('\n📁 Scaffolding dev/...')
  const result = scaffoldProject({ projectName, scss: useScss, tailwind: useTailwind })
  console.log(`✓ SCSS base copié depuis templates/`)
  console.log(`✓ ${result.styleFile} configuré`)
  console.log('✓ dev/data/showcase.json initialisé')
  console.log('✓ gofast.config.json mis à jour')
  console.log('✓ package.json mis à jour')
  if (!fs.existsSync(path.join(ROOT, 'dev', '.gitignore'))) {
    console.log('✓ dev/.gitignore supprimé')
  }

  console.log(`\n✅ Projet "${projectName}" prêt. Lancez npm run dev pour commencer.\n`)

  // Configurer les outils agentiques
  const agenticArgs = process.argv.slice(2)
  const setupScript = path.join(ROOT, 'scripts', 'setup-agentic.js')
  if (fs.existsSync(setupScript)) {
    spawnSync(process.execPath, [setupScript, ...agenticArgs], { stdio: 'inherit' })
  }
}

init().catch(err => {
  console.error('\n❌ Erreur :', err.message)
  process.exit(1)
})
