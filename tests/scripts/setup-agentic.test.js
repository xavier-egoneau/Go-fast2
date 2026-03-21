import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { deployTool } from '../../scripts/setup-agentic.js'

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofast-agentic-'))

  // Structure minimale : CLAUDE.md + .claude/commands/
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE\n\nConstitution test.', 'utf8')
  const commandsDir = path.join(tmpDir, '.claude', 'commands')
  fs.mkdirSync(commandsDir, { recursive: true })
  fs.writeFileSync(path.join(commandsDir, 'gofast-new.md'), '# /new — Créer un composant\n\nContenu test.', 'utf8')
  fs.writeFileSync(path.join(commandsDir, 'gofast-edit.md'), '# /edit — Modifier un composant\n\nRéférence CLAUDE.md.', 'utf8')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('deployTool — copilot', () => {
  it('génère copilot-instructions.md depuis CLAUDE.md', () => {
    deployTool('copilot', tmpDir)
    const dest = path.join(tmpDir, '.github', 'copilot-instructions.md')
    expect(fs.existsSync(dest)).toBe(true)
    expect(fs.readFileSync(dest, 'utf8')).toContain('# CLAUDE')
  })

  it('génère les prompts Copilot avec frontmatter', () => {
    deployTool('copilot', tmpDir)
    const prompt = path.join(tmpDir, '.github', 'prompts', 'gofast-new.prompt.md')
    expect(fs.existsSync(prompt)).toBe(true)
    const content = fs.readFileSync(prompt, 'utf8')
    expect(content).toMatch(/^---\nagent: agent/)
    expect(content).toContain('# /new')
  })

  it('retourne le nombre de commandes déployées', () => {
    const result = deployTool('copilot', tmpDir)
    expect(result.commandsDeployed).toBe(2)
    expect(result.tool).toBe('copilot')
  })
})

describe('deployTool — codex', () => {
  it('génère AGENTS.md depuis CLAUDE.md', () => {
    deployTool('codex', tmpDir)
    const dest = path.join(tmpDir, 'AGENTS.md')
    expect(fs.existsSync(dest)).toBe(true)
    expect(fs.readFileSync(dest, 'utf8')).toContain('# CLAUDE')
  })

  it('remplace CLAUDE.md par AGENTS.md dans les prompts', () => {
    deployTool('codex', tmpDir)
    const prompt = path.join(tmpDir, '.codex', 'prompts', 'gofast-edit.prompt.md')
    const content = fs.readFileSync(prompt, 'utf8')
    expect(content).toContain('AGENTS.md')
    expect(content).not.toContain('CLAUDE.md')
  })
})

describe('deployTool — erreurs', () => {
  it('lève une erreur pour un outil inconnu', () => {
    expect(() => deployTool('unknown', tmpDir)).toThrow('Outil inconnu')
  })

  it('lève une erreur si CLAUDE.md est absent', () => {
    fs.unlinkSync(path.join(tmpDir, 'CLAUDE.md'))
    expect(() => deployTool('copilot', tmpDir)).toThrow('CLAUDE.md')
  })

  it('lève une erreur si .claude/commands/ est absent', () => {
    fs.rmSync(path.join(tmpDir, '.claude', 'commands'), { recursive: true })
    expect(() => deployTool('copilot', tmpDir)).toThrow('.claude/commands/')
  })
})
