import { getCssEditorState, getCssPropertyCategory, ALL_CSS_PROPERTIES } from '../core/css-editor-state.js'
import { getTokens } from '../core/tokens.js'

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function renderTokenSelect(prop, currentValue, inputId) {
  const category = getCssPropertyCategory(prop)
  const tokens = getTokens().filter(t => {
    if (category === 'color') return t.category === 'color'
    if (category === 'spacing') return t.category === 'spacing'
    if (category === 'radius') return t.category === 'radius'
    if (category === 'font-size') return t.category === 'font-size'
    if (category === 'font-weight') return t.category === 'font-weight'
    if (category === 'font-family') return t.category === 'font-family'
    if (category === 'line-height') return t.category === 'line-height'
    if (category === 'transition') return t.category === 'transition'
    return false
  })

  if (tokens.length === 0) {
    return `<input id="${esc(inputId)}" class="ds-field__input ds-css-editor__value-input" type="text" data-action="css-editor-prop-change" data-prop="${esc(prop)}" value="${esc(currentValue)}">`
  }

  const options = tokens.map(t =>
    `<option value="${esc(t.scssVar)}"${currentValue === t.scssVar ? ' selected' : ''}>${esc(t.scssVar)} — ${esc(t.value)}</option>`
  ).join('')

  const hasRaw = currentValue && !tokens.find(t => t.scssVar === currentValue)

  return `
    <select id="${esc(inputId)}" class="ds-field__select ds-css-editor__value-select" data-action="css-editor-prop-change" data-prop="${esc(prop)}">
      ${hasRaw ? `<option value="${esc(currentValue)}" selected>${esc(currentValue)}</option>` : '<option value="">— choisir un token —</option>'}
      ${options}
    </select>
  `
}

function renderPropertyRow(prop, value, isPending) {
  const inputId = `css-editor-${prop.replace(/[^a-z0-9]/g, '-')}`
  return `
    <div class="ds-css-editor__prop-row${isPending ? ' ds-css-editor__prop-row--changed' : ''}">
      <label class="ds-field ds-css-editor__prop-field">
        <span class="ds-field__label ds-css-editor__prop-name">${esc(prop)}</span>
        ${renderTokenSelect(prop, value, inputId)}
      </label>
    </div>
  `
}

function renderAddPropSection(addingProp) {
  if (!addingProp) {
    return `<button class="ds-btn ds-btn--sm ds-css-editor__add-btn" data-action="css-editor-toggle-add">+ Ajouter une propriété</button>`
  }

  const options = ALL_CSS_PROPERTIES.map(p =>
    `<option value="${esc(p)}">${esc(p)}</option>`
  ).join('')

  return `
    <div class="ds-css-editor__add-form">
      <select class="ds-field__select" id="css-editor-new-prop" data-css-editor="new-prop">
        <option value="">— choisir —</option>
        ${options}
      </select>
      <button class="ds-btn ds-btn--sm ds-btn--primary" data-action="css-editor-add-prop">Ajouter</button>
      <button class="ds-btn ds-btn--sm" data-action="css-editor-toggle-add">Annuler</button>
    </div>
  `
}

export function renderCssEditorPanel(entryName, entryLevel) {
  const { selectedSelector, breadcrumb, bemMap, pendingChanges, addingProp, variantMode, variantName, loading, error } = getCssEditorState()

  const header = `
    <div class="ds-panel__header">
      <div class="ds-panel__header-top">
        <h2 class="ds-panel__title">CSS Editor</h2>
        <button class="ds-btn ds-btn--sm" data-action="css-editor-close">Fermer</button>
      </div>
      <p class="ds-panel__subtitle">${esc(entryName)} · ${esc(entryLevel)}</p>
    </div>
  `

  if (loading) {
    return `<aside class="ds-panel">${header}<div class="ds-panel__body"><p class="ds-muted">Chargement du SCSS…</p></div></aside>`
  }

  if (error) {
    return `<aside class="ds-panel">${header}<div class="ds-panel__body"><p class="ds-muted ds-muted--error">${esc(error)}</p></div></aside>`
  }

  const breadcrumbHtml = breadcrumb.length
    ? `<div class="ds-css-editor__breadcrumb">${breadcrumb.map((seg, i) =>
        `<button class="ds-css-editor__breadcrumb-seg${i === breadcrumb.length - 1 ? ' ds-css-editor__breadcrumb-seg--active' : ''}" data-action="css-editor-breadcrumb" data-selector="${esc(seg)}">${esc(seg)}</button>`
      ).join('<span class="ds-css-editor__breadcrumb-sep">›</span>')}</div>`
    : ''

  if (!selectedSelector) {
    return `
      <aside class="ds-panel">
        ${header}
        <div class="ds-panel__body">
          ${breadcrumbHtml}
          <p class="ds-muted ds-css-editor__hint">Clique sur un élément dans la preview pour inspecter ses propriétés CSS.</p>
        </div>
      </aside>
    `
  }

  const baseProps = bemMap[selectedSelector] || {}
  const mergedProps = { ...baseProps, ...pendingChanges }
  const hasPending = Object.keys(pendingChanges).length > 0

  const propsHtml = Object.entries(mergedProps).map(([prop, value]) => {
    const isPending = prop in pendingChanges
    return renderPropertyRow(prop, isPending ? pendingChanges[prop] : value, isPending)
  }).join('')

  const variantForm = variantMode
    ? `
      <div class="ds-css-editor__variant-form">
        <label class="ds-field">
          <span class="ds-field__label">Nom de la variante</span>
          <input class="ds-field__input" type="text" placeholder="ex: compact" data-css-editor="variant-name" value="${esc(variantName)}">
        </label>
        <div class="ds-css-editor__variant-actions">
          <button class="ds-btn ds-btn--primary ds-btn--sm" data-action="css-editor-variant-confirm">Créer &amp; Sauvegarder</button>
          <button class="ds-btn ds-btn--sm" data-action="css-editor-variant-cancel">Annuler</button>
        </div>
      </div>
    `
    : ''

  return `
    <aside class="ds-panel">
      ${header}
      <div class="ds-panel__body">
        ${breadcrumbHtml}
        <div class="ds-inspector-group">
          <h3 class="ds-inspector-group__title">.${esc(selectedSelector)}</h3>
          ${propsHtml || '<p class="ds-muted">Aucune propriété déclarée.</p>'}
          ${renderAddPropSection(addingProp)}
        </div>
        ${hasPending && !variantMode ? `
          <div class="ds-css-editor__footer">
            <button class="ds-btn ds-btn--primary" data-action="css-editor-apply">Appliquer au composant</button>
            <button class="ds-btn" data-action="css-editor-variant-start">Créer une variante</button>
          </div>
        ` : ''}
        ${variantForm}
      </div>
    </aside>
  `
}
