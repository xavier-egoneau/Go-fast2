/**
 * test-a11y.js — Test d'accessibilité automatisé avec axe-core
 *
 * Prérequis :
 *   1. Le dev server doit tourner sur le port 3000 : `npm run dev`
 *   2. Puppeteer doit être installé : `npm install puppeteer --save-dev`
 *
 * Usage :
 *   node scripts/test-a11y.js
 *   npm run test:a11y
 *
 * Options d'environnement :
 *   PORT=3000          Port du dev server (défaut : 3000)
 *   A11Y_LEVEL=critical  Niveau minimum de violation pour exit 1
 *                        Valeurs possibles : critical, serious, moderate, minor (défaut : critical)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const PORT = process.env.PORT || 3000
const BASE_URL = `http://localhost:${PORT}`
const SHOWCASE_PATH = path.join(ROOT, 'dev', 'data', 'showcase.json')
const AXE_PATH = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js')

// Niveaux d'impact axe-core, du plus critique au moins critique
const IMPACT_LEVELS = ['critical', 'serious', 'moderate', 'minor']
const EXIT_LEVEL = process.env.A11Y_LEVEL || 'critical'

// ─── Couleurs ANSI ──────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
}

const impactColor = {
  critical: C.red + C.bold,
  serious:  C.red,
  moderate: C.yellow,
  minor:    C.dim,
}

function colorize(text, ...codes) {
  return codes.join('') + text + C.reset
}

// ─── Vérifications préalables ───────────────────────────────────────────────

function checkPrerequisites() {
  // Vérifier axe-core
  if (!fs.existsSync(AXE_PATH)) {
    console.error(colorize(
      `[a11y] axe-core introuvable : ${AXE_PATH}`,
      C.red
    ))
    console.error(colorize('       Exécutez : npm install', C.dim))
    process.exit(1)
  }

  // Vérifier showcase.json
  if (!fs.existsSync(SHOWCASE_PATH)) {
    console.error(colorize(
      `[a11y] showcase.json introuvable : ${SHOWCASE_PATH}`,
      C.red
    ))
    console.error(colorize(
      '       Lancez d\'abord le dev server pour générer le fichier.',
      C.dim
    ))
    process.exit(1)
  }

  // Vérifier Puppeteer — import dynamique pour un message d'erreur clair
  return import('puppeteer').catch(() => {
    console.error(colorize(
      '[a11y] Puppeteer n\'est pas installé.',
      C.red + C.bold
    ))
    console.error(colorize(
      '       Installez-le avec : npm install puppeteer --save-dev',
      C.yellow
    ))
    process.exit(1)
  })
}

// ─── Chargement des composants ───────────────────────────────────────────────

function loadComponents() {
  const raw = fs.readFileSync(SHOWCASE_PATH, 'utf8')
  const showcase = JSON.parse(raw)

  const components = showcase.components || []
  const pages = showcase.pages || []

  // Construire la liste d'URLs à tester
  const urls = [
    ...components.map(c => ({
      name: c.name,
      id: c.id,
      level: c.level,
      url: `${BASE_URL}/dev/components/${c.id}/${c.id}.html`,
    })),
    ...pages.map(p => ({
      name: p.name,
      id: p.id,
      level: 'page',
      url: `${BASE_URL}/dev/pages/${p.id}.html`,
    })),
  ]

  return urls
}

// ─── Test d'un composant ─────────────────────────────────────────────────────

async function testComponent(page, component) {
  try {
    const response = await page.goto(component.url, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    })

    if (!response || response.status() >= 400) {
      return {
        ...component,
        error: `HTTP ${response ? response.status() : 'no response'}`,
        violations: [],
      }
    }

    // Injecter axe-core depuis node_modules (évite les requêtes réseau)
    await page.addScriptTag({ path: AXE_PATH })

    // Lancer l'analyse axe
    const results = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line no-undef
        axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'best-practice'],
          },
        }, (err, results) => {
          if (err) reject(err)
          else resolve(results)
        })
      })
    })

    return {
      ...component,
      violations: results.violations || [],
      passes: (results.passes || []).length,
      incomplete: (results.incomplete || []).length,
    }
  } catch (err) {
    return {
      ...component,
      error: err.message,
      violations: [],
    }
  }
}

// ─── Rapport ─────────────────────────────────────────────────────────────────

function printReport(results) {
  const separator = '─'.repeat(70)

  console.log()
  console.log(colorize(separator, C.dim))
  console.log(colorize(' RAPPORT D\'ACCESSIBILITÉ — axe-core (WCAG 2.0/2.1 AA)', C.bold + C.cyan))
  console.log(colorize(separator, C.dim))

  let totalViolations = 0
  let errorCount = 0
  const violationsByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 }

  for (const result of results) {
    const hasViolations = result.violations && result.violations.length > 0
    const hasError = !!result.error

    if (hasError) {
      errorCount++
      console.log()
      console.log(colorize(`  [ERREUR] ${result.name} (${result.id})`, C.yellow + C.bold))
      console.log(colorize(`           ${result.error}`, C.dim))
      console.log(colorize(`           URL : ${result.url}`, C.dim))
      continue
    }

    if (!hasViolations) {
      console.log(colorize(`  [OK] ${result.name}`, C.green) + colorize(` (${result.level})`, C.dim))
      continue
    }

    totalViolations += result.violations.length

    console.log()
    console.log(
      colorize(`  [FAIL] ${result.name}`, C.red + C.bold) +
      colorize(` (${result.level})`, C.dim) +
      colorize(` — ${result.violations.length} violation(s)`, C.red)
    )
    console.log(colorize(`         ${result.url}`, C.dim))

    for (const violation of result.violations) {
      const impact = violation.impact || 'unknown'
      const color = impactColor[impact] || C.white

      violationsByImpact[impact] = (violationsByImpact[impact] || 0) + 1

      console.log(
        colorize(`\n    [${impact.toUpperCase()}]`, color) +
        ` ${violation.description}`
      )
      console.log(colorize(`    Règle : ${violation.id}`, C.dim))
      console.log(colorize(`    Aide  : ${violation.helpUrl}`, C.dim))

      // Afficher les éléments concernés (max 3 pour la lisibilité)
      const nodes = violation.nodes || []
      const displayNodes = nodes.slice(0, 3)

      for (const node of displayNodes) {
        const target = node.target ? node.target.join(', ') : '?'
        console.log(colorize(`    ↳ ${target}`, C.magenta))
        if (node.failureSummary) {
          const summary = node.failureSummary
            .replace(/\n/g, ' ')
            .substring(0, 100)
          console.log(colorize(`      ${summary}`, C.dim))
        }
      }

      if (nodes.length > 3) {
        console.log(colorize(`    … et ${nodes.length - 3} autre(s) élément(s)`, C.dim))
      }
    }
  }

  // Résumé final
  console.log()
  console.log(colorize(separator, C.dim))
  console.log(colorize(' RÉSUMÉ', C.bold))
  console.log()

  const ok = results.filter(r => !r.error && r.violations.length === 0).length
  console.log(`  Composants testés   : ${colorize(String(results.length), C.bold)}`)
  console.log(`  Sans violation      : ${colorize(String(ok), C.green + C.bold)}`)
  console.log(`  Avec violations     : ${colorize(String(results.filter(r => r.violations && r.violations.length > 0).length), totalViolations > 0 ? C.red + C.bold : C.green)}`)
  console.log(`  Erreurs de charg.   : ${colorize(String(errorCount), errorCount > 0 ? C.yellow : C.dim)}`)

  if (totalViolations > 0) {
    console.log()
    console.log('  Violations par impact :')
    for (const level of IMPACT_LEVELS) {
      const count = violationsByImpact[level] || 0
      if (count > 0) {
        const color = impactColor[level] || C.white
        console.log(`    ${colorize(level.padEnd(10), color)} : ${colorize(String(count), color)}`)
      }
    }
  }

  console.log(colorize(separator, C.dim))
  console.log()

  return { totalViolations, violationsByImpact, errorCount }
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────

async function main() {
  console.log(colorize('[a11y] Démarrage des tests d\'accessibilité…', C.cyan))
  console.log(colorize(`[a11y] Dev server attendu sur : ${BASE_URL}`, C.dim))

  // Vérifications et import de Puppeteer
  const puppeteerModule = await checkPrerequisites()
  const { default: puppeteer } = puppeteerModule

  // Chargement des composants
  const components = loadComponents()

  if (components.length === 0) {
    console.warn(colorize('[a11y] Aucun composant trouvé dans showcase.json.', C.yellow))
    process.exit(0)
  }

  console.log(colorize(`[a11y] ${components.length} URL(s) à tester…`, C.dim))

  // Lancer Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const results = []

  try {
    const page = await browser.newPage()

    // Désactiver les erreurs console dans Puppeteer pour garder la sortie propre
    page.on('console', () => {})
    page.on('pageerror', () => {})

    for (let i = 0; i < components.length; i++) {
      const component = components[i]
      const progress = `[${i + 1}/${components.length}]`

      process.stdout.write(
        colorize(`\r[a11y] ${progress} Test de : ${component.name}…`.padEnd(70), C.dim)
      )

      const result = await testComponent(page, component)
      results.push(result)
    }

    // Effacer la ligne de progression
    process.stdout.write('\r' + ' '.repeat(72) + '\r')
  } finally {
    await browser.close()
  }

  // Afficher le rapport
  const { violationsByImpact } = printReport(results)

  // Déterminer l'exit code selon le niveau configuré
  const exitLevelIndex = IMPACT_LEVELS.indexOf(EXIT_LEVEL)
  const hasBlockingViolations = IMPACT_LEVELS
    .slice(0, exitLevelIndex + 1)
    .some(level => (violationsByImpact[level] || 0) > 0)

  if (hasBlockingViolations) {
    console.log(colorize(
      `[a11y] Des violations de niveau "${EXIT_LEVEL}" ou supérieur ont été détectées. Exit 1.`,
      C.red + C.bold
    ))
    process.exit(1)
  } else {
    console.log(colorize('[a11y] Aucune violation bloquante. Exit 0.', C.green))
    process.exit(0)
  }
}

main().catch(err => {
  console.error(colorize(`[a11y] Erreur inattendue : ${err.message}`, C.red + C.bold))
  console.error(err.stack)
  process.exit(1)
})
