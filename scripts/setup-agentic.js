#!/usr/bin/env node
/**
 * setup-agentic.js — Génère les fichiers IA pour Copilot et/ou Codex
 *
 * Source de vérité : .claude/ (commands/) + CLAUDE.md
 *
 * Usage :
 *   node scripts/setup-agentic.js --tool copilot
 *   node scripts/setup-agentic.js --tool codex
 *   node scripts/setup-agentic.js --tool copilot --tool codex
 *   node scripts/setup-agentic.js   (mode interactif)
 *
 * Ce script ne supprime rien — il crée ou écrase uniquement les fichiers cibles.
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`  ✓  ${path.relative(ROOT, filePath)}`)
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ fichier manquant : ${path.relative(ROOT, filePath)}`)
    process.exit(1)
  }
  return fs.readFileSync(filePath, 'utf8')
}

// ---------------------------------------------------------------------------
// Transformations
// ---------------------------------------------------------------------------

function extractDescription(content) {
  const firstLine = content.split('\n')[0] || ''
  const match = firstLine.match(/^#\s+\/?\S+\s+[—-]+\s+(.+)/)
  return match ? match[1].trim() : firstLine.replace(/^#+\s*/, '').trim()
}

function transformForCopilot(content) {
  const description = extractDescription(content)
  const frontmatter = `---\nagent: agent\ndescription: ${description}\n---\n\n`
  return frontmatter + content
}

function transformForCodex(content) {
  return content
    .replace(/CLAUDE\.md/g, 'AGENTS.md')
    .replace(/\.claude\/commands\//g, '.codex/prompts/')
}

// ---------------------------------------------------------------------------
// Tool configs
// ---------------------------------------------------------------------------

function getToolConfig(toolId, rootDir) {
  const configs = {
    copilot: {
      label: 'GitHub Copilot',
      instructionsDest: path.join(rootDir, '.github', 'copilot-instructions.md'),
      commandsDest: path.join(rootDir, '.github', 'prompts'),
      commandFileName: (name) => `${name}.prompt.md`,
      transform: transformForCopilot,
    },
    codex: {
      label: 'Codex',
      instructionsDest: path.join(rootDir, 'AGENTS.md'),
      commandsDest: path.join(rootDir, '.codex', 'prompts'),
      commandFileName: (name) => `${name}.prompt.md`,
      transform: transformForCodex,
    },
  }
  return configs[toolId] ?? null
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export function deployTool(toolId, rootDir = ROOT) {
  const config = getToolConfig(toolId, rootDir)
  if (!config) throw new Error(`Outil inconnu : "${toolId}"`)

  const instructionsSrc = path.join(rootDir, 'CLAUDE.md')
  const commandsSrc = path.join(rootDir, '.claude', 'commands')

  if (!fs.existsSync(instructionsSrc)) throw new Error(`Fichier manquant : CLAUDE.md`)
  if (!fs.existsSync(commandsSrc)) throw new Error(`Dossier manquant : .claude/commands/`)

  writeFile(config.instructionsDest, readFile(instructionsSrc))

  ensureDir(config.commandsDest)
  const files = fs.readdirSync(commandsSrc).filter(f => f.endsWith('.md'))
  for (const file of files) {
    const name = file.replace(/\.md$/, '')
    const src = readFile(path.join(commandsSrc, file))
    writeFile(path.join(config.commandsDest, config.commandFileName(name)), config.transform(src))
  }

  return { tool: toolId, commandsDeployed: files.length }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const tools = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tool' && args[i + 1]) {
      const t = args[i + 1].toLowerCase()
      if (!TOOL_CONFIGS[t]) {
        console.error(`❌ Outil inconnu : "${t}". Valeurs acceptées : copilot, codex`)
        process.exit(1)
      }
      if (!tools.includes(t)) tools.push(t)
      i++
    }
  }
  return tools
}

async function promptTools() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise(resolve => rl.question(q, resolve))

  console.log('\nOutils cibles :')
  console.log('  1. GitHub Copilot')
  console.log('  2. Codex')
  console.log('\nIndique les numéros séparés par des virgules (ex: 1,2) :')

  const answer = (await ask('Choix : ')).trim()
  rl.close()

  const map = { '1': 'copilot', '2': 'codex' }
  const tools = []
  for (const part of answer.split(',')) {
    const key = part.trim()
    if (map[key] && !tools.includes(map[key])) tools.push(map[key])
  }

  if (tools.length === 0) {
    console.error('❌ Aucun outil sélectionné.')
    process.exit(1)
  }

  return tools
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n⚙️  Go-fast — Setup Agentic\n')
  console.log(`Source : .claude/commands/ + CLAUDE.md`)

  let selectedTools = parseArgs()
  if (selectedTools.length === 0) {
    selectedTools = await promptTools()
  }

  console.log(`\nOutils sélectionnés : ${selectedTools.map(t => getToolConfig(t, ROOT)?.label ?? t).join(', ')}`)
  console.log('\n── Déploiement ──────────────────────────────────────')

  for (const tool of selectedTools) {
    deployTool(tool)
  }

  console.log('\n✅ Setup terminé.\n')
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message)
  process.exit(1)
})
