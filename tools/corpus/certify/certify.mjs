// Banc de certification d'un instrument : SOURCE (verbatim extrait) ↔ SERVI
// (catalogue de l'application, moteur exécuté).
//
//   node --env-file=web/.env.local tools/corpus/certify/certify.mjs \
//     --instrument Q_SOM_07 --sources WN-SRC-0396,WN-SRC-0397
//
// Chaîne :
//   1. lit `canonical.md` des sources (produit par tools/corpus/extract) ;
//   2. DEUX lectures structurantes indépendantes (Claude et GPT) transforment
//      la prose en spécification JSON — aucune des deux n'a le catalogue sous
//      les yeux, pour qu'aucune ne puisse s'y aligner par complaisance ;
//   3. compare chaque spécification au servi (module pur, testé) ;
//   4. croise les deux verdicts : une divergence vue par les DEUX lectures est
//      « confirmée » ; vue par une seule, elle est « à confirmer ».
//
// Le banc CONSTATE. Il n'écrit jamais dans le catalogue, ne corrige aucun
// scoring, ne bascule aucun statut de certification : sa sortie est une pièce
// d'arbitrage pour le praticien.
//
// Sorties hors dépôt : ~/.wellneuro/corpus/certify/<instrument>/

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { empreinteServie } from './lib/servi.mjs';
import { comparer, croiserLectures } from './lib/comparaison.mjs';

const require = createRequire(import.meta.url);
const home = os.homedir();
const EXTRACTED = path.join(home, '.wellneuro', 'corpus', 'extracted');
const SORTIE = path.join(home, '.wellneuro', 'corpus', 'certify');

const MODELE_CLAUDE = process.env.WN_CERTIFY_CLAUDE_MODEL || 'claude-sonnet-5';
const MODELE_OPENAI = process.env.WN_CERTIFY_OPENAI_MODEL || 'gpt-5.4';

const SCHEMA = `{
  "instrument": "nom officiel tel qu'écrit dans la source, ou null",
  "echelleReponse": { "min": <plus petite valeur cotée>, "max": <plus grande>, "libelles": ["..."] } | null,
  "items": [ { "numero": <n>, "texte": "<libellé VERBATIM>", "inverse": <true si la source dit d'inverser cet item>, "sousEchelle": "<nom ou null>" } ],
  "formuleInversion": "<formule littérale, ex. '6 - réponse'>" | null,
  "sousEchelles": [ { "nom": "...", "nbItems": <n>, "min": <n|null>, "max": <n|null> } ],
  "bornesTotal": { "min": <n|null>, "max": <n|null> } | null,
  "baremeGlobal": <true si la source donne un barème d'interprétation du score TOTAL, false si elle dit explicitement qu'il n'en existe pas, null si elle n'en parle pas>,
  "seuils": [ { "perimetre": "<sur quoi porte le seuil>", "population": "<ou null>", "operateur": ">=|<=|>|<|==", "valeur": <n> } ],
  "population": "<population cible telle qu'écrite, ou null>",
  "mentionsDroits": "<toute mention de licence, copyright, auteur, permission — verbatim, ou null>"
}`;

const CONSIGNE = `Tu lis le document source d'un questionnaire clinique et tu le transformes en spécification JSON.

RÈGLES ABSOLUES :
- N'extrais QUE ce qui est écrit. N'infère rien, ne complète rien depuis tes connaissances de l'instrument.
- Si une information est absente de la source, mets null (ou un tableau vide). L'absence est une information.
- Les libellés d'items sont VERBATIM : ni reformulation, ni correction orthographique, ni traduction.
- "inverse" ne vaut true que si la SOURCE indique d'inverser cet item. Ne le déduis pas du sens de l'énoncé.
- "baremeGlobal" vaut false UNIQUEMENT si la source affirme qu'il n'y a pas de barème d'interprétation global.
- Réponds par le JSON seul, sans commentaire ni bloc de code.

Schéma attendu :
${SCHEMA}`;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { instrument: null, sources: [], recomparer: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--instrument') o.instrument = a[++i];
    else if (a[i] === '--sources') o.sources = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--recomparer') o.recomparer = true;
  }
  return o;
}

/**
 * Relit les spécifications déjà produites pour un instrument.
 *
 * Les lectures structurantes coûtent deux appels de modèle par instrument ;
 * corriger le COMPARATEUR n'a aucune raison de les repayer, puisque la source
 * n'a pas bougé. `--recomparer` rejoue donc la comparaison sur les
 * `spec-*.json` du dossier de sortie — sans réseau, sans clé API, et sur
 * l'ensemble du banc si `--instrument` est omis.
 */
async function specsEnCache(dossier) {
  const lectures = [
    { lecteur: 'B (Claude)', fichier: 'spec-B.json' },
    { lecteur: 'C (GPT)', fichier: 'spec-C.json' },
  ];
  const specs = [];
  for (const { lecteur, fichier } of lectures) {
    try {
      specs.push({ lecteur, spec: JSON.parse(await fs.readFile(path.join(dossier, fichier), 'utf8')), erreur: null });
    } catch {
      specs.push({ lecteur, spec: null, erreur: 'spécification absente du cache' });
    }
  }
  return specs;
}

/** Extrait le premier objet JSON d'une réponse de modèle (tolère les fioritures). */
function extraireJson(texte) {
  const nettoye = texte.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
  const debut = nettoye.indexOf('{');
  const fin = nettoye.lastIndexOf('}');
  if (debut === -1 || fin === -1) throw new Error('aucun objet JSON dans la réponse');
  return JSON.parse(nettoye.slice(debut, fin + 1));
}

async function lectureStructuranteClaude(verbatim) {
  // Budget de sortie large : un instrument de 20 items produit une
  // spécification longue, qu'une troncature rendrait illisible. Au-delà d'un
  // certain budget le SDK impose le streaming — d'où `.stream()`, dont on
  // n'attend que le message final.
  const rep = await new Anthropic()
    .messages.stream({
      model: MODELE_CLAUDE,
      max_tokens: 32000,
      system: CONSIGNE,
      messages: [{ role: 'user', content: `Source :\n\n${verbatim}` }],
    })
    .finalMessage();
  const texte = rep.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  if (rep.stop_reason === 'max_tokens') throw new Error('réponse tronquée (max_tokens) — spécification incomplète');
  return extraireJson(texte);
}

async function lectureStructuranteGpt(verbatim) {
  const rep = await new OpenAI().responses.create({
    model: MODELE_OPENAI,
    reasoning: { effort: 'medium' },
    max_output_tokens: 8192,
    instructions: CONSIGNE,
    input: [{ role: 'user', content: [{ type: 'input_text', text: `Source :\n\n${verbatim}` }] }],
  });
  return extraireJson(rep.output_text || '');
}

function ligneDivergence(d) {
  const cible = d.item ? ` \`${d.item}\`` : '';
  return [
    `- **${d.code}**${cible} — ${d.message}`,
    `  - source : ${JSON.stringify(d.attendu)}`,
    `  - servi  : ${JSON.stringify(d.obtenu)}`,
  ].join('\n');
}

function redigerRapport({ instrument, sources, empreinte, verdicts, croisement, specs }) {
  const l = [];
  l.push(`# Banc de certification — ${instrument}`);
  l.push('');
  l.push(`Instrument servi : **${empreinte.titre}**`);
  l.push(`Sources lues : ${sources.join(', ')}`);
  l.push(`Lectures structurantes : ${MODELE_CLAUDE} et ${MODELE_OPENAI}, indépendantes, sans accès au catalogue.`);
  if (!croisement.croiseeEffective) {
    l.push('');
    l.push('> ⚠ **Une seule lecture a abouti** : le croisement n\'a pas eu lieu. Aucune divergence');
    l.push('> n\'est ici « confirmée » — toutes restent à confirmer par une seconde lecture.');
  }
  l.push('');
  l.push('> Ce rapport CONSTATE des écarts entre la source et ce que l\'application sert.');
  l.push('> Il ne corrige rien et ne certifie rien : chaque écart appelle un arbitrage du praticien.');
  l.push('');

  l.push('## Ce que sert l\'application');
  l.push('');
  // La position des drapeaux en TÊTE du relevé : c'est elle qui dit de quelle
  // forme parle tout ce qui suit.
  const drapeaux = Object.entries(empreinte.drapeaux ?? {});
  if (drapeaux.length) {
    l.push(`- drapeaux de forme : ${drapeaux.map(([k, v]) => `\`${k}\`=${v ? 'ALLUMÉ' : 'éteint'}`).join(' · ')}`);
  }
  l.push(`- items : ${empreinte.items.length}`);
  l.push(`- sections (écran) : ${empreinte.sections.length} (${empreinte.sections.map((s) => s.titre || s.id).join(' · ')})`);
  l.push(`- dimensions **calculées** : ${empreinte.dimensions.noms.length} via \`${empreinte.dimensions.origine}\`${empreinte.dimensions.noms.length ? ` (${empreinte.dimensions.noms.join(' · ')})` : ''}`);
  l.push(`- scoring : type \`${empreinte.scoring.type}\`, maxTotal déclaré ${empreinte.scoring.maxTotalDeclare ?? '—'}${empreinte.scoring.itemsInversesDeclares.length ? `, ${empreinte.scoring.itemsInversesDeclares.length} item(s) inversé(s) déclaré(s)` : ''}`);
  l.push(`- balayage du moteur : ${empreinte.bornesExecutees.min ?? '?'} → ${empreinte.bornesExecutees.max ?? '?'}${empreinte.bornesExecutees.erreur ? ` (erreur : ${empreinte.bornesExecutees.erreur})` : ''} — un score **atteignable**, donc un plancher du maximum, pas le maximum`);
  l.push(`- bandes d'interprétation : ${empreinte.scoring.bandes.length}`);
  l.push('');

  l.push('## Divergences confirmées par les deux lectures');
  l.push('');
  if (croisement.confirmees.length === 0) l.push('_Aucune._');
  else croisement.confirmees.forEach((d) => l.push(ligneDivergence(d)));
  l.push('');

  l.push('## Divergences vues par une seule lecture (à confirmer)');
  l.push('');
  if (croisement.aConfirmer.length === 0) l.push('_Aucune._');
  else croisement.aConfirmer.forEach((d) => l.push(`${ligneDivergence(d)}\n  - vue par : ${d.vuePar}`));
  l.push('');

  l.push('## Mentions de droits relevées dans la source');
  l.push('');
  const droits = specs.map((s) => s?.spec?.mentionsDroits).filter(Boolean);
  l.push(droits.length ? droits.map((d) => `- ${d}`).join('\n') : '_Aucune mention relevée._');
  l.push('');

  l.push('## Verdict');
  l.push('');
  for (const v of verdicts) {
    l.push(`- lecture ${v.lecteur} : ${v.resultat.resume.total} divergence(s) — ` +
      `${v.resultat.resume.parGravite.critique} critique(s), ${v.resultat.resume.parGravite.majeur} majeure(s), ${v.resultat.resume.parGravite.mineur} mineure(s)`);
  }
  const certifiable = verdicts.every((v) => v.resultat.resume.certifiable);
  l.push('');
  l.push(certifiable
    ? '**Aucune divergence critique** : l\'instrument peut être proposé au praticien pour décision de certification.'
    : '**Divergences critiques présentes** : l\'instrument ne peut pas être proposé à la certification en l\'état.');
  l.push('');
  return l.join('\n');
}

/** Clé d'identité d'une divergence : le même écart doit se reconnaître d'une lecture à l'autre. */

async function traiter({ instrument, sources, entree, calculateScore, specs }) {
  const empreinte = empreinteServie(instrument, entree, calculateScore);
  console.log(`  servi : ${empreinte.items.length} items, ${empreinte.dimensions.noms.length} dimension(s) via ${empreinte.dimensions.origine}, balayage ${empreinte.bornesExecutees.min}→${empreinte.bornesExecutees.max}`);
  for (const s of specs) {
    console.log(`  lecture ${s.lecteur} : ${s.spec ? `${(s.spec.items ?? []).length} items lus` : `ÉCHEC — ${s.erreur}`}`);
  }

  const verdicts = specs.filter((s) => s.spec).map((s) => ({ lecteur: s.lecteur, resultat: comparer(empreinte, s.spec) }));
  if (verdicts.length === 0) throw new Error('aucune spécification exploitable');

  const croisement = croiserLectures(verdicts);

  const dossier = path.join(SORTIE, instrument);
  await fs.mkdir(dossier, { recursive: true });
  for (const s of specs) {
    if (s.spec) await fs.writeFile(path.join(dossier, `spec-${s.lecteur[0]}.json`), `${JSON.stringify(s.spec, null, 2)}\n`);
  }
  await fs.writeFile(path.join(dossier, 'empreinte-servie.json'), `${JSON.stringify(empreinte, null, 2)}\n`);
  const rapport = redigerRapport({ instrument, sources, empreinte, verdicts, croisement, specs });
  await fs.writeFile(path.join(dossier, 'rapport.md'), rapport);

  console.log(`  confirmées : ${croisement.confirmees.length} · à confirmer : ${croisement.aConfirmer.length}`);
  for (const d of croisement.confirmees) console.log(`    [${d.gravite}] ${d.code}${d.item ? ` (${d.item})` : ''}`);
  return { instrument, confirmees: croisement.confirmees, aConfirmer: croisement.aConfirmer };
}

async function main() {
  const o = parseArgs();
  // Contrôle d'usage AVANT le chargement du catalogue : lancé depuis un autre
  // répertoire que la racine, le `require` échoue, et un mode d'emploi vaut
  // mieux qu'une trace de module introuvable.
  if (!o.recomparer && (!o.instrument || o.sources.length === 0)) {
    console.error('Usage : --instrument Q_SOM_07 --sources WN-SRC-0396,WN-SRC-0397');
    console.error('        --recomparer [--instrument Q_XXX]   (rejeu depuis le cache, sans appel API)');
    console.error('À lancer depuis la racine du dépôt.');
    process.exit(1);
  }

  const { chargerCatalogue } = require(path.resolve('scripts/lib/charger_catalogue.js'));
  const { QUESTIONNAIRE_CATALOGUE, calculateScore } = chargerCatalogue();

  // ── Rejeu depuis le cache : aucun appel de modèle ──────────────────────
  if (o.recomparer) {
    const dossiers = o.instrument
      ? [o.instrument]
      : (await fs.readdir(SORTIE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    const bilan = [];
    for (const instrument of dossiers) {
      const entree = QUESTIONNAIRE_CATALOGUE[instrument];
      if (!entree) {
        console.error(`${instrument} : absent du catalogue servi — ignoré`);
        continue;
      }
      const specs = await specsEnCache(path.join(SORTIE, instrument));
      if (!specs.some((s) => s.spec)) {
        console.error(`${instrument} : aucune spécification en cache — ignoré`);
        continue;
      }
      console.log(`=== ${instrument} — ${entree.titre} ===`);
      try {
        bilan.push(await traiter({ instrument, sources: ['(cache)'], entree, calculateScore, specs }));
      } catch (e) {
        console.error(`  ÉCHEC : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const critiques = bilan.flatMap((b) => b.confirmees.filter((d) => d.gravite === 'critique'));
    console.log(`\n${bilan.length} instrument(s) recomparés · ${critiques.length} divergence(s) critique(s) confirmée(s)`);
    return;
  }

  const entree = QUESTIONNAIRE_CATALOGUE[o.instrument];
  if (!entree) throw new Error(`${o.instrument} absent du catalogue servi`);

  const morceaux = [];
  for (const sid of o.sources) {
    const chemin = path.join(EXTRACTED, sid, 'canonical.md');
    try {
      morceaux.push(`<!-- source ${sid} -->\n${await fs.readFile(chemin, 'utf8')}`);
    } catch {
      console.error(`  ${sid} : verbatim absent (${chemin}) — extraire d'abord`);
    }
  }
  if (morceaux.length === 0) throw new Error('aucun verbatim disponible');
  const verbatim = morceaux.join('\n\n');

  console.log(`=== ${o.instrument} — ${entree.titre} ===`);
  console.log(`  sources : ${o.sources.join(', ')} (${verbatim.length} caractères)`);

  const [b, c] = await Promise.allSettled([
    lectureStructuranteClaude(verbatim),
    lectureStructuranteGpt(verbatim),
  ]);
  const specs = [
    { lecteur: 'B (Claude)', spec: b.status === 'fulfilled' ? b.value : null, erreur: b.status === 'rejected' ? String(b.reason?.message || b.reason) : null },
    { lecteur: 'C (GPT)', spec: c.status === 'fulfilled' ? c.value : null, erreur: c.status === 'rejected' ? String(c.reason?.message || c.reason) : null },
  ];

  const r = await traiter({ instrument: o.instrument, sources: o.sources, entree, calculateScore, specs });
  console.log(`\n  rapport : ${path.join(SORTIE, r.instrument, 'rapport.md')}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
