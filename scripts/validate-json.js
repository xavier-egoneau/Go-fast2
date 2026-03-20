// =============================================================================
// validate-json.js — Valide les .json de composants Go-fast
// Usage : node scripts/validate-json.js
// Appelé aussi au démarrage du dev server (import dans vite.config.js)
// =============================================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.cwd()

const REQUIRED_FIELDS = ['name', 'level', 'category', 'description']
const VALID_LEVELS = ['atom', 'molecule', 'organism', 'template', 'page']

export function validateComponentJson(jsonPath) {
  const errors = []
  const rel = path.relative(ROOT, jsonPath)

  let data
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  } catch (e) {
    return [{ file: rel, error: `JSON invalide : ${e.message}` }]
  }

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      errors.push({ file: rel, error: `champ "${field}" manquant ou vide` })
    }
  }

  if (data.level && !VALID_LEVELS.includes(data.level)) {
    errors.push({ file: rel, error: `"level" invalide : "${data.level}" (attendu : ${VALID_LEVELS.join(' | ')})` })
  }

  return errors
}

export function validateAllComponents() {
  const componentsDir = path.join(ROOT, 'dev/components')
  if (!fs.existsSync(componentsDir)) return []

  const allErrors = []

  for (const entry of fs.readdirSync(componentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const jsonPath = path.join(componentsDir, entry.name, `${entry.name}.json`)
    if (!fs.existsSync(jsonPath)) continue
    allErrors.push(...validateComponentJson(jsonPath))
  }

  return allErrors
}

// Exécution directe : node scripts/validate-json.js
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const errors = validateAllComponents()

  if (errors.length === 0) {
    console.log('[json] Tous les composants JSON sont valides.')
  } else {
    console.error(`[json] ${errors.length} erreur(s) trouvée(s) :`)
    for (const { file, error } of errors) {
      console.error(`  • ${file} — ${error}`)
    }
    process.exit(1)
  }
}
