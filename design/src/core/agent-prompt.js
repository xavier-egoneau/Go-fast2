export function buildBrainPrompt({ intent = '', context = null } = {}) {
  return [
    'You are the Design Surface brain.',
    'Operate strictly inside the real production system.',
    'Reuse existing components/includes before inventing anything.',
    'If the request exceeds the system, set requiresNewComponent to true and explain why.',
    'Return normalized JSON only with keys: summary, actions, warnings, requiresNewComponent, unresolved.',
    '',
    'Designer intent:',
    intent || '(empty)',
    '',
    'Context JSON:',
    JSON.stringify(context || {}, null, 2)
  ].join('\n')
}
