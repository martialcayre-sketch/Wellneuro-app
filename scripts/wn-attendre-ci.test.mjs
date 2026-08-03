// Banc de `scripts/wn-attendre-ci.mjs`.
//
// Les faits sont injectés : aucun appel `gh`, aucun réseau, aucune PR requise.
// Ce qui est vérifié ici est la seule chose que le script décide vraiment —
// « le check obligatoire a-t-il RÉELLEMENT TOURNÉ ? », question que l'idiome
// remplacé confondait avec « reste-t-il quelque chose en attente ? ».
//
// C'est une donnée d'entrée qui décide de ce qui est imprimé : la classe de
// défaut qui est déjà revenue quatre fois sur le garde anti-secrets. Elle ne se
// couvre que par des fixtures, une par forme d'entrée — d'où le nombre de cas.
//
// Chaque cas assère AUSSI un fragment distinctif du message : un verdict qui
// rendrait le bon code avec le mauvais message enverrait chercher la mauvaise
// cause, et resterait vert sans cette vérification.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  causeDuCheckAbsent,
  diagnostiquer,
  normaliserCheck,
  SORTIE_VERT,
  SORTIE_ECHEC,
  SORTIE_N_A_PAS_TOURNE,
  SORTIE_DELAI,
  SORTIE_PRECONDITION,
} from './wn-attendre-ci.mjs';

const VERCEL = [
  { name: 'Vercel', status: 'COMPLETED', conclusion: 'SUCCESS' },
  { name: 'Vercel Preview Comments', status: 'COMPLETED', conclusion: 'SUCCESS' },
];

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
  const v = diagnostiquer(
    faits({ rollup: [...VERCEL, { name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }] }),
  );
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
  assert.notEqual(v.sortie, SORTIE_DELAI);
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
  assert.notEqual(v.sortie, SORTIE_VERT);
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

test('PR illisible : sortie 4, aucun verdict', () => {
  const v = diagnostiquer(faits({ pr: null }));
  assert.equal(v.sortie, SORTIE_PRECONDITION);
  assert.match(v.message, /Aucun verdict rendu/);
});

test('PR déjà mergée : sortie 4, rien à attendre', () => {
  const v = diagnostiquer(
    faits({ pr: { numero: 550, etat: 'MERGED', mergeable: 'UNKNOWN', mergeStateStatus: 'UNKNOWN' } }),
  );
  assert.equal(v.sortie, SORTIE_PRECONDITION);
  assert.match(v.message, /pas OPEN/);
});

// Le rollup mélange deux formes. Lire `name`/`status` seuls rendrait un
// StatusContext invisible — donc « absent », donc un faux positif de sortie 2.
test('forme StatusContext : `context` + `state` sont lus comme un check', () => {
  assert.deepEqual(normaliserCheck({ context: 'verify', state: 'SUCCESS' }), {
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

// Ne pas pouvoir lire la protection de branche ne doit pas passer en silence :
// la liste attendue n'est alors PAS celle qui décide du merge.
test('protection illisible : repli sur verify, et l\'avertissement est imprimé', () => {
  const v = diagnostiquer(
    faits({ contextesRequis: null, rollup: [{ name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }] }),
  );
  assert.equal(v.sortie, SORTIE_VERT);
  assert.match(v.message, /protection de branche illisible/);
  assert.match(v.message, /n'a pas été vérifiée/);
});

// Vercel ne garde pas `main` : son échec est signalé, il ne décide pas.
test('check NON obligatoire en échec : sortie 0, mais signalé', () => {
  const v = diagnostiquer(
    faits({
      rollup: [
        { name: 'Vercel', status: 'COMPLETED', conclusion: 'FAILURE' },
        { name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' },
      ],
    }),
  );
  assert.equal(v.sortie, SORTIE_VERT);
  assert.match(v.message, /NON obligatoire\(s\) en échec : Vercel → FAILURE/);
});

// La liste obligatoire vient de la protection de branche, pas d'une constante :
// un second check rendu obligatoire doit être attendu sans toucher au script.
test('deux contextes obligatoires : le second manquant suffit à bloquer', () => {
  const v = diagnostiquer(
    faits({
      contextesRequis: ['verify', 'e2e'],
      rollup: [{ name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }],
      runsExistent: false,
    }),
  );
  assert.equal(v.sortie, SORTIE_N_A_PAS_TOURNE);
  assert.match(v.message, /« e2e »/);
});

test('causeDuCheckAbsent rend null quand rien n\'est diagnosticable', () => {
  assert.equal(causeDuCheckAbsent(faits()), null);
});
