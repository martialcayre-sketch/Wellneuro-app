// Banc du validateur du registre des sources d'intervention NNPP2.
// Lancer : node --test scripts/lib/verifier_registre_interventions.test.mjs
//
// Ce que ce banc protège : le faux vert. Un garde qui n'échoue jamais ne protège
// de rien — chaque invariant a donc ici son cas d'échec PROUVÉ, et pas seulement
// son cas passant. Même doctrine que le banc du registre des instruments.
//
// Le banc contrôle aussi le VRAI fichier du dépôt : un garde vert sur des
// fixtures et muet sur la réalité ne vaut rien.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { verifierRegistreInterventions, statutAttendu } = require('./verifier_registre_interventions.js');

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lireJson = relatif => JSON.parse(readFileSync(path.join(racine, relatif), 'utf8'));

// --- Fixtures minimales, dans la forme réelle des trois registres ---

const NOTICES = [
  { sourceId: 'WN-SRC-0001', primaryNotebook: '02 — Sommeil et chronobiologie', documentType: 'Synthèse clinique' },
  { sourceId: 'WN-SRC-0002', primaryNotebook: '04 — Humeur', documentType: 'Protocole / outil décisionnel' },
  { sourceId: 'WN-SRC-0003', primaryNotebook: '00 — Gouvernance du corpus', documentType: 'Outil clinique' },
  { sourceId: 'WN-SRC-0004', primaryNotebook: '13 — Instruments du cabinet', documentType: 'Questionnaire / échelle' },
];

const INSTRUMENTS = [{ questionnaireId: 'Q_SOM_01', sourceIds: ['WN-SRC-0004'] }];

function entree(surcharge = {}) {
  return {
    axeId: 'sommeil-chronobiologie',
    sousAxe: 'insomnie',
    sourceId: 'WN-SRC-0001',
    notebook: '02 — Sommeil et chronobiologie',
    documentType: 'Synthèse clinique',
    titre: 'Fiche synthèse insomnie et troubles anxieux def.pdf',
    tableauClinique: 'Fiche synthèse insomnie et troubles anxieux',
    neCouvrePas: null,
    prescriptiveDeclaree: true,
    claims: { valide: 29, enAttente: 0, prescriptifs: 23, mesureLe: '2026-08-03' },
    statutValidation: 'complet',
    ...surcharge,
  };
}

function registre({ interventions = [entree()], ecartees = [] } = {}) {
  return { version: 'nnpp2-interventions-registry-v1', dateAudit: '2026-08-03', interventions, ecartees };
}

const verifier = reg => verifierRegistreInterventions({ registre: reg, notices: NOTICES, instruments: INSTRUMENTS });

/** Assère qu'AU MOINS une erreur mentionne le fragment attendu. */
function echoue(verdict, fragment) {
  assert.ok(
    verdict.erreurs.some(e => e.includes(fragment)),
    `aucune erreur ne mentionne « ${fragment} » — erreurs : ${JSON.stringify(verdict.erreurs)}`,
  );
}

// --- Le cas passant, d'abord : sans lui, tous les échecs seraient triviaux ---

test('un registre correct ne produit aucune erreur', () => {
  const verdict = verifier(registre());
  assert.deepEqual(verdict.erreurs, []);
  assert.equal(verdict.retenues, 1);
  assert.deepEqual(verdict.claims, { valide: 29, enAttente: 0, prescriptifs: 23 });
});

// --- Invariant 1 : la source doit exister au registre sanitaire ---

test('un sourceId absent de source_registry est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ sourceId: 'WN-SRC-9999' })] })), 'absent de source_registry.json');
});

// --- Invariant 2 : pas de dérive silencieuse entre les deux registres ---

test('un notebook divergent du registre sanitaire est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ notebook: '04 — Humeur' })] })), 'notebook divergent');
});

test('un documentType divergent du registre sanitaire est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ documentType: 'Cours / référence' })] })), 'documentType divergent');
});

// --- Invariant 3 : le notebook 00 reste dehors ---

test('une source du notebook 00 est refusée', () => {
  const e = entree({
    sourceId: 'WN-SRC-0003',
    notebook: '00 — Gouvernance du corpus',
    documentType: 'Outil clinique',
    axeId: 'cas-complexes',
  });
  echoue(verifier(registre({ interventions: [e] })), 'notebook 00');
});

// --- Invariant 4 : disjonction avec le banc certify ---

test('une source déjà rattachée à un instrument est refusée', () => {
  const e = entree({
    sourceId: 'WN-SRC-0004',
    notebook: '13 — Instruments du cabinet',
    documentType: 'Questionnaire / échelle',
    axeId: 'instruments-cabinet',
    claims: { valide: 0, enAttente: 0, prescriptifs: 0, mesureLe: '2026-08-03' },
    statutValidation: 'sans_claim',
    motifSansClaim: 'chunks seuls par conception',
  });
  echoue(verifier(registre({ interventions: [e] })), 'banc certify');
});

test('un instrument_registry sans aucun sourceId rattaché fait échouer le contrôle de disjonction', () => {
  const verdict = verifierRegistreInterventions({ registre: registre(), notices: NOTICES, instruments: [] });
  echoue(verdict, 'contrôle de disjonction serait vide de sens');
});

// --- Invariant 5 : pas de doublon, pas de source à la fois retenue et écartée ---

test('un sourceId en double dans interventions est refusé', () => {
  echoue(verifier(registre({ interventions: [entree(), entree()] })), 'sourceId en double dans interventions');
});

test('une source à la fois retenue et écartée est refusée', () => {
  const reg = registre({ ecartees: [{ sourceId: 'WN-SRC-0001', motif: 'motif quelconque' }] });
  echoue(verifier(reg), 'à la fois retenue et écartée');
});

test('un sourceId en double dans ecartees est refusé', () => {
  const reg = registre({
    ecartees: [
      { sourceId: 'WN-SRC-0003', motif: 'notebook 00' },
      { sourceId: 'WN-SRC-0003', motif: 'notebook 00' },
    ],
  });
  echoue(verifier(reg), 'sourceId en double dans ecartees');
});

// --- Invariant 6 : une exclusion porte toujours sa raison ---

test('une écartée sans motif est refusée', () => {
  echoue(verifier(registre({ ecartees: [{ sourceId: 'WN-SRC-0003', motif: '   ' }] })), 'écartée sans motif');
});

// --- Invariant 7 : le statut ne ment jamais sur ses compteurs ---

test('un statutValidation qui contredit les compteurs est refusé', () => {
  const e = entree({ claims: { valide: 0, enAttente: 12, prescriptifs: 4, mesureLe: '2026-08-03' } });
  echoue(verifier(registre({ interventions: [e] })), 'contredit les compteurs');
});

test('sans_claim sans motifSansClaim est refusé', () => {
  const e = entree({
    claims: { valide: 0, enAttente: 0, prescriptifs: 0, mesureLe: '2026-08-03' },
    statutValidation: 'sans_claim',
  });
  echoue(verifier(registre({ interventions: [e] })), 'sans_claim sans motifSansClaim');
});

test('un motifSansClaim posé sur une source qui porte des claims est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ motifSansClaim: 'inutile' })] })), 'motifSansClaim présent');
});

test('plus de prescriptifs que de claims est refusé', () => {
  const e = entree({ claims: { valide: 5, enAttente: 0, prescriptifs: 9, mesureLe: '2026-08-03' } });
  echoue(verifier(registre({ interventions: [e] })), 'plus de claims prescriptifs');
});

test('une date de mesure absente est refusée — un compteur sans date ne dit pas s\'il est frais', () => {
  const e = entree({ claims: { valide: 29, enAttente: 0, prescriptifs: 23 } });
  echoue(verifier(registre({ interventions: [e] })), 'claims.mesureLe manquant');
});

test('statutAttendu couvre les quatre cas', () => {
  assert.equal(statutAttendu(0, 0), 'sans_claim');
  assert.equal(statutAttendu(29, 0), 'complet');
  assert.equal(statutAttendu(0, 12), 'aucun');
  assert.equal(statutAttendu(33, 21), 'partiel');
});

// --- Invariant 8 : des identifiants stables ---

test('un axeId hors table canonique est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ axeId: 'sommeil-et-chronobiologie' })] })), 'axeId hors table canonique');
});

test('un sousAxe non kebab-case est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ sousAxe: 'Insomnie Sévère' })] })), 'sousAxe doit être null');
});

test('un sousAxe null est accepté', () => {
  assert.deepEqual(verifier(registre({ interventions: [entree({ sousAxe: null })] })).erreurs, []);
});

test('un tableauClinique vide est refusé', () => {
  echoue(verifier(registre({ interventions: [entree({ tableauClinique: '  ' })] })), 'tableauClinique vide');
});

// --- Faux verts structurels : le garde doit refuser de conclure sur du vide ---

test('un registre vide ne passe pas par vacuité', () => {
  echoue(verifier(registre({ interventions: [] })), 'registre des interventions vide');
});

test('un source_registry vide fait échouer le contrôle croisé au lieu de le rendre muet', () => {
  const verdict = verifierRegistreInterventions({ registre: registre(), notices: [], instruments: INSTRUMENTS });
  echoue(verdict, 'source_registry.json vide');
});

test('interventions absent rend une erreur, jamais une exception', () => {
  const verdict = verifierRegistreInterventions({ registre: { ecartees: [] }, notices: NOTICES, instruments: INSTRUMENTS });
  echoue(verdict, 'doivent être des tableaux');
});

// --- Le vrai fichier du dépôt ---

test('le registre committé passe le garde', () => {
  const verdict = verifierRegistreInterventions({
    registre: lireJson('../docs/claude/corpus/nnpp2_interventions_registry.json'),
    notices: lireJson('../docs/claude/corpus/source_registry.json'),
    instruments: lireJson('../docs/claude/corpus/instrument_registry.json').instruments,
  });
  assert.deepEqual(verdict.erreurs, []);
  assert.ok(verdict.retenues > 0, 'le registre committé ne doit pas être vide');
});

// Contre-lecture du périmètre : le registre doit contenir EXACTEMENT ce que le
// critère de sélection désigne. C'est ce qui attrape une entrée oubliée à la
// saisie — un contrôle d'intégrité interne ne la verrait jamais.
test('le registre committé couvre exactement le périmètre du critère de sélection', () => {
  const notices = lireJson('../docs/claude/corpus/source_registry.json');
  const reg = lireJson('../docs/claude/corpus/nnpp2_interventions_registry.json');

  const TYPES = new Set(['Protocole / outil décisionnel', 'Synthèse clinique', 'Outil clinique']);
  const MOTIF = /synth|ordonnance|protocole|prise en charge|conduite/i;

  const attendues = notices.filter(n => TYPES.has(n.documentType) || MOTIF.test(n.title || ''));
  const retenuesAttendues = new Set(
    attendues.filter(n => !String(n.primaryNotebook || '').startsWith('00')).map(n => n.sourceId),
  );
  const ecarteesAttendues = new Set(
    attendues.filter(n => String(n.primaryNotebook || '').startsWith('00')).map(n => n.sourceId),
  );

  const retenues = new Set(reg.interventions.map(e => e.sourceId));
  const ecartees = new Set(reg.ecartees.map(e => e.sourceId));

  const manquantes = [...retenuesAttendues].filter(id => !retenues.has(id));
  const enTrop = [...retenues].filter(id => !retenuesAttendues.has(id));
  assert.deepEqual(manquantes, [], 'sources désignées par le critère mais absentes du registre');
  assert.deepEqual(enTrop, [], 'sources du registre que le critère ne désigne pas');
  assert.deepEqual([...ecarteesAttendues].filter(id => !ecartees.has(id)), [], 'notebook 00 non écarté');
});
