import { getAgentState } from '../state/agent-store.js'

export function renderAgentPanel() {
  const agent = getAgentState()
  if (!agent.open) return ''

  return `
    <aside class="ds-panel" style="border-left:1px solid var(--ds-line);">
      <div class="ds-panel__header">
        <h2 class="ds-panel__title">Agent Panel</h2>
        <p class="ds-panel__subtitle">MVP manuel pour actions structurées</p>
      </div>
      <div class="ds-panel__body">
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Prompt / intention</h3>
          <textarea class="ds-field__input" rows="4" data-agent-action="input">${agent.input}</textarea>
        </div>
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Action JSON</h3>
          <textarea class="ds-field__input" rows="16" data-agent-action="json">${agent.actionJson}</textarea>
        </div>
        <div class="ds-inspector-group">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="ds-btn" data-agent-action="validate">Validate</button>
            <button class="ds-btn" data-agent-action="preview">Preview</button>
            <button class="ds-btn" data-agent-action="apply">Apply</button>
            <button class="ds-btn ds-btn--danger" data-agent-action="clear-preview">Clear preview</button>
          </div>
        </div>
        ${agent.lastSummary ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Summary</h3><p class="ds-muted">${agent.lastSummary}</p></div>` : ''}
        ${agent.validationErrors.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Validation errors</h3>${agent.validationErrors.map(error => `<div class="ds-diff-change">${error}</div>`).join('')}</div>` : ''}
      </div>
    </aside>
  `
}
