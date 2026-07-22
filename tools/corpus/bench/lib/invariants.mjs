// Invariants déterministes (sans IA) : la couche texte (lecture A) est la
// vérité des nombres. Chaque nombre+unité doit survivre à l'identique dans
// les lectures vision B et C, sinon c'est un artéfact détecté.

import { UNITES_DOSAGE } from '../config.mjs';

// Classe d'espaces : ASCII, insécable (U+00A0), fine insécable (U+202F), fine (U+2009).
const ESP = '[\\s\\u00a0\\u202f\\u2009]';

// Normalise un fragment numérique pour la comparaison :
// - espaces (y compris insécables et fines) retirés (séparateur de milliers FR) ;
// - virgule décimale conservée ;
// - unité en minuscules.
function normNombre(valeur) {
  return valeur.replace(new RegExp(ESP, 'gu'), '');
}

const uniteAlt = UNITES_DOSAGE
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .sort((a, b) => b.length - a.length)
  .join('|');

// Un nombre BIEN FORMÉ suivi éventuellement d'une espace puis d'une unité.
// Le nombre est soit un entier avec séparateur de milliers FR (1 000), soit un
// entier/décimal FR ou EN (2,5 / 2.5) — jamais un run mixte : « 2 … 5 » n'est
// pas un nombre, sinon une liste absorbe une ellipse en dosage fantôme.
const NOMBRE = `\\d{1,3}(?:${ESP}\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?`;
const RE_DOSAGE = new RegExp(
  `(${NOMBRE})${ESP}?(${uniteAlt})(?![a-zà-ÿ])`,
  'giu',
);

// Confusables Unicode à unifier avant comparaison — sinon deux transcriptions
// visuellement identiques divergent sur un codepoint :
//   µ signe micro (U+00B5) vs μ mu grec (U+03BC) ;
//   espaces fines/insécables déjà gérées par la classe ESP.
function normUnicode(s) {
  return s.replace(/μ/g, 'µ'); // μ (mu grec) → µ (signe micro)
}

// Extrait les couples nombre+unité d'un texte, normalisés et dédupliqués (multiset).
// Les ellipses (…, ...) sont neutralisées d'abord : elles séparent, ne composent pas.
export function extraireDosages(texte) {
  const out = [];
  if (!texte) return out;
  const propre = normUnicode(texte).replace(/…/g, ' ').replace(/\.{2,}/g, ' ');
  for (const m of propre.matchAll(RE_DOSAGE)) {
    const nombre = normNombre(m[1]);
    const unite = m[2].toLowerCase();
    out.push(`${nombre} ${unite}`);
  }
  return out;
}

// Compare les dosages de la couche texte (A) à ceux d'une lecture vision (X).
// Renvoie les dosages de A absents de X (multiset : tient compte des répétitions).
export function dosagesManquants(dosagesA, texteX) {
  const dansX = new Map();
  for (const d of extraireDosages(texteX)) dansX.set(d, (dansX.get(d) || 0) + 1);
  const manquants = [];
  for (const d of dosagesA) {
    const n = dansX.get(d) || 0;
    if (n > 0) dansX.set(d, n - 1);
    else manquants.push(d);
  }
  return manquants;
}

// Taux de couverture caractères : proportion des caractères significatifs de A
// que l'on retrouve dans X (heuristique grossière de complétude).
export function couvertureCaracteres(texteA, texteX) {
  const sign = (s) => (s || '').toLowerCase().replace(/[^a-zà-ÿ0-9]/gi, '');
  const a = sign(texteA);
  const x = sign(texteX);
  if (a.length === 0) return x.length === 0 ? 1 : 0;
  // Comparaison par bigrammes : robuste aux réordonnancements mineurs.
  const bigrammes = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) || 0) + 1);
    }
    return m;
  };
  const ba = bigrammes(a);
  const bx = bigrammes(x);
  let recouvres = 0;
  let total = 0;
  for (const [bg, n] of ba) {
    total += n;
    recouvres += Math.min(n, bx.get(bg) || 0);
  }
  return total === 0 ? 1 : recouvres / total;
}

// Comptage de cellules de tableau Markdown (lignes | ... | hors séparateurs).
export function compterCellulesTableau(markdown) {
  let cellules = 0;
  let lignes = 0;
  for (const ligne of (markdown || '').split('\n')) {
    const t = ligne.trim();
    if (!t.startsWith('|')) continue;
    if (/^\|[\s:|-]+\|?$/.test(t)) continue; // séparateur d'entête
    lignes += 1;
    cellules += t.split('|').filter((c) => c.trim().length > 0).length;
  }
  return { lignes, cellules };
}
