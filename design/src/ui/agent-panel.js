import { getAgentState } from '../state/agent-store.js'
import { listAgentProviders } from '../core/agent-runtime.js'

export function renderAgentPanel() {
  const agent = getAgentState()
  if (!agent.open) return ''

  const providers = listAgentProviders()
  const selectedProvider = providers.find(provider => provider.id === agent.providerId) || providers[0]

  return `
    <aside class="ds-panel" style="border-left:1px solid var(--ds-line);">
      <div class="ds-panel__header">
        <h2 class="ds-panel__title">Agent Panel</h2>
        <p class="ds-panel__subtitle">Bridge runtime MVP pour le brain contract</p>
      </div>
      <div class="ds-panel__body">
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Provider</h3>
          <label class="ds-field">
            <span class="ds-field__label">Runtime</span>
            <select class="ds-field__select" data-agent-action="provider">
              ${providers.map(provider => `<option value="${provider.id}"${provider.id === selectedProvider.id ? ' selected' : ''}>${provider.label}</option>`).join('')}
            </select>
          </label>
          <p class="ds-muted">${selectedProvider.description}${selectedProvider.available === false ? ` — ${selectedProvider.reason}` : ''}</p>
        </div>
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Intent</h3>
          <textarea class="ds-field__input" rows="4" data-agent-action="input">${agent.input}</textarea>
        </div>
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Prompt preview</h3>
          <textarea class="ds-field__input ds-field__input--mono" rows="10" data-agent-action="prompt-preview" readonly>${agent.promptPreview || ''}</textarea>
        </div>
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">Normalized output</h3>
          <p class="ds-muted">Contrat attendu : <code>{ "summary": string, "actions": [], "warnings": [], "requiresNewComponent": boolean, "unresolved": [] }</code></p>
          <textarea class="ds-field__input ds-field__input--mono" rows="16" data-agent-action="json">${agent.actionJson}</textarea>
        </div>
        <div class="ds-inspector-group">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="ds-btn" data-agent-action="fill-context">Insert context</button>
            <button class="ds-btn" data-agent-action="fill-template">Insert template</button>
            <button class="ds-btn" data-agent-action="refresh-prompt">Refresh prompt</button>
            <button class="ds-btn" data-agent-action="run">Run provider</button>
            <button class="ds-btn" data-agent-action="validate">Validate</button>
            <button class="ds-btn" data-agent-action="preview">Preview</button>
            <button class="ds-btn" data-agent-action="apply">Apply</button>
            <button class="ds-btn ds-btn--danger" data-agent-action="clear-preview">Clear preview</button>
          </div>
        </div>
        ${agent.runtimeError ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Runtime error</h3><div class="ds-diff-change">${agent.runtimeError}</div></div>` : ''}
        ${agent.lastSummary ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Summary</h3><p class="ds-muted">${agent.lastSummary}</p></div>` : ''}
        ${agent.lastWarnings?.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Warnings</h3>${agent.lastWarnings.map(warning => `<div class="ds-diff-change">${warning}</div>`).join('')}</div>` : ''}
        ${agent.requiresNewComponent ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Escalation</h3><div class="ds-diff-change">New component work is required for this request.</div></div>` : ''}
        ${agent.unresolved?.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Unresolved</h3>${agent.unresolved.map(item => `<div class="ds-diff-change"><strong>${item.type}</strong> — ${item.message}</div>`).join('')}</div>` : ''}
        ${agent.validationErrors.length ? `<div class="ds-inspector-group"><h3 class="ds-inspector-group__title">Validation errors</h3>${agent.validationErrors.map(error => `<div class="ds-diff-change">${error}</div>`).join('')}</div>` : ''}
      </div>
    </aside>
  `
}
