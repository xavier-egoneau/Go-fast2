import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const COMPONENTS_DIR = path.join(process.cwd(), 'dev', 'components')

/**
 * Extrait les variables Twig déclarées avec {% set var = ... %}
 * et vérifie que chacune utilise |default()
 */
function checkTwigDefaults(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const violations = []

  // Match: {% set varName = expr %} — sans |default
  const setPattern = /\{%-?\s*set\s+(\w+)\s*=\s*([^%]+?)\s*-?%\}/g
  let match

  while ((match = setPattern.exec(content)) !== null) {
    const varName = match[1]
    const expr = match[2]
    if (!expr.includes('|default')) {
      violations.push({ varName, line: lineOf(content, match.index) })
    }
  }

  return violations
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length
}

function getComponentTwigFiles() {
  if (!fs.existsSync(COMPONENTS_DIR)) return []
  const files = []
  for (const entry of fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const twigPath = path.join(COMPONENTS_DIR, entry.name, `${entry.name}.twig`)
    if (fs.existsSync(twigPath)) files.push({ name: entry.name, path: twigPath })
  }
  return files
}

describe('Conformité Twig — |default() obligatoire', () => {
  const components = getComponentTwigFiles()

  if (components.length === 0) {
    it.skip('aucun composant dans dev/components/ — tests ignorés', () => {})
    return
  }

  for (const { name, path: twigPath } of components) {
    it(`${name}.twig — toutes les variables ont |default()`, () => {
      const violations = checkTwigDefaults(twigPath)
      if (violations.length > 0) {
        const msg = violations
          .map(v => `  ligne ${v.line} : {% set ${v.varName} %} sans |default()`)
          .join('\n')
        expect.fail(`${name}.twig a ${violations.length} variable(s) sans |default() :\n${msg}`)
      }
    })
  }
})
