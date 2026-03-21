import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { validateComponentJson, validateAllComponents } from '../../scripts/validate-json.js'

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofast-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf8')
}

describe('validateComponentJson', () => {
  it('retourne aucune erreur pour un JSON valide', () => {
    const jsonPath = path.join(tmpDir, 'button', 'button.json')
    writeJson(jsonPath, {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
    })
    expect(validateComponentJson(jsonPath)).toEqual([])
  })

  it('détecte un JSON syntaxiquement invalide', () => {
    const jsonPath = path.join(tmpDir, 'button', 'button.json')
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    fs.writeFileSync(jsonPath, '{ invalid json }', 'utf8')
    const errors = validateComponentJson(jsonPath)
    expect(errors).toHaveLength(1)
    expect(errors[0].error).toMatch(/JSON invalide/)
  })

  it('détecte les champs obligatoires manquants', () => {
    const jsonPath = path.join(tmpDir, 'button', 'button.json')
    writeJson(jsonPath, { name: 'Button' })
    const errors = validateComponentJson(jsonPath)
    const fields = errors.map(e => e.error)
    expect(fields.some(e => e.includes('"level"'))).toBe(true)
    expect(fields.some(e => e.includes('"category"'))).toBe(true)
    expect(fields.some(e => e.includes('"description"'))).toBe(true)
  })

  it('détecte un level invalide', () => {
    const jsonPath = path.join(tmpDir, 'button', 'button.json')
    writeJson(jsonPath, {
      name: 'Button',
      level: 'widget',
      category: 'Forms',
      description: 'Un bouton.',
    })
    const errors = validateComponentJson(jsonPath)
    expect(errors.some(e => e.error.includes('"level" invalide'))).toBe(true)
  })

  it('accepte tous les levels valides', () => {
    for (const level of ['atom', 'molecule', 'organism', 'template', 'page']) {
      const jsonPath = path.join(tmpDir, level, `${level}.json`)
      writeJson(jsonPath, { name: 'Test', level, category: 'UI', description: 'Test.' })
      expect(validateComponentJson(jsonPath)).toEqual([])
    }
  })
})

describe('validateAllComponents', () => {
  it('valide plusieurs composants dans dev/components/', () => {
    const componentsDir = path.join(tmpDir, 'dev', 'components')
    writeJson(path.join(componentsDir, 'button', 'button.json'), {
      name: 'Button', level: 'atom', category: 'Forms', description: 'Bouton.'
    })
    writeJson(path.join(componentsDir, 'card', 'card.json'), {
      name: 'Card', level: 'molecule', category: 'Layout', description: 'Carte.'
    })
    expect(validateAllComponents(tmpDir)).toEqual([])
  })

  it('remonte les erreurs de tous les composants invalides', () => {
    const componentsDir = path.join(tmpDir, 'dev', 'components')
    writeJson(path.join(componentsDir, 'bad', 'bad.json'), { name: 'Bad' })
    expect(validateAllComponents(tmpDir).length).toBeGreaterThan(0)
  })
})
