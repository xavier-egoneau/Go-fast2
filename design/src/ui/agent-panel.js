import { getAgentState } from '../state/agent-store.js'

export function renderAgentPanel({ selectionHint = '' } = {}) {
  const agent = getAgentState()
  if (!agent.open) return ''
  const activeHint = selectionHint || agent.selectionHint || 'Sans sélection, la demande s’applique à la scène.'

  return `
    <aside class="ds-panel" style="border-left:1px solid var(--ds-line);">
      <div class="ds-panel__header">
        <h2 class="ds-panel__title">Demande</h2>
        <p class="ds-panel__subtitle">Décris ce que tu veux changer. Le contexte du canvas est ajouté automatiquement.</p>
      </div>
      <div class="ds-panel__body">
        <div class="ds-inspector-group">
          <div class="ds-callout">
            <div class="ds-callout__title">Contexte actif</div>
            <div class="ds-callout__text">${activeHint}</div>
          </div>
          <label class="ds-field">
            <span class="ds-field__label">Demande libre</span>
            <textarea class="ds-field__input" rows="6" data-agent-action="input" placeholder="Exemple : rends ce header plus premium, ou crée une variante de page plus éditoriale.">${agent.input}</textarea>
          </label>
          <button class="ds-btn ds-btn--primary" data-agent-action="submit-request">Générer une proposition</button>
          <p class="ds-muted">Le moteur utilise automatiquement la sélection courante et les composants du système. La demande génère d'abord une proposition prévisualisable avant application.</p>
        </div>
        ${agent.runtimeError ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Erreur</h3><div class="ds-diff-change">${agent.runtimeError}</div></div>` : ''}
        ${agent.lastSummary ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Résumé</h3><p class="ds-muted">${agent.lastSummary}</p></div>` : ''}
        ${agent.requiresNewComponent ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Limite</h3><div class="ds-diff-change">Cette demande demande probablement d’étendre le système existant.</div></div>` : ''}
      </div>
    </aside>
  `
}
