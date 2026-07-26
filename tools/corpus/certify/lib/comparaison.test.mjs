// Banc du comparateur SOURCE ↔ SERVI.
//
//   node --test tools/corpus/certify/lib/comparaison.test.mjs
//
// Ce que ces cas prouvent : le comparateur ÉCHOUE quand il doit échouer.
// Un banc qui ne montrerait que des cas conformes ne dirait rien de sa
// capacité à détecter — c'est exactement l'angle mort qu'on cherche à couvrir
// sur des instruments servis en production.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparer, similarite, normaliserTexte, echelleServie } from './comparaison.mjs';
import { empreinteServie, reponsesExtremes, itemsDuServi } from './servi.mjs';

/** Empreinte servie minimale, surchargeable par cas de test. */
function servi(surcharge = {}) {
  return {
    id: 'Q_TEST',
    titre: 'Instrument de test',
    sections: [{ id: 'A', titre: 'Section A', itemIds: ['T1', 'T2'] }],
    items: [
      { id: 'T1', texte: 'Je me sens en forme', type: 'likert', options: [{ v: 1, l: 'Non' }, { v: 5, l: 'Oui' }], min: null, max: null, unite: null, conditionnel: null, section: 'A' },
      { id: 'T2', texte: 'Je me sens fatigué', type: 'likert', options: [{ v: 1, l: 'Non' }, { v: 5, l: 'Oui' }], min: null, max: null, unite: null, conditionnel: null, section: 'A' },
    ],
    scoring: { type: 'sum', maxTotalDeclare: 10, bandes: [], typePorteUneInversion: false, itemsInversesDeclares: [] },
    dimensions: { noms: ['Section A'], origine: 'subScores' },
    bornesExecutees: { min: 2, max: 10, erreur: null, categoriel: false, nature: 'encadrement_par_balayage' },
    ...surcharge,
  };
}

/** Spécification source minimale, alignée sur `servi()` par défaut. */
function spec(surcharge = {}) {
  return {
    instrument: 'TEST',
    echelleReponse: { min: 1, max: 5 },
    items: [
      { numero: 1, texte: 'Je me sens en forme', inverse: false },
      { numero: 2, texte: 'Je me sens fatigué', inverse: false },
    ],
    sousEchelles: [{ nom: 'Section A', nbItems: 2 }],
    baremeGlobal: true,
    seuils: [],
    bornesTotal: { min: 2, max: 10 },
    ...surcharge,
  };
}

const codes = (resultat) => resultat.divergences.map((d) => d.code);

test('instrument conforme : aucune divergence, certifiable', () => {
  const r = comparer(servi(), spec());
  assert.deepEqual(r.divergences, []);
  assert.equal(r.resume.certifiable, true);
  assert.equal(r.resume.parGravite.critique, 0);
});

test('échelle de cotation décalée : divergence critique', () => {
  // Le cas MFI-20 : source cotée 1-5, application cotée 0-4.
  const decale = servi({
    items: servi().items.map((i) => ({ ...i, options: [{ v: 0, l: 'Non' }, { v: 4, l: 'Oui' }] })),
  });
  const r = comparer(decale, spec());
  const d = r.divergences.find((x) => x.code === 'echelle_de_cotation');
  assert.ok(d, "l'écart d'échelle doit être détecté");
  assert.equal(d.gravite, 'critique');
  assert.equal(d.attendu, '1–5');
  assert.equal(d.obtenu, '0–4');
  assert.equal(r.resume.certifiable, false);
});

test("nombre d'items différent : divergence critique", () => {
  const r = comparer(servi(), spec({ items: [...spec().items, { numero: 3, texte: 'Item surnuméraire', inverse: false }] }));
  assert.ok(codes(r).includes('nombre_items'));
  assert.equal(r.divergences.find((d) => d.code === 'nombre_items').gravite, 'critique');
});

test('inversion exigée par la source et absente du scoring : divergence critique', () => {
  const r = comparer(
    servi(),
    spec({
      items: [
        { numero: 1, texte: 'Je me sens en forme', inverse: true },
        { numero: 2, texte: 'Je me sens fatigué', inverse: false },
      ],
      formuleInversion: '6 - réponse',
    }),
  );
  const d = r.divergences.find((x) => x.code === 'inversion_absente');
  assert.ok(d);
  assert.equal(d.gravite, 'critique');
  assert.match(d.message, /6 - réponse/);
});

/** Instrument à 4 items ; `inversesServis` = positions cotées à rebours. */
function serviAvecCle(inversesServis) {
  const direct = [{ v: 1, l: 'Jamais' }, { v: 3, l: 'Parfois' }, { v: 5, l: 'Souvent' }];
  const rebours = [{ v: 5, l: 'Jamais' }, { v: 3, l: 'Parfois' }, { v: 1, l: 'Souvent' }];
  const items = [1, 2, 3, 4].map((n) => ({
    id: `P${n}`, texte: `Item ${n}`, type: 'likert',
    options: inversesServis.includes(n) ? rebours : direct,
    min: null, max: null, unite: null, conditionnel: null, section: 'A',
  }));
  return servi({ items, sections: [{ id: 'A', titre: 'A', itemIds: items.map((i) => i.id) }] });
}

function specAvecInverses(inversesSource) {
  return spec({
    items: [1, 2, 3, 4].map((n) => ({ numero: n, texte: `Item ${n}`, inverse: inversesSource.includes(n) })),
    sousEchelles: [{ nom: 'Section A', nbItems: 4 }],
  });
}

test("inversion MATÉRIALISÉE dans la clé de réponse : aucune divergence (cas PSS-10)", () => {
  // La source cote « Jamais = 5 » aux items positifs ; l'application fait de
  // même. L'inversion existe, simplement pas sous forme de formule.
  const r = comparer(serviAvecCle([2, 4]), specAvecInverses([2, 4]));
  assert.ok(!codes(r).includes('inversion_absente'), "une inversion portée par les options ne doit pas être signalée absente");
});

test('inversion attendue et absente de la clé comme du type : divergence critique (cas MFI-20)', () => {
  const r = comparer(serviAvecCle([]), specAvecInverses([2, 4]));
  const d = r.divergences.find((x) => x.code === 'inversion_absente');
  assert.ok(d);
  assert.equal(d.gravite, 'critique');
  assert.equal(d.obtenu, '2 non inversé(s) : 2, 4');
});

test('inversion PARTIELLE : signalée comme telle, avec les items restés directs', () => {
  const r = comparer(serviAvecCle([2]), specAvecInverses([2, 4]));
  const d = r.divergences.find((x) => x.code === 'inversion_absente');
  assert.ok(d, "une inversion à moitié appliquée doit être signalée");
  assert.match(d.message, /PARTIE seulement/);
  assert.equal(d.item, '4');
});

test("inversion exigée et portée par le type de scoring : pas de divergence d'inversion", () => {
  const r = comparer(
    servi({ scoring: { type: 'sum_reversed', maxTotalDeclare: 10, bandes: [], typePorteUneInversion: true } }),
    spec({ items: [{ numero: 1, texte: 'Je me sens en forme', inverse: true }, { numero: 2, texte: 'Je me sens fatigué', inverse: false }] }),
  );
  assert.ok(!codes(r).includes('inversion_absente'));
});

test('découpage en sous-échelles différent : divergence majeure', () => {
  const r = comparer(
    servi(),
    spec({ sousEchelles: [{ nom: 'Générale' }, { nom: 'Physique' }, { nom: 'Mentale' }, { nom: 'Activité' }, { nom: 'Motivation' }] }),
  );
  const d = r.divergences.find((x) => x.code === 'sous_echelles');
  assert.ok(d);
  assert.equal(d.gravite, 'majeur');
  assert.match(d.attendu, /Motivation/);
});

test("barème affiché alors que la source n'en prévoit aucun : divergence critique", () => {
  const avecBandes = servi({
    scoring: { type: 'sum', maxTotalDeclare: 10, bandes: [{ min: 0, max: 5, label: 'Normal', protocole: null }], typePorteUneInversion: false },
  });
  const r = comparer(avecBandes, spec({ baremeGlobal: false }));
  const d = r.divergences.find((x) => x.code === 'bareme_sans_source');
  assert.ok(d, "un barème sans source doit être signalé");
  assert.equal(d.gravite, 'critique');
});

test('barème adossé à la source : aucune divergence de barème', () => {
  const avecBandes = servi({
    scoring: { type: 'sum', maxTotalDeclare: 10, bandes: [{ min: 0, max: 5, label: 'Normal', protocole: null }], typePorteUneInversion: false },
  });
  const r = comparer(avecBandes, spec({ baremeGlobal: true }));
  assert.ok(!codes(r).includes('bareme_sans_source'));
});

test('seuil de la source non représenté : divergence majeure', () => {
  const r = comparer(
    servi(),
    spec({ seuils: [{ perimetre: 'sous-échelle fatigue générale', population: 'Femmes ≥ 60 ans', operateur: '>=', valeur: 14 }] }),
  );
  const d = r.divergences.find((x) => x.code === 'seuil_non_represente');
  assert.ok(d);
  assert.equal(d.gravite, 'majeur');
  assert.match(d.message, /Femmes/);
});

test('score atteignable AU-DESSUS du maximum de la source : divergence critique', () => {
  // Un patient peut réellement obtenir ce score : la preuve est directe, et le
  // barème d'interprétation ne le couvre probablement pas.
  const r = comparer(servi({ bornesExecutees: { min: 0, max: 42, erreur: null } }), spec({ bornesTotal: { min: 0, max: 35 } }));
  const d = r.divergences.find((x) => x.code === 'bornes_score_depassees');
  assert.ok(d);
  assert.equal(d.gravite, 'critique');
  assert.equal(d.attendu, '0–35');
  assert.equal(d.obtenu, 'atteint 42');
});

// Les deux cas qui ont produit deux faux positifs CRITIQUES sur le banc du
// 2026-07-25 : le PSQI (annoncé 0–21 attendu / 2–15 servi) et le QIF (0–100 /
// 10–89.9). Les deux atteignent leur maximum publié — le balayage par extrêmes
// ne le trouve pas, parce qu'une de leurs composantes décroît quand l'item
// croît (durée de sommeil, jours ressentis bien). Un plafond NON ATTEINT ne
// prouve rien ; seul un plafond DÉPASSÉ est une preuve.
test('plafond non atteint par le balayage, maxTotal déclaré conforme : aucune divergence', () => {
  const r = comparer(
    servi({ bornesExecutees: { min: 2, max: 15, erreur: null }, scoring: { ...servi().scoring, maxTotalDeclare: 21 } }),
    spec({ bornesTotal: { min: 0, max: 21 } }),
  );
  // Assertion portée sur la GRAVITÉ, pas sur des noms de codes : vérifier
  // l'absence de codes qui n'existaient pas dans la version fautive passerait
  // trivialement, et ne prouverait rien du défaut corrigé.
  assert.equal(r.resume.parGravite.critique, 0, 'un plafond non atteint ne prouve aucune divergence');
  assert.equal(r.resume.certifiable, true);
});

test('plafond non atteint ET maxTotal déclaré divergent : majeur, jamais critique', () => {
  const r = comparer(
    servi({ bornesExecutees: { min: 0, max: 15, erreur: null }, scoring: { ...servi().scoring, maxTotalDeclare: 18 } }),
    spec({ bornesTotal: { min: 0, max: 21 } }),
  );
  const d = r.divergences.find((x) => x.code === 'bornes_score_declarees');
  assert.ok(d, "l'écart de maximum DÉCLARÉ reste à signaler");
  assert.equal(d.gravite, 'majeur');
  assert.equal(r.resume.certifiable, true, 'un plafond non atteint ne doit pas bloquer la certification');
});

test('scoring catégoriel face à une source sans total : aucun faux positif', () => {
  // Le cas Berlin : le moteur rend un niveau de risque, pas un total. La
  // source n'attend pas de total non plus — il n'y a rien à signaler.
  const r = comparer(
    servi({ bornesExecutees: { min: null, max: null, erreur: null, categoriel: true } }),
    spec({ bornesTotal: null }),
  );
  assert.ok(!codes(r).includes('total_numerique_absent'));
  assert.ok(!codes(r).includes('bornes_non_executables'));
});

test('scoring catégoriel alors que la source définit un total : divergence critique', () => {
  const r = comparer(
    servi({ bornesExecutees: { min: null, max: null, erreur: null, categoriel: true } }),
    spec({ bornesTotal: { min: 0, max: 21 } }),
  );
  const d = r.divergences.find((x) => x.code === 'total_numerique_absent');
  assert.ok(d, "un total attendu par la source et absent du moteur doit être signalé");
  assert.equal(d.gravite, 'critique');
});

test("bornes nulles sans nature déclarée : signalées, jamais silencieuses", () => {
  // Si `categoriel` n'est pas renseigné, l'absence de total ne doit pas
  // pouvoir se lire comme une conformité.
  const r = comparer(servi({ bornesExecutees: { min: null, max: null, erreur: null } }), spec({ bornesTotal: null }));
  const d = r.divergences.find((x) => x.code === 'bornes_indeterminees');
  assert.ok(d, 'une nature de résultat indéterminée doit être signalée');
  assert.equal(d.gravite, 'majeur');
});

test('moteur non exécutable : divergence majeure, jamais un silence', () => {
  const r = comparer(servi({ bornesExecutees: { min: null, max: null, erreur: 'type de scoring inconnu' } }), spec());
  const d = r.divergences.find((x) => x.code === 'bornes_non_executables');
  assert.ok(d, "une exécution impossible ne doit pas passer pour une conformité");
  assert.equal(d.gravite, 'majeur');
});

test("conduites cliniques logées dans l'interprétation : divergence majeure", () => {
  // Le cas IRLS : `protocol` mêlé aux bandes de score.
  const avecProtocole = servi({
    scoring: {
      type: 'sum',
      maxTotalDeclare: 10,
      bandes: [{ min: 0, max: 5, label: 'Léger', protocole: 'Bilan biologique complet' }],
      typePorteUneInversion: false,
    },
  });
  const r = comparer(avecProtocole, spec());
  const d = r.divergences.find((x) => x.code === 'protocole_dans_interpretation');
  assert.ok(d);
  assert.equal(d.gravite, 'majeur');
});

test('libellé éloigné de la source : divergence mineure, avec le texte des deux côtés', () => {
  const r = comparer(
    servi(),
    spec({ items: [{ numero: 1, texte: "J'ai des difficultés à démarrer", inverse: false }, { numero: 2, texte: 'Je me sens fatigué', inverse: false }] }),
  );
  const d = r.divergences.find((x) => x.code === 'libelle_item');
  assert.ok(d);
  assert.equal(d.gravite, 'mineur');
  assert.equal(d.item, 'T1');
  assert.equal(d.attendu, "J'ai des difficultés à démarrer");
  assert.equal(d.obtenu, 'Je me sens en forme');
});

test('libellé proche à la casse et aux accents près : aucune divergence', () => {
  const r = comparer(servi(), spec({ items: [{ numero: 1, texte: 'JE ME SENS EN FORME', inverse: false }, { numero: 2, texte: 'je me sens FATIGUE', inverse: false }] }));
  assert.ok(!codes(r).includes('libelle_item'));
});

test('les divergences sont triées : critique avant majeur avant mineur', () => {
  const r = comparer(
    servi({
      items: servi().items.map((i) => ({ ...i, options: [{ v: 0, l: 'Non' }, { v: 4, l: 'Oui' }] })),
      scoring: { type: 'sum', maxTotalDeclare: 10, bandes: [{ min: 0, max: 5, label: 'Léger', protocole: 'Conduite' }], typePorteUneInversion: false },
    }),
    spec({ items: [{ numero: 1, texte: 'Texte totalement autre ici', inverse: false }, { numero: 2, texte: 'Je me sens fatigué', inverse: false }] }),
  );
  const gravites = r.divergences.map((d) => d.gravite);
  assert.deepEqual([...gravites].sort((a, b) => ['critique', 'majeur', 'mineur'].indexOf(a) - ['critique', 'majeur', 'mineur'].indexOf(b)), gravites);
});

test("echelleServie ignore les items numériques sans options", () => {
  const items = [
    { id: 'N1', texte: 'IMC', type: 'number', options: [], min: 10, max: 60, unite: 'kg/m²', conditionnel: null, section: 'C' },
    { id: 'T1', texte: 'Item', type: 'likert', options: [{ v: 0, l: 'Non' }, { v: 3, l: 'Oui' }], min: null, max: null, unite: null, conditionnel: null, section: 'A' },
  ];
  assert.deepEqual(echelleServie(items), { min: 0, max: 3 });
});

test('reponsesExtremes couvre options ET bornes numériques', () => {
  const items = itemsDuServi({
    sections: [
      { id: 'A', questions: [{ id: 'T1', texte: 'x', type: 'likert', options: [{ v: 1, l: 'a' }, { v: 5, l: 'b' }] }, { id: 'N1', texte: 'y', type: 'number', min: 10, max: 60 }] },
    ],
  });
  assert.deepEqual(reponsesExtremes(items, 'min'), { T1: 1, N1: 10 });
  assert.deepEqual(reponsesExtremes(items, 'max'), { T1: 5, N1: 60 });
});

test('empreinteServie obtient les bornes EN EXÉCUTANT le moteur, pas en lisant maxTotal', () => {
  const entree = {
    titre: 'Faux instrument',
    sections: [{ id: 'A', questions: [{ id: 'T1', texte: 'x', type: 'likert', options: [{ v: 0, l: 'a' }, { v: 4, l: 'b' }] }] }],
    // `maxTotal` MENT volontairement : le moteur, lui, rendra 4.
    scoring: { type: 'sum', maxTotal: 999 },
  };
  const moteur = (_id, reponses) => ({ total: Object.values(reponses).reduce((s, v) => s + v, 0) });
  const e = empreinteServie('Q_FAUX', entree, moteur);
  assert.equal(e.scoring.maxTotalDeclare, 999);
  assert.equal(e.bornesExecutees.max, 4, 'la borne doit venir du moteur, pas de la déclaration');
  assert.equal(e.bornesExecutees.min, 0);
});

test('empreinteServie signale un moteur absent au lieu de rendre des bornes nulles muettes', () => {
  const e = empreinteServie('Q_FAUX', { sections: [], scoring: {} }, undefined);
  assert.equal(e.bornesExecutees.erreur, 'calculateScore absent');
});

// ── Les trois faux positifs du banc du 2026-07-25 ──────────────────────────
// Chacun de ces cas ÉCHOUE sur la version d'origine du comparateur. Ils sont
// écrits d'après les instruments réels qui les ont produits.

test("inversion déclarée par `subScores[].reversed` : reconnue, pas accusée (cas UPPS)", () => {
  // L'UPPS déclare 25 items inversés hors du type de scoring. Le moteur les
  // applique — 45 items tous cotés 1 donnent 45/48 en Urgence. La première
  // version ne regardait que le type et annonçait « 25 items non inversés ».
  const entree = {
    titre: 'UPPS réduit',
    sections: [{ id: 'A', questions: [
      { id: 'Q001', texte: 'a', type: 'likert', options: [{ v: 1, l: 'x' }, { v: 4, l: 'y' }] },
      { id: 'Q002', texte: 'b', type: 'likert', options: [{ v: 1, l: 'x' }, { v: 4, l: 'y' }] },
    ] }],
    scoring: { type: 'upps', subScores: [{ id: 'U', label: 'Urgence', items: ['Q001', 'Q002'], reversed: ['Q002'] }] },
  };
  const e = empreinteServie('Q_NEU_05', entree, () => ({ subScores: [{ id: 'U', label: 'Urgence', total: 5 }] }));
  assert.deepEqual(e.scoring.itemsInversesDeclares, ['Q002']);

  const r = comparer(e, {
    echelleReponse: { min: 1, max: 4 },
    items: [{ numero: 1, texte: 'a', inverse: false }, { numero: 2, texte: 'b', inverse: true }],
    sousEchelles: [{ nom: 'Urgence', nbItems: 2 }],
    baremeGlobal: null, seuils: [], bornesTotal: null,
  });
  assert.ok(!codes(r).includes('inversion_absente'), "une inversion appliquée ne doit pas être signalée absente");
});

test("inversion NI déclarée NI matérialisée : toujours signalée (cas MFI-20)", () => {
  const entree = {
    titre: 'MFI réduit',
    sections: [{ id: 'A', questions: [
      { id: 'M1', texte: 'a', type: 'likert', options: [{ v: 0, l: 'x' }, { v: 4, l: 'y' }] },
      { id: 'M2', texte: 'b', type: 'likert', options: [{ v: 0, l: 'x' }, { v: 4, l: 'y' }] },
    ] }],
    scoring: { type: 'sum', maxTotal: 8 },
  };
  const e = empreinteServie('Q_SOM_07', entree, (_i, rep) => ({ total: Object.values(rep).reduce((s, v) => s + v, 0) }));
  const r = comparer(e, {
    echelleReponse: { min: 0, max: 4 },
    items: [{ numero: 1, texte: 'a', inverse: true }, { numero: 2, texte: 'b', inverse: false }],
    sousEchelles: [], baremeGlobal: null, seuils: [], bornesTotal: null,
  });
  assert.ok(codes(r).includes('inversion_absente'), 'une inversion réellement absente doit rester détectée');
});

test('sous-échelles comparées aux dimensions CALCULÉES, pas aux sections (cas DASS-21)', () => {
  // Le DASS-21 tient en une seule section d'écran et calcule trois
  // sous-échelles. Comparer aux sections annonçait « 3 → 1 ».
  const entree = {
    titre: 'DASS-21 réduit',
    sections: [{ id: 'TOUT', titre: 'Questions', questions: [{ id: 'Q1', texte: 'a', type: 'likert', options: [{ v: 0, l: 'x' }, { v: 3, l: 'y' }] }] }],
    scoring: { type: 'subscore', subScores: [{ id: 'D' }, { id: 'A' }, { id: 'S' }] },
  };
  const moteur = () => ({ subScores: [{ id: 'D', label: 'Dépression' }, { id: 'A', label: 'Anxiété' }, { id: 'S', label: 'Stress' }] });
  const e = empreinteServie('Q_STR_04', entree, moteur);
  assert.equal(e.sections.length, 1, 'une seule section d’écran');
  assert.equal(e.dimensions.noms.length, 3, 'trois dimensions calculées');

  const r = comparer(e, {
    echelleReponse: { min: 0, max: 3 },
    items: [{ numero: 1, texte: 'a', inverse: false }],
    sousEchelles: [{ nom: 'Dépression' }, { nom: 'Anxiété' }, { nom: 'Stress' }],
    baremeGlobal: null, seuils: [], bornesTotal: null,
  });
  assert.ok(!codes(r).includes('sous_echelles'), 'un découpage présent ne doit pas être signalé absent');
});

test("dimension réellement absente : toujours signalée (cas MFI-20, 5 → aucune)", () => {
  const entree = {
    titre: 'MFI réduit',
    sections: [{ id: 'A', titre: 'Tout', questions: [{ id: 'M1', texte: 'a', type: 'likert', options: [{ v: 0, l: 'x' }, { v: 4, l: 'y' }] }] }],
    scoring: { type: 'sum', maxTotal: 4 },
  };
  const e = empreinteServie('Q_SOM_07', entree, (_i, rep) => ({ total: Object.values(rep).reduce((s, v) => s + v, 0) }));
  assert.equal(e.dimensions.origine, 'aucune');
  const r = comparer(e, {
    echelleReponse: { min: 0, max: 4 },
    items: [{ numero: 1, texte: 'a', inverse: false }],
    sousEchelles: [{ nom: 'Gén' }, { nom: 'Phy' }, { nom: 'Men' }, { nom: 'Act' }, { nom: 'Mot' }],
    baremeGlobal: null, seuils: [], bornesTotal: null,
  });
  const d = r.divergences.find((x) => x.code === 'sous_echelles');
  assert.ok(d, 'cinq dimensions attendues contre aucune calculée doit être signalé');
  assert.match(d.obtenu, /aucune dimension calculée/);
});

test('normaliserTexte neutralise casse, accents et ponctuation', () => {
  assert.equal(normaliserTexte("Je me sens réveillé(e) — ÉNERGIQUE !"), 'je me sens reveille e energique');
});

test('similarite : identique vaut 1, disjoint vaut 0', () => {
  assert.equal(similarite('abc def', 'abc def'), 1);
  assert.equal(similarite('abc', 'xyz'), 0);
});
