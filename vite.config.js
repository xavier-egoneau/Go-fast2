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

async function getCodexProviderState() {
  const base = getProviderBase('codex-cli')

  try {
    const status = await spawnCommand('codex', ['login', 'status'], { timeoutMs: 10000 })
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
    const message = String(error?.message || error)
    if (/ENOENT/i.test(message)) {
      return {
        ...base,
        available: false,
        connected: false,
        authRequired: false,
        reason: 'Codex CLI not found in PATH'
      }
    }

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

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-codex-'))
  const outputPath = path.join(tempDir, 'last-message.json')

  try {
    const result = await spawnCommand('codex', [
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
    const parsed = JSON.parse(rawOutput)
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
      padding: 2rem 0;
    }
    body.gf-layout--full > * {
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
