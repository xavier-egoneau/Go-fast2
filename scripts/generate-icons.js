// =============================================================================
// generate-icons.js — Génère sprite.svg + doc.html depuis dev/assets/icons/unitaires/
// Déclenché au démarrage du dev server et à chaque ajout/modification de SVG
// =============================================================================

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const ICONS_DIR  = path.join(ROOT, 'dev/assets/icons/unitaires')
const SPRITE_OUT = path.join(ROOT, 'dev/assets/icons/sprite.svg')
const DOC_OUT    = path.join(ROOT, 'dev/assets/icons/doc.html')

export function generateIcons() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true })
    console.log('[icons] Dossier unitaires/ créé')
    return
  }

  const files = fs.readdirSync(ICONS_DIR)
    .filter(f => f.endsWith('.svg'))
    .sort()

  if (files.length === 0) {
    console.log('[icons] Aucun SVG dans unitaires/')
    return
  }

  const icons = files.map(file => {
    const name    = path.basename(file, '.svg')
    const content = fs.readFileSync(path.join(ICONS_DIR, file), 'utf8')

    // Extraire le viewBox
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/)
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24'

    // Extraire le contenu interne (entre <svg...> et </svg>)
    const innerMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)
    const inner = innerMatch ? innerMatch[1].trim() : ''

    return { name, viewBox, inner }
  })

  // ─── Génère sprite.svg ─────────────────────────────────────────────────────
  const symbols = icons.map(({ name, viewBox, inner }) =>
    `  <symbol id="icon-${name}" viewBox="${viewBox}">\n    ${inner}\n  </symbol>`
  )

  const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none;">',
    symbols.join('\n'),
    '</svg>'
  ].join('\n')

  fs.writeFileSync(SPRITE_OUT, sprite, 'utf8')

  // ─── Génère doc.html ───────────────────────────────────────────────────────
  const iconCards = icons.map(({ name, viewBox, inner }) => `
    <div class="icon-card" onclick="copyIconCode('icon-${name}')">
      <div class="icon-container">
        <svg class="icon-preview" viewBox="${viewBox}" aria-hidden="true">
          ${inner}
        </svg>
      </div>
      <div class="icon-name">${name}</div>
      <code class="icon-id">icon-${name}</code>
    </div>`
  ).join('')

  const doc = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Icônes — Go-fast Design System</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; background: #f7fafc; color: #1a202c; }
    .header { max-width: 1200px; margin: 0 auto 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .subtitle { color: #718096; margin-bottom: 1.5rem; }
    .stats { display: flex; gap: 1rem; }
    .stat { background: white; padding: 0.75rem 1.25rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 0.8rem; color: #718096; margin-top: 0.2rem; }
    .usage { max-width: 1200px; margin: 0 auto 2rem; background: white; padding: 1.5rem; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .usage h2 { font-size: 1.125rem; margin-bottom: 0.75rem; }
    .usage-code { background: #1a202c; color: #e2e8f0; padding: 1.25rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.8rem; line-height: 1.7; overflow-x: auto; white-space: pre; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; max-width: 1200px; margin: 0 auto; }
    .icon-card { background: white; padding: 1.5rem 1rem; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); text-align: center; cursor: pointer; transition: transform .15s, box-shadow .15s; }
    .icon-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
    .icon-card:focus-visible { outline: 2px solid #667eea; outline-offset: 2px; }
    .icon-container { width: 48px; height: 48px; margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center; }
    .icon-preview { width: 32px; height: 32px; color: #667eea; fill: currentColor; }
    .icon-name { font-weight: 600; font-size: 0.8rem; margin-bottom: 0.4rem; word-break: break-word; }
    .icon-id { font-family: monospace; font-size: 0.7rem; color: #a0aec0; background: #f7fafc; padding: 0.15rem 0.4rem; border-radius: 0.25rem; }
    .toast { position: fixed; top: 1.5rem; right: 1.5rem; background: #48bb78; color: white; padding: 0.75rem 1.25rem; border-radius: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,.15); opacity: 0; transform: translateY(-8px); transition: all .25s; pointer-events: none; font-size: 0.875rem; }
    .toast.show { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>
  <div class="header">
    <h1>Icônes — Design System</h1>
    <p class="subtitle">Sprite SVG auto-généré depuis <code>dev/assets/icons/unitaires/</code></p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${icons.length}</div>
        <div class="stat-label">Icônes</div>
      </div>
      <div class="stat">
        <div class="stat-value">SVG</div>
        <div class="stat-label">Format sprite</div>
      </div>
    </div>
  </div>

  <div class="usage">
    <h2>Utilisation dans un composant Twig</h2>
    <pre class="usage-code">{% include 'dev/components/icon/icon.twig' with {
  name: 'search',       {# nom du fichier sans extension #}
  size: 'md',          {# xs / sm / md / lg / xl #}
  label: 'Rechercher'  {# vide = décoratif (aria-hidden) #}
} %}</pre>
  </div>

  <div class="grid">${iconCards}
  </div>

  <div class="toast" id="toast">Code copié !</div>

  <script>
    function copyIconCode(iconId) {
      const code = \`{% include 'dev/components/icon/icon.twig' with { name: '\${iconId.replace('icon-', '')}' } %}\`;
      navigator.clipboard.writeText(code).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      });
    }
  </script>
</body>
</html>`

  fs.writeFileSync(DOC_OUT, doc, 'utf8')

  console.log(`[icons] ${icons.length} icônes → sprite.svg + doc.html`)
}

// Exécution directe : node scripts/generate-icons.js
if (process.argv[1] && process.argv[1].endsWith('generate-icons.js')) {
  generateIcons()
}
