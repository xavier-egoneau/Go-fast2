import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { defineConfig } from 'vite'
import Twig from 'twig'
import tailwindcss from '@tailwindcss/vite'
import { normalizeAgentRunPayload, normalizeBrainOutput } from './design/src/core/brain-contract.js'
import { listAgentProviders } from './design/src/core/agent-providers.js'
import { applyPreviewPayloadToTwigData, decodePreviewPayload, PREVIEW_PAYLOAD_QUERY_KEY, resolvePreviewComposableData } from './design/src/core/preview-payload.js'

const ROOT = process.cwd()

// Charger .env dans process.env — Vite ne l'injecte pas côté middleware
;(function loadDotEnv() {
  const envFile = path.join(ROOT, '.env')
  if (!fs.existsSync(envFile)) return
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.trim().match(/^([^#][^=]*)=(.+)$/)
    if (m) process.env[m[1].trim()] ??= m[2].trim()
  }
})()

const config = JSON.parse(fs.readFileSync('./gofast.config.json', 'utf8'))
function spawnCommand(command, args, options = {}) {
  const {
    cwd = ROOT,
    input = '',
    timeoutMs = 120000
  } = options

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      env: process.env
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      reject(new Error(`${command} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', code => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ code, stdout, stderr })
    })

    if (input) child.stdin.write(input)
    child.stdin.end()
  })
}

function getProviderBase(providerId) {
  return listAgentProviders().find(provider => provider.id === providerId) || listAgentProviders()[0]
}

function resolveCodexBin() {
  // 1. Check PATH first
  const pathDirs = (process.env.PATH || '').split(path.delimiter)
  for (const dir of pathDirs) {
    const candidate = path.join(dir, 'codex')
    if (fs.existsSync(candidate)) return candidate
  }

  // 2. Check VS Code extension directories (OpenAI ChatGPT extension ships codex)
  const extensionsDir = path.join(os.homedir(), '.vscode', 'extensions')
  if (fs.existsSync(extensionsDir)) {
    for (const ext of fs.readdirSync(extensionsDir)) {
      if (!ext.startsWith('openai.chatgpt')) continue
      const candidates = [
        path.join(extensionsDir, ext, 'bin', 'macos-aarch64', 'codex'),
        path.join(extensionsDir, ext, 'bin', 'macos-x64', 'codex'),
        path.join(extensionsDir, ext, 'bin', 'linux-x64', 'codex'),
        path.join(extensionsDir, ext, 'bin', 'win32-x64', 'codex.exe')
      ]
      for (const c of candidates) {
        if (fs.existsSync(c)) return c
      }
    }
  }

  return null
}


async function getCodexProviderState() {
  const base = getProviderBase('codex-cli')
  const codexBin = resolveCodexBin()

  if (!codexBin) {
    return {
      ...base,
      available: false,
      connected: false,
      authRequired: false,
      reason: 'Codex CLI not found'
    }
  }

  try {
    const status = await spawnCommand(codexBin, ['login', 'status'], { timeoutMs: 10000 })
    const combined = `${status.stdout}\n${status.stderr}`
    const connected = /Logged in/i.test(combined)
    return {
      ...base,
      available: true,
      connected,
      authRequired: !connected,
      reason: connected ? '' : 'Codex CLI is installed but not logged in'
    }
  } catch (error) {
    return {
      ...base,
      available: true,
      connected: false,
      authRequired: true,
      reason: 'Unable to verify Codex login status'
    }
  }
}

async function getRuntimeProviders() {
  const defaults = listAgentProviders()
  const providers = await Promise.all(defaults.map(async provider => {
    if (provider.id === 'codex-cli') return getCodexProviderState()
    return provider
  }))
  return providers
}

async function callProviderAPI(messages, system = '', maxTokens = 2048) {
  const provider = process.env.AI_PROVIDER
  const apiKey   = process.env.PROVIDER_API_KEY
  const baseUrl  = process.env.PROVIDER_URL
  const model    = process.env.AI_MODEL
  if (!provider || !apiKey) throw new Error('Provider non configuré — vérifie AI_PROVIDER et PROVIDER_API_KEY dans .env')
  if (provider === 'claude') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: model || 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages })
    })
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `Anthropic ${r.status}`) }
    return (await r.json()).content[0].text
  }
  if (provider === 'ollama') {
    const url = (baseUrl || 'http://localhost:11434').replace(/\/$/, '')
    const r = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model || 'llama3', stream: false, messages: [{ role: 'system', content: system }, ...messages] })
    })
    if (!r.ok) throw new Error(`Ollama ${r.status}: ${await r.text()}`)
    return (await r.json()).message.content
  }
  throw new Error(`AI_PROVIDER inconnu : "${provider}". Valeurs : claude, ollama`)
}

function extractJsonFromText(text) {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {}

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {}
  }

  // Find the first { ... } block spanning the whole content
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {}
  }

  throw new Error(`Codex CLI returned non-JSON output: ${text.slice(0, 200)}`)
}

function readCodexOutputFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error('Codex CLI did not produce an output message file')
  }

  const text = fs.readFileSync(filePath, 'utf8').trim()
  if (!text) {
    throw new Error('Codex CLI returned an empty final message')
  }

  return text
}

async function runCodexProvider(payload) {
  const provider = await getCodexProviderState()
  if (!provider.available) throw new Error(provider.reason || 'Codex CLI is unavailable')
  if (provider.authRequired) throw new Error(provider.reason || 'Codex CLI authentication is required')

  const codexBin = resolveCodexBin()
  if (!codexBin) throw new Error('Codex CLI binary not found')

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-codex-'))
  const outputPath = path.join(tempDir, 'last-message.json')

  try {
    const result = await spawnCommand(codexBin, [
      'exec',
      '--skip-git-repo-check',
      '--sandbox', 'read-only',
      '--ephemeral',
      '--output-last-message', outputPath,
      '-'
    ], {
      cwd: ROOT,
      input: `${payload.prompt || payload.intent || ''}\n`,
      timeoutMs: 120000
    })

    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || `Codex CLI exited with code ${result.code}`)
    }

    const rawOutput = readCodexOutputFile(outputPath)
    const parsed = extractJsonFromText(rawOutput)
    return {
      provider: {
        ...provider,
        connected: true,
        authRequired: false,
        reason: ''
      },
      output: normalizeBrainOutput(parsed)
    }
  } catch (error) {
    const message = String(error?.message || error)
    if (/Enable JavaScript and cookies to continue|403 Forbidden/i.test(message)) {
      throw new Error('Codex CLI authentication needs to be refreshed with `codex login`')
    }
    throw error
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// Override le loader fs de Twig : tous les chemins relatifs sont résolus depuis ROOT
// Cela corrige les includes imbriqués (molecule → atom) qui sinon résolvent depuis le dossier du fichier parent
Twig.extend(function (T) {
  const origLoader = T.Templates.loaders['fs']
  T.Templates.loaders['fs'] = function (location, params, callback, errorCallback) {
    if (!path.isAbsolute(location)) {
      // Chemin relatif : résoudre depuis la racine du projet
      location = path.join(ROOT, location)
    } else if (!fs.existsSync(location)) {
      // Chemin absolu mais inexistant : Twig l'a pré-résolu depuis le dossier
      // du template parent (include imbriqué). On re-résout depuis ROOT en
      // cherchant le suffixe de chemin qui existe réellement.
      const rel = path.relative(ROOT, location)
      const parts = rel.split(path.sep)
      for (let i = 1; i < parts.length; i++) {
        const candidate = path.join(ROOT, ...parts.slice(i))
        if (fs.existsSync(candidate)) {
          location = candidate
          break
        }
      }
    }
    return origLoader.call(this, location, params, callback, errorCallback)
  }
})

// Rend un fichier .twig avec des données
function renderTwig(twigPath, data = {}) {
  return new Promise((resolve, reject) => {
    Twig.cache(false)
    Twig.renderFile(twigPath, data, (err, html) => {
      if (err) reject(err)
      else resolve(html)
    })
  })
}

function createShowcaseEntryResolver(showcaseData = {}) {
  const components = (showcaseData.components || []).map(entry => ({ ...entry, kind: 'component' }))
  const pages = (showcaseData.pages || []).map(entry => ({ ...entry, kind: 'page' }))
  const all = [...components, ...pages]

  return (id, kind = null) => {
    if (kind === 'component') return components.find(entry => entry.id === id) || null
    if (kind === 'page') return pages.find(entry => entry.id === id) || null
    return all.find(entry => entry.id === id) || null
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeComposableNodeId(value = '') {
  const compact = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '')

  return compact || 'part'
}

function formatComposableLabel(value = '') {
  const words = String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter(Boolean)

  return words.length
    ? words.map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ')
    : 'Part'
}

function createAvailableComposableNodeId(existingNodes = {}, preferredBase = 'part') {
  const baseId = sanitizeComposableNodeId(preferredBase)
  if (!existingNodes[baseId]) return baseId

  let index = 2
  while (existingNodes[`${baseId}${index}`]) {
    index += 1
  }

  return `${baseId}${index}`
}

function resolveMetaFilePath(relativeMetaPath = '') {
  const resolved = path.resolve(ROOT, relativeMetaPath)
  const allowedRoots = [
    path.join(ROOT, 'dev', 'components'),
    path.join(ROOT, 'dev', 'pages')
  ]

  const isAllowed = allowedRoots.some(baseDir => resolved === baseDir || resolved.startsWith(`${baseDir}${path.sep}`))
  if (!isAllowed) throw new Error('Meta path must stay inside dev/components or dev/pages')
  if (!fs.existsSync(resolved)) throw new Error(`Meta file not found: ${relativeMetaPath}`)

  return resolved
}

function exposeChildPartInMetaFile(relativeMetaPath, payload = {}) {
  const absoluteMetaPath = resolveMetaFilePath(relativeMetaPath)
  const raw = JSON.parse(fs.readFileSync(absoluteMetaPath, 'utf8'))
  const next = isPlainObject(raw) ? { ...raw } : {}
  const childComponent = String(payload.childComponent || '').trim()

  if (!childComponent) throw new Error('childComponent is required')

  const parts = isPlainObject(next.parts) ? { ...next.parts } : {}
  const preferredId = sanitizeComposableNodeId(payload.preferredNodeId || childComponent)
  const existingNode = parts[preferredId]

  let nodeId = preferredId
  if (existingNode && existingNode.component !== childComponent) {
    nodeId = createAvailableComposableNodeId(parts, preferredId)
  }

  if (!parts[nodeId]) {
    parts[nodeId] = {
      label: String(payload.label || formatComposableLabel(nodeId)),
      component: childComponent,
      mode: 'single',
      autoBind: true
    }
  }

  next.parts = parts
  fs.writeFileSync(absoluteMetaPath, JSON.stringify(next, null, 2), 'utf8')

  return {
    absoluteMetaPath,
    nodeId
  }
}

// ── CSS Editor : parse SCSS BEM structure ──────────────────────────────────
function parseComponentScssBemMap(content, componentName) {
  const bemMap = {}
  const selectorStack = []
  const propsStack = []

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('@')) continue

    if (line.includes('{')) {
      const selectorRaw = line.slice(0, line.indexOf('{')).trim()
      let selector

      if (selectorRaw.startsWith('&')) {
        const parent = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1] : componentName
        const expanded = parent + selectorRaw.slice(1)
        // Skip pseudo-selectors (:hover, :focus-visible)
        selector = expanded.includes(':') ? '__skip__' : expanded
      } else if (selectorRaw.startsWith('.')) {
        selector = selectorRaw.slice(1)
      } else if (selectorRaw === '') {
        selector = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1] : componentName
      } else {
        // Combinators, pseudo, etc. — skip for BEM map
        selector = selectorRaw.includes(':') || /[>+~]/.test(selectorRaw) ? '__skip__' : selectorRaw
      }

      selectorStack.push(selector)
      propsStack.push({})

      // Handle single-line rule: selector { prop: val; }
      if (line.includes('}')) {
        const sel = selectorStack.pop()
        const props = propsStack.pop()
        if (sel && sel !== '__skip__' && Object.keys(props).length > 0) {
          bemMap[sel] = { ...(bemMap[sel] || {}), ...props }
        }
      }
      continue
    }

    if (line === '}' || line.startsWith('}')) {
      if (selectorStack.length > 0) {
        const sel = selectorStack.pop()
        const props = propsStack.pop()
        if (sel && sel !== '__skip__' && Object.keys(props).length > 0) {
          bemMap[sel] = { ...(bemMap[sel] || {}), ...props }
        }
      }
      continue
    }

    // Property declaration
    if (line.includes(':') && propsStack.length > 0 && selectorStack[selectorStack.length - 1] !== '__skip__') {
      const colonIdx = line.indexOf(':')
      const prop = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).replace(/;.*$/, '').trim()
      if (prop && value && /^[a-z-]+$/.test(prop)) {
        propsStack[propsStack.length - 1][prop] = value
      }
    }
  }

  return bemMap
}

function patchScssBemProperty(content, componentName, selector, property, newValue) {
  const lines = content.split('\n')
  const selectorStack = []
  let targetDepth = -1
  let currentDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line.startsWith('@')) continue

    if (line.includes('{')) {
      const selectorRaw = line.slice(0, line.indexOf('{')).trim()
      let resolved

      if (selectorRaw.startsWith('&')) {
        const parent = selectorStack.length > 0 ? selectorStack[selectorStack.length - 1] : componentName
        resolved = parent + selectorRaw.slice(1)
      } else if (selectorRaw.startsWith('.')) {
        resolved = selectorRaw.slice(1)
      } else {
        resolved = selectorRaw || (selectorStack.length > 0 ? selectorStack[selectorStack.length - 1] : componentName)
      }

      selectorStack.push(resolved)
      currentDepth++

      if (resolved === selector) targetDepth = currentDepth

      if (line.includes('}')) {
        if (currentDepth === targetDepth) targetDepth = -1
        selectorStack.pop()
        currentDepth--
      }
      continue
    }

    if (line === '}' || line.startsWith('}')) {
      if (currentDepth === targetDepth) targetDepth = -1
      selectorStack.pop()
      currentDepth--
      continue
    }

    if (targetDepth !== -1 && currentDepth === targetDepth && line.includes(':')) {
      const colonIdx = line.indexOf(':')
      const prop = line.slice(0, colonIdx).trim()
      if (prop === property) {
        const indent = rawLine.match(/^(\s*)/)[1]
        const hasSemi = rawLine.includes(';')
        lines[i] = `${indent}${property}: ${newValue}${hasSemi ? ';' : ''}`
        return lines.join('\n')
      }
    }
  }

  throw new Error(`Propriété "${property}" introuvable dans le sélecteur "${selector}" de ${componentName}`)
}

function addScssBemVariant(content, variantName, patches) {
  const lines = content.split('\n')
  let depth = 0
  let rootEnd = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('//') || line.startsWith('@')) continue
    if (line.includes('{') && !line.includes('}')) depth++
    if (line === '}' || line.startsWith('}')) {
      depth--
      if (depth === 0) { rootEnd = i; break }
    }
  }

  if (rootEnd === -1) throw new Error(`Impossible de trouver la fermeture du bloc racine`)

  const propsLines = Object.entries(patches)
    .map(([prop, val]) => `    ${prop}: ${val};`)
    .join('\n')

  const variantBlock = `\n  &--${variantName} {\n${propsLines}\n  }`
  lines.splice(rootEnd, 0, variantBlock)
  return lines.join('\n')
}

// Plugin principal : routage .html → .twig + génération showcase.json
function goFastPlugin() {
  let isBuild = false

  return {
    name: 'gofast',

    // ─── Build : génère index.html depuis index.twig pour Rollup ───────────
    config(cfg, { command }) {
      if (command !== 'build') return
      isBuild = true

      const indexTwig = path.join(ROOT, 'app/templates/index.twig')
      const indexHtml = path.join(ROOT, 'index.html')

      if (fs.existsSync(indexTwig)) {
        fs.writeFileSync(indexHtml, fs.readFileSync(indexTwig, 'utf8'), 'utf8')
      }

      cfg.build = cfg.build || {}
      cfg.build.rollupOptions = cfg.build.rollupOptions || {}
      cfg.build.rollupOptions.input = {
        main: indexHtml,
        design: path.join(ROOT, 'design/index.html')
      }
    },

    // ─── Build : nettoie index.html temporaire après la build ──────────────
    closeBundle() {
      if (!isBuild) return
      const indexHtml = path.join(ROOT, 'index.html')
      if (fs.existsSync(indexHtml)) fs.unlinkSync(indexHtml)
    },

    // ─── Dev : middleware pre-Vite ──────────────────────────────────────────
    configureServer(server) {
      server.middlewares.use('/__design_api/agent/providers', async (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const providers = await getRuntimeProviders()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            ok: true,
            providers
          }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: error.message }))
        }
      })

      server.middlewares.use('/__design_api/scenes/save', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { fileName, scene } = JSON.parse(body || '{}')
            if (!fileName || !scene) throw new Error('fileName et scene requis')
            const safeFileName = path.basename(fileName)
            const scenesDir = path.join(ROOT, 'design', 'scenes')
            const indexPath = path.join(scenesDir, 'index.json')
            const scenePath = path.join(scenesDir, safeFileName)
            fs.mkdirSync(scenesDir, { recursive: true })
            fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2), 'utf8')

            let index = []
            if (fs.existsSync(indexPath)) {
              index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
            }
            const entry = {
              id: scene.id || safeFileName.replace(/\.scene\.json$/, ''),
              name: scene.name || safeFileName,
              file: safeFileName
            }
            const existingIndex = index.findIndex(item => item.file === safeFileName)
            if (existingIndex >= 0) index[existingIndex] = entry
            else index.push(entry)
            fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8')

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, entry }))
          } catch (error) {
            res.statusCode = 500
            res.end(error.message)
          }
        })
      })

      server.middlewares.use('/__design_api/scenes/delete', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { fileName } = JSON.parse(body || '{}')
            if (!fileName) throw new Error('fileName requis')
            const safeFileName = path.basename(fileName)
            const scenesDir = path.join(ROOT, 'design', 'scenes')
            const indexPath = path.join(scenesDir, 'index.json')
            const scenePath = path.join(scenesDir, safeFileName)

            if (fs.existsSync(scenePath) && safeFileName !== 'default.scene.json') {
              fs.unlinkSync(scenePath)
            }

            if (fs.existsSync(indexPath)) {
              const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')).filter(item => item.file !== safeFileName)
              fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8')
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.statusCode = 500
            res.end(error.message)
          }
        })
      })

      server.middlewares.use('/__design_api/components/expose-child', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}')
            const result = exposeChildPartInMetaFile(payload.metaPath, payload)

            if (result.absoluteMetaPath.includes(`${path.sep}dev${path.sep}components${path.sep}`)) {
              const { validateComponentJson } = await import('./scripts/validate-json.js')
              const errors = validateComponentJson(result.absoluteMetaPath)
              if (errors.length) {
                throw new Error(errors.map(entry => entry.error).join(' | '))
              }
            }

            const { generateShowcase } = await import('./scripts/generate-showcase.js')
            await generateShowcase()

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              ok: true,
              nodeId: result.nodeId
            }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })

      server.middlewares.use('/__design_api/agent/run', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const payload = normalizeAgentRunPayload(JSON.parse(body || '{}'))
            const provider = getProviderBase(payload.providerId)

            if (provider.id === 'manual-json') {
              const parsed = payload.manualJson ? JSON.parse(payload.manualJson) : {}
              const output = normalizeBrainOutput(parsed)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                ok: true,
                provider,
                output
              }))
              return
            }

            if (provider.id === 'codex-cli') {
              const result = await runCodexProvider(payload)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                ok: true,
                provider: result.provider,
                output: result.output
              }))
              return
            }

            res.statusCode = 501
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: provider.reason || `Provider ${provider.id} not implemented yet`,
              provider
            }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })

      // ── Workshop : rendu Twig via fichier temp (supporte {% include %}) ──────
      server.middlewares.use('/__design_api/workshop/preview', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          let tempTwig = null
          try {
            const { twig = '', params = {} } = JSON.parse(body || '{}')
            let rendered = ''
            try {
              // Écrire dans le projet pour que le loader Twig custom résolve les {% include %}
              const tmpDir = path.join(ROOT, '.workshop-tmp')
              fs.mkdirSync(tmpDir, { recursive: true })
              tempTwig = path.join(tmpDir, '_preview.twig')
              fs.writeFileSync(tempTwig, twig, 'utf8')
              rendered = await renderTwig(tempTwig, params)
            } catch (twigErr) {
              rendered = `<pre style="color:red;padding:1rem">Twig error:\n${twigErr.message}</pre>`
            }
            const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${config.styleEntry || '/dev/assets/scss/style.scss'}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background-color: #f1f5f9; display: flex; justify-content: center; align-items: flex-start; padding: 3rem 2rem; }
  </style>
</head>
<body>${rendered}
</body>
</html>`
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, html: fullHtml }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          } finally {
            if (tempTwig && fs.existsSync(tempTwig)) fs.unlinkSync(tempTwig)
          }
        })
      })

      // ── Workshop : génère Twig + SCSS + meta via agent ─────────────────────
      server.middlewares.use('/__design_api/workshop/agent', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { intent = '', name = '', level = 'atom', category = '' } = JSON.parse(body || '{}')
            if (!intent.trim()) throw new Error('intent requis')

            // Lire le contenu complet de tous les composants existants
            const componentsDir = path.join(ROOT, 'dev', 'components')
            const componentEntries = []
            if (fs.existsSync(componentsDir)) {
              for (const slug of fs.readdirSync(componentsDir)) {
                const twigPath = path.join(componentsDir, slug, `${slug}.twig`)
                const jsonPath = path.join(componentsDir, slug, `${slug}.json`)
                const scssPath = path.join(componentsDir, slug, `${slug}.scss`)
                const twigContent = fs.existsSync(twigPath) ? fs.readFileSync(twigPath, 'utf8') : null
                const jsonContent = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : null
                const scssContent = fs.existsSync(scssPath) ? fs.readFileSync(scssPath, 'utf8') : null
                if (twigContent) {
                  componentEntries.push({ slug, twigPath: `dev/components/${slug}/${slug}.twig`, twigContent, jsonContent, scssContent })
                }
              }
            }

            // Lire les variables SCSS du design system
            const variablesPath = path.join(ROOT, 'dev', 'assets', 'scss', 'base', '_variables.scss')
            const scssVariables = fs.existsSync(variablesPath) ? fs.readFileSync(variablesPath, 'utf8') : ''

            const componentsContext = componentEntries.map(e => `
--- COMPONENT: ${e.slug} (include path: '${e.twigPath}') ---
[meta.json]
${e.jsonContent || 'n/a'}
[twig]
${e.twigContent}
${e.scssContent ? `[scss]\n${e.scssContent}` : ''}
`.trim()).join('\n\n')

            const prompt = `=== COMPONENT WORKSHOP — JSON CODE GENERATION ===

OUTPUT REQUIREMENT (read this first):
Your response must contain ONLY a single valid JSON object — no markdown, no code fences, no explanation.

DESIGN SYSTEM SCSS VARIABLES (use these, never hardcode values):
${scssVariables}

EXISTING COMPONENTS (study their Twig, BEM classes, SCSS patterns and reuse them):
${componentsContext || 'none'}

COMPONENT TO CREATE:
- Intent: ${intent}
- Name (slug): ${name || 'my-component'}
- Level: ${level}
- Category: ${category || 'General'}

RETURN FORMAT (JSON only):
{
  "twig": "<complete twig template as string>",
  "scss": "<complete SCSS for this component as string>",
  "meta": {
    "variants": {
      "variantKey": { "label": "...", "type": "select|checkbox", "default": "...", "options": ["..."] }
    },
    "content": {
      "contentKey": { "label": "...", "type": "text|color|number", "default": "..." }
    }
  }
}

RULES:
- Copy the exact BEM naming style and SCSS patterns from the existing components above
- All Twig variables must use |default() — copy the pattern from existing components
- SCSS: use $variable-name tokens only, BEM selectors, @use '../base/variables' as * at top
- meta.variants and meta.content: only keys actually used in the twig template
- {% include %} paths MUST use the full path shown in each component header above, e.g. {% include 'dev/components/button/button.twig' with { ... } only %}
- If you reuse a component with {% include %}, do not redeclare its SCSS
- data-gf-component attribute on the root element is mandatory
`

            const codexBin = resolveCodexBin()
            let result

            if (codexBin) {
              const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workshop-agent-'))
              const outputPath = path.join(tempDir, 'last-message.json')
              try {
                const spawnResult = await spawnCommand(codexBin, [
                  'exec',
                  '--skip-git-repo-check',
                  '--sandbox', 'read-only',
                  '--ephemeral',
                  '--output-last-message', outputPath,
                  '-'
                ], { cwd: ROOT, input: `${prompt}\n`, timeoutMs: 120000 })

                if (spawnResult.code !== 0) throw new Error(spawnResult.stderr.trim() || `Codex exited with code ${spawnResult.code}`)
                const rawOutput = readCodexOutputFile(outputPath)
                result = extractJsonFromText(rawOutput)
              } finally {
                fs.rmSync(tempDir, { recursive: true, force: true })
              }
            } else {
              throw new Error('Aucun provider IA disponible. Configure Codex CLI pour utiliser l\'agent workshop.')
            }

            if (!result.twig) throw new Error('L\'agent n\'a pas retourné de template Twig')

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, twig: result.twig, scss: result.scss || '', meta: result.meta || {} }))
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: error.message }))
          }
        })
      })

      // ── Workshop : sauvegarde un nouveau composant sur disque ───────────────
      server.middlewares.use('/__design_api/workshop/save', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { name, level, category, description, twig, scss, meta } = JSON.parse(body || '{}')

            if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
              throw new Error('Le nom doit être un slug valide (ex: accordion-toggle)')
            }
            if (!['atom', 'molecule', 'organism'].includes(level)) {
              throw new Error('Niveau invalide')
            }

            const componentDir = path.join(ROOT, 'dev', 'components', name)
            if (fs.existsSync(componentDir)) {
              throw new Error(`Le composant "${name}" existe déjà dans dev/components/`)
            }

            // Construire le JSON du composant
            const metaJson = {
              name: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              level,
              category: category || 'General',
              description: description || '',
              ...(meta && typeof meta === 'object' ? meta : {})
            }

            // Créer les fichiers
            fs.mkdirSync(componentDir, { recursive: true })
            fs.writeFileSync(path.join(componentDir, `${name}.twig`), twig || '', 'utf8')
            fs.writeFileSync(path.join(componentDir, `${name}.json`), JSON.stringify(metaJson, null, 2), 'utf8')

            // SCSS component file
            const scssDir = path.join(ROOT, 'dev', 'assets', 'scss', 'components')
            fs.mkdirSync(scssDir, { recursive: true })
            const scssContent = scss || `.${name} {\n  // styles\n}\n`
            fs.writeFileSync(path.join(scssDir, `_${name}.scss`), scssContent, 'utf8')

            // Injecter @use dans style.scss
            const stylePath = path.join(ROOT, 'dev', 'assets', 'scss', 'style.scss')
            if (fs.existsSync(stylePath)) {
              let styleContent = fs.readFileSync(stylePath, 'utf8')
              const useImport = `@use 'components/${name}';`
              if (!styleContent.includes(useImport)) {
                // Trouver la dernière ligne @use 'components/...' et insérer après
                const lines = styleContent.split('\n')
                let lastComponentUseIdx = -1
                for (let i = lines.length - 1; i >= 0; i--) {
                  if (lines[i].startsWith("@use 'components/")) {
                    lastComponentUseIdx = i
                    break
                  }
                }
                if (lastComponentUseIdx >= 0) {
                  lines.splice(lastComponentUseIdx + 1, 0, useImport)
                } else {
                  lines.push(useImport)
                }
                fs.writeFileSync(stylePath, lines.join('\n'), 'utf8')
              }
            }

            // Régénérer showcase.json
            const { generateShowcase } = await import('./scripts/generate-showcase.js')
            await generateShowcase()
            server.ws.send({ type: 'custom', event: 'gofast:update' })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, id: name }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: error.message }))
          }
        })
      })

      // ── CSS Editor : lecture BEM map ───────────────────────────────────────
      server.middlewares.use('/__design_api/css-editor/read', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const url = new URL(req.url, 'http://localhost')
        const component = url.searchParams.get('component')
        if (!component || !/^[a-z0-9-]+$/.test(component)) {
          res.statusCode = 400
          return res.end(JSON.stringify({ error: 'component requis (slug valide)' }))
        }
        try {
          const scssPath = path.join(ROOT, 'dev', 'assets', 'scss', 'components', `_${component}.scss`)
          if (!fs.existsSync(scssPath)) throw new Error(`Fichier SCSS introuvable : _${component}.scss`)
          const content = fs.readFileSync(scssPath, 'utf8')
          const bemMap = parseComponentScssBemMap(content, component)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, component, bemMap, scssPath: `dev/assets/scss/components/_${component}.scss` }))
        } catch (error) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: error.message }))
        }
      })

      // ── CSS Editor : patch propriété dans le SCSS ──────────────────────────
      server.middlewares.use('/__design_api/css-editor/patch', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          try {
            const { component, selector, property, value } = JSON.parse(body || '{}')
            if (!component || !selector || !property || value === undefined) throw new Error('component, selector, property, value requis')
            const scssPath = path.join(ROOT, 'dev', 'assets', 'scss', 'components', `_${component}.scss`)
            if (!fs.existsSync(scssPath)) throw new Error(`_${component}.scss introuvable`)
            let content = fs.readFileSync(scssPath, 'utf8')
            content = patchScssBemProperty(content, component, selector, property, value)
            fs.writeFileSync(scssPath, content, 'utf8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })

      // ── CSS Editor : créer un modifier BEM (variante) ──────────────────────
      server.middlewares.use('/__design_api/css-editor/variant', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', async () => {
          try {
            const { component, variantName, patches } = JSON.parse(body || '{}')
            if (!component || !variantName || !patches) throw new Error('component, variantName, patches requis')
            if (!/^[a-z0-9-]+$/.test(variantName)) throw new Error('variantName doit être un slug valide')

            const scssPath = path.join(ROOT, 'dev', 'assets', 'scss', 'components', `_${component}.scss`)
            if (!fs.existsSync(scssPath)) throw new Error(`_${component}.scss introuvable`)
            let scssContent = fs.readFileSync(scssPath, 'utf8')
            scssContent = addScssBemVariant(scssContent, variantName, patches)
            fs.writeFileSync(scssPath, scssContent, 'utf8')

            // Ajouter la variante dans le JSON du composant
            const jsonPath = path.join(ROOT, 'dev', 'components', component, `${component}.json`)
            if (fs.existsSync(jsonPath)) {
              const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
              meta.variants = meta.variants || {}
              if (!meta.variants.type) {
                meta.variants.type = { label: 'Type', type: 'select', default: 'default', options: [] }
              }
              const opts = meta.variants.type.options || []
              if (!opts.includes(variantName)) opts.push(variantName)
              meta.variants.type.options = opts
              fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2), 'utf8')

              const { generateShowcase } = await import('./scripts/generate-showcase.js')
              await generateShowcase()
            }

            server.ws.send({ type: 'custom', event: 'gofast:update' })
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, variantName }))
          } catch (error) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })

      // Génère showcase.json + sprite icônes au démarrage
      import('./scripts/generate-showcase.js').then(({ generateShowcase }) => generateShowcase())
      import('./scripts/generate-icons.js').then(({ generateIcons }) => generateIcons())

      // Valide les JSON de composants au démarrage
      import('./scripts/validate-json.js').then(({ validateAllComponents }) => {
        const errors = validateAllComponents()
        if (errors.length > 0) {
          console.warn(`\n[json] ⚠️  ${errors.length} erreur(s) dans les JSON de composants :`)
          for (const { file, error } of errors) {
            console.warn(`  • ${file} — ${error}`)
          }
          console.warn()
        }
      })

      // Watch : regénère showcase.json si un composant change
      server.watcher.on('change', async (file) => {
        if (
          (file.includes('dev/components') && file.endsWith('.json')) ||
          (file.includes('dev/pages') && (file.endsWith('.json') || file.endsWith('.twig')))
        ) {
          const { generateShowcase } = await import('./scripts/generate-showcase.js')
          await generateShowcase()
          server.ws.send({ type: 'custom', event: 'gofast:update' })
        }
        // Watch : regénère sprite.svg + doc.html si une icône change
        if (file.includes('dev/assets/icons/unitaires') && file.endsWith('.svg')) {
          const { generateIcons } = await import('./scripts/generate-icons.js')
          await generateIcons()
        }
      })
      server.watcher.on('add', async (file) => {
        if (file.includes('dev/components') || file.includes('dev/pages')) {
          const { generateShowcase } = await import('./scripts/generate-showcase.js')
          await generateShowcase()
          server.ws.send({ type: 'custom', event: 'gofast:update' })
        }
        // Watch : regénère sprite.svg + doc.html si une icône est ajoutée
        if (file.includes('dev/assets/icons/unitaires') && file.endsWith('.svg')) {
          const { generateIcons } = await import('./scripts/generate-icons.js')
          await generateIcons()
        }
      })

      // ── Tokens design system ───────────────────────────────────────────────
      const VARIABLES_PATH = path.join(ROOT, 'dev', 'assets', 'scss', 'base', '_variables.scss')

      const GOOGLE_FONTS_CURATED = [
        // Sans-serif
        'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','DM Sans',
        'Source Sans 3','Raleway','Ubuntu','Rubik','Outfit','Plus Jakarta Sans','Figtree',
        'Manrope','Noto Sans','Work Sans','Karla','Mulish','Jost','Barlow','Space Grotesk',
        // Serif
        'Playfair Display','Merriweather','Lora','Source Serif 4','EB Garamond',
        'Cormorant Garamond','Libre Baskerville','Crimson Text','Fraunces','DM Serif Display',
        // Monospace
        'Fira Code','JetBrains Mono','Source Code Pro','Roboto Mono','IBM Plex Mono',
        'Space Mono','Inconsolata','DM Mono',
        // Display
        'Syne','Unbounded','Archivo','Cabinet Grotesk',
      ].sort()

      function parseScssVariables(content) {
        const result = {}
        for (const line of content.split('\n')) {
          const m = line.match(/^\$([a-z0-9-]+):\s*(.+?)(?:\s*;|\s*\/\/)/)
          if (m) result[m[1]] = m[2].trim().replace(/;$/, '').trim()
        }
        return result
      }

      function groupTokens(vars) {
        const pick = (prefix) => Object.fromEntries(
          Object.entries(vars).filter(([k]) => k.startsWith(prefix))
            .map(([k, v]) => [k.replace(prefix, ''), v])
        )
        return {
          colors:      pick('color-'),
          fonts:       pick('font-family-'),
          fontSizes:   pick('font-size-'),
          fontWeights: pick('font-weight-'),
          lineHeights: pick('line-height-'),
          spacing:     pick('spacing-'),
          radius:      pick('radius-'),
          shadows:     pick('shadow-'),
          transitions: pick('transition-'),
        }
      }

      function updateScssVariable(content, varName, newValue) {
        const escaped = varName.replace(/-/g, '\\-')
        const regex   = new RegExp(`(\\$${escaped}:\\s*)([^;]+)(;)`)
        if (!regex.test(content)) throw new Error(`$${varName} non trouvée dans _variables.scss`)
        return content.replace(regex, `$1${newValue}$3`)
      }

      server.middlewares.use('/api/tokens', (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const content = fs.existsSync(VARIABLES_PATH) ? fs.readFileSync(VARIABLES_PATH, 'utf8') : ''
            const tokens  = groupTokens(parseScssVariables(content))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, tokens, fonts: GOOGLE_FONTS_CURATED }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
          return
        }

        if (req.method === 'PATCH') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            try {
              const { name, value } = JSON.parse(body || '{}')
              if (!name || value === undefined) throw new Error('name et value requis')
              let content = fs.readFileSync(VARIABLES_PATH, 'utf8')
              content = updateScssVariable(content, name, value)
              fs.writeFileSync(VARIABLES_PATH, content, 'utf8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: e.message }))
            }
          })
          return
        }

        next()
      })

      // ── Agent panel : config + chat ────────────────────────────────────────
      server.middlewares.use('/api/config', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const provider = process.env.AI_PROVIDER || null
        const model    = process.env.AI_MODEL
          || (provider === 'claude'  ? 'claude-sonnet-4-6' : null)
          || (provider === 'ollama'  ? 'llama3' : null)
          || 'non configuré'
        const ready = !!(provider && process.env.PROVIDER_API_KEY)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ provider, model, ready }))
      })

      server.middlewares.use('/api/chat', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { messages = [], context = '' } = JSON.parse(body || '{}')
            const scssVariables = fs.existsSync(VARIABLES_PATH)
              ? fs.readFileSync(VARIABLES_PATH, 'utf8') : ''
            const system = `Tu es un agent de design pour Go-fast v2 (Atomic Design, Twig + SCSS + JSON).
INSTRUCTION CRITIQUE : réponds UNIQUEMENT avec un objet JSON valide. Zéro texte avant ou après.

Détecte l'intention et réponds avec l'une de ces actions :
- Créer un composant → {"action":"create","name":"nom-kebab","level":"atom|molecule|organism","category":"Forms|Navigation|Layout|Content|Feedback","intent":"description précise et complète"}
- Besoin de précision → {"action":"clarify","message":"ta question courte"}
- Réponse générale → {"action":"chat","message":"ta réponse"}
${context ? `\nComposant/page sélectionné : ${context}` : ''}

VARIABLES SCSS DU DESIGN SYSTEM — utilise uniquement ces tokens, jamais de valeurs hardcodées :
${scssVariables}`
            const raw = await callProviderAPI(messages, system, 512)
            const parsed = extractJsonFromText(raw)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(parsed))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })

      server.middlewares.use('/api/generate', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { name, level, category, intent } = JSON.parse(body || '{}')
            if (!intent) throw new Error('intent requis')

            const componentsDir = path.join(ROOT, 'dev', 'components')
            const componentEntries = []
            if (fs.existsSync(componentsDir)) {
              for (const slug of fs.readdirSync(componentsDir)) {
                const twigPath = path.join(componentsDir, slug, `${slug}.twig`)
                const jsonPath = path.join(componentsDir, slug, `${slug}.json`)
                const twigContent = fs.existsSync(twigPath) ? fs.readFileSync(twigPath, 'utf8') : null
                const jsonContent = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : null
                if (twigContent) componentEntries.push({ slug, twigContent, jsonContent })
              }
            }
            const variablesPath = path.join(ROOT, 'dev', 'assets', 'scss', 'base', '_variables.scss')
            const scssVariables = fs.existsSync(variablesPath) ? fs.readFileSync(variablesPath, 'utf8') : ''

            const system = `Tu es un expert Atomic Design Go-fast v2. Génère du code de composant.
INSTRUCTION CRITIQUE : réponds UNIQUEMENT avec un objet JSON valide. Zéro texte avant ou après.`

            const prompt = `COMPOSANT À CRÉER :
- Intent : ${intent}
- Nom (slug) : ${name || 'my-component'}
- Niveau : ${level || 'atom'}
- Catégorie : ${category || 'General'}

VARIABLES SCSS DU DESIGN SYSTEM (utilise uniquement ces variables, jamais de valeurs hardcodées) :
${scssVariables}

COMPOSANTS EXISTANTS (étudie leurs patterns Twig/BEM/SCSS et réutilise-les) :
${componentEntries.map(e => `--- ${e.slug} ---\n[json] ${e.jsonContent || 'n/a'}\n[twig] ${e.twigContent}`).join('\n\n')}

FORMAT DE RÉPONSE (JSON uniquement) :
{
  "twig": "<template twig complet>",
  "scss": "<SCSS complet avec @use '../base/variables' as * en tête>",
  "meta": {
    "variants": { "clé": { "label": "...", "type": "select|checkbox", "default": "...", "options": ["..."] } },
    "content":  { "clé": { "label": "...", "type": "text|number|color", "default": "..." } }
  }
}

RÈGLES ABSOLUES :
- |default() obligatoire sur chaque variable Twig
- BEM strict (.block__element--modifier)
- SCSS : @use '../base/variables' as * en première ligne, zéro valeur hardcodée
- Include : {% include 'dev/components/[slug]/[slug].twig' with { ... } %}
- data-gf-component="${name || 'my-component'}" sur l'élément racine`

            const raw = await callProviderAPI([{ role: 'user', content: prompt }], system, 4096)
            const result = extractJsonFromText(raw)
            if (!result.twig) throw new Error('Le modèle n\'a pas retourné de template Twig')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, twig: result.twig, scss: result.scss || '', meta: result.meta || {} }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
        })
      })

      // Middleware : intercepte les requêtes .html → rend le .twig correspondant
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url || '/', 'http://localhost')
        const pathname = urlObj.pathname

        let twigRelPath = null

        if (pathname === '/' || pathname === '/index.html') {
          twigRelPath = 'app/templates/index.twig'
        } else if (pathname.endsWith('.html')) {
          const candidate = pathname.slice(1).replace(/\.html$/, '') + '.twig'
          if (fs.existsSync(path.join(ROOT, candidate))) {
            twigRelPath = candidate
          }
        }

        if (!twigRelPath) return next()

        // Données : showcase.json + query params (variantes du composant)
        const data = {}
        const showcasePath = path.join(ROOT, 'dev/data/showcase.json')
        if (fs.existsSync(showcasePath)) {
          try { Object.assign(data, JSON.parse(fs.readFileSync(showcasePath, 'utf8'))) } catch (_) {}
        }
        const previewPayload = decodePreviewPayload(urlObj.searchParams.get(PREVIEW_PAYLOAD_QUERY_KEY))
        if (previewPayload) {
          const resolveShowcaseEntry = createShowcaseEntryResolver(data)
          const previewEntry = resolveShowcaseEntry(previewPayload.ref, previewPayload.kind)
          const resolvedComposableData = previewEntry
            ? resolvePreviewComposableData(previewPayload, previewEntry, resolveShowcaseEntry)
            : null
          Object.assign(data, applyPreviewPayloadToTwigData(data, previewPayload, resolvedComposableData))
        }
        urlObj.searchParams.forEach((val, key) => {
          if (key === PREVIEW_PAYLOAD_QUERY_KEY) return
          if (key === '_layout') return  // param interne, ne pas passer à Twig
          if (val === 'true') data[key] = true
          else if (val === 'false') data[key] = false
          else if (val !== '' && !isNaN(val)) data[key] = Number(val)
          else data[key] = val
        })

        try {
          let html = await renderTwig(path.join(ROOT, twigRelPath), data)
          // Fragments (composants) : envelopper dans un document complet avec les styles dev
          if (!html.includes('<html')) {
            const layout = urlObj.searchParams.get('_layout') || 'centered'
            html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${config.styleEntry || '/dev/assets/scss/style.scss'}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background-color: #f1f5f9;
    }
    body.gf-layout--centered {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 3rem 2rem;
    }
    body.gf-layout--full {
      padding: 1rem 0;
    }
    body.gf-layout--full > * {
      width: 100%;
    }
    body.gf-layout--card {
      min-height: 0;
      padding: 1.25rem;
      background-color: #ffffff;
      overflow: hidden;
    }
    body.gf-layout--card > * {
      width: 100%;
    }
  </style>
</head>
<body class="gf-layout--${layout}">
${html}
</body>
</html>`
          }
          // Injection du client HMR Vite
          html = html.includes('</head>')
            ? html.replace('</head>', '  <script type="module" src="/@vite/client"></script>\n</head>')
            : '<script type="module" src="/@vite/client"></script>\n' + html
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.statusCode = 200
          res.end(html)
        } catch (e) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.statusCode = 500
          res.end(`<!DOCTYPE html><html><head><meta name="gf-status" content="error"></head><body><pre style="color:red">Twig Error in ${twigRelPath}:\n${e.message}</pre></body></html>`)
        }
      })
    },

    // ─── HMR : update sur tout changement Twig ou JSON ─────────────────────
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.twig') || (file.endsWith('.json') && !file.includes('node_modules'))) {
        server.ws.send({ type: 'custom', event: 'gofast:update' })
        return []
      }
    }
  }
}

const plugins = [goFastPlugin()]

if (config.tailwind) {
  plugins.push(tailwindcss())
}

export default defineConfig({
  plugins,
  server: {
    port: 3000,
    open: '/',
    watch: {
      // Exclure les fichiers générés du watcher pour éviter les boucles
      ignored: (file) => file.includes('node_modules') || file.includes('dev/assets/icons/sprite.svg') || file.includes('dev/assets/icons/doc.html')
    }
  },
  build: {
    outDir: 'public',
    emptyOutDir: true
  }
})
