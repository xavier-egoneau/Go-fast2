#!/usr/bin/env node
/**
 * setup-agentic.js — Configure les fichiers pour les outils IA
 *
 * Usage :
 *   node scripts/setup-agentic.js --tool claude
 *   node scripts/setup-agentic.js --tool claude --tool copilot
 *   node scripts/setup-agentic.js  (mode interactif)
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const AI_DIR = path.join(ROOT, '.ai')
const COMMANDS_DIR = path.join(AI_DIR, 'commands')
const INSTRUCTIONS_FILE = path.join(AI_DIR, 'instructions.md')

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
    console.log(`  🗑  supprimé : ${path.relative(ROOT, dirPath)}/`)
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    console.log(`  🗑  supprimé : ${path.relative(ROOT, filePath)}`)
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`  ✓  écrit    : ${path.relative(ROOT, filePath)}`)
}

// ---------------------------------------------------------------------------
// Command transformations
// ---------------------------------------------------------------------------

/** Extrait la description depuis la première ligne `# /name — Description` */
function extractDescription(content) {
  const firstLine = content.split('\n')[0] || ''
  // Match: # /name — Description  ou  # name — Description
  const match = firstLine.match(/^#\s+\/?\S+\s+[—-]+\s+(.+)/)
  return match ? match[1].trim() : firstLine.replace(/^#+\s*/, '').trim()
}

/** Extrait le nom court depuis la première ligne */
function extractCommandName(content) {
  const firstLine = content.split('\n')[0] || ''
  const match = firstLine.match(/^#\s+\/(\S+)/)
  return match ? match[1] : ''
}

function transformForClaude(content) {
  return content
}

function transformForCopilot(content) {
  const description = extractDescription(content)
  const frontmatter = `---\nagent: agent\ndescription: ${description}\n---\n\n`
  return frontmatter + content
}

function transformForCodex(content) {
  return content.replace(/CLAUDE\.md/g, 'AGENTS.md')
}

// ---------------------------------------------------------------------------
// Tool deployment
// ---------------------------------------------------------------------------

const TOOL_CONFIGS = {
  claude: {
    label: 'Claude',
    instructionsDest: path.join(ROOT, 'CLAUDE.md'),
    commandsDest: path.join(ROOT, '.claude', 'commands'),
    commandFileName: (name) => `${name}.md`,
    transform: transformForClaude,
  },
  copilot: {
    label: 'GitHub Copilot',
    instructionsDest: path.join(ROOT, '.github', 'copilot-instructions.md'),
    commandsDest: path.join(ROOT, '.github', 'prompts'),
    commandFileName: (name) => `${name}.prompt.md`,
    transform: transformForCopilot,
  },
  codex: {
    label: 'Codex',
    instructionsDest: path.join(ROOT, 'AGENTS.md'),
    commandsDest: path.join(ROOT, '.codex', 'prompts'),
    commandFileName: (name) => `${name}.prompt.md`,
    transform: transformForCodex,
  },
}

const CLEANUP_MAP = {
  claude: {
    files: [path.join(ROOT, 'CLAUDE.md')],
    dirs: [path.join(ROOT, '.claude', 'commands')],
  },
  copilot: {
    files: [path.join(ROOT, '.github', 'copilot-instructions.md')],
    dirs: [path.join(ROOT, '.github', 'prompts')],
  },
  codex: {
    files: [path.join(ROOT, 'AGENTS.md')],
    dirs: [path.join(ROOT, '.codex', 'prompts')],
  },
}

function deployTool(toolId) {
  const config = TOOL_CONFIGS[toolId]
  console.log(`\n→ ${config.label}`)

  // Vérifier que la source existe
  if (!fs.existsSync(INSTRUCTIONS_FILE)) {
    console.error(`  ❌ source manquante : ${path.relative(ROOT, INSTRUCTIONS_FILE)}`)
    process.exit(1)
  }
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.error(`  ❌ source manquante : ${path.relative(ROOT, COMMANDS_DIR)}/`)
    process.exit(1)
  }

  // Déployer instructions.md
  const instructions = fs.readFileSync(INSTRUCTIONS_FILE, 'utf8')
  writeFile(config.instructionsDest, instructions)

  // Déployer les commandes
  ensureDir(config.commandsDest)
  const commandFiles = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md'))

  for (const file of commandFiles) {
    const name = file.replace(/\.md$/, '')
    const srcContent = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8')
    const destContent = config.transform(srcContent)
    const destFile = path.join(config.commandsDest, config.commandFileName(name))
    writeFile(destFile, destContent)
  }
}

function cleanupTool(toolId) {
  const cleanup = CLEANUP_MAP[toolId]
  const config = TOOL_CONFIGS[toolId]
  console.log(`\n→ Nettoyage ${config.label}`)
  for (const f of cleanup.files) removeFile(f)
  for (const d of cleanup.dirs) removeDir(d)
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2)
  const tools = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tool' && args[i + 1]) {
      const t = args[i + 1].toLowerCase()
      if (!TOOL_CONFIGS[t]) {
        console.error(`❌ Outil inconnu : "${t}". Valeurs acceptées : claude, copilot, codex`)
        process.exit(1)
      }
      if (!tools.includes(t)) tools.push(t)
      i++
    }
  }
  return tools
}

// ---------------------------------------------------------------------------
// Interactive mode
// ---------------------------------------------------------------------------

async function promptTools() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise(resolve => rl.question(q, resolve))

  console.log('\nOutils disponibles :')
  console.log('  1. Claude')
  console.log('  2. GitHub Copilot')
  console.log('  3. Codex')
  console.log('\nIndique les numéros séparés par des virgules (ex: 1,3 ou 1,2,3) :')

  const answer = (await ask('Choix : ')).trim()
  rl.close()

  const map = { '1': 'claude', '2': 'copilot', '3': 'codex' }
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

  let selectedTools = parseArgs()

  if (selectedTools.length === 0) {
    selectedTools = await promptTools()
  }

  const allTools = Object.keys(TOOL_CONFIGS)
  const unselectedTools = allTools.filter(t => !selectedTools.includes(t))

  console.log(`\nOutils sélectionnés : ${selectedTools.map(t => TOOL_CONFIGS[t].label).join(', ')}`)

  // Déployer les outils sélectionnés
  console.log('\n── Déploiement ──────────────────────────────────────')
  for (const tool of selectedTools) {
    deployTool(tool)
  }

  // Nettoyer les outils non sélectionnés
  if (unselectedTools.length > 0) {
    console.log('\n── Nettoyage ────────────────────────────────────────')
    for (const tool of unselectedTools) {
      cleanupTool(tool)
    }
  }

  const totalCommands = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md')).length
  console.log(`\n✅ Setup terminé — ${totalCommands} commandes déployées pour : ${selectedTools.map(t => TOOL_CONFIGS[t].label).join(', ')}\n`)
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message)
  process.exit(1)
})
