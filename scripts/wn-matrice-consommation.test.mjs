// Banc de `scripts/wn-matrice-consommation.mjs`.
//
// La propriété qui compte n'est pas « la matrice se génère » : c'est **une
// source sans appelant apparaît, avec une surface vide, plutôt que d'être
// omise en silence**. Un générateur qui n'imprime que ce qu'il trouve produit
// exactement le tableau rassurant que ce lot cherche à détruire.
//
// Les fixtures vivent en répertoire temporaire ; les deux derniers tests
// lisent CE dépôt, en lecture seule, parce qu'ils portent sur des faits du
// dépôt (l'indépendance au cwd, et le fait que tout arbitrage du registre
// désigne une source réelle).

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  appelantsDe,
  chargerIndexSources,
  collecterAllowlistsRayons,
  collecterRayons,
  construireMatrice,
  corpsDObjet,
  entreesDObjet,
  construireRapport,
  estVisiblePatient,
  contenuHorsImportsDeType,
  importsDe,
  nomsDeValeur,
  jetonsDeModule,
  lireDecisions,
  mentionne,
  natureDuFichier,
  rendreMarkdown,
  sansCommentaires,
  SOURCES_DE_SAVOIR,
  trancheExport,
} from './wn-matrice-consommation.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'wn-matrice-consommation.mjs');
const RACINE_DEPOT = path.join(path.dirname(SCRIPT), '..');

/** Index de fixture : `{chemin: contenu}` → la forme que consomment les fonctions pures. */
const indexer = (fichiers) =>
  Object.entries(fichiers).map(([chemin, contenu]) => ({ chemin, contenu: sansCommentaires(contenu) }));

const SOURCE_FICTIVE = {
  id: 'source-fictive',
  libelle: 'Source fictive',
  module: 'web/src/lib/fictif/source.ts',
  symboles: ['SAVOIR_FICTIF'],
  decisionProduite: 'Rien du tout.',
};

test('une source SANS appelant apparaît dans la matrice, avec une surface vide', () => {
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/app/api/ailleurs/route.ts': "import { autre } from '@/lib/autre';",
  });
  const { lignes, sansDecision } = construireMatrice(index, {}, [SOURCE_FICTIVE]);

  const ligne = lignes.find((l) => l.id === 'source-fictive');
  assert.ok(ligne, 'la source dormante a été OMISE — le défaut que ce banc existe pour interdire');
  assert.deepEqual(ligne.surfaces, []);
  assert.equal(ligne.consommee, false);
  assert.deepEqual(sansDecision, ['source-fictive']);
});

test('une source dormante MAIS arbitrée ne compte plus comme dette non tranchée', () => {
  const index = indexer({ 'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;' });
  const decisions = { 'source-fictive': { verdict: 'dormante', date: '2026-08-05', raison: 'essai' } };
  const { lignes, sansDecision } = construireMatrice(index, decisions, [SOURCE_FICTIVE]);

  assert.equal(lignes[0].consommee, false, 'arbitrer ne rend pas consommé');
  assert.deepEqual(sansDecision, [], 'une décision datée solde la dette, sans effacer la ligne');
});

test('un arbitrage qui ne désigne plus aucune source est signalé, pas ignoré', () => {
  const index = indexer({ 'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;' });
  const { decisionsOrphelines } = construireMatrice(
    index,
    { 'rayon:disparu': { verdict: 'dormante', date: '2026-08-05' } },
    [SOURCE_FICTIVE],
  );
  assert.deepEqual(decisionsOrphelines, ['rayon:disparu']);
});

test("un spécificateur d'import est reconnu — `\\b` ne s'ancre pas devant `@`", () => {
  // Régression : `\b@/lib/x\b` ne correspond JAMAIS (apostrophe et `@` sont
  // tous deux non-mots). Toutes les chaînes d'import remontaient vides, et la
  // table d'orientation passait pour dormante alors que sa route l'importe.
  assert.equal(mentionne("import { a } from '@/lib/clinical/orientationService';", '@/lib/clinical/orientationService'), true);
  assert.equal(mentionne('const ORIENTATION_METADATA = 1;', 'ORIENTATION_METADATA'), true);
  assert.equal(mentionne('const ORIENTATION_METADATA_BIS = 1;', 'ORIENTATION_METADATA'), false);
});

test('une mention en COMMENTAIRE ne fait pas passer une source pour consommée', () => {
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    // Ce dépôt commente beaucoup, et nomme souvent ce qu'un fichier ne fait pas.
    'web/src/app/api/prose/route.ts': '// On n’utilise plus SAVOIR_FICTIF ici.\nexport const GET = () => null;',
  });
  const { lignes } = construireMatrice(index, {}, [SOURCE_FICTIVE]);
  assert.equal(lignes[0].consommee, false, 'un commentaire n’est pas un appel');
});

test('la chaîne route → service → source est suivie, et la distance est conservée', () => {
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/lib/fictif/service.ts': "import { SAVOIR_FICTIF } from './source';",
    'web/src/app/api/fictif/route.ts': "import { s } from '@/lib/fictif/service';",
  });
  const { lignes } = construireMatrice(index, {}, [SOURCE_FICTIVE]);

  assert.equal(lignes[0].consommee, true);
  assert.deepEqual(lignes[0].relais, ['web/src/lib/fictif/service.ts']);
  const surface = lignes[0].surfaces.find((s) => s.chemin === 'web/src/app/api/fictif/route.ts');
  assert.ok(surface, 'la route atteinte via le service doit être une surface');
  assert.equal(surface.saut, 1, 'atteinte à travers un relais : la distance est 1, pas 0');
});

test("un import relatif homonyme d'un AUTRE dossier ne compte pas", () => {
  // `./catalogue` existe dans supplement-library ET dans biology-library : sans
  // contrainte de dossier, l'un passerait pour consommer l'autre.
  const jetons = jetonsDeModule('web/src/lib/a/catalogue.ts');
  const relatif = jetons.find((j) => j.jeton === './catalogue');
  assert.equal(relatif.dossier, 'web/src/lib/a');

  const index = indexer({
    'web/src/lib/a/catalogue.ts': 'export const X = 1;',
    'web/src/lib/b/voisin.ts': "import { Y } from './catalogue';",
  });
  assert.deepEqual(appelantsDe(index, jetons, ['web/src/lib/a/catalogue.ts']), []);
});

test("un import de TYPE ne fait pas d'un fichier un consommateur (D-072)", () => {
  // Un `import type` est EFFACÉ à la compilation : aucun code ne s'exécute,
  // aucune donnée ne transite. Le compter faisait passer une source dormante
  // pour consommée — le cas réel : `statuts.ts` n'importe que le TYPE
  // `Remboursement`, et la bibliothèque NABM cessait d'être dormante sans
  // qu'un seul remboursement soit dérivé.
  const index = indexer({
    'web/src/lib/a/catalogue.ts': 'export const X = 1;\nexport type T = string;',
    'web/src/app/api/typeur/route.ts': "import type { T } from '@/lib/a/catalogue';",
  });
  assert.deepEqual(
    appelantsDe(index, jetonsDeModule('web/src/lib/a/catalogue.ts'), ['web/src/lib/a/catalogue.ts']),
    [],
    'un import de type ne consomme rien',
  );
});

test("un import de VALEUR compte toujours, y compris à côté d'un import de type", () => {
  const index = indexer({
    'web/src/lib/a/catalogue.ts': 'export const X = 1;',
    'web/src/app/api/vrai/route.ts':
      "import type { T } from '@/lib/a/catalogue';\nimport { X } from '@/lib/a/catalogue';",
  });
  const appelants = appelantsDe(
    index, jetonsDeModule('web/src/lib/a/catalogue.ts'), ['web/src/lib/a/catalogue.ts']);
  assert.equal(appelants.length, 1, 'la ligne de valeur suffit à faire un consommateur');
});

test('contenuHorsImportsDeType ne retire que les imports de type', () => {
  const contenu = [
    "import type { A } from './a';",
    "import { b } from './b';",
    "import { type C, d } from './d';",
  ].join('\n');
  const sans = contenuHorsImportsDeType(contenu);
  assert.ok(!sans.includes("'./a'"), "l'import de type entier disparaît");
  assert.ok(sans.includes("'./b'"), "l'import de valeur reste");
  assert.ok(sans.includes("'./d'"), 'un import mixte reste : il porte une valeur');
});

test("`import { type X }` SEUL ne consomme rien non plus (D-072)", () => {
  // La forme en ligne est tout aussi effacée à la compilation que la clause
  // entière. La traiter à moitié laissait des consommateurs fantômes.
  const index = indexer({
    'web/src/lib/a/catalogue.ts': 'export const X = 1;',
    'web/src/app/api/enligne/route.ts': "import { type T } from '@/lib/a/catalogue';",
  });
  assert.deepEqual(
    appelantsDe(index, jetonsDeModule('web/src/lib/a/catalogue.ts'), ['web/src/lib/a/catalogue.ts']),
    [],
  );
});

test('un JUGE UNIQUE décide : importsDe et contenuHorsImportsDeType ne divergent pas', () => {
  // Deux définitions concurrentes de « qu'est-ce qu'un import de type » dans un
  // script dont la valeur est d'être un juge unique produiraient deux vérités.
  for (const clause of ['type { A }', '{ type A }', '{ type A, b }', 'X', '* as ns']) {
    const source = `import ${clause} from './m';`;
    const vuParImportsDe = importsDe(source).length > 0;
    const vuParLeContenu = contenuHorsImportsDeType(source).includes("'./m'");
    assert.equal(vuParImportsDe, vuParLeContenu, `désaccord sur : ${clause}`);
  }
});

test('nomsDeValeur ne rend que ce qui survit à la compilation', () => {
  assert.deepEqual(nomsDeValeur('type { A }'), []);
  assert.deepEqual(nomsDeValeur('{ type A }'), []);
  assert.deepEqual(nomsDeValeur('{ type A, b }'), ['b']);
  assert.deepEqual(nomsDeValeur('{ a as b }'), ['a', 'b']);
});

test("un import multiligne de type est neutralisé, et un import de valeur voisin survit", () => {
  const contenu = "import type {\n  A,\n  B,\n} from './types';\nimport { valeur } from './valeurs';";
  const sans = contenuHorsImportsDeType(contenu);
  assert.ok(!sans.includes("'./types'"), 'le type multiligne disparaît');
  assert.ok(sans.includes("'./valeurs'"), "l'import de valeur survit");
});

test('les bancs ne sont jamais des surfaces', () => {
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/app/api/fictif/route.test.ts': 'import { SAVOIR_FICTIF } from "@/lib/fictif/source";',
  });
  const { lignes } = construireMatrice(index, {}, [SOURCE_FICTIVE]);
  assert.equal(lignes[0].consommee, false, 'un test qui importe une source ne la met dans les mains de personne');
});

test('une source dont TOUS les appelants sont des librairies reste dormante', () => {
  // Le cas réel de la bibliothèque de biologie : son unique référence est
  // `featureFlag.ts`, une librairie. C'est le constat-titre du lot, et deux
  // mutations le faisaient disparaître sans qu'un seul test rougisse —
  // `NATURES_SURFACE` élargi à `'librairie'`, et `consommee` calculé sur le
  // nombre d'appelants plutôt que sur le nombre de surfaces.
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/lib/fictif/relais.ts': "import { SAVOIR_FICTIF } from './source';",
  });
  const { lignes } = construireMatrice(index, {}, [SOURCE_FICTIVE]);

  assert.deepEqual(lignes[0].relais, ['web/src/lib/fictif/relais.ts']);
  assert.deepEqual(lignes[0].surfaces, [], 'une librairie n’est pas une surface');
  assert.equal(lignes[0].consommee, false, 'atteinte par du code, mais par aucun écran : dormante');
});

test('un `/*` écrit DANS un commentaire de ligne n’ouvre pas de bloc', () => {
  // Régression mesurée : les blocs étaient retirés AVANT les lignes, donc
  // « les six routes api/patient/* ont changé » ouvrait un bloc courant
  // jusqu'au prochain `*` `/`. 46 fichiers de web/src perdaient plus de 200
  // caractères de code réel, et un écran patient entier perdait ses onze
  // imports — dix-sept surfaces comptées comme dormantes.
  const nettoye = sansCommentaires(
    ['// Les six routes `api/patient/*` ont changé.',
      "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
      'export const GET = () => SAVOIR_FICTIF;',
      '/* fin */'].join('\n'),
  );
  assert.match(nettoye, /SAVOIR_FICTIF/, 'le code sous le commentaire a été effacé');

  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/app/api/fictif/route.ts': [
      '// Les six routes `api/patient/*` ont changé.',
      "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
      'export const GET = () => SAVOIR_FICTIF;',
    ].join('\n'),
  });
  assert.equal(construireMatrice(index, {}, [SOURCE_FICTIVE]).lignes[0].consommee, true);
});

test('CRLF : le nettoyage des commentaires opère aussi sur les 72 fichiers en \\r\\n', () => {
  // Défaut le plus coûteux des deux revues : une version du correctif
  // découpait sur '\n' et ancrait sur `$`, or `\r` est un terminateur de
  // ligne en JavaScript — la substitution n'avait JAMAIS lieu sur un fichier
  // CRLF. 72 des 879 fichiers de web/src le sont ; la matrice livrée y
  // comptait 17 surfaces fantômes, toutes issues d'un unique commentaire.
  // Toutes les fixtures étant en LF, aucun test ne le voyait.
  assert.doesNotMatch(sansCommentaires('  // commentaire\r\nconst A = 1;\r\n'), /commentaire/);

  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/app/api/crlf/route.ts': '// mention de SAVOIR_FICTIF en prose\r\nexport const GET = () => null;\r\n',
  });
  assert.equal(
    construireMatrice(index, {}, [SOURCE_FICTIVE]).lignes[0].consommee,
    false,
    'commentaire CRLF compté comme un appel',
  );
});

test('sansCommentaires connaît les chaînes, dans les deux sens', () => {
  // Deux passes de regex ne peuvent pas faire ce travail : choisir l'ordre
  // déplace le défaut. Ces quatre cas cassaient l'une ou l'autre version.
  assert.match(sansCommentaires("const c = 'a//b';\nconst VRAI = 1;"), /VRAI/, 'un // dans une chaîne');
  assert.match(sansCommentaires("const c = '/*';\nconst VRAI = 1;"), /VRAI/, 'un /* dans une chaîne');
  assert.match(sansCommentaires('/* voir // ailleurs */\nconst VRAI = 1;'), /VRAI/, 'un // dans un bloc');
  assert.match(sansCommentaires("const u = 'https://x';\nconst VRAI = 1;"), /VRAI/, 'une URL');
  assert.doesNotMatch(sansCommentaires('/* voir // ailleurs */\nconst VRAI = 1;'), /ailleurs/);
});

test('une apostrophe française en JSX n’ouvre pas une chaîne qui avale le fichier', () => {
  // Garde de fin de ligne de l'automate. Sans elle, `L'équilibre` ouvre une
  // pseudo-chaîne qui court jusqu'à l'apostrophe suivante du fichier, et tout
  // ce qu'elle enjambe — commentaires compris — ressort comme du code. C'est
  // le motif le plus courant de ce dépôt, et c'était du code porteur que rien
  // ne retenait.
  const nettoye = sansCommentaires(
    ["export const P = () => <p>L'équilibre du patient</p>;",
      '// commentaire quelconque',
      "import { SAVOIR_FICTIF } from '@/lib/fictif/source';"].join('\n'),
  );
  assert.doesNotMatch(nettoye, /commentaire quelconque/, 'le commentaire a survécu comme du code');
  assert.match(nettoye, /SAVOIR_FICTIF/);
  // Le gabarit, lui, est légitimement multiligne.
  assert.match(sansCommentaires('const t = `ligne\nsuite`;\nconst VRAI = 1;'), /VRAI/);
});

test('un composant monté par un AUTRE composant reste visible du patient', () => {
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/components/patient/Champ.tsx': "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
    'web/src/components/patient/Formulaire.tsx': "import C from '@/components/patient/Champ';",
    'web/src/app/portail/[token]/bilan/page.tsx': "import F from '@/components/patient/Formulaire';",
  });
  assert.equal(
    construireMatrice(index, {}, [SOURCE_FICTIVE]).lignes[0].patientVisible,
    true,
    'la remontée s’arrêtait au composant parent, dont le chemin n’est jamais « patient » par lui-même',
  );
});

test('un composant du cockpit PRATICIEN ne rend pas une source visible du patient', () => {
  // `components/patient-cockpit/` est monté depuis `app/dashboard/` : c'est
  // l'écran praticien. Un préfixe `components/patient` sans séparateur
  // attrapait les deux et faisait dire à la matrice que la table
  // d'orientation est visible du patient — en contradiction avec sa propre
  // colonne « décision produite », qui dit « proposée au praticien ».
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/components/patient-cockpit/Panneau.tsx': "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
    'web/src/app/dashboard/patients/page.tsx': "import P from '@/components/patient-cockpit/Panneau';",
  });
  assert.equal(construireMatrice(index, {}, [SOURCE_FICTIVE]).lignes[0].patientVisible, false);

  const auPatient = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/components/patient/Bilan.tsx': "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
    'web/src/app/portail/[token]/bilan/page.tsx': "import B from '@/components/patient/Bilan';",
  });
  assert.equal(
    construireMatrice(auPatient, {}, [SOURCE_FICTIVE]).lignes[0].patientVisible,
    true,
    'le même composant monté depuis le portail EST visible du patient',
  );
});

test('deux drapeaux dans le même featureFlag.ts ne se contaminent pas', () => {
  // `supplement-library/featureFlag.ts` porte WN_C4_ENABLED et
  // WN_RECHERCHE_CORPUS_ENABLED ; scanner le fichier entier attribuait les
  // deux à chacun de ses accesseurs — donc WN_C4_ENABLED aux rayons de
  // recherche, dont le code dit qu'ils en sont « délibérément distincts ».
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/lib/fictif/featureFlag.ts': [
      "export function isUn(v = process.env.WN_UN) { return v === '1'; }",
      "export function isDeux(v = process.env.WN_DEUX) { return v === '1'; }",
    ].join('\n'),
    'web/src/lib/fictif/access.ts': [
      "import { isUn, isDeux } from './featureFlag';",
      'export function accesUn() { return isUn(); }',
      'export function accesDeux() { return isDeux(); }',
    ].join('\n'),
    'web/src/app/api/fictif/route.ts': [
      "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
      "import { accesUn } from '@/lib/fictif/access';",
      'export const GET = () => (accesUn() ? SAVOIR_FICTIF : null);',
    ].join('\n'),
  });
  assert.deepEqual(construireMatrice(index, {}, [SOURCE_FICTIVE]).lignes[0].drapeaux, ['WN_UN']);
});

test('un drapeau NOMMÉ dans un message d’interface n’est pas une garde', () => {
  // `featureFlag.ts` porte « Son activation métier se fait via le flag
  // WN_RECHERCHE_CORPUS_ENABLED. », une phrase affichée au praticien. Comptée
  // comme garde, elle attribuait ce drapeau à micronutrition — que servir par
  // cette porte le CONTOURNERAIT, dit le code.
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/app/api/fictif/route.ts': [
      "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
      "const MSG = 'Activation via le flag WN_MENTIONNE_SEULEMENT.';",
      "export const GET = () => (process.env.WN_VRAIE_GARDE === '1' ? SAVOIR_FICTIF : MSG);",
    ].join('\n'),
  });
  assert.deepEqual(construireMatrice(index, {}, [SOURCE_FICTIVE]).lignes[0].drapeaux, ['WN_VRAIE_GARDE']);
});

test('la colonne des drapeaux suit la garde route → access → featureFlag', () => {
  // Une route de ce dépôt ne lit presque jamais `process.env` elle-même. Sans
  // ce saut, la colonne rendait « — » pour des rayons pourtant fail-closed —
  // et un tiret s'y lit « rien ne le garde ».
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/lib/fictif/featureFlag.ts': "export const on = () => process.env.WN_FICTIF_ENABLED === '1';",
    'web/src/lib/fictif/access.ts': "import { on } from './featureFlag';\nexport const acces = on;",
    'web/src/app/api/fictif/route.ts': [
      "import { SAVOIR_FICTIF } from '@/lib/fictif/source';",
      "import { acces } from '@/lib/fictif/access';",
      'export const GET = () => (acces() ? SAVOIR_FICTIF : null);',
    ].join('\n'),
  });
  const { lignes } = construireMatrice(index, {}, [SOURCE_FICTIVE]);
  assert.deepEqual(lignes[0].drapeaux, ['WN_FICTIF_ENABLED']);
});

test('un drapeau du VOISINAGE lointain n’est pas attribué à la source', () => {
  // Symétrique du test précédent : la première version ramassait les `WN_*`
  // de toute la fermeture transitive et attribuait au catalogue de
  // questionnaires quatre drapeaux qui ne le gardent pas.
  const index = indexer({
    'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;',
    'web/src/lib/fictif/relais.ts': "import { SAVOIR_FICTIF } from './source';\nexport const r = SAVOIR_FICTIF;",
    'web/src/app/api/loin/route.ts': [
      "import { r } from '@/lib/fictif/relais';",
      "export const GET = () => (process.env.WN_SANS_RAPPORT === '1' ? r : null);",
    ].join('\n'),
  });
  const { lignes } = construireMatrice(index, {}, [SOURCE_FICTIVE]);
  assert.deepEqual(lignes[0].drapeaux, [], 'atteinte à distance : ce drapeau ne garde pas cette source');
});

test('nature et visibilité patient sont dérivées du chemin', () => {
  assert.equal(natureDuFichier('web/src/app/api/portail/bilan/route.ts'), 'route-api');
  assert.equal(natureDuFichier('web/src/app/dashboard/patients/page.tsx'), 'ecran');
  assert.equal(natureDuFichier('web/src/components/SynthesePanel.tsx'), 'composant');
  assert.equal(natureDuFichier('web/src/lib/anthropic.ts'), 'librairie');
  // Route handlers de l'App Router HORS `api/` — le portail patient en pose
  // plusieurs ; les classer « librairie » les sortait des surfaces.
  assert.equal(natureDuFichier('web/src/app/portail/google/route.ts'), 'route-api');
  assert.equal(natureDuFichier('web/src/app/page.tsx'), 'ecran', 'la racine du site est un écran');
});

test('la visibilité patient est vérifiée sur des chemins RÉELS du dépôt', () => {
  // Le premier banc n'exerçait que les clauses écrites dans l'implémentation :
  // il était vert alors que `components/portail/` n'existe pas et que le
  // parcours unifié livré au LOT-04 (#591) vit sous `app/portail/`.
  const reels = execFileSync('git', ['ls-files', 'web/src/app/portail', 'web/src/app/patient'], {
    cwd: RACINE_DEPOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((c) => /\/(page|route)\.tsx?$/.test(c));

  assert.ok(reels.length > 0, 'aucun écran de portail trouvé — la structure du dépôt a changé');
  for (const chemin of reels) {
    assert.equal(estVisiblePatient(chemin), true, `${chemin} devrait compter comme visible du patient`);
  }
  assert.equal(estVisiblePatient('web/src/app/api/praticien/synthese/route.ts'), false);
  assert.equal(estVisiblePatient('web/src/app/dashboard/patients/page.tsx'), false, 'un écran praticien qui parle de patients n’est pas le portail');
});

test('un rayon AJOUTÉ à la carte entre seul dans la matrice', () => {
  // La garantie qui compte : la liste des rayons est LUE dans rayonCorpus.ts,
  // jamais recopiée dans ce script. Un rayon ajouté sans qu'on y pense (la
  // classe de défaut de #546 puis #552) apparaît dormant au lieu de manquer.
  const index = indexer({
    'web/src/lib/supplement-library/rayonCorpus.ts': [
      "export const RAYON_MICRONUTRITION = 'micronutrition' as const;",
      'export const RAYON_VERS_NOTEBOOK = {',
      "  [RAYON_MICRONUTRITION]: '10 — Micronutrition',",
      "  tout_neuf: '11 — Rayon inventé',",
      '}',
      "export const RAYONS_RECHERCHE_CORPUS = ['tout_neuf'];",
      'export async function servirRayonCorpus() { return null; }',
    ].join('\n'),
  });

  assert.deepEqual(
    collecterRayons(index).map((r) => r.cle),
    ['micronutrition', 'tout_neuf'],
    'la clé écrite via un alias (`[RAYON_MICRONUTRITION]`) doit être résolue, pas ignorée',
  );
  assert.deepEqual(collecterAllowlistsRayons(index), [{ nom: 'RAYONS_RECHERCHE_CORPUS', membres: ['tout_neuf'] }]);

  const { lignes } = construireMatrice(index, {}, []);
  assert.deepEqual(lignes.map((l) => l.id).sort(), ['rayon:micronutrition', 'rayon:tout_neuf']);
  assert.ok(lignes.every((l) => !l.consommee), 'aucune surface dans cette fixture : les deux rayons sont dormants');
});

test("un rayon n'est consommé que par un appelant DU SERVICE, pas par un homonyme", () => {
  // « sommeil », « humeur », « stress » sont des mots courants de cette app :
  // l'agenda du sommeil contient le littéral 'sommeil' sans rien savoir du
  // corpus. Une première version comptait ces fichiers et déclarait les trois
  // rayons consommés — le faux vert exact que la matrice doit interdire.
  const index = indexer({
    'web/src/lib/supplement-library/rayonCorpus.ts': [
      'export const RAYON_VERS_NOTEBOOK = {',
      "  sommeil: '02 — Sommeil',",
      "  cognition: '05 — Cognition',",
      '}',
      "export const RAYONS_RECHERCHE_CORPUS = ['cognition'];",
      'export async function servirRayonCorpus() { return null; }',
    ].join('\n'),
    'web/src/app/api/praticien/agenda-sommeil/route.ts': "export const type = 'sommeil';",
    'web/src/app/api/praticien/corpus/rayons/route.ts': [
      "import { servirRayonCorpus, RAYONS_RECHERCHE_CORPUS } from '@/lib/supplement-library/rayonCorpus';",
      'export const GET = () => servirRayonCorpus();',
    ].join('\n'),
  });

  const { lignes } = construireMatrice(index, {}, []);
  const parId = Object.fromEntries(lignes.map((l) => [l.id, l]));
  assert.equal(parId['rayon:sommeil'].consommee, false, "l'agenda du sommeil ne consomme aucun claim");
  assert.equal(parId['rayon:cognition'].consommee, true, "membre de l'allowlist servie par la route");
});

test('les quatre formes de clé de RAYON_VERS_NOTEBOOK sont lues, et un reste non lu se voit', () => {
  // Une clé entre apostrophes ou à tiret (`'axe-thyroide'`) est la SEULE façon
  // d'écrire certains rayons. La première version, ligne à ligne et sur
  // identifiants nus, les perdait sans un mot.
  const index = indexer({
    'web/src/lib/supplement-library/rayonCorpus.ts': [
      "export const RAYON_MICRONUTRITION = 'micronutrition' as const;",
      'export const RAYON_VERS_NOTEBOOK = {',
      "  [RAYON_MICRONUTRITION]: '10 — Micronutrition',",
      "  biologie: '08 — Bio',",
      "  'axe-thyroide': '12 — Thyroïde',",
      '  "peau": \'13 — Peau\',',
      '}',
      'export async function servirRayonCorpus() { return null; }',
    ].join('\n'),
  });
  assert.deepEqual(
    collecterRayons(index).map((r) => r.cle).sort(),
    ['axe-thyroide', 'biologie', 'micronutrition', 'peau'],
  );
});

test('le parseur de rayons ne se laisse pas tromper par la valeur ni par la fermeture du bloc', () => {
  // Trois pièges trouvés en revue : un `: "` À L'INTÉRIEUR d'une valeur
  // (faux positif « non analysé » sur du TypeScript légal), une valeur non
  // littérale (omission silencieuse), et un `} as const;` indenté qui faisait
  // perdre TOUS les rayons d'un coup.
  const index = indexer({
    'web/src/lib/supplement-library/rayonCorpus.ts': [
      'export const RAYON_VERS_NOTEBOOK = {',
      "  biologie: '08 — Bio : \"cas special\"',",
      '  nutrition: NOTEBOOK_09,',
      '  sommeil: `02 — Sommeil`,',
      '} as const;',
    ].join('\n'),
  });
  const rayons = collecterRayons(index);
  assert.deepEqual(rayons.map((r) => r.cle), ['biologie', 'nutrition', 'sommeil']);
  assert.ok(!rayons.some((r) => r.cle.startsWith('NON_ANALYSÉ')), 'faux positif sur du code valide');
  assert.match(rayons[1].notebook, /non littéral/, 'un notebook illisible se dit, il ne s’invente pas');
});

test('une paire que le parseur ne sait pas lire devient une ligne visible, jamais une absence', () => {
  const index = indexer({
    'web/src/lib/supplement-library/rayonCorpus.ts': [
      'export const RAYON_VERS_NOTEBOOK = {',
      "  biologie: '08 — Bio',",
      // Alias non résolvable : aucune déclaration `ALIAS_FANTOME = '…'`.
      "  [ALIAS_FANTOME]: '99 — Inconnu',",
      '}',
    ].join('\n'),
  });
  const cles = collecterRayons(index).map((r) => r.cle);
  assert.ok(cles.includes('biologie'));
  assert.ok(
    cles.some((c) => c.startsWith('NON_ANALYSÉ')),
    'la paire illisible a disparu en silence — c’est la classe de défaut #546/#552',
  );
});

test('une entrée qui n’est pas une paire clé/valeur est signalée, pas avalée', () => {
  // Branche distincte de la précédente (alias non résolu) : ici l'entrée n'a
  // pas de forme `clé:` du tout. Un `...SPREAD` ou une clé abrégée sont du
  // TypeScript légal qui ajouterait des rayons invisibles à la matrice.
  const index = indexer({
    'web/src/lib/supplement-library/rayonCorpus.ts': [
      'export const RAYON_VERS_NOTEBOOK = {',
      "  biologie: '08 — Bio',",
      '  ...AUTRES_RAYONS,',
      '  sommeil,',
      '}',
    ].join('\n'),
  });
  const cles = collecterRayons(index).map((r) => r.cle);
  assert.deepEqual(cles.filter((c) => !c.startsWith('NON_ANALYSÉ')), ['biologie']);
  assert.equal(cles.filter((c) => c.startsWith('NON_ANALYSÉ')).length, 2);
});

test('corpsDObjet et entreesDObjet tiennent sur l’imbrication et les chaînes', () => {
  const contenu = [
    'export const OBJ = {',
    "  a: { interne: 'x, y' },",
    "  b: 'accolade { dans une chaîne',",
    "  c: 'trois',",
    '} as const;',
  ].join('\n');
  const corps = corpsDObjet(contenu, 'OBJ');
  assert.ok(corps !== null, 'un `} as const;` indenté ne doit pas faire perdre l’objet entier');
  const entrees = entreesDObjet(corps).map((e) => e.trim().split(':')[0]);
  assert.deepEqual(entrees, ['a', 'b', 'c'], 'une virgule dans une chaîne ou un objet imbriqué n’est pas un séparateur');
  assert.equal(corpsDObjet(contenu, 'INEXISTANT'), null);
});

test('chaque source déclarée désigne un module et des symboles qui EXISTENT', () => {
  // Sans ce contrôle, un module renommé rend sa ligne dormante en silence — et
  // un arbitrage daté la couvrirait sans que personne relise. C'est ainsi que
  // `FICHE_COMPLEMENT`, un symbole inexistant, a survécu à une première passe.
  const index = chargerIndexSources(RACINE_DEPOT);
  const chemins = new Set(index.map((f) => f.chemin));
  for (const source of SOURCES_DE_SAVOIR) {
    assert.ok(chemins.has(source.module), `${source.id} : module inexistant ${source.module}`);
    for (const garde of source.modulesGardes ?? []) {
      const chemin = typeof garde === 'string' ? garde : garde.chemin;
      assert.ok(chemins.has(chemin), `${source.id} : module de garde inexistant ${chemin}`);
      // Un accesseur déclaré doit exister : sinon la tranche est vide et la
      // colonne des drapeaux rend « — » sans que rien ne le signale.
      for (const nom of (typeof garde === 'string' ? [] : garde.noms ?? [])) {
        const fichier = index.find((f) => f.chemin === chemin);
        assert.ok(
          trancheExport(fichier.contenu, nom) !== null,
          `${source.id} : accesseur ${nom} introuvable dans ${chemin}`,
        );
      }
    }
    for (const symbole of source.symboles) {
      assert.ok(
        index.some((f) => mentionne(f.contenu, symbole)),
        `${source.id} : symbole ${symbole} introuvable dans web/src`,
      );
    }
  }
});

test('le Markdown livré est à jour vis-à-vis du code (garde de fraîcheur)', () => {
  // Le fichier porte « ne pas éditer à la main » ; rien ne détectait sa
  // dérive. Une source qui devient consommée laisserait le tableau afficher
  // « dormante » indéfiniment — `sansDecision` ne mord que dans l'autre sens.
  const attendu = rendreMarkdown(construireRapport(RACINE_DEPOT));
  const livre = fs.readFileSync(path.join(RACINE_DEPOT, 'docs', 'claude', 'MATRICE_CONSOMMATION.md'), 'utf8');
  assert.equal(
    livre,
    attendu,
    'docs/claude/MATRICE_CONSOMMATION.md a dérivé — rejouer `node scripts/wn-matrice-consommation.mjs --markdown`',
  );
});

test('--strict rend 2 sur une dormante non arbitrée, 0 sinon', () => {
  // Le registre et le changelog annoncent « échoue en code 2 » ; aucune passe
  // ne l'exerçait. Un code de sortie que personne ne vérifie est une promesse.
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-matrice-'));
  execFileSync('git', ['init', '--quiet'], { cwd: racine });
  fs.mkdirSync(path.join(racine, 'scripts'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(racine, 'scripts', 'wn-matrice-consommation.mjs'));
  fs.mkdirSync(path.join(racine, 'web', 'src', 'lib', 'fictif'), { recursive: true });
  // Un dépôt où AUCUNE source déclarée n'a d'appelant : toutes dormantes.
  fs.writeFileSync(path.join(racine, 'web', 'src', 'lib', 'fictif', 'x.ts'), 'export const X = 1;\n');
  execFileSync('git', ['add', '-A'], { cwd: racine });
  execFileSync('git', ['-c', 'user.email=t@wellneuro.fr', '-c', 'user.name=banc', 'commit', '--quiet', '-m', 'init'], { cwd: racine });

  const strict = spawnSync(process.execPath, [path.join(racine, 'scripts', 'wn-matrice-consommation.mjs'), '--strict'], { encoding: 'utf8' });
  assert.equal(strict.status, 2, 'des sources dormantes sans arbitrage doivent faire échouer --strict');

  const sansStrict = spawnSync(process.execPath, [path.join(racine, 'scripts', 'wn-matrice-consommation.mjs')], { encoding: 'utf8' });
  assert.equal(sansStrict.status, 0, 'sans --strict, observer ne casse pas la passe');
});

test('le Markdown nomme les dormantes au lieu de les taire', () => {
  const index = indexer({ 'web/src/lib/fictif/source.ts': 'export const SAVOIR_FICTIF = 1;' });
  const rapport = { ...construireMatrice(index, {}, [SOURCE_FICTIVE]), fichiersIndexes: 1 };
  const md = rendreMarkdown(rapport);
  assert.match(md, /aucune — dormante/);
  assert.match(md, /1 dormante\(s\)/);
  assert.match(md, /à trancher/);
  assert.match(md, /ne pas éditer à la main/);
});

test('registre de décisions absent ou invalide : statut explicite, jamais une exception', () => {
  const vide = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-matrice-'));
  assert.equal(lireDecisions(vide).status, 'missing');

  fs.mkdirSync(path.join(vide, 'docs', 'claude', 'corpus'), { recursive: true });
  fs.writeFileSync(path.join(vide, 'docs', 'claude', 'corpus', 'consommation_decisions.json'), '{ pas du json');
  const invalide = lireDecisions(vide);
  assert.equal(invalide.status, 'invalid');
  assert.deepEqual(invalide.decisions, {}, 'un registre illisible ne doit pas se confondre avec un registre vide côté forme');
});

test('un dépôt sans web/src rend une matrice vide sans lever', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-matrice-'));
  execFileSync('git', ['init', '--quiet'], { cwd: racine });
  assert.deepEqual(chargerIndexSources(racine), []);
  const rapport = construireRapport(racine);
  // Comparaison à la liste DÉCLARÉE, pas à une valeur recalculée depuis le
  // rapport lui-même : la première version comparait `lignes.length` à un
  // filtre du même tableau — une assertion que `SOURCES_DE_SAVOIR = []`
  // satisfaisait aussi.
  assert.deepEqual(
    rapport.lignes.map((l) => l.id).sort(),
    SOURCES_DE_SAVOIR.map((s) => s.id).sort(),
    'sans code, il reste exactement les sources déclarées (les rayons se lisent dans rayonCorpus.ts, absent)',
  );
  assert.ok(rapport.lignes.every((l) => !l.consommee));
});

test("le script ne dépend pas du cwd d'appel (les sessions tournent depuis web/)", () => {
  const depuisWeb = spawnSync(process.execPath, [SCRIPT], {
    cwd: path.join(RACINE_DEPOT, 'web'),
    encoding: 'utf8',
  });
  assert.equal(depuisWeb.status, 0, depuisWeb.stderr);
  const rapport = JSON.parse(depuisWeb.stdout);
  assert.ok(rapport.fichiersIndexes > 100, `lancé depuis web/, le script n'a indexé que ${rapport.fichiersIndexes} fichier(s)`);
  assert.ok(rapport.lignes.length > 10);
});

test('sur CE dépôt : tout arbitrage désigne une source réelle, et toute dormante est arbitrée', () => {
  const rapport = construireRapport(RACINE_DEPOT);
  assert.deepEqual(
    rapport.decisionsOrphelines,
    [],
    'un arbitrage sans source correspondante : la source a été renommée ou retirée sans mettre le registre à jour',
  );
  assert.deepEqual(
    rapport.sansDecision,
    [],
    'une source dormante sans décision datée — c’est exactement la dette que le LOT-05 solde',
  );
});

test("le script n'ouvre aucune connexion base et n'écrit rien hors --markdown", () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  assert.doesNotMatch(source, /\bpsql\b|@prisma\/client|new Pool\(/, 'aucune lecture de base : CLAUDE.md la réserve à l’outil MCP Supabase');
  const ecritures = [...source.matchAll(/fs\.(writeFileSync|appendFileSync|rmSync|unlinkSync)/g)];
  assert.equal(ecritures.length, 1, `une seule écriture attendue (le rendu --markdown), ${ecritures.length} trouvée(s)`);
});
