# Figma Integration — Go-fast v2

Guide complet pour connecter Figma à Claude Code via le MCP officiel Figma, et générer des composants Go-fast directement depuis des frames Figma annotées "Ready for dev".

> **Statut : beta** — Le MCP Figma est fonctionnel mais l'extraction automatique de tokens peut nécessiter des ajustements selon l'organisation du fichier Figma.

---

## Prérequis

- **Claude Code** installé et configuré
- **Compte Figma** avec accès au fichier source
- **Clé API Figma** (Personal Access Token)
- Les frames Figma doivent être **annotées "Ready for dev"** (mode Dev Mode de Figma)

---

## Étape 1 — Obtenir une clé API Figma

1. Aller sur **Figma > Paramètres du compte** (`https://www.figma.com/settings`)
2. Rubrique **Personal access tokens** → cliquer **Generate new token**
3. Donner un nom explicite : `go-fast-mcp`
4. Sélectionner les permissions : `Read-only` sur les fichiers suffit
5. Copier la clé générée (elle n'est affichée qu'une seule fois)

---

## Étape 2 — Configurer la clé API via `.env`

Le `.mcp.json` est versionné et utilise la variable d'environnement `${FIGMA_API_KEY}` — la clé réelle ne doit jamais être commitée.

**1. Copier `.env.example` en `.env` :**

```bash
cp .env.example .env
```

**2. Renseigner la clé dans `.env` :**

```
# Figma MCP - requis pour /gofast-from-figma
FIGMA_API_KEY=your_figma_api_key_here
```

> **`.env` est dans `.gitignore`** — il reste local à votre machine.

**`.mcp.json` (déjà configuré, versionné) :**

```json
{
  "mcpServers": {
    "orbit": { ... },
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp",
      "headers": {
        "X-Figma-Token": "${FIGMA_API_KEY}"
      }
    }
  }
}
```

Claude Code résout automatiquement `${FIGMA_API_KEY}` depuis l'environnement au démarrage.

---

## Étape 3 — Relancer Claude Code

Après modification de `.mcp.json`, relancer Claude Code pour que le serveur MCP soit chargé.

Vérifier la connexion : le MCP Figma doit apparaître dans la liste des outils disponibles.

---

## Workflow designer → développeur

### Côté designer (Figma)

1. **Utiliser les tokens du design system** — nommer les styles selon la convention `docs/figma-tokens-convention.md`
   - Couleurs : `color/primary/base`, `color/gray/500`, etc.
   - Espacements : `spacing/md`, `spacing/lg`, etc.
   - Typographie : `font-size/base`, `font-weight/semibold`, etc.

2. **Annoter les frames** avec le niveau atomique :
   - Préfixer le nom de la frame : `[atom] Button`, `[molecule] Form Field`
   - Ou utiliser les annotations Dev Mode de Figma

3. **Marquer "Ready for dev"** les frames finalisées

4. **Exporter les tokens** si vous utilisez Tokens Studio :
   - `Tokens Studio > Export > JSON (flat)` → `figma-tokens.json`

### Côté développeur (Claude Code)

1. Copier le lien de la frame Figma (clic droit sur la frame > "Copy link")

2. Lancer la commande :
   ```
   /from-figma
   ```
   Puis coller le lien quand demandé.

3. Claude lit la frame, extrait les tokens, génère les 4 fichiers du composant :
   - `dev/components/[nom]/[nom].json`
   - `dev/components/[nom]/[nom].twig`
   - `dev/components/[nom]/[nom].md`
   - `dev/assets/scss/components/_[nom].scss`

4. L'import SCSS est automatiquement ajouté dans `style.scss`

5. Vérifier dans le showcase : `http://localhost:3000`

---

## Validation des tokens

Après export depuis Figma :

```bash
npm run validate:figma -- --tokens=path/to/figma-tokens.json
```

Le script affiche :
- ✓ Tokens avec correspondance SCSS exacte
- ✗ Tokens Figma sans variable SCSS (à ajouter dans `_variables.scss`)
- ⚠ Variables SCSS sans token Figma (tokens à créer dans Figma)

**Format du fichier JSON attendu :**
```json
{
  "color/primary/base": "#2563eb",
  "color/primary/light": "#60a5fa",
  "spacing/md": "1rem",
  "font-size/base": "1rem"
}
```

Ou format Style Dictionary / Tokens Studio (hiérarchique ou plat).

---

## Limites connues (beta)

| Limite | Contournement |
|--------|---------------|
| Le MCP lit la structure Figma mais ne "voit" pas les rendus visuels | Annoter les frames clairement |
| Les composants Figma complexes nécessitent une révision manuelle | Traiter les composants simples en premier |
| Les tokens non nommés selon la convention ne sont pas mappés | Respecter `docs/figma-tokens-convention.md` |
| Les variantes Figma sont inférées, pas toujours exhaustives | Vérifier et compléter le JSON généré |
| La clé API Figma ne doit pas être commitée | Stocker dans `.env` (voir Étape 2) |

---

## Structure des fichiers liés

```
.mcp.json                              ← Config MCP (versionné, clé via ${FIGMA_API_KEY})
.env.example                           ← Template des variables d'environnement requises
docs/figma-tokens-convention.md        ← Table de correspondance tokens ↔ SCSS
docs/figma-integration.md              ← Ce guide
scripts/validate-figma-tokens.js       ← Script de validation
.claude/commands/gofast-from-figma.md  ← Commande Claude Code
.github/prompts/gofast-from-figma.prompt.md  ← Commande GitHub Copilot
.codex/prompts/gofast-from-figma.md    ← Commande Codex
```

---

## Ressources

- Documentation MCP Figma officielle : `https://help.figma.com/hc/en-us/articles/mcp`
- Tokens Studio (plugin Figma) : `https://tokens.studio`
- Convention tokens Go-fast : `docs/figma-tokens-convention.md`
- Variables SCSS du projet : `dev/assets/scss/base/_variables.scss`
