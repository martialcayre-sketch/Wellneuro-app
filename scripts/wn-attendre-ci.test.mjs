// Banc de `scripts/wn-attendre-ci.mjs`.
//
// Les faits sont injectés : aucun appel `gh`, aucun réseau, aucune PR requise.
// Ce qui est vérifié ici est la seule chose que le script décide vraiment —
// « puis-je annoncer cette PR prête ? », question que l'idiome remplacé
// confondait avec « reste-t-il quelque chose en attente ? ».
//
// C'est une donnée d'entrée qui décide de ce qui est imprimé : la classe de
// défaut qui est déjà revenue quatre fois sur le garde anti-secrets. Elle ne se
// couvre que par des fixtures, une par forme d'entrée — d'où le nombre de cas.
//
// Chaque cas assère AUSSI un fragment distinctif du message : un verdict qui
// rendrait le bon code avec le mauvais message enverrait chercher la mauvaise
// cause, et resterait vert sans cette vérification.
//
// Les cas marqués « survivant » ont été ajoutés après une revue adversariale
// qui a fait passer 18 tests verts à une logique fausse. Ils sont les seuls à
// tuer ces mutations-là.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  agregerParNom,
  analyserArguments,
  causesDuCheckAbsent,
  diagnostiquer,
  normaliserCheck,
  SORTIE_VERT,
  SORTIE_ECHEC,
  SORTIE_N_A_PAS_TOURNE,
  SORTIE_DELAI,
  SORTIE_INDETERMINE,
  SORTIE_NON_FUSIONNABLE,
} from './wn-attendre-ci.mjs';

const VERCEL = [
  { name: 'Vercel', status: 'COMPLETED', conclusion: 'SUCCESS' },
  { name: 'Vercel Preview Comments', status: 'COMPLETED', conclusion: 'SUCCESS' },
];
const VERIFY_VERT = { name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' };

function faits(surcharge = {}) {
  return {
    pr: { numero: 553, etat: 'OPEN', mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' },
    contextesRequis: ['verify'],
    rollup: [],
    auteurCommitTete: 'martialcayre-sketch',
    runsExistent: true,
    delaiDepasse: false,
    ...surcharge,
  };
}

test('verify vert : sortie 0, et le message dit qu\'il a réellement tourné', () => {
  const v = diagnostiquer(faits({ rollup: [...VERCEL, VERIFY_VERT] }));
  assert.equal(v.sortie, SORTIE_VERT);
  assert.equal(v.attendre, false);
  assert.match(v.message, /a réellement tourné, et est vert/);
});

test('verify en échec : sortie 1, la conclusion est nommée', () => {
  const v = diagnostiquer(
    faits({ rollup: [...VERCEL, { name: 'verify', status: 'COMPLETED', conclusion: 'FAILURE' }] }),
  );
  assert.equal(v.sortie, SORTIE_ECHEC);
  assert.match(v.message, /ÉCHEC \(verify → FAILURE\)/);
  assert.match(v.message, /Ne pas merger/);
});

// SURVIVANT — `ci.yml` se déclenche sur `push` ET `pull_request` : une PR issue
// d'une branche `campaign/**` porte DEUX runs nommés `verify` (observé sur la
// PR #528). Un `Map` construit par `.map()` gardait la DERNIÈRE entrée, c'est-à-
// dire l'ordre du tableau — que l'API ne garantit pas.
test('deux entrées « verify », une rouge une verte : sortie 1, jamais 0', () => {
  const rouge = { name: 'verify', status: 'COMPLETED', conclusion: 'FAILURE' };
  for (const rollup of [[rouge, VERIFY_VERT], [VERIFY_VERT, rouge]]) {
    const v = diagnostiquer(faits({ rollup }));
    assert.equal(v.sortie, SORTIE_ECHEC, `ordre ${JSON.stringify(rollup.map((c) => c.conclusion))}`);
    assert.notEqual(v.sortie, SORTIE_VERT);
  }
});

test('deux entrées « verify », une en cours une verte : on attend, jamais 0', () => {
  const enCours = { name: 'verify', status: 'IN_PROGRESS', conclusion: null };
  for (const rollup of [[enCours, VERIFY_VERT], [VERIFY_VERT, enCours]]) {
    const v = diagnostiquer(faits({ rollup }));
    assert.equal(v.attendre, true);
    assert.notEqual(v.sortie, SORTIE_VERT);
  }
});

test('agregerParNom cumule les entrées homonymes au lieu de les écraser', () => {
  const agg = agregerParNom(
    [
      { nom: 'verify', termine: true, conclusion: 'FAILURE' },
      { nom: 'verify', termine: true, conclusion: 'SUCCESS' },
    ],
  );
  assert.equal(agg.get('verify').entrees.length, 2);
  assert.equal(agg.get('verify').aEchec, true);
});

// LE CAS QUI A MOTIVÉ LE SCRIPT — PR #550, le 2026-08-03. Deux checks Vercel
// verts, `verify` jamais créé, PR en conflit. L'idiome remplacé rendait la main
// ici en annonçant un CI vert.
test('pas de verify + PR en conflit : sortie 2, la cause est le conflit', () => {
  const v = diagnostiquer(
    faits({ rollup: VERCEL, pr: { numero: 550, etat: 'OPEN', mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' } }),
  );
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /n'a JAMAIS été créé/);
  assert.match(v.message, /en CONFLIT avec sa base/);
  assert.match(v.message, /Checks présents : Vercel, Vercel Preview Comments/);
  assert.match(v.message, /ne prouve rien/);
});

test('pas de verify + commit de tête Copilot : sortie 2, la cause est action_required', () => {
  const v = diagnostiquer(faits({ rollup: VERCEL, auteurCommitTete: 'Copilot' }));
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /action_required/);
  assert.match(v.message, /sous le compte du dépôt/);
});

test('pas de verify + aucun run pour le sha : sortie 2, la cause est la branche squashée', () => {
  const v = diagnostiquer(faits({ rollup: VERCEL, runsExistent: false }));
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /aucun run n'existe/);
  assert.match(v.message, /squashée/);
});

// Une PR peut être à la fois en conflit ET gelée : n'en nommer qu'une enverrait
// corriger la moitié du problème.
test('plusieurs causes simultanées : toutes sont nommées', () => {
  const causes = causesDuCheckAbsent(
    faits({ pr: { numero: 1, etat: 'OPEN', mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' }, auteurCommitTete: 'Copilot', runsExistent: false }),
  );
  assert.equal(causes.length, 3);
  const v = diagnostiquer(
    faits({
      rollup: VERCEL,
      pr: { numero: 1, etat: 'OPEN', mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' },
      auteurCommitTete: 'Copilot',
    }),
  );
  assert.match(v.message, /CONFLIT/);
  assert.match(v.message, /action_required/);
});

test('pas de verify, aucune cause diagnosticable : on attend, on ne conclut pas', () => {
  const v = diagnostiquer(faits({ rollup: VERCEL }));
  assert.equal(v.sortie, null);
  assert.equal(v.attendre, true);
  assert.match(v.message, /on attend/);
});

// L'absence est plus informative que l'expiration : un verify jamais créé doit
// sortir en 2 même quand c'est le délai qui met fin à l'attente, sinon le
// message envoie chercher un run lent qui n'existe pas.
test('pas de verify, sans cause, à l\'expiration : sortie 2 et NON 3', () => {
  const v = diagnostiquer(faits({ rollup: VERCEL, delaiDepasse: true }));
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /non diagnosticable/);
});

test('rollup vide à l\'expiration : sortie 2, « Checks présents : aucun »', () => {
  const v = diagnostiquer(faits({ rollup: [], delaiDepasse: true }));
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /Checks présents : aucun/);
});

test('verify en cours : on attend', () => {
  const v = diagnostiquer(faits({ rollup: [{ name: 'verify', status: 'IN_PROGRESS', conclusion: null }] }));
  assert.equal(v.sortie, null);
  assert.equal(v.attendre, true);
  assert.match(v.message, /en cours/);
});

// Expirer n'est pas réussir. C'est la vacuité transposée : une boucle d'attente
// qui rend 0 au bout de son délai ne prouve que sa propre patience.
test('verify en cours à l\'expiration : sortie 3, jamais 0', () => {
  const v = diagnostiquer(
    faits({ rollup: [{ name: 'verify', status: 'IN_PROGRESS', conclusion: null }], delaiDepasse: true }),
  );
  assert.equal(v.sortie, SORTIE_DELAI);
  assert.match(v.message, /Expirer n'est pas réussir/);
});

// Un run gelé n'est ni un succès ni un échec : il n'a rien exécuté. Le classer
// en échec enverrait chercher un bug inexistant.
test('verify en action_required : sortie 2, décrit comme gelé et non comme un échec', () => {
  const v = diagnostiquer(
    faits({ rollup: [...VERCEL, { name: 'verify', status: 'COMPLETED', conclusion: 'ACTION_REQUIRED' }] }),
  );
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.notEqual(v.sortie, SORTIE_ECHEC);
  assert.match(v.message, /GELÉ/);
  assert.match(v.message, /n'a pas eu lieu/);
});

// SURVIVANT — reproduit sur la PR #553 le 2026-08-03 : `verify` vert, mais
// `main` avait bougé et la PR était passée en CONFLICTING. Le vert portait sur
// un commit qui n'est pas le résultat de la fusion, et le script annonçait
// « PR prête ».
test('verify vert mais PR en conflit : sortie 5, jamais 0', () => {
  const v = diagnostiquer(
    faits({
      rollup: [...VERCEL, VERIFY_VERT],
      pr: { numero: 553, etat: 'OPEN', mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' },
    }),
  );
  assert.equal(v.sortie, SORTIE_NON_FUSIONNABLE);
  assert.notEqual(v.sortie, SORTIE_VERT);
  assert.match(v.message, /pas le résultat de la fusion/);
});

// `BLOCKED` couvre le cas ordinaire d'une PR en attente de revue, et `UNKNOWN`
// le temps que GitHub calcule la fusion : bloquer dessus bloquerait presque
// toutes les PR.
test('BLOCKED et UNKNOWN ne sont PAS traités comme un conflit', () => {
  for (const [mergeable, etat] of [['MERGEABLE', 'BLOCKED'], ['UNKNOWN', 'UNKNOWN']]) {
    const v = diagnostiquer(
      faits({ rollup: [VERIFY_VERT], pr: { numero: 1, etat: 'OPEN', mergeable, mergeStateStatus: etat } }),
    );
    assert.equal(v.sortie, SORTIE_VERT, `${mergeable}/${etat}`);
  }
});

test('PR illisible : sortie 4, aucun verdict', () => {
  const v = diagnostiquer(faits({ pr: null }));
  assert.equal(v.sortie, SORTIE_INDETERMINE);
  assert.match(v.message, /Aucun verdict rendu/);
});

test('PR déjà mergée : sortie 4, rien à attendre', () => {
  const v = diagnostiquer(
    faits({ pr: { numero: 550, etat: 'MERGED', mergeable: 'UNKNOWN', mergeStateStatus: 'UNKNOWN' } }),
  );
  assert.equal(v.sortie, SORTIE_INDETERMINE);
  assert.match(v.message, /pas OPEN/);
});

// Le rollup mélange deux formes. Lire `name`/`status` seuls rendrait un
// StatusContext invisible — donc « absent », donc un faux positif de sortie 2.
test('forme StatusContext : `context` + `state` sont lus comme un check', () => {
  assert.deepEqual(normaliserCheck({ __typename: 'StatusContext', context: 'verify', state: 'SUCCESS' }), {
    nom: 'verify',
    termine: true,
    conclusion: 'SUCCESS',
  });
  assert.deepEqual(normaliserCheck({ context: 'verify', state: 'PENDING' }), {
    nom: 'verify',
    termine: false,
    conclusion: null,
  });
  const v = diagnostiquer(faits({ rollup: [{ context: 'verify', state: 'SUCCESS' }] }));
  assert.equal(v.sortie, SORTIE_VERT);
});

// Si `gh` émettait un jour `status: null` sur un StatusContext, la
// discrimination par « status absent » basculerait chaque statut en « en
// cours » : attente puis sortie 3 systématique. `__typename` tranche.
test('StatusContext avec `status: null` : `__typename` tranche', () => {
  assert.equal(normaliserCheck({ __typename: 'StatusContext', context: 'v', state: 'FAILURE', status: null }).termine, true);
  assert.equal(normaliserCheck({ __typename: 'CheckRun', name: 'v', status: 'IN_PROGRESS' }).termine, false);
});

test('formes dégradées : nom à espacer, entrée sans nom, COMPLETED sans conclusion', () => {
  assert.equal(normaliserCheck({ name: '  verify  ', status: 'COMPLETED', conclusion: 'SUCCESS' }).nom, 'verify');
  assert.equal(normaliserCheck({ status: 'COMPLETED', conclusion: 'SUCCESS' }).nom, '');
  // Un `COMPLETED` sans conclusion n'est pas vert : il penche du côté sûr.
  const v = diagnostiquer(faits({ rollup: [{ name: 'verify', status: 'COMPLETED' }] }));
  assert.equal(v.sortie, SORTIE_ECHEC);
});

// SURVIVANT — `null` (API illisible) et `[]` (protection sans check) doivent
// être traités PAREIL. Traiter `[]` comme « rien à attendre » rendait un vert
// inconditionnel sur un rollup vide : une mutation d'un caractère suffisait.
test('contextesRequis vide + verify vert : sortie 4, jamais 0', () => {
  const v = diagnostiquer(faits({ contextesRequis: [], rollup: [VERIFY_VERT] }));
  assert.notEqual(v.sortie, SORTIE_VERT);
  assert.equal(v.sortie, SORTIE_INDETERMINE);
  assert.match(v.message, /On ignore ce qu'il fallait attendre/);
});

test('contextesRequis vide + rollup vide : on attend, puis 2 — jamais 0', () => {
  assert.notEqual(diagnostiquer(faits({ contextesRequis: [], rollup: [] })).sortie, SORTIE_VERT);
  assert.equal(diagnostiquer(faits({ contextesRequis: [], rollup: [] })).attendre, true);
  assert.equal(diagnostiquer(faits({ contextesRequis: [], rollup: [], delaiDepasse: true })).sortie, SORTIE_N_A_PAS_TOURNE);
});

// Ne pas pouvoir lire la protection ne doit pas passer en silence, ET ne doit
// pas rendre le code qui autorise à annoncer une PR prête.
test('protection illisible : sortie 4 même si verify est vert', () => {
  const v = diagnostiquer(faits({ contextesRequis: null, rollup: [VERIFY_VERT] }));
  assert.equal(v.sortie, SORTIE_INDETERMINE);
  assert.match(v.message, /liste des checks OBLIGATOIRES n'a pas pu être lue/);
});

// Et surtout : ne pas qualifier « NON obligatoire » ce qu'on vient d'échouer à
// lire. C'était affirmer le contraire de ce qu'on sait.
test('protection illisible + second check rouge : aucune qualification « non obligatoire »', () => {
  const v = diagnostiquer(
    faits({ contextesRequis: null, rollup: [VERIFY_VERT, { name: 'e2e', status: 'COMPLETED', conclusion: 'FAILURE' }] }),
  );
  assert.equal(v.sortie, SORTIE_INDETERMINE);
  assert.doesNotMatch(v.message, /NON obligatoire/);
});

// Vercel ne garde pas `main` : son échec est signalé, il ne décide pas.
test('check NON obligatoire en échec, liste connue : sortie 0, mais signalé', () => {
  const v = diagnostiquer(
    faits({ rollup: [{ name: 'Vercel', status: 'COMPLETED', conclusion: 'FAILURE' }, VERIFY_VERT] }),
  );
  assert.equal(v.sortie, SORTIE_VERT);
  assert.match(v.message, /NON obligatoire\(s\) en échec : Vercel/);
});

// La liste obligatoire vient de la protection de branche, pas d'une constante :
// un second check rendu obligatoire doit être attendu sans toucher au script.
test('deux contextes obligatoires : le second manquant suffit à bloquer', () => {
  const v = diagnostiquer(
    faits({ contextesRequis: ['verify', 'e2e'], rollup: [VERIFY_VERT], runsExistent: false }),
  );
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /« e2e »/);
});

test('causesDuCheckAbsent rend une liste vide quand rien n\'est diagnosticable', () => {
  assert.deepEqual(causesDuCheckAbsent(faits()), []);
});

// `--delai 60 553` retenait « 60 » comme numéro de PR : le message le disait,
// le code de sortie — seul consommé par un skill — ne le disait pas.
test('analyserArguments : le drapeau et sa valeur ne sont pas pris pour un numéro', () => {
  assert.deepEqual(analyserArguments(['--delai', '60', '553']), { numero: '553', delai: 60 });
  assert.deepEqual(analyserArguments(['553', '--delai', '60']), { numero: '553', delai: 60 });
  assert.equal(analyserArguments(['553']).delai, 900);
  assert.equal(analyserArguments([]).numero, null);
  assert.equal(analyserArguments(['--delai']).numero, null);
});
