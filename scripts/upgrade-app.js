// =============================================================================
// upgrade-app.js — Met à jour app/ depuis le repo source sans toucher dev/
// Usage : npm run upgrade
// =============================================================================

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function rimraf(dirPath) {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}

async function upgrade() {
  console.log('\n🔄 Go-fast — Mise à jour de app/\n')

  // Vérifie que le projet est un dépôt git
  try {
    execSync('git rev-parse --git-dir', { cwd: ROOT, stdio: 'ignore' })
  } catch {
    console.error('❌ Ce dossier n\'est pas un dépôt git. Impossible de mettre à jour app/.')
    process.exit(1)
  }

  // Récupère l'URL du remote origin
  let remoteUrl
  try {
    remoteUrl = execSync('git remote get-url origin', { cwd: ROOT }).toString().trim()
  } catch {
    console.error('❌ Aucun remote "origin" configuré.')
    process.exit(1)
  }

  console.log(`Remote : ${remoteUrl}`)

  // Clone le repo dans un dossier temporaire
  const tmpDir = path.join(ROOT, '.gofast-upgrade-tmp')
  rimraf(tmpDir)

  console.log('📥 Récupération de la dernière version de app/...')
  try {
    execSync(`git clone --depth 1 --filter=blob:none --sparse "${remoteUrl}" "${tmpDir}"`, {
      cwd: ROOT,
      stdio: 'pipe'
    })
    execSync('git sparse-checkout set app', { cwd: tmpDir, stdio: 'pipe' })
  } catch (e) {
    console.error('❌ Erreur lors du clone :', e.message)
    rimraf(tmpDir)
    process.exit(1)
  }

  const srcApp = path.join(tmpDir, 'app')
  if (!fs.existsSync(srcApp)) {
    console.error('❌ Dossier app/ introuvable dans le repo source.')
    rimraf(tmpDir)
    process.exit(1)
  }

  // Sauvegarde et remplacement de app/
  console.log('🔁 Remplacement de app/...')
  rimraf(path.join(ROOT, 'app'))
  copyDir(srcApp, path.join(ROOT, 'app'))

  // Nettoyage
  rimraf(tmpDir)

  console.log('✅ app/ mis à jour.\n')
  console.log('dev/ n\'a pas été touché.\n')
}

upgrade().catch(err => {
  console.error('\n❌ Erreur :', err.message)
  process.exit(1)
})
