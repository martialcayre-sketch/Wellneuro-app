// Banc du validateur de registre des instruments.
// Lancer : node --test scripts/lib/verifier_registre_instruments.test.mjs
//
// Ce que ce banc protège : le faux vert. Un garde qui n'échoue jamais ne
// protège de rien — chaque cas ci-dessous a été signalé comme faux vert
// plausible par la revue indépendante du 2026-07-25.

import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { verifierRegistreInstruments, extraireSourcesEquilibre } = require('./verifier_registre_instruments.js');

const CONSTANTS_VALIDE = `
export const BESOIN_SOURCES: Record<number, SourceQuestionnaire[]> = {
  1: [{ idQuestionnaire: 'Q_ALI_01', max: 42, inverser: false }],
  9: [{ idQuestionnaire: 'Q_STR_02', max: 50, inverser: true }],
};

export const JOURS_JALON = { T0: 0 };
`;

function entree(surcharge = {}) {
  return {
    questionnaireId: 'Q_ALI_01',
    instrument: { nomOfficiel: 'Questionnaire alimentaire SIIN', auteurs: null, anneePublication: null, formePubliee: null, proprietaireDroits: null },
    versionServie: { description: null, langue: 'fr', traductionValidee: null, statutContenu: 'a_auditer' },
    references: { doi: null, pmid: null, dateVerification: null, verifiePar: null },
    droits: { statut: 'a_verifier', detail: null, dateVerification: null },
    cosmin: 'inconnu',
    statutCertification: 'repere',
    politiqueSuivi: { readministrable: null, intervalleMinJours: null },
    sourceMonEquilibre: true,
    sourceIds: [],
    driveMd: 'questionnaire_alimentaire_siin_contexte.md',
    statutBibliographique: 'referentiel_interne_siin',
    ...surcharge,
  };
}

function verifier(surcharge = {}) {
  return verifierRegistreInstruments({
    registre: { instruments: [entree()] },
    idsCatalogue: ['Q_ALI_01'],
    sourceIdsCorpus: new Set(['WN-SRC-0001']),
    constantsSource: CONSTANTS_VALIDE,
    matriceDrive: '| `Q_ALI_01` | `questionnaire_alimentaire_siin_contexte.md` | certifié |',
    evidence: { etudes: [] },
    ...surcharge,
  });
}

test('registre conforme : aucune erreur', () => {
  assert.deepEqual(verifier().erreurs, []);
});

test('questionnaire du catalogue sans entrée : détecté', () => {
  const { erreurs } = verifier({ idsCatalogue: ['Q_ALI_01', 'Q_STR_02'] });
  assert.equal(erreurs.length, 1);
  assert.match(erreurs[0], /Q_STR_02.*absent d'instrument_registry/);
});

test('entrée orpheline (hors catalogue) : détectée', () => {
  const { erreurs } = verifier({ idsCatalogue: [] });
  assert.ok(erreurs.some(e => /sans questionnaire correspondant/.test(e)));
});

test('doublon de questionnaireId : détecté', () => {
  const { erreurs } = verifier({ registre: { instruments: [entree(), entree()] } });
  assert.ok(erreurs.some(e => /doublon questionnaireId/.test(e)));
});

test('valeur hors vocabulaire fermé : détectée sur chaque axe', () => {
  const cas = [
    [{ statutBibliographique: 'inventé' }, /statutBibliographique inconnu/],
    [{ statutCertification: 'certifie' }, /statutCertification inconnu/],
    [{ droits: { statut: 'ok' } }, /droits\.statut inconnu/],
    [{ cosmin: 'D' }, /cosmin inconnu/],
    [{ versionServie: { statutContenu: 'parfait' } }, /statutContenu inconnu/],
  ];
  for (const [surcharge, motif] of cas) {
    const { erreurs } = verifier({ registre: { instruments: [entree(surcharge)] } });
    assert.ok(erreurs.some(e => motif.test(e)), `attendu ${motif}`);
  }
});

test('sourceId absent du registre corpus : détecté', () => {
  const { erreurs } = verifier({ registre: { instruments: [entree({ sourceIds: ['WN-SRC-9999'] })] } });
  assert.ok(erreurs.some(e => /WN-SRC-9999 absent de source_registry/.test(e)));
});

test('sourceMonEquilibre désaligné de BESOIN_SOURCES : détecté dans les deux sens', () => {
  const faussementAbsent = verifier({ registre: { instruments: [entree({ sourceMonEquilibre: false })] } });
  assert.ok(faussementAbsent.erreurs.some(e => /sourceMonEquilibre incohérent/.test(e)));

  const faussementPresent = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_CAN_01', driveMd: null, sourceMonEquilibre: true })] },
    idsCatalogue: ['Q_CAN_01'],
  });
  assert.ok(faussementPresent.erreurs.some(e => /sourceMonEquilibre incohérent/.test(e)));
});

test('BESOIN_SOURCES introuvable ou vide : le garde échoue au lieu de rester muet', () => {
  const introuvable = verifier({ constantsSource: 'export const POIDS_STRATE = {};' });
  assert.ok(introuvable.erreurs.some(e => /BESOIN_SOURCES introuvable/.test(e)));

  const vide = verifier({ constantsSource: 'export const BESOIN_SOURCES = {\n  3: [],\n};\n' });
  assert.ok(vide.erreurs.some(e => /extraction cassée|vide/.test(e)));
});

test("l'extraction est scopée au bloc BESOIN_SOURCES", () => {
  const avecAutreBloc = `${CONSTANTS_VALIDE}
export const NOYAU_ANCRAGE = [{ idQuestionnaire: 'Q_SOM_01' }];
`;
  const sources = extraireSourcesEquilibre(avecAutreBloc);
  assert.deepEqual([...sources].sort(), ['Q_ALI_01', 'Q_STR_02']);
});

test("description servie affirmée alors que le contenu est 'a_auditer' : détectée", () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({ versionServie: { description: '10 items', statutContenu: 'a_auditer' } })] },
  });
  assert.ok(erreurs.some(e => /description affirmée/.test(e)));
});

test('traçabilité bibliographique partielle : détectée', () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({ references: { doi: null, pmid: null, dateVerification: '2026-07-25', verifiePar: null } })] },
  });
  assert.ok(erreurs.some(e => /dateVerification et references\.verifiePar/.test(e)));
});

test('driveMd absent de la matrice Drive : détecté', () => {
  const { erreurs } = verifier({ matriceDrive: '| `Q_ALI_01` | `autre_fichier.md` |' });
  assert.ok(erreurs.some(e => /absent de docs\/questionnaires-drive-mapping/.test(e)));
});

test('preuve psychométrique sans référence vérifiable : détectée', () => {
  const { erreurs } = verifier({
    evidence: { etudes: [{ questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'B' }] },
  });
  assert.ok(erreurs.some(e => /au moins une référence/.test(e)));
});

test('preuve psychométrique valide : acceptée', () => {
  const { erreurs } = verifier({
    evidence: { etudes: [{ questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'B', sourceId: 'WN-SRC-0001' }] },
  });
  assert.deepEqual(erreurs, []);
});

test('structures manquantes : signalées plutôt que traversées', () => {
  assert.ok(verifier({ registre: {} }).erreurs.some(e => /instruments` doit être un tableau/.test(e)));
  assert.ok(verifier({ evidence: {} }).erreurs.some(e => /etudes` doit être un tableau/.test(e)));
  const sansNom = verifier({ registre: { instruments: [entree({ instrument: {} })] } });
  assert.ok(sansNom.erreurs.some(e => /nomOfficiel manquant/.test(e)));
});
