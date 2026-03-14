/**
 * quality.js — Tests accessibilité avec axe-core
 * Déclenché sur la page composant isolé via le bouton ♿
 * Exécute axe dans le document de l'iframe pour une analyse fidèle au rendu réel
 */

async function injectAxeInFrame(frame) {
  const iframeWin = frame.contentWindow
  if (iframeWin?.axe) return // déjà injecté

  return new Promise((resolve, reject) => {
    const doc = frame.contentDocument
    if (!doc) return reject(new Error('iframe inaccessible'))
    const script = doc.createElement('script')
    script.src = '/node_modules/axe-core/axe.min.js'
    script.onload = resolve
    script.onerror = () => reject(new Error('Impossible de charger axe-core'))
    doc.head.appendChild(script)
  })
}

async function runA11yTest() {
  const panel = document.getElementById('gf-a11y-panel')
  const frame = document.getElementById('gf-preview-frame')

  if (!panel || !frame) return

  // Toggle visibilité du panneau
  if (!panel.hidden) {
    panel.hidden = true
    return
  }

  panel.hidden = false
  panel.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem">Analyse en cours...</p>'

  try {
    await injectAxeInFrame(frame)

    const iframeWin = frame.contentWindow
    const iframeDoc = frame.contentDocument

    const results = await iframeWin.axe.run(iframeDoc.body, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa']
      }
    })

    renderA11yResults(panel, results)
  } catch (e) {
    panel.innerHTML = `<p style="color:#f87171;font-size:0.8rem">Erreur axe-core : ${e.message}</p>`
    console.error('[go-fast quality]', e)
  }
}

function renderA11yResults(panel, results) {
  const violations = results.violations || []
  const passes = results.passes || []
  const incomplete = results.incomplete || []

  if (violations.length === 0) {
    panel.innerHTML = `
      <div style="color:#34d399;font-weight:600;margin-bottom:0.5rem">
        ✓ Aucune violation détectée (${passes.length} règle${passes.length > 1 ? 's' : ''} passée${passes.length > 1 ? 's' : ''})
      </div>
      ${incomplete.length > 0 ? `<p style="color:#fbbf24;font-size:0.75rem">${incomplete.length} règle(s) à vérifier manuellement</p>` : ''}
    `
    return
  }

  panel.innerHTML = `
    <div style="color:#f87171;font-weight:600;margin-bottom:0.75rem">
      ✗ ${violations.length} violation${violations.length > 1 ? 's' : ''} détectée${violations.length > 1 ? 's' : ''}
    </div>
    <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.5rem">
      ${violations.map(v => `
        <li style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:4px;padding:0.5rem 0.75rem">
          <strong style="color:#fca5a5;font-size:0.8rem">${v.id}</strong>
          <span style="color:#94a3b8;font-size:0.75rem;margin-left:0.5rem">[${v.impact}]</span>
          <p style="margin:0.2rem 0 0;color:#e2e8f0;font-size:0.75rem">${v.description}</p>
          ${v.helpUrl ? `<a href="${v.helpUrl}" target="_blank" rel="noopener" style="font-size:0.7rem;color:#60a5fa">En savoir plus ↗</a>` : ''}
        </li>
      `).join('')}
    </ul>
    ${passes.length > 0 ? `<p style="color:#94a3b8;font-size:0.7rem;margin-top:0.5rem">${passes.length} règle(s) passée(s) avec succès</p>` : ''}
  `
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('gf-toggle-a11y')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', runA11yTest)
  }
})
