// Banc des trois gardes de cohérence de l'état machine (LOT-00 de la campagne
// `2026-08-08-dettes-ouvertes-5-0`, dette 6).
//
// Il fait deux choses, et la seconde est celle qui compte :
//
// 1. Vérifier sur fixtures que chaque garde détecte SA dérive — et, sa
//    contrepartie, qu'un état sain n'en produit aucune. Un garde qui rougit
//    toujours ne garde rien, un garde qui ne rougit jamais non plus.
// 2. **Confronter le dépôt RÉEL.** C'est ici que le banc échoue si
//    `ACTIVE_CAMPAIGN.md` a été régénéré avant sa source, si un
//    `last_checked_at` a été tamponné en avance, ou si le lot courant de
//    `.wn/state.json` a divergé de `CAMPAGNE.md`. Ces trois classes sont
//    déterministes — deux fichiers du dépôt, aucune horloge —, donc jouables en
//    CI sans devenir rouges avec le temps.
//
// Ce que ce banc n'assère PAS sur le dépôt réel : le verdict « périmé »
// (`last_checked_at` de plus de sept jours). Celui-là dépend de la date du jour
// et rougirait un lundi matin sans qu'aucun commit n'ait rien cassé. Il reste
// signalé par le rapport, il ne bloque pas le CI.
//
// Question tranchée à l'ouverture du lot : le garde **échoue**, il ne répare
// pas. Une régénération automatique supprimerait la trace de la dérive au
// moment même où elle survient — or c'est le taux de récidive qui motive ce
// lot, et on ne compte pas ce qu'on efface. La réparation existe déjà et reste
// un geste explicite : `node scripts/wn-cycle.mjs --appliquer`.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { rendreVueCampagnesActives } from './lib/vue-campagnes-actives.mjs';
import { collecterCampagnes, comparerEtat, lireVueSurDisque, ordinalDeLot } from './wn-etat-reel.mjs';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const MAINTENANT = new Date('2026-08-08T12:00:00Z');

/** État minimal cohérent : aucun garde ne doit rien trouver dessus. */
function etatSain() {
  return {
    status: 'active',
    active_campaign: 'campagne-x',
    active_lot: 'LOT-03',
    validation: { last_checked_at: '2026-08-08T09:00:00Z' },
    updated_at: '2026-08-08T10:00:00Z',
  };
}

function faitsSains(etat) {
  const campagnes = [{ name: 'campagne-x', title: 'Campagne X', lotCourant: 'LOT-03' }];
  const vue = rendreVueCampagnesActives(etat, campagnes);
  return {
    worktreesVivants: [],
    dirty: false,
    maintenant: MAINTENANT,
    vueSurDisque: vue,
    vueAttendue: vue,
    lotCourantDeclare: 'LOT-03',
  };
}

function champs(ecarts) {
  return ecarts.map((ecart) => ecart.champ).sort();
}

// ── Contrepartie : l'état sain ne produit rien ──────────────────────────────

test('état cohérent : aucun écart — sans quoi les trois gardes ne prouveraient rien', () => {
  assert.deepEqual(comparerEtat(etatSain(), faitsSains(etatSain())), []);
});

// ── Garde 1 — la vue dérivée contre sa source ───────────────────────────────

test('garde 1 : une vue régénérée AVANT sa source est détectée (défaut de la PR de clôture 5.0)', () => {
  const etat = etatSain();
  const campagnes = [{ name: 'campagne-x', title: 'Campagne X', lotCourant: 'LOT-03' }];

  // La séquence exacte du 2026-08-08 : la vue est rendue depuis l'état
  // PRÉCÉDENT (lot 02), puis l'état passe au lot 03 sans que la vue soit
  // refaite. Les deux fichiers sont individuellement bien formés.
  const vuePerimee = rendreVueCampagnesActives({ ...etat, active_lot: 'LOT-02' }, campagnes);
  const ecarts = comparerEtat(etat, {
    ...faitsSains(etat),
    vueSurDisque: vuePerimee,
    vueAttendue: rendreVueCampagnesActives(etat, campagnes),
  });

  assert.deepEqual(champs(ecarts), ['ACTIVE_CAMPAIGN.md']);
  assert.match(ecarts[0].valeurStockee, /LOT-02/);
  assert.match(ecarts[0].valeurReelle, /LOT-03/);
});

test("garde 1 : une vue éditée à la main — même d'un seul mot — est détectée", () => {
  const etat = etatSain();
  const faits = faitsSains(etat);
  const ecarts = comparerEtat(etat, {
    ...faits,
    vueSurDisque: faits.vueAttendue.replace('Campagne X', 'Campagne X (en pause)'),
  });
  assert.deepEqual(champs(ecarts), ['ACTIVE_CAMPAIGN.md']);
});

test('garde 1 : sans état daté, aucune comparaison — jamais un écart inventé', () => {
  // `vueAttendue: null` est ce que `construireRapport` passe quand
  // `updated_at` manque : le rendu devrait alors inventer une date, et la
  // comparaison rougirait sur du bruit.
  const etat = { ...etatSain(), updated_at: undefined };
  const ecarts = comparerEtat(etat, { ...faitsSains(etatSain()), vueAttendue: null });
  assert.deepEqual(champs(ecarts), []);
});

// ── Garde 2 — une validation ne précède pas l'écriture qui la porte ─────────

test('garde 2 : last_checked_at postérieur à updated_at est incohérent', () => {
  const etat = { ...etatSain(), validation: { last_checked_at: '2026-08-08T11:00:00Z' } };
  const ecarts = comparerEtat(etat, faitsSains(etat));
  assert.deepEqual(champs(ecarts), ['validation.last_checked_at vs updated_at']);
  assert.equal(ecarts[0].verdict, 'incohérent');
});

test('garde 2 : une validation exactement contemporaine de updated_at passe', () => {
  // La borne compte : `wn-cycle --appliquer` peut écrire les deux dans la même
  // seconde. Un garde en `>=` rougirait à chaque exécution normale.
  const etat = { ...etatSain(), validation: { last_checked_at: '2026-08-08T10:00:00Z' } };
  assert.deepEqual(comparerEtat(etat, faitsSains(etat)), []);
});

test('garde 2 : la date périmée et la date incohérente sont deux écarts distincts, jamais fondus', () => {
  // Vieille de 24 jours face à `maintenant` (donc périmée) ET postérieure de
  // deux semaines à l'écriture de l'état (donc incohérente).
  const etat = {
    ...etatSain(),
    validation: { last_checked_at: '2026-07-15T00:00:00Z' },
    updated_at: '2026-07-01T00:00:00Z',
  };
  const ecarts = comparerEtat(etat, faitsSains(etat));
  assert.deepEqual(champs(ecarts), [
    'validation.last_checked_at',
    'validation.last_checked_at vs updated_at',
  ]);
});

// ── Garde 3 — le lot courant, qui n'était comparé par rien ──────────────────

test('garde 3 : active_lot divergent de lot_courant est détecté (LOT-06 contre LOT-07)', () => {
  const etat = { ...etatSain(), active_lot: 'LOT-06' };
  // La vue est rendue depuis le MÊME état : elle est cohérente, et c'est le
  // point — le garde 3 attrape ce que les deux autres laissent passer. C'est
  // exactement la situation du 2026-08-08 vue depuis `CAMPAGNE.md`.
  const ecarts = comparerEtat(etat, { ...faitsSains(etat), lotCourantDeclare: 'LOT-07-cloture.md' });
  assert.deepEqual(champs(ecarts), ['active_lot']);
  assert.equal(ecarts.find((e) => e.champ === 'active_lot').valeurStockee, 'LOT-06');
});

test('garde 3 : le suffixe libre du fichier de lot ne compte pas — LOT-03 vaut LOT-03-implementation.md', () => {
  const etat = etatSain();
  const ecarts = comparerEtat(etat, { ...faitsSains(etat), lotCourantDeclare: 'LOT-03-implementation.md' });
  assert.deepEqual(champs(ecarts), []);
});

test('garde 3 : hors campagne active, rien à comparer', () => {
  const etat = { ...etatSain(), active_campaign: null, active_lot: null, status: 'idle' };
  const ecarts = comparerEtat(etat, { ...faitsSains(etat), vueAttendue: null, lotCourantDeclare: 'LOT-01' });
  assert.deepEqual(champs(ecarts), []);
});

test('ordinalDeLot : « aucun », vide et non-chaîne rendent null, jamais une égalité par accident', () => {
  assert.equal(ordinalDeLot('LOT-07-cloture.md'), 'LOT-07');
  assert.equal(ordinalDeLot('lot-07'), 'LOT-07');
  assert.equal(ordinalDeLot('aucun'), null);
  assert.equal(ordinalDeLot(''), null);
  assert.equal(ordinalDeLot(null), null);
  assert.equal(ordinalDeLot(undefined), null);
});

// ── Le dépôt réel ───────────────────────────────────────────────────────────

test('DÉPÔT RÉEL — ACTIVE_CAMPAIGN.md est identique à ce que .wn/state.json produit', () => {
  const etat = JSON.parse(fs.readFileSync(path.join(RACINE, '.wn', 'state.json'), 'utf8'));
  const vueSurDisque = lireVueSurDisque(RACINE);
  assert.ok(vueSurDisque, 'docs/claude/campagnes/ACTIVE_CAMPAIGN.md doit exister');
  assert.ok(etat.updated_at, '.wn/state.json doit porter updated_at — sans lui, la vue est incomparable');

  const attendu = rendreVueCampagnesActives(etat, collecterCampagnes(RACINE));
  assert.equal(
    vueSurDisque,
    attendu,
    'La vue a dérivé de sa source. Réparer : `node scripts/wn-cycle.mjs --appliquer` (jamais à la main).',
  );
});

test('DÉPÔT RÉEL — la validation ne se prétend pas plus récente que la dernière écriture d\'état', () => {
  const etat = JSON.parse(fs.readFileSync(path.join(RACINE, '.wn', 'state.json'), 'utf8'));
  const ecarts = comparerEtat(etat, {
    worktreesVivants: [],
    dirty: null,
    // Date de l'état lui-même, pas l'horloge : ce test ne doit dépendre que de
    // deux champs du fichier. `maintenant` ne sert ici qu'au verdict « périmé »,
    // que ce banc n'assère délibérément pas.
    maintenant: new Date(etat.updated_at),
  });
  assert.deepEqual(
    ecarts.filter((ecart) => ecart.champ === 'validation.last_checked_at vs updated_at'),
    [],
  );
});

test('DÉPÔT RÉEL — le lot actif de .wn/state.json est celui que CAMPAGNE.md déclare', () => {
  const etat = JSON.parse(fs.readFileSync(path.join(RACINE, '.wn', 'state.json'), 'utf8'));
  const campagnes = collecterCampagnes(RACINE);
  const ecarts = comparerEtat(etat, {
    worktreesVivants: [],
    dirty: null,
    maintenant: new Date(etat.updated_at),
    lotCourantDeclare: campagnes.find((campagne) => campagne.name === etat.active_campaign)?.lotCourant ?? null,
  });
  assert.deepEqual(ecarts.filter((ecart) => ecart.champ === 'active_lot'), []);
});
