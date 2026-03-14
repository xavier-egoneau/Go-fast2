import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vite'
import Twig from 'twig'
import tailwindcss from '@tailwindcss/vite'

const ROOT = process.cwd()
const config = JSON.parse(fs.readFileSync('./gofast.config.json', 'utf8'))

// Override le loader fs de Twig : tous les chemins relatifs sont résolus depuis ROOT
// Cela corrige les includes imbriqués (molecule → atom) qui sinon résolvent depuis le dossier du fichier parent
Twig.extend(function (T) {
  const origLoader = T.Templates.loaders['fs']
  T.Templates.loaders['fs'] = function (location, params, callback, errorCallback) {
    if (!path.isAbsolute(location)) {
      location = path.join(ROOT, location)
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
  return {
    name: 'gofast',

    // ─── Dev : middleware pre-Vite ──────────────────────────────────────────
    configureServer(server) {
      // Génère showcase.json au démarrage
      import('./scripts/generate-showcase.js').then(({ generateShowcase }) => generateShowcase())

      // Watch : regénère showcase.json si un composant change
      server.watcher.on('change', async (file) => {
        if (
          (file.includes('dev/components') && file.endsWith('.json')) ||
          (file.includes('dev/pages') && (file.endsWith('.json') || file.endsWith('.twig')))
        ) {
          const { generateShowcase } = await import('./scripts/generate-showcase.js')
          await generateShowcase()
          server.ws.send({ type: 'full-reload' })
        }
      })
      server.watcher.on('add', async (file) => {
        if (file.includes('dev/components') || file.includes('dev/pages')) {
          const { generateShowcase } = await import('./scripts/generate-showcase.js')
          await generateShowcase()
          server.ws.send({ type: 'full-reload' })
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
          if (val === 'true') data[key] = true
          else if (val === 'false') data[key] = false
          else if (val !== '' && !isNaN(val)) data[key] = Number(val)
          else data[key] = val
        })

        try {
          let html = await renderTwig(path.join(ROOT, twigRelPath), data)
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
          res.end(`<!DOCTYPE html><html><body><pre style="color:red">Twig Error in ${twigRelPath}:\n${e.message}</pre></body></html>`)
        }
      })
    },

    // ─── HMR : reload sur tout changement Twig ou JSON ─────────────────────
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.twig') || (file.endsWith('.json') && !file.includes('node_modules'))) {
        server.ws.send({ type: 'full-reload' })
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
  build: {
    outDir: 'public',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: '/'
  }
})
