import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { generateShowcase } from '../../scripts/generate-showcase.js'

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofast-showcase-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeComponent(name, meta) {
  const dir = path.join(tmpDir, 'dev', 'components', name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(meta), 'utf8')
}

async function runGenerateShowcase() {
  await generateShowcase(tmpDir)
  const outputPath = path.join(tmpDir, 'dev', 'data', 'showcase.json')
  return JSON.parse(fs.readFileSync(outputPath, 'utf8'))
}

describe('generateShowcase', () => {
  it('génère un showcase vide si aucun composant', async () => {
    fs.mkdirSync(path.join(tmpDir, 'dev', 'components'), { recursive: true })
    const showcase = await runGenerateShowcase()
    expect(showcase.components).toEqual([])
    expect(showcase.pages).toEqual([])
  })

  it('inclut les composants avec leurs métadonnées', async () => {
    writeComponent('button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: { variant: { type: 'select', default: 'primary', options: ['primary'] } },
    })

    const showcase = await runGenerateShowcase()
    expect(showcase.components).toHaveLength(1)
    const comp = showcase.components[0]
    expect(comp.id).toBe('button')
    expect(comp.name).toBe('Button')
    expect(comp.level).toBe('atom')
    expect(comp.category).toBe('Forms')
    expect(comp.path).toBe('dev/components/button/button')
  })

  it('ignore les composants sans JSON', async () => {
    const dir = path.join(tmpDir, 'dev', 'components', 'no-json')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'no-json.twig'), '<div></div>', 'utf8')

    const showcase = await runGenerateShowcase()
    expect(showcase.components).toHaveLength(0)
  })

  it('ignore les composants avec JSON invalide', async () => {
    const dir = path.join(tmpDir, 'dev', 'components', 'bad')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'bad.json'), '{ invalid }', 'utf8')

    const showcase = await runGenerateShowcase()
    expect(showcase.components).toHaveLength(0)
  })

  it('crée dev/data/ si absent', async () => {
    fs.mkdirSync(path.join(tmpDir, 'dev', 'components'), { recursive: true })
    await runGenerateShowcase()
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'data', 'showcase.json'))).toBe(true)
  })
})
