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
  it('genere un showcase vide si aucun composant', async () => {
    fs.mkdirSync(path.join(tmpDir, 'dev', 'components'), { recursive: true })
    const showcase = await runGenerateShowcase()
    expect(showcase.components).toEqual([])
    expect(showcase.pages).toEqual([])
  })

  it('inclut les composants avec leurs metadonnees', async () => {
    writeComponent('button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: { variant: { type: 'select', default: 'primary', options: ['primary'] } }
    })

    const showcase = await runGenerateShowcase()
    expect(showcase.components).toHaveLength(1)
    const comp = showcase.components[0]
    expect(comp.id).toBe('button')
    expect(comp.name).toBe('Button')
    expect(comp.level).toBe('atom')
    expect(comp.category).toBe('Forms')
    expect(comp.path).toBe('dev/components/button/button')
    expect(comp.parts).toEqual({})
    expect(comp.collections).toEqual({})
    expect(comp.families).toEqual({})
    expect(comp.instances).toEqual({})
    expect(comp.layoutGroups).toEqual({})
  })

  it('inclut les blocs parts et collections quand ils existent', async () => {
    writeComponent('button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      content: {
        text: { label: 'Texte', type: 'text', default: 'Cliquer' }
      }
    })
    writeComponent('header-nav', {
      name: 'Header Nav',
      level: 'organism',
      category: 'Navigation',
      description: 'Un header.',
      content: {
        ctaText: { label: 'Texte CTA', type: 'text', default: 'Commencer' }
      },
      parts: {
        cta: {
          label: 'CTA',
          component: 'button',
          mode: 'single',
          autoBind: true,
          binding: {
            content: { text: 'ctaText' }
          }
        }
      },
      collections: {
        links: {
          label: 'Liens',
          kind: 'list',
          itemComponent: 'button',
          mode: 'bulk'
        }
      }
    })

    const showcase = await runGenerateShowcase()
    const header = showcase.components.find(component => component.id === 'header-nav')
    expect(header.parts).toEqual({
      cta: {
        label: 'CTA',
        component: 'button',
        mode: 'single',
        autoBind: true,
        binding: {
          content: { text: 'ctaText' }
        }
      }
    })
    expect(header.collections).toEqual({
      links: {
        label: 'Liens',
        kind: 'list',
        itemComponent: 'button',
        mode: 'bulk'
      }
    })
  })

  it('inclut aussi families, instances et layoutGroups quand ils existent', async () => {
    writeComponent('input', {
      name: 'Input',
      level: 'atom',
      category: 'Forms',
      description: 'Un champ.'
    })
    writeComponent('grid', {
      name: 'Grid',
      level: 'atom',
      category: 'Layout',
      description: 'Une grille.'
    })
    writeComponent('form-block', {
      name: 'Form Block',
      level: 'organism',
      category: 'Forms',
      description: 'Un bloc formulaire.',
      families: {
        inputs: {
          label: 'Inputs',
          component: 'input',
          mode: 'shared'
        }
      },
      instances: {
        firstName: {
          label: 'Prenom',
          component: 'input',
          family: 'inputs',
          mode: 'single'
        }
      },
      layoutGroups: {
        personalRow1: {
          label: 'Ligne 1',
          component: 'grid',
          mode: 'layout',
          children: ['firstName']
        }
      }
    })

    const showcase = await runGenerateShowcase()
    const block = showcase.components.find(component => component.id === 'form-block')
    expect(block.families).toEqual({
      inputs: {
        label: 'Inputs',
        component: 'input',
        mode: 'shared'
      }
    })
    expect(block.instances).toEqual({
      firstName: {
        label: 'Prenom',
        component: 'input',
        family: 'inputs',
        mode: 'single'
      }
    })
    expect(block.layoutGroups).toEqual({
      personalRow1: {
        label: 'Ligne 1',
        component: 'grid',
        mode: 'layout',
        children: ['firstName']
      }
    })
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

  it('cree dev/data si absent', async () => {
    fs.mkdirSync(path.join(tmpDir, 'dev', 'components'), { recursive: true })
    await runGenerateShowcase()
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'data', 'showcase.json'))).toBe(true)
  })
})
