import { describe, expect, it } from 'vitest';
import { estUnTest, fichiersSource, lire, retirerLignesDeCommentaire } from './bio-parcours/balayageSources';

// K-05a (F46, arbitrage du responsable du 2026-10-14) — LISTE FERMÉE des
// fichiers de `web/src` qui parlent à un fournisseur d'IA, CHACUN rattaché à
// sa déclaration dans `docs/DOSSIER_RGPD.md`. Un fichier qui se met à parler à
// un fournisseur sans figurer ici rougit ; une entrée qui ne parle plus à
// personne rougit aussi (la liste ne se périme pas). C'est le constat du
// 2026-09-07 qui fonde le banc : OpenAI recevait du texte depuis la
// production sans être déclaré nulle part (D4, [[D-299]]).
//
// CE QUI EST VU, sur le source sans ses lignes de commentaire :
//   — appel par SDK : `.messages.create(` / `.messages.stream(` (Anthropic),
//     `.chat.completions.create(`, `.embeddings.create(`, `.responses.create(`
//     (OpenAI) ;
//   — appel direct : un `fetch(` dont la cible nomme un fournisseur
//     (`${ANTHROPIC_BASE_URL}/messages`, `${config.openAiBaseUrl}/embeddings`) ;
//   — client : l'import (valeur, pas `import type`) d'un SDK d'IA ;
//   — constante : l'adresse d'un fournisseur écrite en dur.
// Le banc reconnaît le site d'appel ET ce qui le permet : un nouveau SDK, une
// nouvelle adresse rougissent avant même leur premier appel.
// LIMITES, dites pour ne pas sur-promettre. La garantie couvre les seuls
// fournisseurs et SDK que nomment `NOMS_FOURNISSEUR`, `ADRESSES_IA` et
// `SDK_IA` : un fournisseur absent de ces listes échappe au banc, et
// l'y ajouter est le geste de la revue qui l'introduit. Un appel dont la cible
// ne nomme aucun fournisseur (une URL lue d'une variable au nom neutre)
// échappe aussi et relève de la revue. `tools/` et `scripts/` sont hors du
// banc : ils ne tournent pas dans l'application.
//
// RATTACHEMENT. Un flux d'un sous-traitant se déclare sur la ligne de son
// fournisseur au tableau de la rubrique 6 — celle que le patient lit, tenue
// égale au document servi par `registre.dossier.test.ts`. Un flux qui
// n'envoie aucune donnée de patient par construction se déclare en toutes
// lettres, avec son chemin, son motif et la limite de son champ libre.
// L'appartenance au périmètre biologie ne dispense pas : `extraction.ts` est
// listé ici, et `bio-parcours/appelantsLlmBiologie.guard.test.ts` garde, lui,
// le vérificateur DC-03 — deux questions distinctes.

type Fournisseur = 'Anthropic' | 'OpenAI';
type Role = 'appel' | 'client' | 'constante';

type Site = {
  chemin: string;
  fournisseur: Fournisseur;
  roles: readonly Role[];
} & (
  /** `declaration` figure sur la ligne `| <fournisseur> |` de la rubrique 6. */
  | { rattachement: 'sous-traitant'; declaration: string; precisions?: readonly string[] }
  /** `declaration` figure dans le dossier, avec son motif. */
  | { rattachement: 'sans donnée de patient'; declaration: string }
);

export const SITES_APPEL_IA: readonly Site[] = [
  {
    chemin: 'web/src/lib/anthropic.ts',
    fournisseur: 'Anthropic',
    roles: ['client'],
    rattachement: 'sous-traitant',
    declaration: "assistance d'IA pour la préparation des synthèses",
  },
  {
    chemin: 'web/src/lib/synthese/generation.ts',
    fournisseur: 'Anthropic',
    roles: ['appel'],
    rattachement: 'sous-traitant',
    declaration: "assistance d'IA pour la préparation des synthèses",
  },
  {
    chemin: 'web/src/lib/objectif/propositionPriorite.ts',
    fournisseur: 'Anthropic',
    roles: ['appel'],
    rattachement: 'sous-traitant',
    declaration: "pour la proposition de formulation de la priorité d'un objectif",
  },
  {
    chemin: 'web/src/lib/objectif/propositionComprehension.ts',
    fournisseur: 'Anthropic',
    roles: ['appel'],
    rattachement: 'sous-traitant',
    declaration: "pour la proposition d'un premier jet de « Ce que j'ai compris de vous »",
  },
  {
    // État courant ([[D-284]] §5, lot 2 du masquage) : seules les pages
    // masquées par le praticien partent, jamais le compte rendu d'origine.
    chemin: 'web/src/lib/biology-library/import/extraction.ts',
    fournisseur: 'Anthropic',
    roles: ['appel', 'client'],
    rattachement: 'sous-traitant',
    declaration: "pour le relevé des valeurs des comptes rendus d'analyses biologiques",
    precisions: ['seules ces pages, en JPEG réencodées sans métadonnées, partent chez Anthropic'],
  },
  {
    chemin: 'web/src/lib/rag/embeddings.ts',
    fournisseur: 'OpenAI',
    roles: ['appel'],
    rattachement: 'sous-traitant',
    declaration: 'aide à la recherche du praticien dans sa bibliothèque de références scientifiques',
  },
  {
    chemin: 'web/src/lib/rag/config.ts',
    fournisseur: 'OpenAI',
    roles: ['constante'],
    rattachement: 'sous-traitant',
    declaration: 'aide à la recherche du praticien dans sa bibliothèque de références scientifiques',
  },
  {
    chemin: 'web/src/lib/rag/claims/evaluation.ts',
    fournisseur: 'Anthropic',
    roles: ['appel', 'constante'],
    rattachement: 'sans donnée de patient',
    declaration: 'Atelier de validation du corpus (`rag/claims`) — aucune donnée de patient envoyée par l\'application.',
  },
  {
    chemin: 'web/src/lib/rag/claims/questionnaire.ts',
    fournisseur: 'Anthropic',
    roles: ['appel', 'constante'],
    rattachement: 'sans donnée de patient',
    declaration: 'Atelier de validation du corpus (`rag/claims`) — aucune donnée de patient envoyée par l\'application.',
  },
];

const NOMS_FOURNISSEUR: readonly { fournisseur: Fournisseur; motif: RegExp }[] = [
  { fournisseur: 'Anthropic', motif: /anthropic/i },
  { fournisseur: 'OpenAI', motif: /open_?ai/i },
];

// Les SDK d'IA connus. Un SDK d'un fournisseur hors de `Fournisseur` rougit
// sous le nom `inconnu` : il appelle une décision avant d'appeler un modèle.
const SDK_IA: readonly { motif: RegExp; fournisseur: Fournisseur | 'inconnu' }[] = [
  { motif: /^@anthropic-ai\//, fournisseur: 'Anthropic' },
  { motif: /^openai(\/|$)/, fournisseur: 'OpenAI' },
  { motif: /^(@google\/(generative-ai|genai)|@mistralai\/|cohere-ai$|groq-sdk$|ai$|@ai-sdk\/|langchain$|@langchain\/|@huggingface\/)/, fournisseur: 'inconnu' },
];

const ADRESSES_IA: readonly { motif: RegExp; fournisseur: Fournisseur | 'inconnu' }[] = [
  { motif: /api\.anthropic\.com/, fournisseur: 'Anthropic' },
  { motif: /api\.openai\.com/, fournisseur: 'OpenAI' },
  { motif: /api\.mistral\.ai|generativelanguage\.googleapis\.com|api\.groq\.com|api\.cohere\.(ai|com)|api\.deepseek\.com|api\.perplexity\.ai|api-inference\.huggingface\.co/, fournisseur: 'inconnu' },
];

/**
 * Le premier argument d'un appel, de `debut` (juste après la parenthèse
 * ouvrante) à la première virgule ou parenthèse fermante de même niveau :
 * `fetch(new URL('/v1/x', config.openAiBaseUrl))` rend tout le `new URL(…)`.
 */
function premierArgument(code: string, debut: number): string {
  let profondeur = 0;
  for (let i = debut; i < code.length; i++) {
    const c = code[i];
    if (c === '(' || c === '[' || c === '{') profondeur++;
    else if (c === ')' || c === ']' || c === '}') {
      if (profondeur === 0) return code.slice(debut, i);
      profondeur--;
    } else if (c === ',' && profondeur === 0) return code.slice(debut, i);
  }
  return code.slice(debut);
}

/**
 * Modules dont un fichier dépend À L'EXÉCUTION : import et réexportation de
 * valeur, `import()` et `require()`. Les formes effacées par TypeScript ne
 * comptent pas : `import type`, `export type`, et un import nommé dont chaque
 * élément porte `type`.
 */
function modulesDeValeur(code: string): string[] {
  const modules: string[] = [];
  for (const m of code.matchAll(/^\s*(import|export)\s+([^;]*?)\s*\bfrom\s*['"]([^'"]+)['"]/gm)) {
    const clause = m[2].trim();
    if (/^type\b/.test(clause)) continue;
    const nommes = clause.match(/^\{([^}]*)\}$/);
    if (nommes) {
      const elements = nommes[1].split(',').map(e => e.trim()).filter(Boolean);
      if (elements.length > 0 && elements.every(e => /^type\s/.test(e))) continue;
    }
    modules.push(m[3]);
  }
  for (const m of code.matchAll(/\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g)) modules.push(m[1]);
  return modules;
}

type Detection = { chemin: string; fournisseur: Fournisseur | 'inconnu'; roles: Role[] };

/** Ce que le source d'un fichier révèle de ses échanges avec un fournisseur d'IA. */
export function detecter(chemin: string, source: string): Detection[] {
  const code = retirerLignesDeCommentaire(source);
  const vus = new Map<Fournisseur | 'inconnu', Set<Role>>();
  const noter = (f: Fournisseur | 'inconnu', r: Role) => {
    if (!vus.has(f)) vus.set(f, new Set());
    vus.get(f)!.add(r);
  };

  if (/\.messages\s*\.\s*(create|stream)\s*\(/.test(code)) noter('Anthropic', 'appel');
  if (/\.(chat\s*\.\s*completions|embeddings|responses)\s*\.\s*create\s*\(/.test(code)) noter('OpenAI', 'appel');
  for (const m of code.matchAll(/\bfetch\s*\(/g)) {
    const cible = premierArgument(code, m.index! + m[0].length);
    for (const { fournisseur, motif } of NOMS_FOURNISSEUR) if (motif.test(cible)) noter(fournisseur, 'appel');
    for (const { fournisseur, motif } of ADRESSES_IA) if (motif.test(cible)) noter(fournisseur, 'appel');
  }
  for (const specifiant of modulesDeValeur(code)) {
    const sdk = SDK_IA.find(s => s.motif.test(specifiant));
    if (sdk) noter(sdk.fournisseur, 'client');
  }
  for (const { fournisseur, motif } of ADRESSES_IA) if (motif.test(code)) noter(fournisseur, 'constante');

  return [...vus].map(([fournisseur, roles]) => ({ chemin, fournisseur, roles: [...roles].sort() }));
}

const cle = (d: { chemin: string; fournisseur: string; roles: readonly string[] }) =>
  `${d.chemin} · ${d.fournisseur} · ${[...d.roles].sort().join('+')}`;

describe('sites d\'appel IA de web/src — liste fermée, chacun déclaré au registre (K-05a)', () => {
  const detections = fichiersSource()
    .filter(chemin => !estUnTest(chemin))
    .flatMap(chemin => detecter(chemin, lire(chemin)));
  const dossier = lire('docs/DOSSIER_RGPD.md');
  const dossierAplati = dossier.replace(/\s+/g, ' ');

  it('les fichiers qui parlent à un fournisseur d\'IA sont exactement ceux de la liste', () => {
    expect(
      detections.map(cle).sort(),
      'site IA nouveau ou modifié : l\'ajouter à SITES_APPEL_IA avec sa déclaration au DOSSIER_RGPD (rubrique 6), '
        + 'ou retirer l\'entrée qui ne parle plus au fournisseur',
    ).toEqual(SITES_APPEL_IA.map(cle).sort());
  });

  it('chaque flux d\'un sous-traitant est déclaré sur la ligne de son fournisseur (rubrique 6)', () => {
    for (const site of SITES_APPEL_IA) {
      if (site.rattachement !== 'sous-traitant') continue;
      const ligne = dossier.split('\n').find(l => l.startsWith(`| ${site.fournisseur} |`));
      expect(ligne, `${site.fournisseur} absent du tableau des sous-traitants`).toBeDefined();
      expect(ligne!.replace(/\*\*/g, ''), `${site.chemin} : déclaration introuvable sur la ligne ${site.fournisseur}`)
        .toContain(site.declaration);
      for (const p of site.precisions ?? []) expect(dossierAplati, `${site.chemin} : précision introuvable`).toContain(p);
    }
  });

  it('chaque flux sans donnée de patient est déclaré en toutes lettres, avec son chemin', () => {
    for (const site of SITES_APPEL_IA) {
      if (site.rattachement !== 'sans donnée de patient') continue;
      expect(dossierAplati, `${site.chemin} : déclaration introuvable`).toContain(site.declaration);
      expect(dossierAplati, `${site.chemin} : chemin absent du dossier`).toContain(site.chemin.replace('web/src/lib/', ''));
    }
  });

  // CONTRE-ÉPREUVE : chaque forme d'échange est vue, la prose et le type ne
  // le sont pas.
  it('le balayage voit SDK, fetch, client et adresse ; ignore commentaire et import de type', () => {
    const vu = (source: string) => detecter('x.ts', source).map(cle);
    expect(vu("const r = await anthropic.messages.create({});")).toEqual(['x.ts · Anthropic · appel']);
    expect(vu("const r = client.messages\n  .stream({});")).toEqual(['x.ts · Anthropic · appel']);
    expect(vu("await openai.chat.completions.create({});")).toEqual(['x.ts · OpenAI · appel']);
    expect(vu("await fetch(`${config.openAiBaseUrl}/embeddings`, {});")).toEqual(['x.ts · OpenAI · appel']);
    expect(vu("import Anthropic from '@anthropic-ai/sdk';")).toEqual(['x.ts · Anthropic · client']);
    expect(vu("import { Mistral } from '@mistralai/mistralai';")).toEqual(['x.ts · inconnu · client']);
    expect(vu("const URL = 'https://api.mistral.ai/v1';")).toEqual(['x.ts · inconnu · constante']);
    expect(vu("// anthropic.messages.create( est appelé ailleurs\n/* fetch(`${ANTHROPIC}`) */")).toEqual([]);
    expect(vu("import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';")).toEqual([]);
    expect(vu("await fetch(`/api/praticien/synthese`, {});")).toEqual([]);
    // Revue de #1472 : une virgule DANS le premier argument ne l'ampute pas ;
    // réexportation, `import()` et `require()` sont des dépendances de valeur ;
    // un import nommé tout en `type` est effacé par TypeScript.
    expect(vu("await fetch(new URL('/v1/embeddings', config.openAiBaseUrl), {});")).toEqual(['x.ts · OpenAI · appel']);
    expect(vu("export * from '@anthropic-ai/sdk';")).toEqual(['x.ts · Anthropic · client']);
    expect(vu("export { default } from 'openai';")).toEqual(['x.ts · OpenAI · client']);
    expect(vu("const { default: A } = await import('@anthropic-ai/sdk');")).toEqual(['x.ts · Anthropic · client']);
    expect(vu("const O = require('openai');")).toEqual(['x.ts · OpenAI · client']);
    expect(vu("import { type MessageParam } from '@anthropic-ai/sdk/resources/messages';")).toEqual([]);
    expect(vu("export type { MessageParam } from '@anthropic-ai/sdk/resources/messages';")).toEqual([]);
    expect(vu("import { type A, B } from '@anthropic-ai/sdk';")).toEqual(['x.ts · Anthropic · client']);
  });
});
