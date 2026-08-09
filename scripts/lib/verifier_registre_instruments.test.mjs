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
const {
  verifierRegistreInstruments,
  extraireSourcesEquilibre,
  extraireIdsSuspendus,
  STATUTS_CERTIFICATION_ECRAN,
} = require('./verifier_registre_instruments.js');

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

// Extrait de `bibliotheque.ts`, dans sa forme réelle : la liste des instruments
// administrés EN CONSULTATION. Elle porte, comme le vrai fichier, un commentaire
// en prose entre deux entrées — c'est la même chausse-trappe que pour le
// catalogue, et l'extraction doit y survivre.
const BIBLIOTHEQUE_VALIDE = `
export const PASSATION_PRATICIEN: { id: string; categorie: string }[] = [
  { id: 'Q_GEO_03', categorie: 'Gérontologie' },
  // Ce commentaire cite \`{ id: 'Q_XXX_99' }\` sans rien déclarer : c'est de la prose.
  { id: 'Q_URO_02', categorie: 'Urologie' },
];
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

// Le statut de certification SERVI, tel que l'appelant le construit depuis le
// catalogue évalué : une entrée par identifiant du catalogue, sans quoi le
// garde refuse une carte partielle. La première porte `ambigu` et non `null` —
// la carte doit porter AU MOINS un statut, faute de quoi le garde anti-mutisme
// la refuse, ce qui est tout l'objet du cas « carte sans aucun statut ».
//
// Dérivée d'`idsCatalogue` plutôt qu'écrite en dur : les cas qui changent le
// catalogue de la fixture (`Q_GEO_03`, `Q_SOM_07`) changeraient sinon de
// verdict pour une raison sans rapport avec ce qu'ils éprouvent.
function certificationsPour(idsCatalogue) {
  return new Map(idsCatalogue.map((id, index) => [id, index === 0 ? 'ambigu' : null]));
}

function verifier(surcharge = {}) {
  const idsCatalogue = surcharge.idsCatalogue ?? ['Q_ALI_01'];
  return verifierRegistreInstruments({
    registre: { instruments: [entree()] },
    sourceIdsCorpus: new Set(['WN-SRC-0001']),
    constantsSource: CONSTANTS_VALIDE,
    matriceDrive: '| `Q_ALI_01` | `questionnaire_alimentaire_siin_contexte.md` | certifié |',
    evidence: { etudes: [] },
    catalogueSource: CATALOGUE_VALIDE,
    bibliothequeSource: BIBLIOTHEQUE_VALIDE,
    certificationsCatalogue: certificationsPour(idsCatalogue),
    ...surcharge,
    idsCatalogue,
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

test('barreau psychometrie_revue : une preuve PRÉSENTE ne suffit pas, il la faut CONCLUANTE', () => {
  const montee = {
    statutCertification: 'psychometrie_revue',
    sourceIds: ['WN-SRC-0001'],
    droits: DEGAGE,
    versionServie: { description: '21 items', statutContenu: 'adapte' },
    verdictScoring: VERDICT_PROPRE,
  };
  const sansPreuve = verifier({ registre: { instruments: [entree(montee)] } });
  assert.ok(sansPreuve.erreurs.some(e => /sans preuve psychométrique CONCLUANTE/.test(e)));

  // BRANCHE 1 — preuve PRÉSENTE mais toutes `inconnu`. C'est exactement l'état
  // que le lot du 2026-08-04 a créé sur Q_PED_01, et que le test de présence
  // laissait passer.
  const preuveMuette = verifier({
    registre: { instruments: [entree({ ...montee, cosmin: 'B' })] },
    evidence: { etudes: [{ questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'inconnu', doi: '10.0/x' }] },
  });
  assert.ok(preuveMuette.erreurs.some(e => /sans preuve psychométrique CONCLUANTE/.test(e)));

  // BRANCHE 2 — preuve GRADUÉE mais `cosmin` d'entrée resté `inconnu` :
  // « psychométrie revue » et « qualité psychométrique inconnue » ne peuvent pas
  // coexister sur la même entrée.
  const entreeMuette = verifier({
    registre: { instruments: [entree(montee)] },
    evidence: { etudes: [{ questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'B', doi: '10.0/x' }] },
  });
  assert.ok(entreeMuette.erreurs.some(e => /sans preuve psychométrique CONCLUANTE/.test(e)));

  // BRANCHE 3 — les deux gradés, et concordants : la garde se lève. Sinon elle
  // rendrait le barreau inatteignable, ce qui n'est pas garder mais interdire.
  const lesDeuxGrades = verifier({
    registre: { instruments: [entree({ ...montee, cosmin: 'B' })] },
    evidence: { etudes: [{ questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'B', doi: '10.0/x' }] },
  });
  assert.deepEqual(lesDeuxGrades.erreurs, []);
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

// ── Réserve opposable ──────────────────────────────────────────────────────
// Ajoutés le 2026-08-01. `divergencesCritiques === 0` ne suffit pas.
//
// La mesure exacte, rejouée sur le code d'avant ce lot : des cinq instruments
// hors échelle, QUATRE affichaient 0 au compteur, mais DEUX seulement passaient
// réellement le vérificateur (`Q_SOM_09`, `Q_GEO_04`). Vrai du compteur, faux du
// verrou — les trois `suspendu` étaient déjà tenus par deux gardes préexistants.
// Une première rédaction annonçait quatre ; corrigé après revue, parce que
// surestimer le trou d'un facteur deux dans la pièce qui explique la garde,
// c'est refaire ici la faute que cette campagne attaque partout ailleurs.
//
// Ce qui retenait les deux instruments réellement libres n'était écrit qu'en
// français dans `revision.notes`, et rien ne le lisait. Ces cas exigent qu'une
// réserve inscrite MORDE.

const MOTIF = "aucun des 19 à 34 seuils de la source n'est servi, aucune bande d'interprétation ; 4 dimensions à la source dont 2 de validité, 0 calculée par le moteur";

test('réserve : un statut AU-DESSUS de son plafond est refusé, même à 0 divergence critique', () => {
  // Le cas Q_PED_03, celui qui nomme le trou : verdict irréprochable au compteur,
  // et une réserve qui dit que le scoring n'est pas vérifié pour autant.
  const { erreurs } = verifier({
    registre: {
      instruments: [entree({
        statutCertification: 'scoring_verifie',
        sourceIds: ['WN-SRC-0001'],
        droits: DEGAGE,
        versionServie: { description: '108 items', statutContenu: 'adapte' },
        verdictScoring: {
          ...VERDICT_PROPRE,
          reserve: { date: '2026-08-01', plafond: 'contenu_verrouille', motif: MOTIF },
        },
      })],
    },
  });
  assert.ok(
    erreurs.some(e => /au-dessus du plafond 'contenu_verrouille'/.test(e)),
    'un barreau au-dessus du plafond de sa propre réserve devait être refusé'
  );
  // Et la garde du compteur, elle, se tait : c'est bien la réserve qui refuse,
  // pas un effet de bord de l'ancienne condition.
  assert.deepEqual(erreurs.filter(e => /sans verdict de banc exploitable/.test(e)), []);
});

test('réserve : un statut AU plafond, ou en dessous, passe', () => {
  // Anti-sur-filtrage. Sans ce cas, la garde pourrait refuser tout instrument
  // porteur d'une réserve et rester verte sur le précédent.
  for (const statut of ['contenu_verrouille', 'droits_verifies', 'repere']) {
    const { erreurs } = verifier({
      registre: {
        instruments: [entree({
          statutCertification: statut,
          sourceIds: ['WN-SRC-0001'],
          droits: DEGAGE,
          versionServie: { description: '108 items', statutContenu: 'adapte' },
          verdictScoring: {
            ...VERDICT_PROPRE,
            reserve: { date: '2026-08-01', plafond: 'contenu_verrouille', motif: MOTIF },
          },
        })],
      },
    });
    assert.deepEqual(erreurs, [], `${statut} est au plafond ou en dessous : rien ne doit être refusé`);
  }
});

test('réserve mal formée : refusée, y compris SOUS le barreau qu’elle contraint', () => {
  // Inscrite bas, une réserve mal formée devient vraie le jour de la montée —
  // même raison qu'au contrôle de forme du verdict.
  const cas = [
    { date: null, plafond: 'contenu_verrouille', motif: MOTIF },
    { date: '2026-13-45', plafond: 'contenu_verrouille', motif: MOTIF },
    // `suspendu` est un état terminal, pas un barreau : il ne peut pas plafonner.
    { date: '2026-08-01', plafond: 'suspendu', motif: MOTIF },
    { date: '2026-08-01', plafond: 'inconnu', motif: MOTIF },
    { date: '2026-08-01', plafond: 'contenu_verrouille', motif: null },
    { date: '2026-08-01', plafond: 'contenu_verrouille', motif: 'à voir' },
  ];
  for (const reserve of cas) {
    const { erreurs } = verifier({
      registre: {
        instruments: [entree({
          statutCertification: 'repere',
          verdictScoring: { ...VERDICT_PROPRE, reserve },
        })],
      },
    });
    assert.ok(
      erreurs.some(e => /reserve mal formée/.test(e)),
      `reserve ${JSON.stringify(reserve)} : la forme devait être refusée`
    );
  }
});

test('réserve sur un état terminal : hors comparaison de plafond, mais toujours bien formée', () => {
  const suspendu = {
    questionnaireId: 'Q_SOM_07', driveMd: null, sourceMonEquilibre: false,
    statutCertification: 'suspendu', sourceIds: [],
  };
  const commun = { idsCatalogue: ['Q_SOM_07'] };
  // `suspendu` rend `barreau === -1` : aucun plafond ne lui est opposé aujourd'hui.
  // La réserve n'y dort pas : elle mordra à la réactivation. Le contrôle voisin
  // n'impose AUCUN barreau de reprise — il interdit seulement de rester terminal.
  const terminal = verifier({
    ...commun,
    registre: {
      instruments: [entree({
        ...suspendu,
        verdictScoring: { ...VERDICT_PROPRE, reserve: { date: '2026-08-01', plafond: 'source_obtenue', motif: MOTIF } },
      })],
    },
  });
  assert.deepEqual(terminal.erreurs, []);

  // La bonne forme, elle, reste exigée : un état terminal n'est pas une dispense
  // d'écrire une réserve lisible.
  const malFormee = verifier({
    ...commun,
    registre: {
      instruments: [entree({
        ...suspendu,
        verdictScoring: { ...VERDICT_PROPRE, reserve: { date: '2026-08-01', plafond: 'source_obtenue', motif: 'trop court' } },
      })],
    },
  });
  assert.ok(malFormee.erreurs.some(e => /reserve mal formée/.test(e)));
});

test('absence de réserve : le comportement d’avant le 2026-08-01 est inchangé', () => {
  // Les 59 instruments certifiés n'en portent aucune. Une garde qui les refuserait
  // n'aurait pas fermé un trou, elle aurait fermé la campagne.
  const { erreurs } = verifier({
    registre: {
      instruments: [entree({
        statutCertification: 'scoring_verifie',
        sourceIds: ['WN-SRC-0001'],
        droits: DEGAGE,
        versionServie: { description: '21 items', statutContenu: 'adapte' },
        verdictScoring: VERDICT_PROPRE,
      })],
    },
  });
  assert.deepEqual(erreurs, []);
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


// ── `actif: false` porte deux sens, et l'exemption qui les sépare ────────────
//
// Ajouté le 2026-07-31. Le contrôle « actif: false ⟹ état terminal » traitait un
// test ADMINISTRÉ PAR LE CLINICIEN comme un instrument retiré : son entrée de
// catalogue inactive — posée exprès pour fermer la route d'assignation — le
// rendait incapable de gravir l'échelle pour toujours.

test('instrument de consultation : actif:false ne l’épingle plus à un état terminal', () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_GEO_03', statutCertification: 'contenu_verrouille', versionServie: { description: 'x', langue: 'fr', traductionValidee: null, statutContenu: 'adapte' }, sourceIds: ['WN-SRC-0001'], droits: { statut: 'libre', detail: 'Domaine public, vérifié le 2026-07-31 sur la publication d’origine.', dateVerification: '2026-07-31' }, sourceMonEquilibre: false, driveMd: null, statutBibliographique: 'reference_identifiee' })] },
    idsCatalogue: ['Q_GEO_03'],
    catalogueSource: `
export const QUESTIONNAIRES_CATALOG = [
  { id: 'Q_GEO_03', titre: 'Test clinicien', categorie: 'Gérontologie', duree: '5 min', actif: false },
];`,
  });
  assert.deepEqual(erreurs.filter(e => /retiré de la production/.test(e)), []);
});

test('instrument RETIRÉ (hors consultation) : la règle terminale s’applique toujours', () => {
  // Contrôle négatif de la précédente : sans lui, une exemption trop large
  // dispenserait TOUS les inactifs, et le test ci-dessus resterait vert.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_SOM_07', statutCertification: 'contenu_verrouille', sourceMonEquilibre: false, driveMd: null })] },
    idsCatalogue: ['Q_SOM_07'],
  });
  assert.ok(erreurs.some(e => /Q_SOM_07 : retiré de la production/.test(e)));
});

test('la contrepartie : un instrument servi en consultation ne peut pas être suspendu', () => {
  // Sans elle, l'exemption serait à DOUBLE SENS et rouvrirait le trou qu'elle
  // ferme : inscrire un identifiant dans PASSATION_PRATICIEN deviendrait le
  // moyen de le servir tout en le laissant dispensé de source, de droits, de
  // contenu et de verdict. C'est le reproche fait le 2026-07-31 à une exemption
  // écrite pour ce même Q_NEU_06.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_GEO_03', statutCertification: 'suspendu', sourceMonEquilibre: false, driveMd: null })] },
    idsCatalogue: ['Q_GEO_03'],
    catalogueSource: `
export const QUESTIONNAIRES_CATALOG = [
  { id: 'Q_GEO_03', titre: 'Test clinicien', categorie: 'Gérontologie', duree: '5 min', actif: false },
];`,
  });
  assert.ok(erreurs.some(e => /servi en passation praticien/.test(e)));
});

test('PASSATION_PRATICIEN introuvable ou vide : le garde échoue au lieu de rester muet', () => {
  // Même discipline que BESOIN_SOURCES : une extraction cassée doit rougir. Un
  // garde borgne aurait exempté TOUT LE MONDE en silence, ce qui est pire que
  // l'état d'avant.
  const introuvable = verifier({ bibliothequeSource: 'export const AUTRE_CHOSE = [];' });
  assert.ok(introuvable.erreurs.some(e => /PASSATION_PRATICIEN introuvable/.test(e)));

  const vide = verifier({ bibliothequeSource: 'export const PASSATION_PRATICIEN = [\n];' });
  assert.ok(vide.erreurs.some(e => /PASSATION_PRATICIEN introuvable/.test(e)));
});

test('l’extraction PASSATION_PRATICIEN ignore la prose des commentaires', () => {
  // La fixture cite `{ id: 'Q_XXX_99' }` dans un commentaire. Le compter
  // exempterait un instrument que personne n'a déclaré — la faute exacte commise
  // le 2026-07-29 sur les `actif: false` cités en prose.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_XXX_99', statutCertification: 'contenu_verrouille', sourceMonEquilibre: false, driveMd: null })] },
    idsCatalogue: ['Q_XXX_99'],
    catalogueSource: `
export const QUESTIONNAIRES_CATALOG = [
  { id: 'Q_XXX_99', titre: 'Cité en prose seulement', categorie: 'X', duree: '5 min', actif: false },
];`,
  });
  assert.ok(erreurs.some(e => /Q_XXX_99 : retiré de la production/.test(e)));
});

test('passation praticien : un plancher de barreau est exigé', () => {
  // La contrepartie « pas d'état terminal » ne posait AUCUNE exigence : tous les
  // contrôles de pièces sont conditionnés à `barreau >= …`, et à `repere` aucun
  // n'est armé. Un instrument pouvait donc être servi en consultation — affiché
  // au rayon, verbatim livré par l'aperçu — sans source, sans droits, sans
  // contenu verrouillé et sans verdict. Mesuré par mutation le 2026-08-01.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_GEO_03', statutCertification: 'droits_verifies', sourceMonEquilibre: false, driveMd: null })] },
    idsCatalogue: ['Q_GEO_03'],
  });
  assert.ok(erreurs.some(e => /elle exige donc au moins 'contenu_verrouille'/.test(e)));
});

test('passation praticien : `contenu_verrouille` suffit (contrôle négatif)', () => {
  // Sans lui, un plancher placé trop haut passerait inaperçu — et fermerait la
  // consultation à des instruments légitimes.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_GEO_03', statutCertification: 'contenu_verrouille', versionServie: { description: 'x', langue: 'fr', traductionValidee: null, statutContenu: 'adapte' }, sourceIds: ['WN-SRC-0001'], droits: { statut: 'libre', detail: 'Domaine public, vérifié le 2026-08-01 sur la publication d’origine.', dateVerification: '2026-08-01' }, sourceMonEquilibre: false, driveMd: null, statutBibliographique: 'a_completer' })] },
    idsCatalogue: ['Q_GEO_03'],
  });
  assert.deepEqual(erreurs.filter(e => /passation praticien/.test(e)), []);
});

test("'reference_identifiee' sans aucun champ qui désigne la référence : détecté", () => {
  // L'étiquette n'était qu'un mot d'un vocabulaire fermé : une montée de
  // `a_completer` à `reference_identifiee` pouvait être PUREMENT DÉCLARATIVE.
  // C'est le reproche fait au VQ11 le 2026-07-30, puis à Q_NEU_06 le 2026-07-31 —
  // dont tous les champs d'identification restaient `null` pendant que
  // l'étiquette changeait.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ statutBibliographique: 'reference_identifiee' })] },
  });
  assert.ok(erreurs.some(e => /sans aucun champ qui désigne la référence/.test(e)));
});

test("'reference_identifiee' : UN champ suffit, et chacun compte", () => {
  // Seuil volontairement bas — on exige que la référence soit désignable, pas
  // qu'elle soit publiée à comité de lecture : un gabarit strict serait contourné
  // par un gabarit vide. Les cinq champs sont éprouvés un par un, sinon quatre
  // d'entre eux pourraient être retirés du prédicat sans qu'un test bouge.
  const champs = [
    { instrument: { nomOfficiel: 'X', auteurs: 'Folstein MF', anneePublication: null, formePubliee: null, proprietaireDroits: null } },
    { instrument: { nomOfficiel: 'X', auteurs: null, anneePublication: 2005, formePubliee: null, proprietaireDroits: null } },
    { instrument: { nomOfficiel: 'X', auteurs: null, anneePublication: null, formePubliee: 'PDF IEDM 2005', proprietaireDroits: null } },
    { references: { doi: '10.1016/0022-3956(75)90026-6', pmid: null, dateVerification: null, verifiePar: null } },
    { references: { doi: null, pmid: '1202204', dateVerification: null, verifiePar: null } },
  ];
  for (const surcharge of champs) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ statutBibliographique: 'reference_identifiee', ...surcharge })] },
    });
    assert.deepEqual(
      erreurs.filter(e => /sans aucun champ qui désigne la référence/.test(e)),
      [], `champ suffisant non reconnu : ${JSON.stringify(surcharge)}`
    );
  }
});

test("'reference_identifiee' : un champ VIDE mais non nul ne suffit pas", () => {
  // `valeur != null` laissait passer `0`, `false`, `[]` et `{}`. Un champ vide
  // qui satisfait un garde est pire qu'un champ absent : il éteint l'alerte au
  // lieu de la déclencher, et l'étiquette redevient purement déclarative — le
  // défaut même que ce garde a été écrit pour fermer.
  const vides = [
    { instrument: { nomOfficiel: 'X', auteurs: '   ', anneePublication: null, formePubliee: null, proprietaireDroits: null } },
    { instrument: { nomOfficiel: 'X', auteurs: [], anneePublication: null, formePubliee: null, proprietaireDroits: null } },
    { instrument: { nomOfficiel: 'X', auteurs: null, anneePublication: 0, formePubliee: null, proprietaireDroits: null } },
    { instrument: { nomOfficiel: 'X', auteurs: null, anneePublication: null, formePubliee: '', proprietaireDroits: null } },
    { references: { doi: false, pmid: null, dateVerification: null, verifiePar: null } },
  ];
  for (const surcharge of vides) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ statutBibliographique: 'reference_identifiee', ...surcharge })] },
    });
    assert.ok(
      erreurs.some(e => /sans aucun champ qui désigne la référence/.test(e)),
      `champ vide accepté à tort : ${JSON.stringify(surcharge)}`
    );
  }
});

// ── L'ÉCRAN ET LE REGISTRE (D-036, LOT-04) ──────────────────────────────────
//
// Le badge praticien « Scoring vérifié » emprunte son nom au barreau
// `scoring_verifie`, et rien ne reliait les deux. Ce que ces cas éprouvent :
// la divergence qui MENT rougit, celle qui se TAIT est inventoriée sans rougir,
// et les deux mutismes possibles de la carte de certifications échouent.
//
// Aucun attendu n'est dérivé du registre réel ni du catalogue : littéraux
// uniquement — un attendu qui bouge avec sa source ne prouve rien.

// Le socle minimal pour porter `scoring_verifie` sans déclencher les contrôles
// de pièces, qui n'ont rien à voir avec ce qu'on éprouve ici.
const SOCLE_VERIFIE = {
  sourceIds: ['WN-SRC-0001'],
  droits: DEGAGE,
  versionServie: { description: '21 items en 3 sections, score sur 42', langue: 'fr', traductionValidee: null, statutContenu: 'adapte' },
  verdictScoring: VERDICT_PROPRE,
};

test('écran `certifie` sous le barreau `scoring_verifie` : détecté à chaque barreau du dessous', () => {
  for (const statutCertification of ['repere', 'source_obtenue', 'droits_verifies', 'contenu_verrouille']) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ ...SOCLE_VERIFIE, statutCertification })] },
      certificationsCatalogue: new Map([['Q_ALI_01', 'certifie']]),
    });
    assert.ok(
      erreurs.some(e => /affiche « Scoring vérifié ».*sous le barreau 'scoring_verifie'/s.test(e)),
      `'certifie' à l'écran sous '${statutCertification}' doit être refusé — erreurs : ${JSON.stringify(erreurs)}`
    );
  }
});

test('écran `certifie` AU barreau `scoring_verifie` : accepté (la comparaison est stricte)', () => {
  // Contrôle négatif du précédent : sans lui, un `<=` posé à la place du `<`
  // refuserait exactement la situation NORMALE — l'écran et le dossier
  // d'accord — et le garde serait rouge sur les 38 instruments certifiés.
  const { erreurs } = verifier({
    registre: { instruments: [entree({ ...SOCLE_VERIFIE, statutCertification: 'scoring_verifie' })] },
    certificationsCatalogue: new Map([['Q_ALI_01', 'certifie']]),
  });
  assert.deepEqual(erreurs, []);
});

test('le registre déclare, l’écran se tait : inventorié, jamais bloquant', () => {
  // LES DEUX FORMES DU MUTISME, et elles ne se valent pas à l'écran : sans
  // certification la fiche affiche « Statut inconnu », avec `ambigu` elle
  // affiche « Scoring ambigu ». L'inventaire doit donc rendre le statut, pas
  // seulement l'identifiant — c'est ce qui rend D-037 arbitrable.
  //
  // Le second instrument n'est pas décoratif : une carte dont AUCUNE entrée ne
  // porte de statut est refusée par le garde anti-mutisme, et ce cas-ci
  // éprouve un instrument muet parmi d'autres qui parlent — la situation
  // réelle, où 18 se taisent sur 65.
  for (const statutEcran of [null, 'ambigu']) {
    const { erreurs, divergencesEcranRegistre } = verifier({
      idsCatalogue: ['Q_ALI_01', 'Q_STR_02'],
      registre: {
        instruments: [
          entree({ ...SOCLE_VERIFIE, statutCertification: 'scoring_verifie' }),
          entree({ ...SOCLE_VERIFIE, questionnaireId: 'Q_STR_02', statutCertification: 'scoring_verifie' }),
        ],
      },
      certificationsCatalogue: new Map([['Q_ALI_01', statutEcran], ['Q_STR_02', 'certifie']]),
    });
    assert.deepEqual(erreurs, [], `un écran muet ne doit pas bloquer (statut ${statutEcran})`);
    assert.deepEqual(divergencesEcranRegistre, [
      { questionnaireId: 'Q_ALI_01', statutCertification: 'scoring_verifie', statutEcran },
    ]);
  }
});

test('écran et registre d’accord : aucune ligne d’inventaire', () => {
  // Contrôle négatif du précédent : un inventaire qui compterait TOUT le
  // registre se lirait exactement pareil sur la sortie du garde, et le chiffre
  // porté en D-037 serait faux sans que rien ne le dise.
  const { divergencesEcranRegistre } = verifier({
    registre: { instruments: [entree({ ...SOCLE_VERIFIE, statutCertification: 'scoring_verifie' })] },
    certificationsCatalogue: new Map([['Q_ALI_01', 'certifie']]),
  });
  assert.deepEqual(divergencesEcranRegistre, []);
});

test('état terminal : hors comparaison ET hors inventaire', () => {
  // LE PIÈGE DE CE CONTRÔLE. `ECHELLE.indexOf('suspendu')` rend -1 : écrite
  // naïvement, la comparaison rangerait un instrument SUSPENDU « sous
  // scoring_verifie » et lui reprocherait son `certifie` d'écran. Ailleurs dans
  // ce fichier le -1 EXEMPTE, ici il ACCUSERAIT. `Q_FIB_03` et `Q_PED_03` sont
  // dans cette position au registre réel.
  //
  // C'est ce cas qui tient le `barreau !== -1` du garde : retirer ce test rend
  // ce cas-ci rouge, mesuré le 2026-08-09.
  const { erreurs, divergencesEcranRegistre } = verifier({
    registre: { instruments: [entree({ questionnaireId: 'Q_SOM_07', statutCertification: 'suspendu', sourceMonEquilibre: false, driveMd: null })] },
    idsCatalogue: ['Q_SOM_07'],
    certificationsCatalogue: new Map([['Q_SOM_07', 'certifie']]),
  });
  assert.deepEqual(erreurs.filter(e => /Scoring vérifié/.test(e)), []);
  assert.deepEqual(divergencesEcranRegistre, []);
});

test('carte de certifications absente ou mal typée : le garde échoue au lieu de rester muet', () => {
  for (const certificationsCatalogue of [undefined, null, {}, [['Q_ALI_01', 'certifie']]]) {
    const { erreurs } = verifier({ certificationsCatalogue });
    assert.ok(
      erreurs.some(e => /certificationsCatalogue absent ou mal typé/.test(e)),
      `${JSON.stringify(certificationsCatalogue)} doit être refusé`
    );
  }
});

test('carte ne portant AUCUN statut : refusée — c’est le renommage silencieux', () => {
  // Le cas réellement dangereux : renommer la clé `certification` dans le
  // catalogue ne casse rien et ne lève rien. Tous les statuts deviennent nuls,
  // le contrôle bloquant devient vrai POUR TOUJOURS, et l'inventaire enfle d'un
  // coup à tout le registre — vert de bout en bout.
  //
  // Le cas ÉTROIT (carte licite mais sans aucun `certifie`) n'est pas ici : il
  // porte sur la distribution du vrai catalogue, pas sur cette fonction, et il
  // est asséré chez l'appelant. Voir le commentaire du garde.
  const { erreurs } = verifier({
    idsCatalogue: ['Q_ALI_01', 'Q_STR_02'],
    registre: { instruments: [entree(), entree({ questionnaireId: 'Q_STR_02', sourceMonEquilibre: true, driveMd: null })] },
    certificationsCatalogue: new Map([['Q_ALI_01', null], ['Q_STR_02', null]]),
  });
  assert.ok(erreurs.some(e => /aucun instrument du catalogue ne porte de statut/.test(e)));
});

// LE SET DE VOCABULAIRE EST EN DUR, ET C'EST CE BANC QUI L'EMPÊCHE DE DÉRIVER.
//
// `verifier_registre_instruments.js` est du CommonJS : il ne peut pas importer
// l'union TypeScript qu'il recopie. Laisser cette recopie à la vigilance de qui
// édite `types.ts` serait exactement le « relevé » que tout ce fichier refuse au
// profit d'une propriété dérivée — d'autant que le pointeur du commentaire, lui,
// a DÉJÀ été faux une fois (il désignait `statutCertificationRuntime`, qui
// énumère six valeurs et en accepte n'importe laquelle).
test('le vocabulaire d’écran recopie exactement l’union `CertificationStatus` de types.ts', () => {
  const types = readFileSync(new URL('../../web/src/lib/scoring/types.ts', import.meta.url), 'utf8');
  const declaration = types.match(/export type CertificationStatus\s*=\s*([^;]+);/);
  assert.ok(declaration, 'CertificationStatus introuvable dans types.ts — le garde ne peut pas rester muet');
  const deLUnion = [...declaration[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort();
  assert.ok(deLUnion.length > 0, 'union CertificationStatus vide — extraction cassée');
  assert.deepEqual(deLUnion, [...STATUTS_CERTIFICATION_ECRAN].sort());
});

test('carte bâtie sur la MAUVAISE SOURCE : refusée par le vocabulaire', () => {
  // Le garde « aucun statut » ne teste que la non-nullité. Une carte construite
  // depuis les `statutCertification` du REGISTRE porte des valeurs bien non
  // nulles, le passe — et rend le contrôle bloquant vacu pour toujours, puisque
  // aucune de ces valeurs ne vaut jamais 'certifie'. Une coquille accentuée est
  // de la même famille. Relevé en revue adversariale le 2026-08-09.
  for (const statut of ['scoring_verifie', 'certifié', 'verified']) {
    const { erreurs } = verifier({ certificationsCatalogue: new Map([['Q_ALI_01', statut]]) });
    assert.ok(
      erreurs.some(e => /hors du vocabulaire du catalogue/.test(e)),
      `le statut ${JSON.stringify(statut)} doit être refusé — erreurs : ${JSON.stringify(erreurs)}`
    );
  }
});

test('vocabulaire du catalogue : les quatre valeurs licites passent (contrôle négatif)', () => {
  // Sans lui, un motif trop strict refuserait le vocabulaire réel et personne ne
  // le verrait tant que le catalogue ne sert que `certifie` et `ambigu`.
  for (const statut of ['certifie', 'ambigu', 'a_verifier', 'non_score']) {
    const { erreurs } = verifier({ certificationsCatalogue: new Map([['Q_ALI_01', statut]]) });
    assert.deepEqual(
      erreurs.filter(e => /hors du vocabulaire/.test(e)), [],
      `le statut ${statut} est licite au catalogue`
    );
  }
});

test('carte PARTIELLE : refusée — une absence de lecture se lit comme une absence de certification', () => {
  const { erreurs } = verifier({
    idsCatalogue: ['Q_ALI_01', 'Q_STR_02'],
    registre: { instruments: [entree(), entree({ questionnaireId: 'Q_STR_02', sourceMonEquilibre: true, driveMd: null })] },
    certificationsCatalogue: new Map([['Q_ALI_01', 'certifie']]),
  });
  assert.ok(erreurs.some(e => /ne couvre pas tout le catalogue.*Q_STR_02/s.test(e)));
});

// ── L'ANCRAGE SUR LE REGISTRE RÉEL ──────────────────────────────────────────
//
// Les cas ci-dessus éprouvent la FONCTION sur des fixtures. Ils ne peuvent rien
// dire de la SUPPRESSION d'une réserve du registre réel — ni de son renommage
// (`reserves`), ni de son déplacement (`revision.reserve`), qui sont tous deux
// silencieusement inertes.
//
// Une première rédaction de ce lot s'en remettait à « supprimer un bloc est une
// ligne de diff qu'une revue voit ». La revue adversariale a défait l'argument :
// porter `plafond` à `publie` lève la réserve en UN JETON, le bloc restant
// visiblement en place avec son motif intact. Un relecteur qui vérifie « la
// réserve est-elle toujours là ? » répond oui.
//
// Cet ancrage est le seul geste qui ferme la famille entière. Le précédent existe
// dans le dépôt : `mmtReconstruit.guard.test.ts` lit déjà le registre réel.
const REGISTRE_REEL = JSON.parse(
  readFileSync(new URL('../../docs/claude/corpus/instrument_registry.json', import.meta.url), 'utf8')
);

// Chaque ligne est une DÉCISION. Lever une réserve, c'est retirer sa ligne d'ici
// dans le même diff que le registre — donc en le disant.
//
// LA DATE EST ÉPINGLÉE AVEC LE PLAFOND — et il faut dire exactement ce que cela
// apporte, parce que ce n'est PAS ce qu'une première rédaction en annonçait.
//
// Elle ferme un geste, et un seul : re-dater une réserve dans le REGISTRE SEUL —
// la faire paraître courante — est rouge. Sur le plafond, elle n'oblige à rien.
// Relever un plafond dans les DEUX fichiers du même diff,
// sans toucher à la date, reste vert : mesuré, et c'est la mutation qui a défait
// l'argument. Rien ne peut forcer une re-datation depuis un test statique, qui
// n'a pas d'historique.
//
// Ce qu'elle apporte, et qui n'est pas rien : la date de chaque décision est
// LISIBLE ici, donc un plafond relevé sous une date ancienne se voit à l'œil nu
// en revue, à côté du motif qu'il contredit. C'est un appui à la relecture, pas
// un verrou.
//
// LE TROU RÉSIDUEL, ASSUMÉ : relever un plafond de façon cohérente dans les deux
// fichiers est une décision écrite deux fois, et aucune garde automatique ne peut
// distinguer une décision légitime d'une complaisance. Ce qui reste alors est ce
// que ce dépôt oppose partout ailleurs à ce genre de trou — une revue qui lit le
// motif à côté du plafond.
const RESERVES_ATTENDUES = {
  Q_SOM_09: { plafond: 'droits_verifies', date: '2026-08-01' },
  Q_GEO_04: { plafond: 'contenu_verrouille', date: '2026-08-01' },
  Q_PED_03: { plafond: 'contenu_verrouille', date: '2026-08-01' },
  Q_FIB_03: { plafond: 'contenu_verrouille', date: '2026-08-01' },
  Q_STR_03: { plafond: 'scoring_verifie', date: '2026-08-04' },
};

test('les réserves du registre réel sont exactement celles qui ont été décidées', () => {
  const constatees = Object.fromEntries(
    REGISTRE_REEL.instruments
      .filter(e => e?.verdictScoring?.reserve != null)
      .map(e => [e.questionnaireId, { plafond: e.verdictScoring.reserve.plafond, date: e.verdictScoring.reserve.date }])
  );
  assert.deepEqual(
    constatees,
    RESERVES_ATTENDUES,
    'une réserve a été ajoutée, retirée, renommée, déplacée, ou son plafond a changé — '
    + 'chacun de ces gestes est une décision qui doit être écrite ici en même temps ; '
    + 're-dater la réserve fait partie de la décision, même si ce banc ne peut pas '
    + 'l\'exiger — un plafond qui monte sous une date ancienne laisse un motif qui dit '
    + 'l\'inverse juste à côté'
  );
});

test('aucune réserve du registre réel ne plafonne au sommet de l’échelle', () => {
  // `publie` est bien formé et ne contraint rien : c'est la levée qui ne se voit
  // pas. Le contrôle ci-dessus l'attraperait déjà par le plafond attendu ; celui-ci
  // le nomme, pour que le message d'échec dise POURQUOI.
  for (const e of REGISTRE_REEL.instruments) {
    const r = e?.verdictScoring?.reserve;
    if (!r) continue;
    assert.notEqual(r.plafond, 'publie', `${e.questionnaireId} : une réserve plafonnée à \`publie\` ne plafonne rien`);
  }
});

test('le registre réel est lisible et porte exactement cinq réserves', () => {
  // Le titre dit ce que ce test fait, et rien de plus — une rédaction antérieure
  // annonçait « passe le vérificateur », qu'il n'appelle jamais. Le registre réel
  // EST bien passé au vérificateur, mais par `scoring-check`, dans la même chaîne
  // T1 et en CI ; pas ici.
  //
  // Ce que ce test tient, et qui n'est pas rien : le COMPTE. C'est lui, et non le
  // `deepEqual`, qui attrape le retrait d'une réserve des DEUX fichiers à la fois.
  // Un nettoyage qui le jugerait redondant rouvrirait ce cas sans bruit.
  assert.ok(Array.isArray(REGISTRE_REEL.instruments) && REGISTRE_REEL.instruments.length >= 60);
  assert.equal(Object.keys(RESERVES_ATTENDUES).length, 5);
});

test('plafond `publie` : refusé, parce qu’il ne plafonne rien', () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({
      statutCertification: 'repere',
      verdictScoring: { banc: 'certify', date: '2026-08-01', divergencesCritiques: 0,
        reserve: { date: '2026-08-01', plafond: 'publie', motif: 'Motif suffisamment long pour franchir le seuil de quarante caractères.' } },
    })] },
  });
  assert.ok(erreurs.some(e => /reserve mal formée/.test(e)));
});

// ── Complétude bibliographique et adossement du grade COSMIN ────────────────
//
// Ajoutés le 2026-08-04. Deux étiquettes faisaient autorité sans pièce :
// `a_completer`, que le vérificateur se contentait de COMPTER en fin de passe,
// et `cosmin`, tenu par son seul vocabulaire fermé. Écrire 'A' au registre
// suffisait à afficher un grade de qualité psychométrique que rien n'adossait.

const MOTIF_BIBLIO = "recherche du 2026-08-04 sur PubMed, Google Scholar et les actes du SIIN : aucune publication d'origine retrouvée, l'instrument étant construit localement";

test("'a_completer' sans motif : la lacune muette est refusée", () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({ statutBibliographique: 'a_completer' })] },
  });
  assert.ok(erreurs.some(e => /sans constat de recherche/.test(e)));
});

test("'a_completer' : un motif trop court ne suffit pas, 40 caractères oui", () => {
  // Le seuil est celui de `droits.detail` et de `reserve.motif` : une phrase, pas
  // un gabarit. Les deux bornes sont éprouvées — sans le cas à 39, un garde
  // affaibli en `> 0` resterait vert ; sans le cas à 40, un garde qui refuserait
  // tout le monde le resterait aussi.
  for (const motif of [null, '', '   ', 'à faire', 'x'.repeat(39), `  ${'x'.repeat(39)}  `]) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ statutBibliographique: 'a_completer', motifBibliographique: motif })] },
    });
    assert.ok(
      erreurs.some(e => /sans constat de recherche/.test(e)),
      `motif ${JSON.stringify(motif)} : la lacune devait être refusée`
    );
  }
  for (const motif of ['x'.repeat(40), MOTIF_BIBLIO]) {
    const { erreurs } = verifier({
      registre: { instruments: [entree({ statutBibliographique: 'a_completer', motifBibliographique: motif })] },
    });
    assert.deepEqual(erreurs, [], `motif de ${motif.trim().length} caractères : devait être accepté`);
  }
});

test('un motif survivant à une promotion est refusé, sur chaque statut promu', () => {
  // Le revers du contrôle ci-dessus. Un « aucune publication trouvée » laissé en
  // place sous `reference_identifiee` contredit le champ d'à côté, et rien ne fait
  // relire ce champ une fois le statut monté.
  const identifiee = {
    statutBibliographique: 'reference_identifiee',
    instrument: { nomOfficiel: 'X', auteurs: 'Ninot et al.', anneePublication: 2007, formePubliee: null, proprietaireDroits: null },
  };
  const { erreurs } = verifier({
    registre: { instruments: [entree({ ...identifiee, motifBibliographique: MOTIF_BIBLIO })] },
  });
  assert.ok(erreurs.some(e => /motifBibliographique renseigné alors que/.test(e)));

  // Et sur l'autre statut promu, pour que l'exigence ne tienne pas à une valeur.
  const interne = verifier({
    registre: { instruments: [entree({ motifBibliographique: MOTIF_BIBLIO })] },
  });
  assert.ok(interne.erreurs.some(e => /motifBibliographique renseigné alors que/.test(e)));

  // Anti-sur-filtrage : l'absence et le `null` explicite passent tous les deux.
  assert.deepEqual(verifier({ registre: { instruments: [entree(identifiee)] } }).erreurs, []);
  assert.deepEqual(
    verifier({ registre: { instruments: [entree({ ...identifiee, motifBibliographique: null })] } }).erreurs,
    []
  );
});

test('grade COSMIN sans étude au dossier : refusé', () => {
  const { erreurs } = verifier({
    registre: { instruments: [entree({ cosmin: 'B' })] },
    evidence: { etudes: [] },
  });
  assert.ok(erreurs.some(e => /sans étude concordante/.test(e)));
});

test('grade COSMIN : la DOUBLE égalité est exigée, instrument ET conclusion', () => {
  const etude = (surcharge = {}) => ({
    questionnaireId: 'Q_ALI_01', propriete: 'fidelite', conclusionCosmin: 'B', doi: '10.0/x', ...surcharge,
  });
  // Le bon instrument, le bon grade : le seul cas qui fonde le grade.
  const concordante = verifier({
    registre: { instruments: [entree({ cosmin: 'B' })] },
    evidence: { etudes: [etude()] },
  });
  assert.deepEqual(concordante.erreurs, []);

  // Une étude concluant 'B' sur un AUTRE instrument ne fonde rien ici. Sans ce
  // cas, un contrôle qui ne testerait que la conclusion resterait vert.
  const autreInstrument = verifier({
    registre: { instruments: [entree({ cosmin: 'B' })] },
    evidence: { etudes: [etude({ questionnaireId: 'Q_STR_02' })] },
  });
  assert.ok(autreInstrument.erreurs.some(e => /sans étude concordante/.test(e)));

  // Le bon instrument, mais l'étude conclut 'C' : elle ne fonde pas un 'B'. Sans
  // ce cas, un contrôle réduit à la seule égalité sur `questionnaireId` — la
  // mutation (d) du 2026-08-04 — resterait vert.
  const autreConclusion = verifier({
    registre: { instruments: [entree({ cosmin: 'B' })] },
    evidence: { etudes: [etude({ conclusionCosmin: 'C' })] },
  });
  assert.ok(autreConclusion.erreurs.some(e => /sans étude concordante/.test(e)));

  // `inconnu` n'affirme rien : il reste exempté, sinon la garde interdirait
  // l'état par défaut de tout le registre au lieu de garder quoi que ce soit.
  assert.deepEqual(verifier({ registre: { instruments: [entree({ cosmin: 'inconnu' })] } }).erreurs, []);
});

// L'ANCRAGE SUR LE REGISTRE RÉEL, pour la même raison qu'aux réserves : les cas
// ci-dessus éprouvent la FONCTION sur des fixtures et ne peuvent rien dire d'un
// motif retiré du vrai fichier. Le déplacement du contrôle hors de la boucle —
// mutation (b) du 2026-08-04 — est également attrapé ici : sur fixtures, une
// entrée unique rend « hors boucle » et « dans la boucle » indiscernables.
test('registre réel : chaque `a_completer` porte son constat de recherche', () => {
  const muettes = REGISTRE_REEL.instruments
    .filter(e => e.statutBibliographique === 'a_completer')
    .filter(e => typeof e.motifBibliographique !== 'string' || e.motifBibliographique.trim().length < 40)
    .map(e => e.questionnaireId);
  assert.deepEqual(muettes, [], 'un `a_completer` du registre réel ne dit pas ce qui a été cherché');

  // Et le compte, pour que le retrait d'une entrée ne vide pas le contrôle en
  // silence : un filtre sur zéro entrée passe toujours.
  const aCompleter = REGISTRE_REEL.instruments.filter(e => e.statutBibliographique === 'a_completer');
  assert.equal(aCompleter.length, 10);
});

test('registre réel : aucun motif ne survit à une promotion, aucun grade COSMIN nu', () => {
  const survivants = REGISTRE_REEL.instruments
    .filter(e => e.statutBibliographique !== 'a_completer' && e.motifBibliographique != null)
    .map(e => e.questionnaireId);
  assert.deepEqual(survivants, [], 'un motif de recherche a survécu à la promotion de son entrée');

  const grades = REGISTRE_REEL.instruments.filter(e => e.cosmin !== 'inconnu').map(e => e.questionnaireId);
  assert.deepEqual(grades, [], 'un grade COSMIN est apparu au registre : il doit être adossé à measurement_evidence.json');
});

test("les trois contrôles s'appliquent à CHAQUE entrée, pas à la première", () => {
  // TROU DU BANC, MESURÉ LE 2026-08-04 ET REFERMÉ ICI. Tous les cas ci-dessus
  // n'instancient qu'UNE entrée : « contrôlé dans la boucle » et « contrôlé une
  // fois, hors de la boucle » y sont indiscernables. Déplacé hors du `forEach` et
  // appliqué à `instruments[0]`, le contrôle du motif laissait le banc VERT — et
  // les tests d'ancrage sur le registre réel n'y voient rien non plus, puisqu'ils
  // lisent le fichier sans jamais appeler le vérificateur.
  //
  // C'est la leçon du 2026-08-03 : un banc éprouvé sur le seul RETRAIT d'un
  // contrôle ne prouve rien, le déplacement est ce qui casse en vrai.
  //
  // ET LA FAMILLE SE FERME AUX DEUX BOUTS. Une première rédaction ne mettait que
  // DEUX entrées, la fautive en seconde — donc en DERNIÈRE — position : mesuré le
  // 2026-08-04, une mutation `if (entry === instruments[instruments.length - 1])`
  // autour des contrôles laissait le banc VERT. La faute est donc encadrée : une
  // entrée saine AVANT, une entrée saine APRÈS. Ni la première ni la dernière.
  const sain = entree({ questionnaireId: 'Q_STR_02', driveMd: null, sourceMonEquilibre: true, statutBibliographique: 'a_completer', motifBibliographique: MOTIF_BIBLIO });
  const sainApres = entree({ questionnaireId: 'Q_GEO_04', driveMd: null, sourceMonEquilibre: false });
  const cas = [
    [{ statutBibliographique: 'a_completer' }, /sans constat de recherche/],
    [{ motifBibliographique: MOTIF_BIBLIO }, /motifBibliographique renseigné alors que/],
    [{ cosmin: 'B' }, /sans étude concordante/],
  ];
  for (const [surcharge, motif] of cas) {
    const { erreurs } = verifier({
      registre: { instruments: [sain, entree(surcharge), sainApres] },
      idsCatalogue: ['Q_STR_02', 'Q_ALI_01', 'Q_GEO_04'],
    });
    assert.ok(
      erreurs.some(e => motif.test(e)),
      `${motif} : la faute au MILIEU doit être vue — ni première, ni dernière`
    );
  }
});

// ANCRAGES SUR LE RÉEL — le fichier de preuves et les chiffres du document de
// gouvernance. Même raison qu'aux réserves : les cas sur fixtures éprouvent la
// FONCTION et ne peuvent rien dire de ce que les vrais fichiers contiennent.
const PREUVES_REELLES = JSON.parse(
  readFileSync(new URL('../../docs/claude/corpus/measurement_evidence.json', import.meta.url), 'utf8')
);

test('measurement_evidence réel : 3 lignes, aucune ne conclut quoi que ce soit', () => {
  // Ce fichier est devenu PORTEUR D'UN BARREAU le 2026-08-04 : `psychometrie_revue`
  // exige désormais qu'une de ses lignes conclue A, B ou C. Y écrire une ligne
  // graduée n'est donc plus une addition documentaire, c'est ouvrir un barreau de
  // certification — le compte est épinglé pour que ça se voie en revue.
  assert.equal(PREUVES_REELLES.etudes.length, 3);
  const concluantes = PREUVES_REELLES.etudes
    .filter(e => e.conclusionCosmin !== 'inconnu')
    .map(e => `${e.questionnaireId}|${e.conclusionCosmin}`);
  assert.deepEqual(concluantes, [], 'une conclusion COSMIN est apparue au dossier : elle ouvre le barreau psychometrie_revue');
});

test('gouvernance : les chiffres écrits dans le document sont ceux des fichiers', () => {
  // UN COMPTEUR FAUX DANS UN DOCUMENT DONT LA THÈSE EST « NE VOUS FIEZ PAS AUX
  // ÉTIQUETTES » serait le défaut le plus embarrassant de ce lot. Les chiffres
  // sont donc PARSÉS du markdown et recalculés depuis le registre et le fichier
  // de preuves — jamais recopiés ici, ce qui ne ferait que déplacer d'un cran la
  // possibilité d'un chiffre faux.
  const doc = readFileSync(new URL('../../docs/gouvernance-questionnaires-scoring.md', import.meta.url), 'utf8');
  const nombre = (motif, groupe = 1) => {
    const trouve = doc.match(motif);
    assert.ok(trouve, `chiffre introuvable dans le document : ${motif}`);
    return Number(trouve[groupe]);
  };

  const entrees = REGISTRE_REEL.instruments;
  assert.equal(nombre(/`cosmin` vaut `inconnu` sur les (\d+) entrées/), entrees.length);
  assert.equal(nombre(/il contient (\d+) lignes/), PREUVES_REELLES.etudes.length);

  const repartition = doc.match(
    /sur les (\d+) entrées : (\d+) portent `reference_identifiee`, (\d+) `referentiel_interne_siin`, (\d+) `a_completer`/
  );
  assert.ok(repartition, 'la répartition de statutBibliographique est introuvable dans le document');
  const compte = statut => entrees.filter(e => e.statutBibliographique === statut).length;
  assert.equal(Number(repartition[1]), entrees.length);
  assert.equal(Number(repartition[2]), compte('reference_identifiee'));
  assert.equal(Number(repartition[3]), compte('referentiel_interne_siin'));
  assert.equal(Number(repartition[4]), compte('a_completer'));

  // Les entrées à identifiant vérifiable sont nommées dans le document : on
  // compare la LISTE, pas le seul compte — deux erreurs qui se compensent
  // passeraient sur un compte.
  const nommees = doc.match(/entrées seulement\*\* \(([^)]+)\) portent un identifiant vérifiable/);
  assert.ok(nommees, "la liste des entrées à identifiant vérifiable est introuvable dans le document");
  const citees = nommees[1].match(/Q_[A-Z]+_\d+/g) ?? [];
  const reelles = entrees
    .filter(e => e.references?.doi || e.references?.pmid)
    .map(e => e.questionnaireId);
  assert.deepEqual([...citees].sort(), [...reelles].sort());
});
