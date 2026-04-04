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

function writeComponent(rootDir, name, data) {
  writeJson(path.join(rootDir, 'dev', 'components', name, `${name}.json`), data)
}

function writeTwig(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
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

  it('accepte un JSON v2 avec parts et collections valides', () => {
    writeComponent(tmpDir, 'button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: {
        variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary', 'secondary'] }
      },
      content: {
        text: { label: 'Texte', type: 'text', default: 'Cliquer' }
      }
    })
    writeComponent(tmpDir, 'card', {
      name: 'Card',
      level: 'molecule',
      category: 'Layout',
      description: 'Une carte.',
      variants: {
        variant: { label: 'Variante', type: 'select', default: 'default', options: ['default'] }
      },
      content: {
        ctaText: { label: 'CTA', type: 'text', default: 'Lire' }
      }
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'header-nav', 'header-nav.json')
    writeJson(jsonPath, {
      name: 'Header Nav',
      level: 'organism',
      category: 'Navigation',
      description: 'Header.',
      variants: {
        ctaVariant: { label: 'Variante CTA', type: 'select', default: 'primary', options: ['primary'] }
      },
      content: {
        ctaText: { label: 'Texte CTA', type: 'text', default: 'Commencer' },
        cardCtaText: { label: 'Texte card', type: 'text', default: 'Lire' }
      },
      parts: {
        cta: {
          label: 'CTA',
          component: 'button',
          mode: 'single',
          binding: {
            variants: { variant: 'ctaVariant' },
            content: { text: 'ctaText' }
          }
        }
      },
      collections: {
        cards: {
          label: 'Cards',
          kind: 'list',
          itemComponent: 'card',
          mode: 'bulk',
          binding: {
            content: { ctaText: 'cardCtaText' }
          }
        }
      }
    })

    expect(validateComponentJson(jsonPath)).toEqual([])
  })

  it('detecte une collection sans kind explicite', () => {
    writeComponent(tmpDir, 'card', {
      name: 'Card',
      level: 'molecule',
      category: 'Layout',
      description: 'Une carte.'
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'listing', 'listing.json')
    writeJson(jsonPath, {
      name: 'Listing',
      level: 'template',
      category: 'Pages',
      description: 'Listing.',
      variants: {},
      content: {},
      collections: {
        cards: {
          label: 'Cards',
          itemComponent: 'card',
          mode: 'bulk'
        }
      }
    })

    const errors = validateComponentJson(jsonPath)
    expect(errors.some(error => error.error.includes('"collections.cards.kind" manquant'))).toBe(true)
  })

  it('accepte autoBind quand les champs parent préfixés existent', () => {
    writeComponent(tmpDir, 'button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: {
        variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary'] },
        disabled: { label: 'Disabled', type: 'checkbox', default: false }
      },
      content: {
        text: { label: 'Texte', type: 'text', default: 'Cliquer' }
      }
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'header-nav', 'header-nav.json')
    writeJson(jsonPath, {
      name: 'Header Nav',
      level: 'organism',
      category: 'Navigation',
      description: 'Header.',
      variants: {
        ctaVariant: { label: 'Variante CTA', type: 'select', default: 'primary', options: ['primary'] },
        ctaDisabled: { label: 'CTA disabled', type: 'checkbox', default: false }
      },
      content: {
        ctaText: { label: 'Texte CTA', type: 'text', default: 'Commencer' }
      },
      parts: {
        cta: {
          label: 'CTA',
          component: 'button',
          mode: 'single',
          autoBind: true
        }
      }
    })

    expect(validateComponentJson(jsonPath)).toEqual([])
  })

  it('détecte une référence de part invalide', () => {
    const jsonPath = path.join(tmpDir, 'dev', 'components', 'header-nav', 'header-nav.json')
    writeJson(jsonPath, {
      name: 'Header Nav',
      level: 'organism',
      category: 'Navigation',
      description: 'Header.',
      variants: {},
      content: {},
      parts: {
        cta: {
          label: 'CTA',
          component: 'missing-button',
          mode: 'single'
        }
      }
    })

    const errors = validateComponentJson(jsonPath)
    expect(errors.some(error => error.error.includes('composant introuvable'))).toBe(true)
  })

  it('détecte un binding mal formé', () => {
    writeComponent(tmpDir, 'button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: {
        variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary'] },
        size: { label: 'Taille', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
        full: { label: 'Full', type: 'checkbox', default: false },
        disabled: { label: 'Disabled', type: 'checkbox', default: false }
      },
      content: {
        text: { label: 'Texte', type: 'text', default: 'Cliquer' }
      }
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'header-nav', 'header-nav.json')
    writeJson(jsonPath, {
      name: 'Header Nav',
      level: 'organism',
      category: 'Navigation',
      description: 'Header.',
      variants: {},
      content: {},
      parts: {
        cta: {
          label: 'CTA',
          component: 'button',
          mode: 'single',
          binding: {
            content: {
              text: ''
            }
          }
        }
      }
    })

    const errors = validateComponentJson(jsonPath)
    expect(errors.some(error => error.error.includes('doit cibler un champ parent'))).toBe(true)
  })

  it('accepte autoBind sans recopier les champs plats du sous-composant dans le parent', () => {
    writeComponent(tmpDir, 'button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: {
        variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary'] },
        size: { label: 'Taille', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
        full: { label: 'Full', type: 'checkbox', default: false },
        disabled: { label: 'Disabled', type: 'checkbox', default: false }
      },
      content: {
        text: { label: 'Texte', type: 'text', default: 'Cliquer' }
      }
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'header-nav', 'header-nav.json')
    writeJson(jsonPath, {
      name: 'Header Nav',
      level: 'organism',
      category: 'Navigation',
      description: 'Header.',
      variants: {},
      content: {},
      parts: {
        cta: {
          label: 'CTA',
          component: 'button',
          mode: 'single',
          autoBind: true
        }
      }
    })

    expect(validateComponentJson(jsonPath)).toEqual([])
  })

  it('accepte le schema non-list avec families, instances et layoutGroups', () => {
    writeComponent(tmpDir, 'input', {
      name: 'Input',
      level: 'atom',
      category: 'Forms',
      description: 'Champ.',
      variants: {
        type: { label: 'Type', type: 'select', default: 'text', options: ['text', 'email'] },
        required: { label: 'Requis', type: 'checkbox', default: false }
      },
      content: {
        label: { label: 'Label', type: 'text', default: 'Label' },
        placeholder: { label: 'Placeholder', type: 'text', default: '' }
      }
    })
    writeComponent(tmpDir, 'grid', {
      name: 'Grid',
      level: 'atom',
      category: 'Layout',
      description: 'Grille.',
      variants: {
        cols: { label: 'Colonnes', type: 'select', default: '1', options: ['1', '2', '3'] },
        gap: { label: 'Gap', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] }
      }
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'form-block', 'form-block.json')
    writeJson(jsonPath, {
      name: 'Form Block',
      level: 'organism',
      category: 'Forms',
      description: 'Bloc formulaire.',
      variants: {},
      content: {},
      families: {
        inputs: {
          label: 'Inputs',
          component: 'input',
          mode: 'shared',
          autoBind: true,
          exclude: {
            content: ['label', 'placeholder']
          }
        }
      },
      instances: {
        firstName: {
          label: 'Prenom',
          component: 'input',
          family: 'inputs',
          mode: 'single',
          defaults: {
            variants: {
              type: 'text',
              required: true
            },
            content: {
              label: 'Prenom',
              placeholder: 'ex : Jean'
            }
          }
        }
      },
      layoutGroups: {
        personalRow1: {
          label: 'Ligne 1',
          component: 'grid',
          mode: 'layout',
          children: ['firstName'],
          defaults: {
            variants: {
              cols: '1',
              gap: 'lg'
            }
          }
        }
      }
    })

    expect(validateComponentJson(jsonPath)).toEqual([])
  })

  it('detecte une instance qui reference une famille introuvable', () => {
    writeComponent(tmpDir, 'input', {
      name: 'Input',
      level: 'atom',
      category: 'Forms',
      description: 'Champ.'
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'form-block', 'form-block.json')
    writeJson(jsonPath, {
      name: 'Form Block',
      level: 'organism',
      category: 'Forms',
      description: 'Bloc formulaire.',
      variants: {},
      content: {},
      instances: {
        firstName: {
          label: 'Prenom',
          component: 'input',
          family: 'missing-family',
          mode: 'single'
        }
      }
    })

    const errors = validateComponentJson(jsonPath)
    expect(errors.some(error => error.error.includes('"instances.firstName.family"'))).toBe(true)
  })

  it('détecte une composition Twig non déclarée dans parts ou collections', () => {
    const jsonPath = path.join(tmpDir, 'dev', 'components', 'card', 'card.json')
    writeJson(jsonPath, {
      name: 'Card',
      level: 'molecule',
      category: 'Layout',
      description: 'Carte.',
      variants: {},
      content: {}
    })
    writeTwig(path.join(tmpDir, 'dev', 'components', 'card', 'card.twig'), `
      {% include 'dev/components/button/button.twig' with {
        text: 'CTA'
      } %}
    `)

    const errors = validateComponentJson(jsonPath)
    expect(errors.some(error => error.error.includes('composition non declaree'))).toBe(true)
  })

  it('accepte une composition Twig déclarée via part', () => {
    writeComponent(tmpDir, 'button', {
      name: 'Button',
      level: 'atom',
      category: 'Forms',
      description: 'Un bouton.',
      variants: {
        variant: { label: 'Variante', type: 'select', default: 'primary', options: ['primary'] },
        size: { label: 'Taille', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
        full: { label: 'Full', type: 'checkbox', default: false },
        disabled: { label: 'Disabled', type: 'checkbox', default: false }
      },
      content: {
        text: { label: 'Texte', type: 'text', default: 'Cliquer' }
      }
    })

    const jsonPath = path.join(tmpDir, 'dev', 'components', 'card', 'card.json')
    writeJson(jsonPath, {
      name: 'Card',
      level: 'molecule',
      category: 'Layout',
      description: 'Carte.',
      variants: {
        ctaVariant: { label: 'CTA variant', type: 'select', default: 'primary', options: ['primary'] }
      },
      content: {
        ctaText: { label: 'CTA text', type: 'text', default: 'Lire' }
      },
      parts: {
        cta: {
          label: 'CTA',
          component: 'button',
          mode: 'single',
          autoBind: true,
          exclude: {
            variants: ['disabled', 'full', 'size']
          }
        }
      }
    })
    writeTwig(path.join(tmpDir, 'dev', 'components', 'card', 'card.twig'), `
      {% include 'dev/components/button/button.twig' with {
        text: ctaText,
        variant: ctaVariant
      } %}
    `)

    expect(validateComponentJson(jsonPath)).toEqual([])
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
