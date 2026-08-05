import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, mockMeta, mockRegles } = vi.hoisted(() => ({
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    pack: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
  mockMeta: {
    version: 'orientation-nnpp2-v1',
    validationExterne: false,
    dateValidation: null as string | null,
    claimsSource: [] as unknown[],
  },
  mockRegles: [] as unknown[],
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical/orientationRulesV1', () => ({
  ORIENTATION_METADATA: mockMeta,
  ORIENTATION_RULES_V1: mockRegles,
  ORIENTATION_RULES_SHA256: 'sha-test',
}));

import { evaluerOrientationPourPatient, orientationActive } from './orientationService';

function signerLaTable() {
  mockMeta.validationExterne = true;
  mockMeta.dateValidation = '2026-08-03';
  mockMeta.claimsSource = ['WN-CLM-0001'];
}

function lecturesVides() {
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.assignation.findMany.mockResolvedValue([]);
  prisma.pack.findMany.mockResolvedValue([]);
  prisma.consultation.findFirst.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMeta.validationExterne = false;
  mockMeta.dateValidation = null;
  mockMeta.claimsSource = [];
  mockRegles.length = 0;
  vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('orientationActive — le double verrou', () => {
  it('est fermé sans le drapeau, table signée ou non', () => {
    signerLaTable();
    vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '');
    expect(orientationActive()).toBe(false);
  });

  it('est fermé quand la table n’est pas signée', () => {
    expect(orientationActive()).toBe(false);
  });

  it('reste fermé sur une validation sans date — le verrou est auto-portant', () => {
    mockMeta.validationExterne = true;
    mockMeta.claimsSource = ['WN-CLM-0001'];
    expect(orientationActive()).toBe(false);
  });

  it('reste fermé sur une validation sans claim source', () => {
    mockMeta.validationExterne = true;
    mockMeta.dateValidation = '2026-08-03';
    expect(orientationActive()).toBe(false);
  });

  it('n’est ouvert que sur les trois conditions réunies', () => {
    signerLaTable();
    expect(orientationActive()).toBe(true);
  });
});

describe('evaluerOrientationPourPatient', () => {
  it('rend actif:false SANS aucune lecture du dossier quand le verrou est fermé', async () => {
    const resultat = await evaluerOrientationPourPatient('PAT_SEED_03');

    expect(resultat.actif).toBe(false);
    // Le cœur du fail-closed : ce n'est pas seulement la réponse qui est vide,
    // c'est que le dossier n'a pas été ouvert. Une route qui journalise l'accès
    // s'appuie sur cette propriété pour ne pas consigner un accès fictif.
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
    expect(prisma.pack.findMany).not.toHaveBeenCalled();
    expect(prisma.consultation.findFirst).not.toHaveBeenCalled();
  });

  it('porte le message français de constitution, jamais une erreur', async () => {
    const resultat = await evaluerOrientationPourPatient('PAT_SEED_03');
    expect(resultat.actif === false && resultat.message).toContain('en cours de constitution');
  });

  it('lit le dossier et rend une liste vide quand la table signée ne déclenche rien', async () => {
    signerLaTable();
    lecturesVides();

    const resultat = await evaluerOrientationPourPatient('PAT_SEED_03');

    expect(resultat.actif).toBe(true);
    expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    expect(resultat.actif === true && resultat.sha256).toBe('sha-test');
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledOnce();
  });

  it('ne lit que les consultations PORTANT une anamnèse', async () => {
    signerLaTable();
    lecturesVides();

    await evaluerOrientationPourPatient('PAT_SEED_03');

    // Une consultation naît sans anamnèse : prendre la plus récente tout court
    // ferait taire les règles de drapeau dans la fenêtre exacte où le praticien
    // regarde l'orientation.
    const argument = prisma.consultation.findFirst.mock.calls[0][0];
    expect(argument.where.NOT).toBeTruthy();
    expect(argument.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('ne considère que les packs actifs', async () => {
    signerLaTable();
    lecturesVides();

    await evaluerOrientationPourPatient('PAT_SEED_03');

    expect(prisma.pack.findMany.mock.calls[0][0].where).toEqual({ actif: true });
  });
});

// ── Le score gelé, et pourquoi il ne l'est plus ─────────────────────────────
//
// DÉFAUT TROUVÉ EN REVUE ADVERSARIALE le 2026-08-04, sur le lot qui prétendait
// l'avoir fermé. `api/patient/submit` calcule le score UNE FOIS à la soumission
// et le persiste. Une garde de scoring ajoutée ensuite ne touche donc AUCUNE
// passation déjà en base : le service relisait un instantané produit par une
// doctrine révolue, et la garde de recueil partiel du PSQI ne protégeait que
// l'avenir — alors que trois documents affirmaient le trou fermé.
//
// Classe de la PR #202 : pas une ligne fautive, un rattrapage absent.
describe('evaluerOrientationPourPatient — le score est RECALCULÉ, jamais relu', () => {
  const REGLE_PSQI = {
    id: 'R-TEST-SOM',
    statut: 'publiee',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_SOM_01', zone: { type: 'couleur', couleurs: ['info', 'warning', 'danger', 'dark'] } },
    ],
    suggestions: [{ questionnaireId: 'Q_SOM_05', priorite: 1, objectif: 'Explorer le chronotype.' }],
    justificationClaims: [{ claimId: 'WN-CL-0000-001', versionClaim: 'v1.0' }],
    niveau: 'socle',
  };

  /** Huit items sur dix-huit — les sept composantes mesurées, la bande faussée. */
  const PARTIEL = { Q1: 23, Q2: 10, Q3: 7, Q4: 8, Q5b: 3, Q6: 0, Q7: 0, Q8: 0 };

  function dossierAvec(scoresJson: unknown) {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'REP-1', idQuestionnaire: 'Q_SOM_01', dateReponse: new Date('2026-07-01T10:00:00Z'), scoresJson },
    ]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.pack.findMany.mockResolvedValue([]);
    prisma.consultation.findFirst.mockResolvedValue(null);
  }

  beforeEach(() => {
    signerLaTable();
    mockRegles.push(REGLE_PSQI);
  });

  it('une bande PÉRIMÉE stockée en base ne déclenche plus rien', () => {
    // Exactement ce qu'un dossier antérieur au déploiement porte : la bande
    // calculée par l'ancien moteur, sans `missing`, à côté des réponses brutes.
    dossierAvec({
      type: 'psqi', total: 1, maxTotal: 21,
      interpretation: { label: 'Pas de trouble du sommeil', color: 'info' },
      rawAnswers: PARTIEL,
    });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif).toBe(true);
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });

  it('une passation COMPLÈTE et dégradée déclenche bien — contre-épreuve', () => {
    // Sans ce cas, un service qui écarterait TOUT passerait le test précédent.
    const complet = {
      Q1: 0, Q2: 90, Q3: 7, Q4: 4,
      Q5a: 3, Q5b: 3, Q5c: 3, Q5d: 3, Q5e: 3,
      Q5f: 3, Q5g: 3, Q5h: 3, Q5i: 3, Q5j: 3,
      Q6: 3, Q7: 3, Q8: 3, Q9: 3,
    };
    dossierAvec({ type: 'psqi', total: 0, interpretation: null, rawAnswers: complet });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      if (resultat.actif !== true) throw new Error('la table doit être active dans ce cas');
      expect(resultat.recommandations).toHaveLength(1);
      expect(resultat.recommandations[0].cible).toEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_05' });
    });
  });

  it('une passation ancienne garde son badge « déjà renseigné »', () => {
    // DEUX FAITS DISTINCTS, et une première rédaction les confondait. « Une
    // réponse existe » est ADMINISTRATIF ; « une réponse est cotable » est
    // CLINIQUE. Écarter la ligne entière faisait disparaître le badge de
    // l'écran praticien — et, pour un pack, pour le pack ENTIER, une seule
    // ligne ancienne suffisant à casser le `every`.
    //
    // La règle ci-dessous se déclenche sur un DRAPEAU seul : elle s'allume donc
    // sans mesure, ce qui permet d'observer `dejaRepondu` sur une passation
    // qu'aucun déclencheur ne peut lire.
    mockRegles.length = 0;
    mockRegles.push({
      id: 'R-TEST-DRAPEAU',
      statut: 'publiee',
      declencheurs: [
        { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Psychiatrique (anxiété, dépression, burn-out)'] },
      ],
      suggestions: [{ questionnaireId: 'Q_SOM_01', priorite: 1, objectif: 'Explorer le sommeil.' }],
      justificationClaims: [{ claimId: 'WN-CL-0000-002', versionClaim: 'v1.0' }],
      niveau: 'socle',
    });
    dossierAvec({ type: 'psqi', total: 12, interpretation: { label: 'Troubles du sommeil modérés', color: 'warning' } });
    prisma.consultation.findFirst.mockResolvedValue({
      anamnese: { antecedents_domaines: ['Psychiatrique (anxiété, dépression, burn-out)'] },
    });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      if (resultat.actif !== true) throw new Error('la table doit être active dans ce cas');
      expect(resultat.recommandations).toHaveLength(1);
      // Le fait administratif survit à l'écartement clinique.
      expect(resultat.recommandations[0].dejaRepondu).toBe(true);
    });
  });

  it('une passation NON INTERPRÉTABLE ne fonde aucun déclencheur', () => {
    // Ce point ne pouvait pas se poser tant qu'on relayait un instantané : il
    // se pose dès qu'on FABRIQUE un score. Le registre dit de `Q_SOM_07` que
    // « le total et la bande enregistrés ne sont pas une mesure de fatigue » —
    // recalculer ses réponses brutes produirait un nombre que le dépôt affirme
    // ne pas devoir exister.
    mockRegles.length = 0;
    mockRegles.push({
      id: 'R-TEST-MFI',
      statut: 'publiee',
      declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_SOM_07', sousScore: 'GEN', operateur: '>=', valeur: 1 }],
      suggestions: [{ questionnaireId: 'Q_SOM_05', priorite: 1, objectif: 'Explorer le chronotype.' }],
      justificationClaims: [{ claimId: 'WN-CL-0000-003', versionClaim: 'v1.0' }],
      niveau: 'socle',
    });
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'REP-2', idQuestionnaire: 'Q_SOM_07', dateReponse: new Date('2026-07-01T10:00:00Z'), scoresJson: { rawAnswers: { M1: 3, M5: 4, M12: 2, M16: 5 } } },
    ]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.pack.findMany.mockResolvedValue([]);
    prisma.consultation.findFirst.mockResolvedValue(null);
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });

  it('une passation NON ADMINISTRABLE ne fonde aucun déclencheur', () => {
    // `Q_NEU_06` est scorable — `sum`, total 10 sur cette passation complète —
    // mais retiré de la route (droits/certification). Le
    // moteur écarte déjà ces instruments comme CIBLES ; il n'y a pas de raison
    // d'accepter leurs MESURES. Sans ce banc, la garde restait verte à la
    // mutation — c'est-à-dire qu'elle ne gardait rien de prouvé.
    mockRegles.length = 0;
    mockRegles.push({
      id: 'R-TEST-NONADM',
      statut: 'publiee',
      declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_NEU_06', operateur: '>=', valeur: 0 }],
      suggestions: [{ questionnaireId: 'Q_SOM_05', priorite: 1, objectif: 'Explorer le chronotype.' }],
      justificationClaims: [{ claimId: 'WN-CL-0000-004', versionClaim: 'v1.0' }],
      niveau: 'socle',
    });
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'REP-3', idQuestionnaire: 'Q_NEU_06', dateReponse: new Date('2026-07-01T10:00:00Z'), scoresJson: { rawAnswers: { MM1: 1, MM2: 1, MM3: 1, MM4: 1, MM5: 1, MM6: 1, MM7: 1, MM8: 1, MM9: 1, MM10: 1 } } },
    ]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.pack.findMany.mockResolvedValue([]);
    prisma.consultation.findFirst.mockResolvedValue(null);
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });

  it('un instrument HORS CATALOGUE ne fonde aucun déclencheur', () => {
    // `calculateScore` rend `{error: 'Questionnaire introuvable'}` — un objet
    // TRUTHY. Un `if (!scores)` seul ne l'attrape pas, et une première rédaction
    // affirmait pourtant qu'il rendait `null`. Le déclencheur ci-dessous mord sur
    // `>= 0`, donc sur n'importe quel total : si l'objet d'erreur entrait avec un
    // `total` un jour, la règle s'allumerait.
    mockRegles.length = 0;
    mockRegles.push({
      id: 'R-TEST-INCONNU',
      statut: 'publiee',
      declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_INEXISTANT', operateur: '>=', valeur: 0 }],
      suggestions: [{ questionnaireId: 'Q_SOM_05', priorite: 1, objectif: 'Explorer le chronotype.' }],
      justificationClaims: [{ claimId: 'WN-CL-0000-005', versionClaim: 'v1.0' }],
      niveau: 'socle',
    });
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'REP-4', idQuestionnaire: 'Q_INEXISTANT', dateReponse: new Date('2026-07-01T10:00:00Z'), scoresJson: { rawAnswers: { X1: 1 } } },
    ]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.pack.findMany.mockResolvedValue([]);
    prisma.consultation.findFirst.mockResolvedValue(null);
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });

  it('une passation sans rawAnswers ne fonde aucun déclencheur', () => {
    // Fail-closed sur l'irrécupérable : 15 lignes sur 99 en production portent
    // une forme antérieure au moteur actuel. Elles étaient déjà inertes ; ce
    // banc rend le fait VOULU, et non plus accidentel.
    dossierAvec({
      type: 'psqi', total: 12,
      interpretation: { label: 'Troubles du sommeil modérés', color: 'warning' },
    });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });
});

// ── Le TFD, dernier de la classe ────────────────────────────────────────────
//
// Le lot du PSQI a fermé le recueil partiel sur son moteur et a NOMMÉ `tfd`
// comme le dernier trou atteignable par une règle publiée. Ce bloc est la
// contre-épreuve BOUT EN BOUT de sa fermeture : la garde vit dans
// `questions.ts`, mais ce qui compte cliniquement est ce que le SERVICE fait des
// dossiers déjà en base, dont le score est figé à la soumission.
describe('evaluerOrientationPourPatient — le recueil partiel du TFD', () => {
  const REGLE_TFD = {
    id: 'R-TEST-GAS',
    statut: 'publiee',
    declencheurs: [
      { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['success', 'info', 'warning', 'danger', 'dark'] } },
    ],
    suggestions: [{ questionnaireId: 'Q_GAS_03', priorite: 1, objectif: 'Préciser la forme des selles.' }],
    justificationClaims: [{ claimId: 'WN-CL-0000-004', versionClaim: 'v1.0' }],
    niveau: 'socle',
  };

  /** Cinq items sur trente-et-un — les cinq axes mesurés, la bande faussée. */
  const PARTIEL = { C1_1: 3, C2_1: 3, C3_1: 3, C4_1: 3, C5_1: 3 };

  function dossierTfd(scoresJson: unknown) {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'REP-G', idQuestionnaire: 'Q_GAS_01', dateReponse: new Date('2026-07-01T10:00:00Z'), scoresJson },
    ]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.pack.findMany.mockResolvedValue([]);
    prisma.consultation.findFirst.mockResolvedValue(null);
  }

  beforeEach(() => {
    signerLaTable();
    mockRegles.push(REGLE_TFD);
  });

  it('une bande PÉRIMÉE stockée en base ne déclenche plus rien', () => {
    // Le dossier tel qu'il existe avant ce lot : la bande calculée par l'ancien
    // moteur — « A — Absence de troubles fonctionnels » sur cinq items dont
    // TOUS sont au maximum de leur échelle —, sans aucun compte, à côté des
    // réponses brutes. La règle ci-dessus s'allume sur N'IMPORTE quelle couleur :
    // si le service relisait l'instantané, elle sortirait.
    //
    // POURQUOI CE CAS RESTE VIDE APRÈS LE LOT DU PLANCHER (2026-08-05), et ce
    // n'est plus pour la même raison qu'hier. Un recueil partiel PEUT désormais
    // rallumer une règle, par son plancher garanti. Pas celui-ci : cinq items à
    // 3 font 15 sur 93, soit la bande A — la PLUS BASSE de la grille. « Au moins
    // la bande la plus basse » ne dit rien, `bandePlancher` n'est donc pas servi
    // (D-014), et il n'y a rien à allumer. Le cas suivant prend le même dossier
    // huit items plus loin et s'allume, lui : c'est le couple qui prouve que
    // c'est bien la bande atteinte qui décide, et non le fait d'être partiel.
    dossierTfd({
      type: 'tfd', total: 15, maxTotal: 93,
      interpretation: { label: 'A — Absence de troubles fonctionnels', color: 'success' },
      rawAnswers: PARTIEL,
    });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif).toBe(true);
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });

  it('une passation COMPLÈTE déclenche bien — contre-épreuve', () => {
    // Sans ce cas, un service qui écarterait TOUT passerait le test précédent.
    const complet = Object.fromEntries(
      ['C1_1','C1_2','C1_3','C1_4','C1_5','C1_6','C1_7','C1_8',
       'C2_1','C2_2','C2_3','C2_4','C2_5','C2_6','C2_7',
       'C3_1','C3_2','C3_3','C3_4','C3_5',
       'C4_1','C4_2','C4_3','C4_4','C4_5','C4_6',
       'C5_1','C5_2','C5_3','C5_4','C5_5'].map(id => [id, 3]),
    );
    dossierTfd({ type: 'tfd', total: null, interpretation: null, rawAnswers: complet });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      if (resultat.actif !== true) throw new Error('la table doit être active dans ce cas');
      expect(resultat.recommandations).toHaveLength(1);
      expect(resultat.recommandations[0].cible).toEqual({ type: 'questionnaire', questionnaireId: 'Q_GAS_03' });
    });
  });

  /** Huit items à 3, répartis sur les cinq axes : total 24, bande B acquise. */
  const PARTIEL_DEJA_EN_B = {
    C1_1: 3, C1_2: 3, C1_3: 3, C1_4: 3,
    C2_1: 3, C3_1: 3, C4_1: 3, C5_1: 3,
  };

  it('un partiel DÉJÀ SÉVÈRE rallume la règle, sur son plancher et en « au moins »', () => {
    // D-024 vu depuis le service — c'est lui qui lève la réserve de D-021, dont
    // le texte (append-only) dit encore « R-GAS-01 n'est PAS rallumée ». La
    // bande reste absente, le
    // plancher B est servi à côté, et ses bandes encore atteignables
    // (`warning`, `danger`) sont toutes contenues dans la zone de la règle. Le
    // dossier porte, comme en base, une bande PÉRIMÉE qui n'est pas relue : ce
    // qui allume vient du rescoring de `rawAnswers`.
    dossierTfd({
      type: 'tfd', total: 15, maxTotal: 93,
      interpretation: { label: 'A — Absence de troubles fonctionnels', color: 'success' },
      rawAnswers: PARTIEL_DEJA_EN_B,
    });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      if (resultat.actif !== true) throw new Error('la table doit être active dans ce cas');
      expect(resultat.recommandations).toHaveLength(1);
      expect(resultat.recommandations[0].cible).toEqual({ type: 'questionnaire', questionnaireId: 'Q_GAS_03' });
      // Le praticien lit `motif.conditions.join(' ; ')` : « au moins » n'est pas
      // une précaution rédactionnelle, c'est ce qui empêche de relire un
      // minimum acquis comme la mesure que la garde vient de retirer. Et la
      // mention du recueil partiel dit d'où ce minimum est tiré — un libellé de
      // bande peut être rassurant à côté d'une proposition qui ne l'est pas.
      expect(resultat.recommandations[0].motifs[0].conditions[0]).toBe(
        'Q_GAS_01 : au moins zone warning (« B — Troubles fonctionnels modérés à importants ») — recueil partiel, 23 items sans réponse sur 31',
      );
    });
  });

  it('LE MÊME partiel n’allume PAS une règle qui s’arrête à `warning`', () => {
    // LE SEUL CAS QUI PROUVE LA FERMETURE. Le plancher est bien `warning`, et
    // une implémentation naïve — « la couleur du plancher figure dans la zone »
    // — s'allumerait ici. Elle aurait tort : les vingt-trois items sans réponse
    // ne peuvent qu'ajouter, le score final peut donc atteindre `danger`,
    // c'est-à-dire SORTIR de la zone visée. Rien n'est garanti, rien ne s'allume.
    mockRegles.length = 0;
    mockRegles.push({
      ...REGLE_TFD,
      id: 'R-TEST-GAS-ETROITE',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['warning'] } },
      ],
    });
    dossierTfd({ type: 'tfd', total: null, interpretation: null, rawAnswers: PARTIEL_DEJA_EN_B });
    return evaluerOrientationPourPatient('PAT-1').then(resultat => {
      expect(resultat.actif).toBe(true);
      expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    });
  });
});
