#!/usr/bin/env node
/**
 * validate-figma-tokens.js
 *
 * Compare les tokens d'un export Figma avec les variables SCSS de _variables.scss.
 * Affiche les écarts dans les deux sens :
 *   - Tokens Figma sans correspondance SCSS (à ajouter dans _variables.scss)
 *   - Variables SCSS sans token Figma (token manquant dans Figma)
 *
 * Usage :
 *   node scripts/validate-figma-tokens.js --tokens=path/to/figma-tokens.json
 *   npm run validate:figma -- --tokens=path/to/figma-tokens.json
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ─── Couleurs console ──────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

// ─── Règle de transformation : token Figma → nom de variable SCSS ─────────────
// color/primary/base  → color-primary
// color/gray/50       → color-gray-50
// spacing/md          → spacing-md
// font-size/2xl       → font-size-2xl
function figmaTokenToScssName(token) {
  return token
    .split('/')
    .map((part, i) => {
      // Le dernier segment "base" est supprimé (color/primary/base → color-primary)
      if (i === 2 && part === 'base') return null;
      return part;
    })
    .filter(Boolean)
    .join('-');
}

// ─── Extraire les noms de variables depuis _variables.scss ────────────────────
function extractScssVariables(scssPath) {
  const content = readFileSync(scssPath, 'utf8');
  const varNames = new Set();
  // Matcher les lignes : $nom-variable: valeur;
  const regex = /^\$([a-z0-9-]+)\s*:/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    varNames.add(match[1]);
  }
  return varNames;
}

// ─── Charger les tokens Figma depuis un fichier JSON ──────────────────────────
// Supporte deux formats :
//   Format plat simple  : { "color/primary/base": "#2563eb" }
//   Format Style Dictionary : { "color/primary/base": { "value": "#2563eb", "type": "color" } }
function loadFigmaTokens(tokensPath) {
  const raw = JSON.parse(readFileSync(tokensPath, 'utf8'));
  const tokens = new Set();

  function flatten(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}/${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value) && !('value' in value)) {
        flatten(value, path);
      } else {
        tokens.add(path);
      }
    }
  }

  // Détecter si c'est déjà un format plat (clés avec "/") ou hiérarchique
  const firstKey = Object.keys(raw)[0];
  if (firstKey && firstKey.includes('/')) {
    // Format plat : { "color/primary/base": ... }
    for (const key of Object.keys(raw)) {
      tokens.add(key);
    }
  } else {
    // Format hiérarchique : { color: { primary: { base: ... } } }
    flatten(raw);
  }

  return tokens;
}

// ─── Point d'entrée ────────────────────────────────────────────────────────────
function main() {
  // Parser les arguments CLI
  const args = process.argv.slice(2);
  let tokensPath = null;

  for (const arg of args) {
    if (arg.startsWith('--tokens=')) {
      tokensPath = arg.replace('--tokens=', '');
    }
  }

  if (!tokensPath) {
    console.error(`${c.red}Erreur : argument --tokens manquant.${c.reset}`);
    console.error(`Usage : npm run validate:figma -- --tokens=path/to/figma-tokens.json`);
    process.exit(1);
  }

  const absoluteTokensPath = resolve(process.cwd(), tokensPath);
  const scssPath = join(ROOT, 'dev/assets/scss/base/_variables.scss');

  // Vérifications d'existence
  if (!existsSync(absoluteTokensPath)) {
    console.error(`${c.red}Fichier tokens introuvable : ${absoluteTokensPath}${c.reset}`);
    process.exit(1);
  }
  if (!existsSync(scssPath)) {
    console.error(`${c.red}Fichier SCSS introuvable : ${scssPath}${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}${c.cyan}Go-fast v2 — Validation des tokens Figma${c.reset}\n`);
  console.log(`${c.gray}Tokens Figma : ${absoluteTokensPath}${c.reset}`);
  console.log(`${c.gray}Variables SCSS : ${scssPath}${c.reset}\n`);

  // Charger les données
  const figmaTokens = loadFigmaTokens(absoluteTokensPath);
  const scssVars = extractScssVariables(scssPath);

  // Calculer les correspondances
  const matched = [];
  const figmaOnly = [];   // token Figma sans variable SCSS correspondante
  const scssOnly = new Set(scssVars); // variables SCSS sans token Figma

  for (const token of figmaTokens) {
    const scssName = figmaTokenToScssName(token);
    if (scssVars.has(scssName)) {
      matched.push({ token, scssName });
      scssOnly.delete(scssName);
    } else {
      figmaOnly.push({ token, scssName });
    }
  }

  // ─── Rapport ────────────────────────────────────────────────────────────────
  console.log(`${c.bold}Résultats${c.reset}`);
  console.log(`${'─'.repeat(60)}`);

  // Correspondances exactes
  console.log(`\n${c.green}${c.bold}✓ Correspondances (${matched.length})${c.reset}`);
  if (matched.length > 0) {
    for (const { token, scssName } of matched) {
      console.log(`  ${c.green}✓${c.reset}  ${token.padEnd(35)} → ${c.bold}$${scssName}${c.reset}`);
    }
  } else {
    console.log(`  ${c.gray}(aucune)${c.reset}`);
  }

  // Tokens Figma sans variable SCSS
  console.log(`\n${c.red}${c.bold}✗ Tokens Figma sans variable SCSS (${figmaOnly.length})${c.reset}`);
  if (figmaOnly.length > 0) {
    console.log(`  ${c.gray}→ Ces tokens doivent être ajoutés dans dev/assets/scss/base/_variables.scss${c.reset}`);
    for (const { token, scssName } of figmaOnly) {
      console.log(`  ${c.red}✗${c.reset}  ${token.padEnd(35)} → ${c.bold}$${scssName}${c.reset} ${c.gray}(manquant)${c.reset}`);
    }
  } else {
    console.log(`  ${c.gray}(aucun — tous les tokens Figma ont une correspondance SCSS)${c.reset}`);
  }

  // Variables SCSS sans token Figma
  console.log(`\n${c.yellow}${c.bold}⚠ Variables SCSS sans token Figma (${scssOnly.size})${c.reset}`);
  if (scssOnly.size > 0) {
    console.log(`  ${c.gray}→ Ces variables pourraient être ajoutées comme tokens dans Figma${c.reset}`);
    for (const varName of [...scssOnly].sort()) {
      console.log(`  ${c.yellow}⚠${c.reset}  $${varName}`);
    }
  } else {
    console.log(`  ${c.gray}(aucune — toutes les variables SCSS ont un token Figma)${c.reset}`);
  }

  // Résumé
  const total = figmaTokens.size;
  const ok = matched.length;
  const coverage = total > 0 ? Math.round((ok / total) * 100) : 0;
  const coverageColor = coverage === 100 ? c.green : coverage >= 80 ? c.yellow : c.red;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${c.bold}Couverture : ${coverageColor}${coverage}%${c.reset}${c.bold} (${ok}/${total} tokens mappés)${c.reset}\n`);

  // Exit code non-nul si des tokens Figma ne sont pas couverts
  if (figmaOnly.length > 0) {
    process.exit(1);
  }
}

main();
