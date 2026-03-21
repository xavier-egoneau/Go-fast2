import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const SCSS_COMPONENTS_DIR = path.join(process.cwd(), 'dev', 'assets', 'scss', 'components')

// Patterns de valeurs hardcodées à détecter
const HARDCODED_PATTERNS = [
  { pattern: /#[0-9a-fA-F]{3,8}\b/, label: 'couleur hex' },
  { pattern: /rgba?\s*\(/, label: 'couleur rgb/rgba' },
  { pattern: /hsla?\s*\(/, label: 'couleur hsl/hsla' },
  // Espacements hardcodés : valeurs px/rem qui ne sont pas dans un @use ou $variable
  { pattern: /:\s*\d+(\.\d+)?(px|rem|em)\b(?!\s*\/\/)/, label: 'valeur px/rem/em hardcodée' },
]

// Lignes à exclure : commentaires, @use, @include, variables $
const EXCLUDE_LINE = /^\s*(\/\/|\/\*|\*|@use|@forward|\$)/

function checkScssHardcoded(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const violations = []

  content.split('\n').forEach((line, idx) => {
    if (EXCLUDE_LINE.test(line)) return
    for (const { pattern, label } of HARDCODED_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({ line: idx + 1, content: line.trim(), label })
        break
      }
    }
  })

  return violations
}

function getScssComponentFiles() {
  if (!fs.existsSync(SCSS_COMPONENTS_DIR)) return []
  return fs.readdirSync(SCSS_COMPONENTS_DIR)
    .filter(f => f.endsWith('.scss'))
    .map(f => ({ name: f, path: path.join(SCSS_COMPONENTS_DIR, f) }))
}

describe('Conformité SCSS — zéro valeur hardcodée', () => {
  const files = getScssComponentFiles()

  if (files.length === 0) {
    it.skip('aucun fichier SCSS dans dev/assets/scss/components/ — tests ignorés', () => {})
    return
  }

  for (const { name, path: scssPath } of files) {
    it(`${name} — pas de valeur hardcodée`, () => {
      const violations = checkScssHardcoded(scssPath)
      if (violations.length > 0) {
        const msg = violations
          .map(v => `  ligne ${v.line} (${v.label}) : ${v.content}`)
          .join('\n')
        expect.fail(`${name} a ${violations.length} valeur(s) hardcodée(s) :\n${msg}`)
      }
    })
  }
})
