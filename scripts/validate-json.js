// =============================================================================
// validate-json.js — Valide les .json de composants Go-fast
// Usage : node scripts/validate-json.js
// Appelé aussi au démarrage du dev server (import dans vite.config.js)
// =============================================================================

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.cwd()

const REQUIRED_FIELDS = ['name', 'level', 'category', 'description']
const VALID_LEVELS = ['atom', 'molecule', 'organism', 'template', 'page']
const VALID_CONTROL_TYPES = ['select', 'checkbox', 'text', 'color', 'number', 'array']
const VALID_PART_MODES = ['single']
const VALID_COLLECTION_MODES = ['bulk']
const VALID_COLLECTION_KINDS = ['list']
const VALID_FAMILY_MODES = ['shared']
const VALID_INSTANCE_MODES = ['single']
const VALID_LAYOUT_GROUP_MODES = ['layout']

function capitalize(value = '') {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : ''
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function addError(errors, rel, error) {
  errors.push({ file: rel, error })
}

function validateControlGroup(group, groupName, rel, errors) {
  if (group === undefined) return
  if (!isPlainObject(group)) {
    addError(errors, rel, `"${groupName}" doit être un objet`)
    return
  }

  for (const [controlKey, control] of Object.entries(group)) {
    if (!isPlainObject(control)) {
      addError(errors, rel, `"${groupName}.${controlKey}" doit être un objet`)
      continue
    }
    if (!control.label) addError(errors, rel, `"${groupName}.${controlKey}.label" manquant ou vide`)
    if (!control.type) {
      addError(errors, rel, `"${groupName}.${controlKey}.type" manquant`)
      continue
    }
    if (!VALID_CONTROL_TYPES.includes(control.type)) {
      addError(errors, rel, `"${groupName}.${controlKey}.type" invalide : "${control.type}"`)
    }
    if (control.type === 'select' && !Array.isArray(control.options)) {
      addError(errors, rel, `"${groupName}.${controlKey}.options" doit être un tableau pour un select`)
    }
  }
}

function extractIncludedComponentIds(templatePath) {
  if (!fs.existsSync(templatePath)) return []
  const source = fs.readFileSync(templatePath, 'utf8')
  const matches = source.matchAll(/include\s+['"]dev\/components\/([^/'"]+)\/[^'"]+\.twig['"]/g)
  return [...new Set(Array.from(matches, match => match[1]).filter(Boolean))]
}

function resolveComponentJsonPath(rootDir, componentId) {
  const jsonPath = path.join(rootDir, 'dev', 'components', componentId, `${componentId}.json`)
  return fs.existsSync(jsonPath) ? jsonPath : null
}

function getComponentSchema(rootDir, componentId, cache) {
  if (!componentId) return null
  if (cache.has(componentId)) return cache.get(componentId)
  const jsonPath = resolveComponentJsonPath(rootDir, componentId)
  if (!jsonPath) {
    cache.set(componentId, null)
    return null
  }

  try {
    const schema = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    cache.set(componentId, schema)
    return schema
  } catch {
    cache.set(componentId, null)
    return null
  }
}

function validateBindingMap(bindingMap, schemaSection, parentData, rel, errors, contextLabel) {
  if (bindingMap === undefined) return
  if (!isPlainObject(bindingMap)) {
    addError(errors, rel, `"${contextLabel}" doit être un objet`)
    return
  }

  for (const [childField, parentField] of Object.entries(bindingMap)) {
    if (!(childField in schemaSection)) {
      addError(errors, rel, `"${contextLabel}.${childField}" référence un champ enfant inexistant`)
    }
    if (typeof parentField !== 'string' || !parentField.trim()) {
      addError(errors, rel, `"${contextLabel}.${childField}" doit cibler un champ parent sous forme de chaîne`)
      continue
    }
  }
}

function validateExcludeMap(excludeMap, schemaSection, rel, errors, contextLabel) {
  if (excludeMap === undefined) return
  if (!Array.isArray(excludeMap)) {
    addError(errors, rel, `"${contextLabel}" doit être un tableau`)
    return
  }

  for (const childField of excludeMap) {
    if (typeof childField !== 'string' || !childField.trim()) {
      addError(errors, rel, `"${contextLabel}" doit contenir uniquement des chaînes`)
      continue
    }
    if (!(childField in schemaSection)) {
      addError(errors, rel, `"${contextLabel}" référence un champ enfant inexistant : "${childField}"`)
    }
  }
}

function validateAutoBind(partKey, childSchema, parentData, node, rel, errors, contextLabel) {
  if (!node?.autoBind) return
  if (typeof node.autoBind !== 'boolean') {
    addError(errors, rel, `"${contextLabel}.autoBind" doit être un booléen`)
    return
  }

  if (node.exclude !== undefined && !isPlainObject(node.exclude)) {
    addError(errors, rel, `"${contextLabel}.exclude" doit être un objet`)
    return
  }

  for (const section of ['variants', 'content']) {
    validateExcludeMap(node.exclude?.[section], childSchema?.[section] || {}, rel, errors, `${contextLabel}.exclude.${section}`)

    for (const childField of Object.keys(childSchema?.[section] || {})) {
      if (node.exclude?.[section]?.includes(childField)) continue
      const explicitTarget = node.binding?.[section]?.[childField]
      if (explicitTarget) continue
    }
  }
}

function validateDefaults(defaults, childSchema, rel, errors, contextLabel) {
  if (defaults === undefined) return
  if (!isPlainObject(defaults)) {
    addError(errors, rel, `"${contextLabel}" doit être un objet`)
    return
  }

  for (const section of ['variants', 'content']) {
    const values = defaults[section]
    if (values === undefined) continue
    if (!isPlainObject(values)) {
      addError(errors, rel, `"${contextLabel}.${section}" doit être un objet`)
      continue
    }
    for (const key of Object.keys(values)) {
      if (!childSchema?.[section]?.[key]) {
        addError(errors, rel, `"${contextLabel}.${section}.${key}" référence un champ enfant inexistant`)
      }
    }
  }
}

function validateParts(parts, data, rootDir, rel, errors, componentCache) {
  if (parts === undefined) return
  if (!isPlainObject(parts)) {
    addError(errors, rel, '"parts" doit être un objet')
    return
  }

  for (const [partKey, part] of Object.entries(parts)) {
    if (!isPlainObject(part)) {
      addError(errors, rel, `"parts.${partKey}" doit être un objet`)
      continue
    }
    if (!part.label) addError(errors, rel, `"parts.${partKey}.label" manquant ou vide`)
    if (!part.component) {
      addError(errors, rel, `"parts.${partKey}.component" manquant`)
      continue
    }
    if (!VALID_PART_MODES.includes(part.mode)) {
      addError(errors, rel, `"parts.${partKey}.mode" invalide : "${part.mode}"`)
    }

    const childSchema = getComponentSchema(rootDir, part.component, componentCache)
    if (!childSchema) {
      addError(errors, rel, `"parts.${partKey}.component" référence un composant introuvable : "${part.component}"`)
      continue
    }

    if (part.binding !== undefined && !isPlainObject(part.binding)) {
      addError(errors, rel, `"parts.${partKey}.binding" doit être un objet`)
    } else {
      validateBindingMap(part.binding?.variants, childSchema.variants || {}, data, rel, errors, `parts.${partKey}.binding.variants`)
      validateBindingMap(part.binding?.content, childSchema.content || {}, data, rel, errors, `parts.${partKey}.binding.content`)
    }

    validateAutoBind(partKey, childSchema, data, part, rel, errors, `parts.${partKey}`)
    validateDefaults(part.defaults, childSchema, rel, errors, `parts.${partKey}.defaults`)
  }
}

function validateFamilies(families, data, rootDir, rel, errors, componentCache) {
  if (families === undefined) return
  if (!isPlainObject(families)) {
    addError(errors, rel, '"families" doit être un objet')
    return
  }

  for (const [familyKey, family] of Object.entries(families)) {
    if (!isPlainObject(family)) {
      addError(errors, rel, `"families.${familyKey}" doit être un objet`)
      continue
    }
    if (!family.label) addError(errors, rel, `"families.${familyKey}.label" manquant ou vide`)
    if (!family.component) {
      addError(errors, rel, `"families.${familyKey}.component" manquant`)
      continue
    }
    if (!VALID_FAMILY_MODES.includes(family.mode)) {
      addError(errors, rel, `"families.${familyKey}.mode" invalide : "${family.mode}"`)
    }

    const childSchema = getComponentSchema(rootDir, family.component, componentCache)
    if (!childSchema) {
      addError(errors, rel, `"families.${familyKey}.component" référence un composant introuvable : "${family.component}"`)
      continue
    }

    if (family.binding !== undefined && !isPlainObject(family.binding)) {
      addError(errors, rel, `"families.${familyKey}.binding" doit être un objet`)
    } else {
      validateBindingMap(family.binding?.variants, childSchema.variants || {}, data, rel, errors, `families.${familyKey}.binding.variants`)
      validateBindingMap(family.binding?.content, childSchema.content || {}, data, rel, errors, `families.${familyKey}.binding.content`)
    }

    validateAutoBind(familyKey, childSchema, data, family, rel, errors, `families.${familyKey}`)
    validateDefaults(family.defaults, childSchema, rel, errors, `families.${familyKey}.defaults`)
  }
}

function validateInstances(instances, data, rootDir, rel, errors, componentCache) {
  if (instances === undefined) return
  if (!isPlainObject(instances)) {
    addError(errors, rel, '"instances" doit être un objet')
    return
  }

  for (const [instanceKey, instance] of Object.entries(instances)) {
    if (!isPlainObject(instance)) {
      addError(errors, rel, `"instances.${instanceKey}" doit être un objet`)
      continue
    }
    if (!instance.label) addError(errors, rel, `"instances.${instanceKey}.label" manquant ou vide`)
    if (!instance.component) {
      addError(errors, rel, `"instances.${instanceKey}.component" manquant`)
      continue
    }
    if (!VALID_INSTANCE_MODES.includes(instance.mode)) {
      addError(errors, rel, `"instances.${instanceKey}.mode" invalide : "${instance.mode}"`)
    }
    if (instance.family !== undefined && !data.families?.[instance.family]) {
      addError(errors, rel, `"instances.${instanceKey}.family" référence une famille introuvable : "${instance.family}"`)
    }

    const childSchema = getComponentSchema(rootDir, instance.component, componentCache)
    if (!childSchema) {
      addError(errors, rel, `"instances.${instanceKey}.component" référence un composant introuvable : "${instance.component}"`)
      continue
    }

    if (instance.binding !== undefined && !isPlainObject(instance.binding)) {
      addError(errors, rel, `"instances.${instanceKey}.binding" doit être un objet`)
    } else {
      validateBindingMap(instance.binding?.variants, childSchema.variants || {}, data, rel, errors, `instances.${instanceKey}.binding.variants`)
      validateBindingMap(instance.binding?.content, childSchema.content || {}, data, rel, errors, `instances.${instanceKey}.binding.content`)
    }

    validateAutoBind(instanceKey, childSchema, data, instance, rel, errors, `instances.${instanceKey}`)
    validateDefaults(instance.defaults, childSchema, rel, errors, `instances.${instanceKey}.defaults`)
  }
}

function validateLayoutGroups(layoutGroups, data, rootDir, rel, errors, componentCache) {
  if (layoutGroups === undefined) return
  if (!isPlainObject(layoutGroups)) {
    addError(errors, rel, '"layoutGroups" doit être un objet')
    return
  }

  for (const [groupKey, group] of Object.entries(layoutGroups)) {
    if (!isPlainObject(group)) {
      addError(errors, rel, `"layoutGroups.${groupKey}" doit être un objet`)
      continue
    }
    if (!group.label) addError(errors, rel, `"layoutGroups.${groupKey}.label" manquant ou vide`)
    if (!group.component) {
      addError(errors, rel, `"layoutGroups.${groupKey}.component" manquant`)
      continue
    }
    if (!VALID_LAYOUT_GROUP_MODES.includes(group.mode)) {
      addError(errors, rel, `"layoutGroups.${groupKey}.mode" invalide : "${group.mode}"`)
    }
    if (!Array.isArray(group.children)) {
      addError(errors, rel, `"layoutGroups.${groupKey}.children" doit être un tableau`)
    } else {
      for (const childId of group.children) {
        if (typeof childId !== 'string' || !childId.trim()) {
          addError(errors, rel, `"layoutGroups.${groupKey}.children" doit contenir uniquement des ids de chaîne`)
          continue
        }
        if (!data.instances?.[childId] && !data.parts?.[childId]) {
          addError(errors, rel, `"layoutGroups.${groupKey}.children" référence un enfant introuvable : "${childId}"`)
        }
      }
    }

    const childSchema = getComponentSchema(rootDir, group.component, componentCache)
    if (!childSchema) {
      addError(errors, rel, `"layoutGroups.${groupKey}.component" référence un composant introuvable : "${group.component}"`)
      continue
    }

    if (group.binding !== undefined && !isPlainObject(group.binding)) {
      addError(errors, rel, `"layoutGroups.${groupKey}.binding" doit être un objet`)
    } else {
      validateBindingMap(group.binding?.variants, childSchema.variants || {}, data, rel, errors, `layoutGroups.${groupKey}.binding.variants`)
      validateBindingMap(group.binding?.content, childSchema.content || {}, data, rel, errors, `layoutGroups.${groupKey}.binding.content`)
    }

    validateAutoBind(groupKey, childSchema, data, group, rel, errors, `layoutGroups.${groupKey}`)
    validateDefaults(group.defaults, childSchema, rel, errors, `layoutGroups.${groupKey}.defaults`)
  }
}

function validateCollections(collections, data, rootDir, rel, errors, componentCache) {
  if (collections === undefined) return
  if (!isPlainObject(collections)) {
    addError(errors, rel, '"collections" doit être un objet')
    return
  }

  for (const [collectionKey, collection] of Object.entries(collections)) {
    if (!isPlainObject(collection)) {
      addError(errors, rel, `"collections.${collectionKey}" doit être un objet`)
      continue
    }
    if (!collection.label) addError(errors, rel, `"collections.${collectionKey}.label" manquant ou vide`)
    if (!collection.kind) {
      addError(errors, rel, `"collections.${collectionKey}.kind" manquant`)
    } else if (!VALID_COLLECTION_KINDS.includes(collection.kind)) {
      addError(errors, rel, `"collections.${collectionKey}.kind" invalide : "${collection.kind}"`)
    }
    if (!collection.itemComponent) {
      addError(errors, rel, `"collections.${collectionKey}.itemComponent" manquant`)
      continue
    }
    if (!VALID_COLLECTION_MODES.includes(collection.mode)) {
      addError(errors, rel, `"collections.${collectionKey}.mode" invalide : "${collection.mode}"`)
    }

    const childSchema = getComponentSchema(rootDir, collection.itemComponent, componentCache)
    if (!childSchema) {
      addError(errors, rel, `"collections.${collectionKey}.itemComponent" référence un composant introuvable : "${collection.itemComponent}"`)
      continue
    }

    if (collection.binding !== undefined && !isPlainObject(collection.binding)) {
      addError(errors, rel, `"collections.${collectionKey}.binding" doit être un objet`)
      continue
    }

    validateBindingMap(collection.binding?.variants, childSchema.variants || {}, data, rel, errors, `collections.${collectionKey}.binding.variants`)
    validateBindingMap(collection.binding?.content, childSchema.content || {}, data, rel, errors, `collections.${collectionKey}.binding.content`)
    validateAutoBind(collectionKey, childSchema, data, collection, rel, errors, `collections.${collectionKey}`)
  }
}

function validateDeclaredComposition(jsonPath, data, rel, errors) {
  const templatePath = jsonPath.replace(/\.json$/i, '.twig')
  const includedComponents = extractIncludedComponentIds(templatePath)
  if (!includedComponents.length) return

  const declaredRefs = new Set([
    ...Object.values(data.parts || {}).map(part => part?.component).filter(Boolean),
    ...Object.values(data.collections || {}).map(collection => collection?.itemComponent).filter(Boolean)
    ,...Object.values(data.families || {}).map(family => family?.component).filter(Boolean)
    ,...Object.values(data.instances || {}).map(instance => instance?.component).filter(Boolean)
    ,...Object.values(data.layoutGroups || {}).map(group => group?.component).filter(Boolean)
  ])

  for (const componentId of includedComponents) {
    if (!declaredRefs.has(componentId)) {
      addError(errors, rel, `composition non declaree : "${componentId}" doit etre reference dans "parts", "collections", "families", "instances" ou "layoutGroups"`)
    }
  }
}

export function validateComponentJson(jsonPath) {
  const errors = []
  const rel = path.relative(ROOT, jsonPath)
  const rootDir = path.resolve(path.dirname(jsonPath), '..', '..', '..')
  const componentCache = new Map()

  let data
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  } catch (e) {
    return [{ file: rel, error: `JSON invalide : ${e.message}` }]
  }

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      errors.push({ file: rel, error: `champ "${field}" manquant ou vide` })
    }
  }

  if (data.level && !VALID_LEVELS.includes(data.level)) {
    errors.push({ file: rel, error: `"level" invalide : "${data.level}" (attendu : ${VALID_LEVELS.join(' | ')})` })
  }

  validateControlGroup(data.variants, 'variants', rel, errors)
  validateControlGroup(data.content, 'content', rel, errors)
  validateParts(data.parts, data, rootDir, rel, errors, componentCache)
  validateCollections(data.collections, data, rootDir, rel, errors, componentCache)
  validateFamilies(data.families, data, rootDir, rel, errors, componentCache)
  validateInstances(data.instances, data, rootDir, rel, errors, componentCache)
  validateLayoutGroups(data.layoutGroups, data, rootDir, rel, errors, componentCache)
  validateDeclaredComposition(jsonPath, data, rel, errors)

  return errors
}

export function validateAllComponents(rootDir = ROOT) {
  const componentsDir = path.join(rootDir, 'dev/components')
  if (!fs.existsSync(componentsDir)) return []

  const allErrors = []

  for (const entry of fs.readdirSync(componentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const jsonPath = path.join(componentsDir, entry.name, `${entry.name}.json`)
    if (!fs.existsSync(jsonPath)) continue
    allErrors.push(...validateComponentJson(jsonPath))
  }

  return allErrors
}

// Exécution directe : node scripts/validate-json.js
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const errors = validateAllComponents()

  if (errors.length === 0) {
    console.log('[json] Tous les composants JSON sont valides.')
  } else {
    console.error(`[json] ${errors.length} erreur(s) trouvée(s) :`)
    for (const { file, error } of errors) {
      console.error(`  • ${file} — ${error}`)
    }
    process.exit(1)
  }
}
