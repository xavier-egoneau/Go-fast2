const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

console.log(`
${GREEN}${BOLD}╔══════════════════════════════════════════╗
║          Go-fast v2 — Installé ✓         ║
╚══════════════════════════════════════════╝${RESET}

${CYAN}Commandes disponibles :${RESET}

  ${BOLD}npm run dev${RESET}      → Lance le serveur de développement
  ${BOLD}npm run build${RESET}    → Build de production
  ${BOLD}npm run reset${RESET}    → Remet dev/ à zéro pour un nouveau projet

${CYAN}Commandes IA (Claude Code) :${RESET}

  ${BOLD}/new${RESET}   → Créer un composant (atom / molecule / organism / template / page)
  ${BOLD}/dev${RESET}   → Démarrer l'implémentation
  ${BOLD}/add${RESET}   → Ajouter un composant à un projet existant

${CYAN}Documentation :${RESET} GUIDELINES_AI.md
`)
