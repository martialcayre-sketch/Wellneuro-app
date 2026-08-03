// Banc de `scripts/wn-cycle.mjs`.
//
// Les faits sont injectés : aucun appel git, aucun réseau, aucun dépôt requis.
// Ce qui est vérifié ici est la seule chose que le script décide vraiment —
// dans quelle phase du cycle on se trouve, et si la fenêtre de clôture est
// passée. Le cas qui a motivé le script est `apres-merge` sans clôture
// embarquée : c'est lui qui doit sortir en échec, pas en simple constat.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cheminsDuPorcelain,
  diagnostiquer,
  SORTIE_OK,
  SORTIE_FENETRE_RATEE,
  SORTIE_PRECONDITION,
} from './wn-cycle.mjs';

const SESSION_LOG = 'docs/claude/SESSION_LOG.md';
const HANDOFF = 'docs/claude/HANDOFF_CURRENT.md';

function faits(surcharge = {}) {
  return {
    dansUnDepot: true,
    branche: 'wn/lot-06',
    brancheParDefaut: 'main',
    arbrePropre: true,
    fichiersDuLot: ['web/src/lib/questions.ts'],
    prOuverte: null,
    prMergee: null,
    ghDisponible: true,
    ...surcharge,
  };
}

test('hors dépôt git : précondition absente, aucun verdict', () => {
  const v = diagnostiquer({ dansUnDepot: false });
  assert.equal(v.phase, 'hors-depot');
  assert.equal(v.sortie, SORTIE_PRECONDITION);
});

test('sur la branche par défaut : hors-lot', () => {
  const v = diagnostiquer(faits({ branche: 'main', fichiersDuLot: [] }));
  assert.equal(v.phase, 'hors-lot');
  assert.equal(v.sortie, SORTIE_OK);
});

test('branche de lot sans clôture ni PR : travail, la clôture est annoncée avant la PR', () => {
  const v = diagnostiquer(faits());
  assert.equal(v.phase, 'travail');
  assert.deepEqual(v.cloture, { sessionLog: false, handoff: false });
  assert.equal(v.sortie, SORTIE_OK);
  assert.ok(v.suivant.some((l) => l.includes('/wn-handoff write')));
});

test('SESSION_LOG seul ne suffit pas : le handoff manquant maintient la phase travail', () => {
  const v = diagnostiquer(faits({ fichiersDuLot: ['web/src/lib/questions.ts', SESSION_LOG] }));
  assert.equal(v.phase, 'travail');
  assert.deepEqual(v.cloture, { sessionLog: true, handoff: false });
});

test('clôture complète sur la branche, aucune PR : pret-pr', () => {
  const v = diagnostiquer(faits({ fichiersDuLot: ['web/src/lib/questions.ts', SESSION_LOG, HANDOFF] }));
  assert.equal(v.phase, 'pret-pr');
  assert.equal(v.sortie, SORTIE_OK);
  assert.ok(v.suivant.some((l) => l.includes('/wn-pr apply')));
});

test('PR ouverte avec la clôture embarquée : pr-ouverte, cap sur le merge', () => {
  const v = diagnostiquer(
    faits({ fichiersDuLot: [SESSION_LOG, HANDOFF], prOuverte: { numero: 545 } }),
  );
  assert.equal(v.phase, 'pr-ouverte');
  assert.ok(v.suivant.some((l) => l.includes('/wn-merge apply')));
});

test('PR ouverte sans la clôture : dernière fenêtre, la clôture est réclamée avant le merge', () => {
  const v = diagnostiquer(faits({ prOuverte: { numero: 545 } }));
  assert.equal(v.phase, 'pr-ouverte');
  assert.equal(v.fenetreRatee, false);
  assert.ok(v.suivant.some((l) => l.includes('/wn-finish')));
  assert.ok(v.suivant.some((l) => l.includes('fenêtre')));
});

test('PR mergée avec la clôture embarquée : rien à reprendre', () => {
  const v = diagnostiquer(
    faits({ prMergee: { numero: 545, fichiers: ['web/src/lib/questions.ts', SESSION_LOG, HANDOFF] } }),
  );
  assert.equal(v.phase, 'apres-merge');
  assert.equal(v.fenetreRatee, false);
  assert.equal(v.sortie, SORTIE_OK);
});

test('PR mergée sans la clôture : fenêtre ratée, sortie en échec', () => {
  const v = diagnostiquer(faits({ prMergee: { numero: 545, fichiers: ['web/src/lib/questions.ts'] } }));
  assert.equal(v.phase, 'apres-merge');
  assert.equal(v.fenetreRatee, true);
  assert.equal(v.sortie, SORTIE_FENETRE_RATEE);
  assert.ok(v.suivant.some((l) => l.includes('depuis `main`')));
  assert.ok(v.suivant.some((l) => l.includes('Ne pas rebrancher')));
});

test('PR mergée aux fichiers inconnus : on ne conclut pas à la fenêtre ratée', () => {
  const v = diagnostiquer(faits({ prMergee: { numero: 545, fichiers: null } }));
  assert.equal(v.phase, 'apres-merge');
  assert.equal(v.fenetreRatee, false);
  assert.equal(v.sortie, SORTIE_OK);
});

test('la preuve de merge prime sur le diff local : une branche squashée reste apres-merge', () => {
  // Sous squash-merge la branche locale survit intacte ; rien dans git seul ne
  // la distingue d'une branche de travail. Si le diff décidait, on rendrait
  // « travail » et le skill écrirait dans le vide.
  const v = diagnostiquer(
    faits({
      fichiersDuLot: ['web/src/lib/questions.ts'],
      prMergee: { numero: 545, fichiers: ['web/src/lib/questions.ts'] },
    }),
  );
  assert.equal(v.phase, 'apres-merge');
});

test('gh indisponible : verdict partiel rendu, jamais une erreur', () => {
  const v = diagnostiquer(faits({ ghDisponible: false }));
  assert.equal(v.phase, 'travail');
  assert.equal(v.sortie, SORTIE_OK);
});

// `/wn-finish` et `/wn-handoff` écrivent avant le commit : si seul le diff
// committé comptait, la clôture serait déclarée absente une seconde après
// avoir été écrite, et le verdict renverrait sur lui-même.
test('porcelain : un fichier écrit mais non committé compte', () => {
  const chemins = cheminsDuPorcelain(` M web/src/lib/questions.ts\n?? ${HANDOFF}\nA  ${SESSION_LOG}`);
  assert.deepEqual(chemins, ['web/src/lib/questions.ts', HANDOFF, SESSION_LOG]);
});

test('porcelain : un renommage compte par sa destination', () => {
  assert.deepEqual(cheminsDuPorcelain('R  docs/vieux.md -> docs/neuf.md'), ['docs/neuf.md']);
});

test('porcelain vide ou nul : aucun chemin', () => {
  assert.deepEqual(cheminsDuPorcelain(''), []);
  assert.deepEqual(cheminsDuPorcelain(null), []);
});
