import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La jointure reçoit son client en argument : le client réel n'est jamais lu.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
  LIMITATION_QUESTIONNAIRE_PROVENANCE,
} from '@/lib/clinical/safetyQuestionnaireTextes';
import {
  LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE,
  LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE,
  MENTION_QUESTIONNAIRE_CABINET,
  REGLE_SECURITE_QUESTIONNAIRE_CABINET,
  SAFETY_QUESTIONNAIRE_CABINET_METADATA,
  SAFETY_QUESTIONNAIRE_CABINET_SHA256,
  regleSecuriteQuestionnaireCabinetValidee,
  tableSecuriteQuestionnaireCabinetSignee,
} from '@/lib/clinical/safetyQuestionnaireCabinetV1';
import { REGLE_SECURITE_QUESTIONNAIRE } from '@/lib/clinical/safetyQuestionnaireV1';
import {
  SHA_ANCRAGE_ADRESSAGE_QUESTIONNAIRE_CABINET,
  VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE,
  VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE_CABINET,
  genererCourrierAdressage,
  rendreCourrierAdressageFige,
} from '@/lib/clinical/courrierAdressage';
import { SAFETY_SIGNALS_SHA256 } from '@/lib/clinical/safetySignalsV1';
import { verdictAncrage } from '@/lib/praticien/ancrageCorrespondance';
import { joindreDesignationsCabinet, wherePassationsCabinet } from './designationsCabinetPrisma';
import {
  construireSafetyFindings,
  reponsesSecuriteDeclarees,
  type DesignationCabinetLue,
  type PassationSecuriteRow,
} from './safetyFindings';
import { estFindingAdressable, estFindingQuestionnaire } from './safetyFindingSource';

// [[D-515]] — le banc du QUATRIÈME producteur de l'objet de sécurité,
// `SAF-QUEST-02` (lot de code de §6.2, PR 2). Chaque propriété de la décision,
// avec sa contre-épreuve :
//
//   1. la table livrée n'est PAS signée : aucun constat, la règle en
//      `candidate` sur les seuls dossiers qu'une réponse ou une limitation
//      concerne ; un SHA périmé referme le verrou ;
//   2. §1 : seule la question désignée, sur une copie « oui », est lue — ni
//      le catalogue, ni un `CAB_` « non » ou non déclaré, ni une désignation
//      non chargée ;
//   3. §2 : toute valeur autre que la valeur « non » copiée fait un constat,
//      hors options compris (et l'option écartée hors int4, 20261114-1112-a) ;
//      illisible ⇒ limitation ; A1 ;
//   4. §7 : désignation inconnue ⇒ limitation, sans constat ;
//   5. `SAF-QUEST-01` reçoit les seules réponses du catalogue : sa sortie ne
//      change pas, et `SAF-QUEST-02` vient après elle ;
//   6. drapeau éteint, la jointure ne lit rien et ne joint rien ;
//   7. la lettre : sans réponse du cabinet, au caractère près ; avec, sa
//      propre version d'ancrage, la mention, et un verdict d'ancrage à jour.

const ETAT_LIVRE = { ...SAFETY_QUESTIONNAIRE_CABINET_METADATA };

// Drapeau ALLUMÉ par défaut dans ce banc : la règle n'existe que sous lui.
// Les cas « éteint » l'éteignent explicitement.
beforeEach(() => {
  process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
});

afterEach(() => {
  Object.assign(SAFETY_QUESTIONNAIRE_CABINET_METADATA, ETAT_LIVRE);
  delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
});

function simulerSignature(): void {
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne = true;
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation = '2026-11-14T00:00:00.000Z';
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre = SAFETY_QUESTIONNAIRE_CABINET_SHA256;
}

const COPIE = {
  instrument: 'Humeur du cabinet',
  enonce: 'Avez-vous eu des idées de mort ?',
  options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 3, l: 'Souvent' }],
};

function designation(surcharge: Partial<DesignationCabinetLue> = {}): DesignationCabinetLue {
  return {
    poseQuestionSuicide: true,
    titreAssignation: 'Humeur du cabinet',
    questionSuicideId: 'Q2',
    questionSuicideOptionNon: 0,
    questionSuicideCopie: COPIE,
    ...surcharge,
  };
}

function passationCab(
  idReponse: string,
  rawAnswers: Record<string, unknown>,
  surcharge: Partial<PassationSecuriteRow> = {},
): PassationSecuriteRow {
  return {
    idReponse,
    idQuestionnaire: 'CAB_HUMEUR',
    dateReponse: new Date('2026-11-10T09:00:00.000Z'),
    scoresJson: { total: 4, rawAnswers },
    statutValidite: 'VALID',
    designationCabinet: designation(),
    ...surcharge,
  };
}

const CAB_SOUVENT = passationCab('REP-CAB-S', { Q1: 3, Q2: 3 });
const CAB_JAMAIS = passationCab('REP-CAB-J', { Q1: 3, Q2: 0 });
const BDI_PLANS: PassationSecuriteRow = {
  idReponse: 'REP-BDI',
  idQuestionnaire: 'Q_NEU_01',
  dateReponse: new Date('2026-10-01T09:00:00.000Z'),
  scoresJson: { total: 3, rawAnswers: { B7: 2 } },
  statutValidite: 'VALID',
};

function regles(sortie: ReturnType<typeof construireSafetyFindings>, ruleId: string) {
  return sortie.rules.filter(regle => regle.ruleId === ruleId);
}

describe('verrou de signature — livrée NON signée, sens inverse', () => {
  it('la table livrée n’est pas signée : aucune règle validée', () => {
    expect(SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne).toBe(false);
    expect(SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre).toBeNull();
    expect(tableSecuriteQuestionnaireCabinetSignee()).toBe(false);
    expect(regleSecuriteQuestionnaireCabinetValidee()).toBeNull();
  });

  it('non signée : aucun constat, la règle candidate seulement là où une réponse l’appelle', () => {
    const positif = construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_SOUVENT]));
    expect(positif.findings).toEqual([]);
    expect(positif.limitations).toEqual([]);
    expect(regles(positif, REGLE_SECURITE_QUESTIONNAIRE_CABINET)).toEqual([
      expect.objectContaining({ lifecycle: 'candidate' }),
    ]);
    const negatif = construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_JAMAIS]));
    expect(regles(negatif, REGLE_SECURITE_QUESTIONNAIRE_CABINET)).toEqual([]);
  });

  it('non signée : une réponse illisible ou une désignation inconnue joint aussi la règle candidate', () => {
    for (const row of [
      passationCab('REP-I', { Q1: 2 }),
      passationCab('REP-D', { Q2: 3 }, { designationCabinet: designation({ questionSuicideCopie: null, questionSuicideId: null, questionSuicideOptionNon: null }) }),
    ]) {
      const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([row]));
      expect(sortie.findings).toEqual([]);
      expect(regles(sortie, REGLE_SECURITE_QUESTIONNAIRE_CABINET)).toEqual([
        expect.objectContaining({ lifecycle: 'candidate' }),
      ]);
    }
  });

  it('un sha périmé referme le verrou, une date non canonique aussi', () => {
    simulerSignature();
    expect(tableSecuriteQuestionnaireCabinetSignee()).toBe(true);
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre = '0'.repeat(64);
    expect(tableSecuriteQuestionnaireCabinetSignee()).toBe(false);
    simulerSignature();
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation = '2026-11-14';
    expect(tableSecuriteQuestionnaireCabinetSignee()).toBe(false);
  });
});

describe('§1 — seule la question désignée d’une copie « oui » est lue', () => {
  it('une autre question de l’instrument, même « positive », n’est pas lue', () => {
    simulerSignature();
    const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_JAMAIS]));
    expect(sortie.findings).toEqual([]);
    expect(sortie.limitations).toEqual([]);
  });

  it('copie « non », non déclarée ou non chargée : la passation n’est pas lue', () => {
    simulerSignature();
    const rows = [
      passationCab('REP-N', { Q2: 3 }, { designationCabinet: designation({ poseQuestionSuicide: false }) }),
      passationCab('REP-X', { Q2: 3 }, { designationCabinet: designation({ poseQuestionSuicide: null }) }),
      passationCab('REP-Z', { Q2: 3 }, { designationCabinet: undefined }),
    ];
    expect(reponsesSecuriteDeclarees(rows)).toEqual([]);
  });

  it('drapeau éteint : une désignation jointe n’est pas lue non plus (contre-revue Codex, P2)', () => {
    simulerSignature();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    expect(reponsesSecuriteDeclarees([CAB_SOUVENT])).toEqual([]);
    const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_SOUVENT, BDI_PLANS]));
    expect(regles(sortie, REGLE_SECURITE_QUESTIONNAIRE_CABINET)).toEqual([]);
  });

  it('une désignation jointe à un questionnaire hors cabinet n’est pas lue par SAF-QUEST-02', () => {
    expect(reponsesSecuriteDeclarees([{ ...passationCab('REP-Q', { Q2: 3 }), idQuestionnaire: 'Q_AUTRE' }])).toEqual([]);
  });
});

describe('§2 — la valeur « non » copiée commande la production', () => {
  it('chaque option autre que la valeur « non » produit un constat, la valeur « non » aucun', () => {
    simulerSignature();
    for (const v of [1, 3]) {
      const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([passationCab(`REP-${v}`, { Q2: v })]));
      expect(sortie.findings).toHaveLength(1);
      const [constat] = sortie.findings;
      expect(constat.ruleId).toBe(REGLE_SECURITE_QUESTIONNAIRE_CABINET);
      expect(constat.rationale).toContain('« Humeur du cabinet »');
      expect(constat.rationale).toContain('« Avez-vous eu des idées de mort ? »');
      expect(constat.rationale).toContain(`« ${COPIE.options.find(o => o.v === v)?.l} »`);
      expect(constat.limitations).toEqual([LIMITATION_QUESTIONNAIRE_PROVENANCE, MENTION_QUESTIONNAIRE_CABINET]);
      expect(regles(sortie, REGLE_SECURITE_QUESTIONNAIRE_CABINET)).toEqual([
        expect.objectContaining({ lifecycle: 'clinically_validated' }),
      ]);
    }
    expect(construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_JAMAIS])).findings).toEqual([]);
  });

  it('la valeur « non » est celle désignée, pas la première option', () => {
    simulerSignature();
    const nonEnDernier = designation({ questionSuicideOptionNon: 3 });
    const premiere = passationCab('REP-P', { Q2: 0 }, { designationCabinet: nonEnDernier });
    const derniere = passationCab('REP-D', { Q2: 3 }, { designationCabinet: nonEnDernier });
    expect(construireSafetyFindings([], reponsesSecuriteDeclarees([premiere])).findings).toHaveLength(1);
    expect(construireSafetyFindings([], reponsesSecuriteDeclarees([derniere])).findings).toEqual([]);
  });

  it('une valeur hors des options copiées fait un constat qui le dit — y compris l’option écartée hors int4', () => {
    simulerSignature();
    for (const valeur of [2, 3000000000, 'oui']) {
      const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([passationCab('REP-H', { Q2: valeur })]));
      expect(sortie.findings).toHaveLength(1);
      expect(sortie.findings[0].rationale).toContain('valeur hors des options de la question');
      expect(sortie.findings[0].limitations).toEqual([
        LIMITATION_QUESTIONNAIRE_PROVENANCE, MENTION_QUESTIONNAIRE_CABINET, LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
      ]);
    }
  });

  it('illisible : aucun constat, une limitation par instrument (A2), la règle jointe', () => {
    simulerSignature();
    const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([
      passationCab('REP-I1', { Q1: 2 }),
      passationCab('REP-I2', { Q2: null }),
      passationCab('REP-I3', { Q2: '  ' }),
    ]));
    expect(sortie.findings).toEqual([]);
    expect(sortie.limitations).toEqual([
      LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE.replace('{n}', '3').replace('{instrument}', '« Humeur du cabinet »'),
    ]);
    expect(regles(sortie, REGLE_SECURITE_QUESTIONNAIRE_CABINET)).toHaveLength(1);
  });

  it('A1 : deux passations positives font deux constats distincts ; l’invalidation retire, un « non » ultérieur ne lève rien', () => {
    simulerSignature();
    const deux = construireSafetyFindings([], reponsesSecuriteDeclarees([
      CAB_SOUVENT, passationCab('REP-CAB-S2', { Q2: 3 }), CAB_JAMAIS,
    ]));
    expect(deux.findings).toHaveLength(2);
    expect(new Set(deux.findings.map(f => f.findingId)).size).toBe(2);
    const invalidee = construireSafetyFindings([], reponsesSecuriteDeclarees([
      passationCab('REP-INV', { Q2: 3 }, { statutValidite: 'INVALID' }),
    ]));
    expect(invalidee.findings).toEqual([]);
    for (const statut of ['AMBIGUOUS', 'SUPERSEDED', 'HISTORICAL_ONLY', null]) {
      expect(construireSafetyFindings([], reponsesSecuriteDeclarees([
        passationCab('REP-ST', { Q2: 3 }, { statutValidite: statut }),
      ])).findings).toHaveLength(1);
    }
  });

  it('un énoncé vide copié tel quel reste lu : le constat cite l’identifiant de la question', () => {
    simulerSignature();
    const vide = passationCab('REP-V', { Q2: 3 }, { designationCabinet: designation({ questionSuicideCopie: { ...COPIE, enonce: '' } }) });
    const [constat] = construireSafetyFindings([], reponsesSecuriteDeclarees([vide])).findings;
    expect(constat.rationale).toContain('à la question « Q2 »');
  });

  it('l’identifiant garde la forme de SAF-QUEST-01 : la lettre peut le couvrir', () => {
    simulerSignature();
    const [constat] = construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_SOUVENT])).findings;
    expect(constat.findingId).toMatch(/^safety:questionnaire:[0-9a-f]{16}$/);
    expect(estFindingQuestionnaire(constat.findingId)).toBe(true);
    expect(estFindingAdressable(constat.findingId)).toBe(true);
  });
});

describe('§7 — une désignation inconnue : limitation, jamais « non », jamais un constat', () => {
  const INCOHERENTES: Partial<DesignationCabinetLue>[] = [
    { questionSuicideCopie: null, questionSuicideId: null, questionSuicideOptionNon: null },
    { questionSuicideCopie: { instrument: 7, enonce: 'x', options: COPIE.options } },
    { questionSuicideCopie: { ...COPIE, options: [] } },
    { questionSuicideCopie: { ...COPIE, options: [{ v: 1.5, l: 'demi' }] } },
    { questionSuicideOptionNon: 9 },
    { questionSuicideId: '' },
  ];

  it('copie absente ou incohérente : une limitation, sans constat, même sur une réponse « positive »', () => {
    simulerSignature();
    for (const surcharge of INCOHERENTES) {
      const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([
        passationCab('REP-DI', { Q2: 3 }, { designationCabinet: designation(surcharge) }),
      ]));
      expect(sortie.findings, JSON.stringify(surcharge)).toEqual([]);
      expect(sortie.limitations).toEqual([
        LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE.replace('{n}', '1').replace('{instrument}', '« Humeur du cabinet »'),
      ]);
    }
  });
});

describe('SAF-QUEST-01 inchangée, SAF-QUEST-02 après elle', () => {
  it('un dossier sans instrument du cabinet lu rend exactement la sortie d’avant', () => {
    for (const signer of [false, true]) {
      if (signer) simulerSignature();
      const seul = construireSafetyFindings([], reponsesSecuriteDeclarees([BDI_PLANS]));
      const avecCabNonLu = construireSafetyFindings([], reponsesSecuriteDeclarees([
        BDI_PLANS,
        passationCab('REP-NL', { Q2: 3 }, { designationCabinet: undefined }),
        CAB_JAMAIS,
      ]));
      expect(avecCabNonLu).toEqual(seul);
    }
  });

  it('les sorties de SAF-QUEST-01 sont un préfixe : le constat du cabinet vient à la fin', () => {
    simulerSignature();
    const seul = construireSafetyFindings([], reponsesSecuriteDeclarees([BDI_PLANS]));
    const mixte = construireSafetyFindings([], reponsesSecuriteDeclarees([CAB_SOUVENT, BDI_PLANS]));
    expect(mixte.findings.slice(0, seul.findings.length)).toEqual(seul.findings);
    expect(mixte.findings.at(-1)?.ruleId).toBe(REGLE_SECURITE_QUESTIONNAIRE_CABINET);
    expect(mixte.rules.slice(0, seul.rules.length)).toEqual(seul.rules);
    expect(mixte.rules.at(-1)?.ruleId).toBe(REGLE_SECURITE_QUESTIONNAIRE_CABINET);
    expect(regles(mixte, REGLE_SECURITE_QUESTIONNAIRE)).toEqual(regles(seul, REGLE_SECURITE_QUESTIONNAIRE));
  });
});

describe('jointure — drapeau éteint, rien n’est lu ni joint', () => {
  const ROWS: (PassationSecuriteRow & { idAssignation: string | null })[] = [
    { ...BDI_PLANS, idAssignation: 'ASG-1' },
    { idReponse: 'REP-C', idQuestionnaire: 'CAB_HUMEUR', dateReponse: new Date(0), scoresJson: {}, idAssignation: 'ASG-2' },
    { idReponse: 'REP-D', idQuestionnaire: 'CAB_HUMEUR', dateReponse: new Date(0), scoresJson: {}, idAssignation: null },
  ];

  it('éteint : aucune requête, les lignes reviennent telles quelles', async () => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    const findMany = vi.fn();
    expect(wherePassationsCabinet()).toBeNull();
    expect(await joindreDesignationsCabinet(ROWS, { assignation: { findMany } } as never)).toEqual(ROWS);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('allumé : la seule assignation d’une passation du cabinet est lue, et sa copie jointe telle quelle', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    expect(wherePassationsCabinet()).toEqual({ idQuestionnaire: { startsWith: 'CAB_' } });
    const findMany = vi.fn().mockResolvedValue([{
      idAssignation: 'ASG-2', titre: 'Humeur du cabinet', poseQuestionSuicide: true,
      questionSuicideId: null, questionSuicideOptionNon: null, questionSuicideCopie: null,
    }]);
    const joint = await joindreDesignationsCabinet(ROWS, { assignation: { findMany } } as never);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toEqual({ idAssignation: { in: ['ASG-2'] } });
    expect(joint[0]).toEqual(ROWS[0]);
    expect(joint[1].designationCabinet).toEqual({
      poseQuestionSuicide: true, titreAssignation: 'Humeur du cabinet',
      questionSuicideId: null, questionSuicideOptionNon: null, questionSuicideCopie: null,
    });
    expect(joint[2]).toEqual(ROWS[2]);
  });
});

// La lettre d'un dossier SANS réponse du cabinet : empreintes du texte figées
// sur le code d'avant ce lot (`origin/main` à 424025e9), pour trois lettres —
// anamnèse seule, questionnaire seul, les deux. Une retouche du chemin commun
// les ferait rougir ([[D-515]] §5 : « ne change pas d'un caractère »).
const EMPREINTES_LETTRES_AVANT = {
  anamnese: '9acfd05494ce13e1dda7bc058bd151b6c872295a575e1fa5be3615f319b2a9c7',
  questionnaire: '3aa1d86d8c871dc9f7aa6c048a71a1820e2a1b16a9fe695990600a61c75853ef',
  mixte: 'f83723d425ca6a0533f8cf32079ec54271f229f114498656c4b895779bd3be26',
};

function lettre(signaux: string[], rows: PassationSecuriteRow[]) {
  const sortie = genererCourrierAdressage({
    patientId: 'PAT-FIXTURE',
    signaux,
    reponses: reponsesSecuriteDeclarees(rows),
    tableSha256: SAFETY_SIGNALS_SHA256,
    dateCourrier: '2026-11-14T10:00:00.000Z',
  });
  if (!sortie.ok) throw new Error(sortie.raison);
  return sortie.courrier;
}

describe('lettre — sans réponse du cabinet, au caractère près ; avec, sa propre ancre', () => {
  const SIGNAL = 'Idées noires ou suicidaires';

  it('les trois lettres sans réponse du cabinet n’ont pas bougé', () => {
    expect(sha256(lettre([SIGNAL], []).texte)).toBe(EMPREINTES_LETTRES_AVANT.anamnese);
    expect(sha256(lettre([], [BDI_PLANS]).texte)).toBe(EMPREINTES_LETTRES_AVANT.questionnaire);
    expect(sha256(lettre([SIGNAL], [BDI_PLANS]).texte)).toBe(EMPREINTES_LETTRES_AVANT.mixte);
  });

  it('une réponse du cabinet : citée depuis la copie, marquée (§), sous la mention ; ancre propre et à jour', () => {
    const courrier = lettre([], [BDI_PLANS, CAB_SOUVENT]);
    expect(courrier.texte).toContain(
      '— questionnaire « Humeur du cabinet » (§), passation du 2026-11-10, question « Avez-vous eu des idées de mort ? » : « Souvent »',
    );
    expect(courrier.texte).toContain(`(§) ${MENTION_QUESTIONNAIRE_CABINET}`);
    const provenance = courrier.document.blocs[0].provenance;
    expect(provenance.version).toBe(VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE_CABINET);
    expect(provenance.ancrageHash).toBe(SHA_ANCRAGE_ADRESSAGE_QUESTIONNAIRE_CABINET);
    expect(verdictAncrage(provenance.ancrageHash, provenance.version)).toBe('concordante');
    expect(provenance.version.startsWith('safety-signals-')).toBe(true);
    expect(provenance.version).not.toBe(VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE);
  });

  it('un énoncé vide se cite par l’identifiant de la question, un nom vide par le titre de l’assignation', () => {
    const vide = passationCab('REP-V', { Q2: 3 }, {
      designationCabinet: designation({ questionSuicideCopie: { ...COPIE, instrument: '', enonce: '' } }),
    });
    const courrier = lettre([], [vide]);
    expect(courrier.texte).toContain('— questionnaire « Humeur du cabinet » (§), passation du 2026-11-10, question « Q2 » : « Souvent »');
  });

  it('un nom du praticien qui porte des motifs de remplacement est cité tel quel', () => {
    simulerSignature();
    const piege = designation({ questionSuicideCopie: { ...COPIE, instrument: 'Bilan $& $\' $1' }, titreAssignation: 'Bilan $& $\' $1' });
    const sortie = construireSafetyFindings([], reponsesSecuriteDeclarees([
      passationCab('REP-P1', { Q1: 1 }, { designationCabinet: piege }),
    ]));
    expect(sortie.limitations).toEqual([
      LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE.split('{n}').join('1').split('{instrument}').join("« Bilan $& $' $1 »"),
    ]);
  });

  it('la lettre remise d’une version du cabinet se rend avec la source des questionnaires', () => {
    const courrier = lettre([], [CAB_SOUVENT]);
    const html = rendreCourrierAdressageFige({
      patientId: 'PAT-FIXTURE',
      texte: courrier.texte,
      dateCourrier: '2026-11-14T10:00:00.000Z',
      ancrageSha256: SHA_ANCRAGE_ADRESSAGE_QUESTIONNAIRE_CABINET,
      ancrageVersion: VERSION_ANCRAGE_ADRESSAGE_QUESTIONNAIRE_CABINET,
    });
    expect(html).not.toBeNull();
    expect(html).toContain('Avez-vous eu des idées de mort ?');
  });
});
