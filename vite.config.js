import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { defineConfig } from 'vite'
import Twig from 'twig'
import tailwindcss from '@tailwindcss/vite'
import { normalizeAgentRunPayload, normalizeBrainOutput } from './design/src/core/brain-contract.js'
import { listAgentProviders } from './design/src/core/agent-providers.js'

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

function extractJsonFromText(text) {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]) } catch {}
  }
  const raw = text.match(/\{[\s\S]*\}/)
  if (raw) {
    try { return JSON.parse(raw[0]) } catch {}
  }
  return {}
}

async function getClaudeCodeProviderState() {
  const base = getProviderBase('claude-code')
  try {
    const result = await spawnCommand('npx', ['--yes', '@anthropic-ai/claude-code', '--version'], { timeoutMs: 15000 })
    const available = result.code === 0 || /Claude Code/i.test(result.stdout + result.stderr)
    return {
      ...base,
      available,
      connected: available,
      authRequired: false,
      reason: available ? '' : 'Claude Code CLI not available via npx'
    }
  } catch {
    return { ...base, available: false, connected: false, authRequired: false, reason: 'Claude Code CLI not found' }
  }
}

async function runClaudeCodeProvider(payload) {
  const provider = await getClaudeCodeProviderState()
  if (!provider.available) throw new Error(provider.reason || 'Claude Code CLI is unavailable')

  const prompt = payload.prompt || payload.intent || ''
  const result = await spawnCommand('npx', [
    '@anthropic-ai/claude-code',
    '-p',
    '--output-format', 'json',
    '--model', 'haiku',
    '--no-session-persistence',
    '--dangerously-skip-permissions',
    '--bare'
  ], { cwd: ROOT, input: prompt, timeoutMs: 90000 })

  if (result.code !== 0 && !result.stdout.includes('"type":"result"')) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Claude Code CLI failed')
  }

  const outer = JSON.parse(result.stdout.trim())
  if (outer.is_error) throw new Error(String(outer.result || 'Claude Code returned an error'))

  const text = typeof outer.result === 'string' ? outer.result : ''
  return {
    provider: { ...provider, connected: true, reason: '' },
    output: normalizeBrainOutput(extractJsonFromText(text))
  }
}

async function getRuntimeProviders() {
  const defaults = listAgentProviders()
  const providers = await Promise.all(defaults.map(async provider => {
    if (provider.id === 'codex-cli') return getCodexProviderState()
    if (provider.id === 'claude-code') return getClaudeCodeProviderState()
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

      server.middlewares.use('/__design_api/tokens', (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const tokensPath = path.join(ROOT, 'dev', 'assets', 'scss', 'base', '_variables.scss')
          const source = fs.readFileSync(tokensPath, 'utf8')
          const tokens = source
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('$') && line.includes(':'))
            .map(line => {
              const match = line.match(/^\$([a-zA-Z0-9-]+)\s*:\s*(.+);$/)
              if (!match) return null
              const [, name, value] = match
              const inferCategory = n => {
                if (n.startsWith('color-')) return 'color'
                if (n.startsWith('font-size-')) return 'font-size'
                if (n.startsWith('font-weight-')) return 'font-weight'
                if (n.startsWith('line-height-')) return 'line-height'
                if (n.startsWith('font-family-')) return 'font-family'
                if (n.startsWith('spacing-')) return 'spacing'
                if (n.startsWith('radius-')) return 'radius'
                if (n.startsWith('shadow-')) return 'shadow'
                if (n.startsWith('transition-')) return 'transition'
                if (n.startsWith('breakpoint-')) return 'breakpoint'
                if (n.startsWith('z-')) return 'z-index'
                return 'other'
              }
              return { id: name, scssVar: `$${name}`, value: value.trim(), category: inferCategory(name) }
            })
            .filter(Boolean)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, tokens }))
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: error.message }))
        }
      })

      server.middlewares.use('/__design_api/scaffold', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { name, level, category, description } = JSON.parse(body || '{}')
            if (!name || !level) throw new Error('name et level sont requis')

            const kebab = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            if (!kebab) throw new Error('Nom invalide')

            const isPage = level === 'page'
            const compDir = isPage
              ? path.join(ROOT, 'dev', 'pages')
              : path.join(ROOT, 'dev', 'components', kebab)
            const scssDir = path.join(ROOT, 'dev', 'assets', 'scss', 'components')
            const styleEntry = path.join(ROOT, 'dev', 'assets', 'scss', 'style.scss')

            if (!isPage && fs.existsSync(compDir)) throw new Error(`Le composant "${kebab}" existe déjà`)

            const displayName = kebab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            const cat = category || 'Layout'
            const desc = description || `Composant ${displayName}`

            if (!isPage) {
              fs.mkdirSync(compDir, { recursive: true })

              // JSON metadata
              const jsonContent = JSON.stringify({
                name: displayName,
                level,
                category: cat,
                description: desc,
                variants: {},
                content: { text: { label: 'Texte', type: 'text', default: displayName } }
              }, null, 2)
              fs.writeFileSync(path.join(compDir, `${kebab}.json`), jsonContent, 'utf8')

              // Twig template
              const twigContent = `{% set text = text|default('${displayName}') %}\n\n<div class="${kebab}">\n  {{ text }}\n</div>\n`
              fs.writeFileSync(path.join(compDir, `${kebab}.twig`), twigContent, 'utf8')

              // SCSS (si activé)
              if (config.scss) {
                fs.mkdirSync(scssDir, { recursive: true })
                const scssContent = `@use '../base/variables' as *;\n@use '../base/mixins' as *;\n\n.${kebab} {\n}\n`
                fs.writeFileSync(path.join(scssDir, `_${kebab}.scss`), scssContent, 'utf8')

                if (fs.existsSync(styleEntry)) {
                  const styleContent = fs.readFileSync(styleEntry, 'utf8')
                  if (!styleContent.includes(`components/${kebab}`)) {
                    fs.appendFileSync(styleEntry, `@use 'components/${kebab}';\n`, 'utf8')
                  }
                }
              }
            } else {
              // Page : fichier twig dans dev/pages/
              fs.mkdirSync(compDir, { recursive: true })
              const twigContent = `{% extends 'dev/layouts/base.twig' %}\n\n{% block content %}\n<main class="${kebab}-page">\n  <h1>${displayName}</h1>\n</main>\n{% endblock %}\n`
              fs.writeFileSync(path.join(compDir, `${kebab}.twig`), twigContent, 'utf8')
            }

            // Régénère showcase.json
            const { generateShowcase } = await import('./scripts/generate-showcase.js')
            await generateShowcase()

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, name: displayName, level, category: cat, kebab }))
          } catch (error) {
            res.statusCode = 400
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

            if (provider.id === 'claude-code') {
              const result = await runClaudeCodeProvider(payload)
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
        urlObj.searchParams.forEach((val, key) => {
          if (key === '_layout') return  // param interne, ne pas passer à Twig
          if (val === 'true') data[key] = true
          else if (val === 'false') data[key] = false
          else if (val !== '' && !isNaN(val)) data[key] = Number(val)
          else if (val.startsWith('[') || val.startsWith('{')) {
            try { data[key] = JSON.parse(val) } catch { data[key] = val }
          }
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
