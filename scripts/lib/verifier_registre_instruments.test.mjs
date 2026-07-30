// Banc du validateur de registre des instruments.
// Lancer : node --test scripts/lib/verifier_registre_instruments.test.mjs
//
// Ce que ce banc protège : le faux vert. Un garde qui n'échoue jamais ne
// protège de rien — chaque cas ci-dessous a été signalé comme faux vert
// plausible par la revue indépendante du 2026-07-25.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { verifierRegistreInstruments, extraireSourcesEquilibre, extraireIdsSuspendus } = require('./verifier_registre_instruments.js');

// Extrait du catalogue servi, dans sa forme réelle : une entrée active, une
// suspendue — et, comme dans le vrai fichier, un COMMENTAIRE qui parle de
// `actif: false` en prose. C'est ce commentaire qui a fait déclarer suspendus deux
// instruments actifs le 2026-07-29 ; la fixture le porte pour que ça ne revienne pas.
const CATALOGUE_VALIDE = `
export const QUESTIONNAIRES_CATALOG = [
  { id: 'Q_ALI_01', titre: 'Enquête alimentaire', categorie: 'Alimentation',
    description: \`57 items.\`, duree: '15 min' },
  // Le champ \`actif: false\` retire l'entrée des écrans et des trois chemins
  // d'assignation. Cette phrase-ci ne suspend rien : c'est de la prose.
  { id: 'Q_SOM_07', titre: 'MFI-20', categorie: 'Sommeil',
    description: \`20 items.\`, duree: '10 min', actif: false },
];
// Les instruments suspendus — \`actif: false\`. À importer par les routes.
`;

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
    catalogueSource: CATALOGUE_VALIDE,
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

// ── Cohérence de l'échelle de certification ────────────────────────────────
// Ajoutés le 2026-07-29. Le vocabulaire fermé, seul, accepte `publie` sur une
// entrée sans source et aux droits non vérifiés : il contrôle la VALEUR du
// barreau, pas les PIÈCES qui le portent. Les cas ci-dessous montent chaque
// barreau sans sa pièce et exigent un refus.

// `detail` porte un vrai fondement : depuis le 2026-07-29 le vérificateur exige
// qu'un statut de droits dégagé dise SUR QUOI il repose. Une fixture qui s'en
// dispenserait ne représenterait plus une entrée valide.
const DEGAGE = { statut: 'permission_obtenue', detail: "déclaration du praticien du 2026-07-29, périmètre cabinet ; fondement écrit au dossier, non une pièce signée de l'ayant droit", dateVerification: '2026-07-29' };
const VERDICT_PROPRE = { banc: 'certify', date: '2026-07-29', divergencesCritiques: 0 };

test('barreau source_obtenue et au-delà sans aucune source : détecté', () => {
  for (const statut of ['source_obtenue', 'droits_verifies', 'contenu_verrouille', 'publie']) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ statutCertification: statut, sourceIds: [] })] },
    });
    assert.ok(
      erreurs.some(e => /sans aucune source au dossier/.test(e)),
      `${statut} : le barreau devait être refusé faute de source`
    );
  }
});

test('barreau droits_verifies sans FONDEMENT écrit : détecté', () => {
  // Ajouté le 2026-07-29. `permission_obtenue` + une date suffisaient à franchir
  // le barreau avec un `detail` vide : le registre faisait alors autorité sans
  // rien produire à l'appui. Le jour même, 42 instruments ont été dégagés sur une
  // DÉCLARATION du praticien et non sur une pièce signée de l'ayant droit — la
  // distinction ne vit que dans ce champ, et rien ne la gardait. Le changelog de
  // ce lot affirmait d'ailleurs l'existence d'un contrôle qui n'existait pas ;
  // c'est celui-ci.
  for (const detail of [null, '', '   ', 'ok', 'déclaration']) {
    const { erreurs } = verifier({
      registre: {
        instruments: [entree({
          statutCertification: 'droits_verifies',
          sourceIds: ['WN-SRC-0001'],
          droits: { statut: 'permission_obtenue', detail, dateVerification: '2026-07-29' },
        })],
      },
    });
    assert.ok(
      erreurs.some(e => /sans fondement écrit/.test(e)),
      `detail ${JSON.stringify(detail)} : le barreau devait être refusé faute de fondement`
    );
  }
  // Anti-sur-filtrage : un fondement réellement écrit passe. Sans ce contrôle, la
  // garde pourrait refuser tout le monde et rester verte sur les cas ci-dessus.
  const { erreurs } = verifier({
    registre: {
      instruments: [entree({
        statutCertification: 'droits_verifies', sourceIds: ['WN-SRC-0001'], droits: DEGAGE,
      })],
    },
  });
  assert.deepEqual(erreurs.filter(e => /sans fondement écrit/.test(e)), []);
});

test('barreau droits_verifies sans droits dégagés : détecté dans les trois cas', () => {
  const cas = [
    // Droits jamais tranchés.
    { statut: 'a_verifier', detail: null, dateVerification: null },
    // Verdict rendu, mais NÉGATIF : une licence manque. Il ne dégage rien.
    { statut: 'licence_requise', detail: '© MHS', dateVerification: '2026-07-29' },
    // Statut favorable, mais sans date : rien ne dit quand ni sur quelle pièce.
    { statut: 'permission_obtenue', detail: "déclaration du praticien du 2026-07-29, périmètre cabinet ; fondement écrit au dossier, non une pièce signée de l'ayant droit", dateVerification: null },
  ];
  for (const droits of cas) {
    const { erreurs } = verifier({
      registre: {
        instruments: [entree({ statutCertification: 'droits_verifies', sourceIds: ['WN-SRC-0001'], droits })],
      },
    });
    assert.ok(
      erreurs.some(e => /droits ne sont pas dégagés/.test(e)),
      `droits.statut ${droits.statut} / date ${droits.dateVerification} : le barreau devait être refusé`
    );
  }
});

test("barreau contenu_verrouille alors que le contenu reste 'a_auditer' : détecté", () => {
  const { erreurs } = verifier({
    registre: {
      instruments: [entree({
        statutCertification: 'contenu_verrouille',
        sourceIds: ['WN-SRC-0001'],
        droits: DEGAGE,
        versionServie: { description: null, statutContenu: 'a_auditer' },
      })],
    },
  });
  assert.ok(erreurs.some(e => /contenu servi reste 'a_auditer'/.test(e)));
});

test('barreau psychometrie_revue sans preuve au dossier : détecté', () => {
  const montee = {
    statutCertification: 'psychometrie_revue',
    sourceIds: ['WN-SRC-0001'],
    droits: DEGAGE,
    versionServie: { description: '21 items', statutContenu: 'adapte' },
    verdictScoring: VERDICT_PROPRE,
  };
  const sansPreuve = verifier({ registre: { instruments: [entree(montee)] } });
  assert.ok(sansPreuve.erreurs.some(e => /sans aucune preuve psychométrique/.test(e)));

  // Et la garde se lève dès qu'une étude porte sur cet instrument : sinon elle
  // rendrait le barreau inatteignable, ce qui n'est pas garder mais interdire.
  const avecPreuve = verifier({
    registre: { instruments: [entree(montee)] },
    evidence: { etudes: [{ questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'B', doi: '10.0/x' }] },
  });
  assert.deepEqual(avecPreuve.erreurs, []);
});

test('états terminaux : exemptés de la cohérence de barreau, pas traités comme `publie`', () => {
  // Sur un instrument RÉELLEMENT retiré de la production : c'est là que l'exemption
  // a un sens. Sur un instrument actif, elle est refusée — test suivant.
  for (const statut of ['suspendu', 'remplace']) {
    const { erreurs } = verifier({
      idsCatalogue: ['Q_SOM_07'],
      registre: { instruments: [entree({ questionnaireId: 'Q_SOM_07', driveMd: null, sourceMonEquilibre: false, statutCertification: statut, sourceIds: [] })] },
    });
    assert.deepEqual(erreurs, [], `${statut} est hors échelle : aucune pièce ne doit lui être exigée`);
  }
});

test('état terminal sur un instrument ACTIF au catalogue : détecté', () => {
  // Le contrôle à sens unique laissait passer la réactivation — que le catalogue
  // annonce par écrit pour Q_SOM_07. L'instrument serait revenu en production en
  // gardant `suspendu`, donc dispensé de source, de droits, de contenu et de verdict.
  for (const statut of ['suspendu', 'remplace']) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ statutCertification: statut, sourceIds: [] })] },
    });
    assert.ok(
      erreurs.some(e => /ACTIF au catalogue/.test(e)),
      `${statut} sur un instrument actif doit être refusé`
    );
  }
});

test('montée complète et justifiée : acceptée', () => {
  const { erreurs } = verifier({
    registre: {
      instruments: [entree({
        statutCertification: 'scoring_verifie',
        sourceIds: ['WN-SRC-0001'],
        droits: DEGAGE,
        versionServie: { description: '21 items en 3 sections, score sur 42', statutContenu: 'adapte' },
        verdictScoring: VERDICT_PROPRE,
      })],
    },
  });
  assert.deepEqual(erreurs, []);
});

// ── Ajouts après la revue adversariale du 2026-07-29 (NO-GO) ───────────────

test('barreau scoring_verifie sans verdict de banc exploitable : détecté', () => {
  const socle = {
    statutCertification: 'scoring_verifie',
    sourceIds: ['WN-SRC-0001'],
    droits: DEGAGE,
    versionServie: { description: '21 items', statutContenu: 'adapte' },
  };
  const cas = [
    // Aucun verdict : le critère ne vivait que hors dépôt.
    null,
    // Verdict rendu, mais l'instrument porte des divergences critiques.
    { banc: 'certify', date: '2026-07-29', divergencesCritiques: 2 },
  ];
  for (const verdictScoring of cas) {
    const { erreurs } = verifier({ registre: { instruments: [entree({ ...socle, verdictScoring })] } });
    assert.ok(
      erreurs.some(e => /sans verdict de banc exploitable/.test(e)),
      `verdictScoring ${JSON.stringify(verdictScoring)} : le barreau devait être refusé`
    );
  }

  // Un verdict mal formé bloque aussi ce barreau — par l'autre message, celui qui
  // vaut à tous les barreaux. Ce qui compte est qu'il ne monte pas.
  for (const verdictScoring of [
    { banc: 'certify', date: null, divergencesCritiques: 0 },
    { banc: 'certify', date: 'à confirmer', divergencesCritiques: 0 },
  ]) {
    const { erreurs } = verifier({ registre: { instruments: [entree({ ...socle, verdictScoring })] } });
    assert.ok(erreurs.length > 0, `verdictScoring ${JSON.stringify(verdictScoring)} : le barreau devait être refusé`);
  }
});

test('les barreaux au-dessus de scoring_verifie en héritent la pièce', () => {
  for (const statut of ['psychometrie_revue', 'mapping_clinique_approuve', 'publie']) {
    const { erreurs } = verifier({
      registre: {
        instruments: [entree({
          statutCertification: statut,
          sourceIds: ['WN-SRC-0001'],
          droits: DEGAGE,
          versionServie: { description: '21 items', statutContenu: 'adapte' },
          verdictScoring: { banc: 'certify', date: '2026-07-29', divergencesCritiques: 3 },
        })],
      },
    });
    assert.ok(
      erreurs.some(e => /sans verdict de banc exploitable/.test(e)),
      `${statut} : un barreau haut ne doit pas contourner la pièce d'un barreau bas`
    );
  }
});

test("instrument retiré de la production (actif: false) au-dessus de 'repere' : détecté", () => {
  const suspendu = { questionnaireId: 'Q_SOM_07', driveMd: null, sourceMonEquilibre: false };
  const commun = { idsCatalogue: ['Q_SOM_07'], sourceIdsCorpus: new Set(['WN-SRC-0001']) };

  for (const statut of ['repere', 'source_obtenue', 'contenu_verrouille', 'scoring_verifie']) {
    const { erreurs } = verifier({
      ...commun,
      registre: { instruments: [entree({ ...suspendu, statutCertification: statut, sourceIds: ['WN-SRC-0001'] })] },
    });
    assert.ok(
      erreurs.some(e => /retiré de la production/.test(e)),
      `${statut} : un instrument suspendu ne doit pas gravir l'échelle`
    );
  }

  // Les deux états terminaux sont les seuls acceptés.
  for (const statut of ['suspendu', 'remplace']) {
    const { erreurs } = verifier({
      ...commun,
      registre: { instruments: [entree({ ...suspendu, statutCertification: statut, sourceIds: [] })] },
    });
    assert.deepEqual(erreurs, [], `${statut} doit être accepté pour un instrument suspendu`);
  }
});

test('catalogue illisible : le garde des suspendus échoue au lieu de rester muet', () => {
  // Aucune mention d'`actif` : le catalogue n'est pas celui qu'on croit.
  const absent = verifier({ catalogueSource: 'export const RIEN = [];' });
  assert.ok(absent.erreurs.some(e => /instruments suspendus introuvables/.test(e)));

  // Un `actif: false` qu'aucun identifiant ne précède : la forme du catalogue a
  // changé. Rendre un ensemble incomplet ferait passer un suspendu pour actif —
  // le garde doit se déclarer aveugle plutôt que de rendre une réponse partielle.
  const orphelin = verifier({
    catalogueSource: "export const CAT = [\n  { titre: 'sans identifiant', actif: false },\n];",
  });
  assert.ok(orphelin.erreurs.some(e => /instruments suspendus introuvables/.test(e)));
  assert.equal(extraireIdsSuspendus("export const CAT = [{ titre: 'x', actif: false }];"), null);
});

test("l'extraction des suspendus ne retient que les entrées actif: false", () => {
  assert.deepEqual([...extraireIdsSuspendus(CATALOGUE_VALIDE)], ['Q_SOM_07']);
});

test('dateVerification : une forme de date qui n’est pas une date est refusée', () => {
  for (const date of ['2026-13-45', '2026-02-30', '2026-00-10', 'à confirmer', '2026-7-9']) {
    const { erreurs } = verifier({
      registre: {
        instruments: [entree({
          statutCertification: 'droits_verifies',
          sourceIds: ['WN-SRC-0001'],
          droits: { statut: 'permission_obtenue', detail: "déclaration du praticien du 2026-07-29, périmètre cabinet ; fondement écrit au dossier, non une pièce signée de l'ayant droit", dateVerification: date },
        })],
      },
    });
    assert.ok(erreurs.some(e => /droits ne sont pas dégagés/.test(e)), `${date} devait être refusée`);
  }
});

test('verdictScoring mal formé : refusé même SOUS le barreau qui l’exige', () => {
  const cas = [
    { banc: '', date: '2026-07-29', divergencesCritiques: 0 },
    { banc: 'certify', date: '2026-13-45', divergencesCritiques: 0 },
    { banc: 'certify', date: '2026-07-29', divergencesCritiques: 'plein' },
    { banc: 'certify', date: '2026-07-29', divergencesCritiques: -1 },
  ];
  for (const verdictScoring of cas) {
    // `repere` : très en dessous du barreau qui consomme ce champ. Un verdict faux
    // inscrit ici passait sans contrôle et devenait vrai le jour de la montée.
    const { erreurs } = verifier({ registre: { instruments: [entree({ verdictScoring })] } });
    assert.ok(
      erreurs.some(e => /verdictScoring mal formé/.test(e)),
      `${JSON.stringify(verdictScoring)} devait être refusé`
    );
  }
});

test("l'extraction des suspendus résiste aux mentions qui n'en sont pas", () => {
  const actif = "  { id: 'Q_AAA_01', titre: 'x', actif: true },\n";
  const suspendu = "  { id: 'Q_BBB_02', titre: 'y', actif: false },\n";
  const cas = [
    ['commentaire en fin de ligne', `const C = [\n  { id: 'Q_AAA_01', actif: true }, // jamais actif: false\n${suspendu}];`],
    ['chaîne', `const C = [\n  { id: 'Q_AAA_01', d: 'ne pas confondre avec actif: false', actif: true },\n${suspendu}];`],
    ['littéral gabarit', `const C = [\n  { id: 'Q_AAA_01', d: \`mention actif: false\`, actif: true },\n${suspendu}];`],
    ['commentaire de bloc', `const C = [\n${actif}  /* actif: false ailleurs */\n${suspendu}];`],
  ];
  for (const [nom, source] of cas) {
    assert.deepEqual([...extraireIdsSuspendus(source)], ['Q_BBB_02'], `${nom} : ne doit pas suspendre un instrument actif`);
  }

  // `actif` déclaré AVANT l'`id` : TypeScript l'autorise, et le rattachement au
  // dernier identifiant croisé désignerait l'entrée PRÉCÉDENTE — un actif déclaré
  // suspendu, et le vrai suspendu manqué. Le garde doit se déclarer aveugle.
  assert.equal(extraireIdsSuspendus(`const C = [\n${actif}  { actif: false, id: 'Q_BBB_02' },\n];`), null);
});

test("l'extraction des suspendus dit la vérité sur le catalogue réel", () => {
  // Le seul test qui confronte le garde à la source de vérité plutôt qu'à une
  // fixture : c'est sur le vrai fichier que les trois extractions fausses ont porté.
  const racine = new URL('../../', import.meta.url);
  const source = readFileSync(new URL('web/src/lib/questionnaires-catalog.ts', racine), 'utf8');
  const extraits = [...extraireIdsSuspendus(source)].sort();

  // Vérité terrain calculée AUTREMENT que par la fonction testée : lignes de
  // commentaire retirées, puis découpage d'une entrée à la suivante. Grossier, mais
  // indépendant — un banc qui rejoue l'algorithme qu'il vérifie ne vérifie rien.
  const lignes = source.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const bornes = [...lignes.matchAll(/id:\s*'(Q_[A-Z]{3}_\d{2})'/g)];
  const attendus = bornes
    .filter((m, k) => /actif:\s*false/.test(lignes.slice(m.index, bornes[k + 1]?.index)))
    .map(m => m[1]).sort();

  assert.deepEqual(extraits, attendus);
  assert.ok(extraits.length > 0, 'le catalogue réel porte des suspendus : un ensemble vide serait un faux vert');
});

test("un instrument créé localement atteint source_obtenue sans source externe", () => {
  const creeLocalement = {
    statutCertification: 'source_obtenue',
    sourceIds: [],
    versionServie: { description: null, statutContenu: 'cree_localement' },
  };
  assert.deepEqual(verifier({ registre: { instruments: [entree(creeLocalement)] } }).erreurs, []);

  // L'exemption est bornée au contenu créé localement : elle ne dispense personne d'autre.
  const emprunte = { ...creeLocalement, versionServie: { description: null, statutContenu: 'traduit' } };
  assert.ok(
    verifier({ registre: { instruments: [entree(emprunte)] } }).erreurs.some(e => /sans aucune source/.test(e)),
    "l'exemption ne doit pas s'étendre aux instruments tiers"
  );
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

// ── Fraîcheur du verdict de banc ────────────────────────────────────────────
//
// Un verdict certifie un scoring À UN INSTANT DONNÉ, et rien ne le reliait au
// code qu'il certifie : le 2026-07-30, deux instruments étaient `scoring_verifie`
// sur un verdict antérieur à la réécriture de leur propre grille — le QDRS a vu
// ses cinq bandes réalignées le matin et portait encore le verdict de la veille.
const VERDICT = { banc: 'certify', date: '2026-07-30', divergencesCritiques: 0 };

test('verdict antérieur à sa propre révision : refusé', () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({
      verdictScoring: { ...VERDICT, date: '2026-07-29', revision: { date: '2026-07-30', notes: ['grille réécrite'] } },
    })] },
  });
  assert.ok(
    erreurs.some(e => /verdictScoring daté du 2026-07-29/.test(e)),
    `attendu un refus de fraîcheur, obtenu ${JSON.stringify(erreurs)}`,
  );
});

test('verdict postérieur ou égal à sa révision : accepté', () => {
  for (const date of ['2026-07-30', '2026-07-31']) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({
        verdictScoring: { ...VERDICT, date, revision: { date: '2026-07-30', notes: ['note'] } },
      })] },
    });
    assert.equal(erreurs.filter(e => /daté du/.test(e)).length, 0, `date ${date} refusée à tort`);
  }
});

test('SANS bloc `revision`, la garde ne voit rien — angle mort assumé, pas tacite', () => {
  // Ce test ne verrouille pas une protection : il verrouille son ABSENCE, pour
  // qu'elle soit lisible. La garde n'a qu'un témoin, `revision.date`, et ce
  // témoin est écrit à la main. La moitié du registre n'en porte pas, et le cas
  // vraiment dangereux — quelqu'un modifie une grille dans `questions.ts` sans
  // toucher au registre — la laisse muette dans TOUS les cas.
  //
  // Le seul témoin honnête est déjà produit par le banc (`empreinte-servie.json`,
  // hors dépôt) : y stocker une empreinte et la recomparer au catalogue relierait
  // enfin le verdict au code. C'est un lot à part, et cette assertion est le
  // repère qui rougira quand il sera fait.
  const { erreurs } = verifier({
    registre: { instruments: [entree({
      verdictScoring: { ...VERDICT, date: '2020-01-01' },
    })] },
  });
  assert.equal(
    erreurs.filter(e => /daté du/.test(e)).length, 0,
    'la garde est censée rester muette faute de témoin — si elle parle, elle a gagné un témoin, et ce test doit être réécrit',
  );
});
