function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function renderWorkshop(workshopState) {
  const { name, level, category, description, activeTab, saveError, saving, previewHtml, agentIntent, agentRunning, agentError } = workshopState

  const tabs = [
    { id: 'agent', label: 'Agent' },
    { id: 'twig', label: 'Twig' },
    { id: 'scss', label: 'SCSS' },
    { id: 'meta', label: 'Params JSON' }
  ]

  const previewSrcdoc = previewHtml ? esc(previewHtml) : ''

  return `
    <div class="ds-workshop">
      <div class="ds-workshop__meta-bar">
        <label class="ds-field ds-field--inline">
          <span class="ds-field__label">Nom</span>
          <input class="ds-field__input" type="text" data-workshop="name" value="${esc(name)}" placeholder="ex: accordion-toggle">
        </label>
        <label class="ds-field ds-field--inline">
          <span class="ds-field__label">Niveau</span>
          <select class="ds-field__select" data-workshop="level">
            ${['atom', 'molecule', 'organism'].map(l => `<option value="${l}"${l === level ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label class="ds-field ds-field--inline">
          <span class="ds-field__label">Catégorie</span>
          <input class="ds-field__input" type="text" data-workshop="category" value="${esc(category)}" placeholder="ex: Forms">
        </label>
        <label class="ds-field ds-field--inline">
          <span class="ds-field__label">Description</span>
          <input class="ds-field__input" type="text" data-workshop="description" value="${esc(description)}">
        </label>
      </div>
      <div class="ds-workshop__body">
        <div class="ds-workshop__left">
          <div class="ds-workshop__tabs">
            ${tabs.map(t => `<button class="ds-workshop__tab${activeTab === t.id ? ' ds-workshop__tab--active' : ''}" data-action="workshop-tab" data-tab="${t.id}">${t.label}</button>`).join('')}
          </div>

          <div class="ds-workshop__editor-pane${activeTab !== 'agent' ? ' ds-workshop__editor-pane--hidden' : ''}" data-workshop-pane="agent">
            <div class="ds-workshop__agent-pane">
              <p class="ds-workshop__agent-hint">Décris le composant à créer. L'agent génère le Twig, le SCSS et les paramètres — tu peux ensuite affiner dans les onglets.</p>
              <textarea
                class="ds-workshop__agent-textarea"
                data-workshop="agentIntent"
                placeholder="Ex: un badge pill avec variantes primary / success / danger, prop text et prop size sm/md"
              >${esc(agentIntent)}</textarea>
              <button class="ds-btn ds-btn--primary ds-workshop__agent-btn" data-action="workshop-agent-run" ${agentRunning ? 'disabled' : ''}>
                ${agentRunning ? '<span class="ds-workshop__spinner"></span> Génération en cours…' : '✦ Générer le composant'}
              </button>
              ${agentError ? `<div class="ds-workshop__error">${esc(agentError)}</div>` : ''}
            </div>
          </div>

          ${['twig', 'scss', 'meta'].map(t => `
            <div class="ds-workshop__editor-pane${activeTab !== t ? ' ds-workshop__editor-pane--hidden' : ''}" data-workshop-pane="${t}">
              <div id="workshop-editor-${t}" class="ds-workshop__codemirror"></div>
            </div>
          `).join('')}
        </div>

        <div class="ds-workshop__right">
          <div class="ds-workshop__preview-bar">
            <span class="ds-workshop__preview-label">Aperçu live</span>
            <button class="ds-btn ds-btn--sm" data-action="workshop-refresh-preview">↺ Actualiser</button>
          </div>
          <iframe id="workshop-preview-frame" class="ds-workshop__preview-frame" srcdoc="${previewSrcdoc}" sandbox="allow-scripts allow-same-origin"></iframe>
          ${saveError ? `<div class="ds-workshop__error">${esc(saveError)}</div>` : ''}
        </div>
      </div>
      <div class="ds-workshop__footer">
        <button class="ds-btn" data-action="workshop-cancel">← Retour au canvas</button>
        <button class="ds-btn ds-btn--primary" data-action="workshop-save" ${saving ? 'disabled' : ''}>${saving ? 'Sauvegarde…' : 'Sauvegarder le composant →'}</button>
      </div>
    </div>
  `
}
