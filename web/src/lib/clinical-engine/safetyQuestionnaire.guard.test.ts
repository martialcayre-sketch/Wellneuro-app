import { afterEach, describe, expect, it } from 'vitest';

import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { QUESTION_SUICIDE_PAR_QUESTIONNAIRE } from '@/lib/securite/urgenceSuicide';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  CONDUITE_SECURITE_QUESTIONNAIRE,
  LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
  LIMITATION_QUESTIONNAIRE_ILLISIBLE,
  LIMITATION_QUESTIONNAIRE_PROVENANCE,
} from '@/lib/clinical/safetyQuestionnaireTextes';
import {
  REGLE_SECURITE_QUESTIONNAIRE,
  SAFETY_QUESTIONNAIRE_METADATA,
  SAFETY_QUESTIONNAIRE_SHA256,
  SAFETY_QUESTIONNAIRE_V1,
  tableSecuriteQuestionnaireSignee,
} from '@/lib/clinical/safetyQuestionnaireV1';
import {
  construireSafetyFindings,
  constatsSecuriteOuverts,
  findingIdQuestionnaire,
  partitionnerConstatsAdresses,
  reponsesSecuriteDeclarees,
  type PassationSecuriteRow,
} from './safetyFindings';
import { estFindingAdressable, estFindingQuestionnaire } from './safetyFindingSource';

// [[D-275]] §2, LOT-3 — le banc du TROISIÈME producteur de l'objet de sécurité.
// Il garde ce que la décision promet, chaque propriété avec sa contre-épreuve :
//
//   1. la table est celle de l'encart, et ses options celles du catalogue ;
//   2. toute réponse autre que la première produit un constat, et la première
//      n'en produit aucun ;
//   3. A1 : toute passation non invalidée compte, un « non » ultérieur ne lève
//      rien, l'invalidation retire ;
//   4. A2 : illisible ⇒ limitation sans constat ; hors options ⇒ constat ;
//   5. aucun dossier sans réponse positive ne change d'empreinte — c'est ce qui
//      garde les écrans patients au déploiement ;
//   6. la lettre peut couvrir ces constats, jamais un effet indésirable.

const ETAT_LIVRE = { ...SAFETY_QUESTIONNAIRE_METADATA };

afterEach(() => {
  Object.assign(SAFETY_QUESTIONNAIRE_METADATA, ETAT_LIVRE);
  delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
});

function simulerSignature(): void {
  SAFETY_QUESTIONNAIRE_METADATA.validationExterne = true;
  SAFETY_QUESTIONNAIRE_METADATA.dateValidation = '2026-10-10T00:00:00.000Z';
  SAFETY_QUESTIONNAIRE_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
  SAFETY_QUESTIONNAIRE_METADATA.shaPerimetre = SAFETY_QUESTIONNAIRE_SHA256;
}

function passation(
  idReponse: string,
  idQuestionnaire: string,
  rawAnswers: Record<string, unknown> | null,
  surcharge: Partial<PassationSecuriteRow> = {},
): PassationSecuriteRow {
  return {
    idReponse,
    idQuestionnaire,
    dateReponse: new Date('2026-10-01T09:00:00.000Z'),
    scoresJson: rawAnswers === null ? {} : { total: 3, rawAnswers },
    statutValidite: 'VALID',
    ...surcharge,
  };
}

const BDI_PLANS = passation('REP-B', 'Q_NEU_01', { B1: 1, B7: 2 });
const BDI_NON = passation('REP-C', 'Q_NEU_01', { B7: 0 });

type Question = { id: string; options?: { v: number; l: string }[] };
function questionDuCatalogue(idQuestionnaire: string, idQuestion: string): Question | undefined {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, { sections?: { questions?: Question[] }[] }>)[idQuestionnaire];
  return (def?.sections ?? []).flatMap(section => section.questions ?? []).find(q => q.id === idQuestion);
}

describe('la table — elle ne dérive ni de l’encart ni du catalogue', () => {
  it('ses questions sont exactement celles de l’encart, dans les deux sens', () => {
    const table = Object.fromEntries(SAFETY_QUESTIONNAIRE_V1.map(q => [q.idQuestionnaire, q.idQuestion]));
    // Anti-vacuité : deux listes vides seraient égales.
    expect(Object.keys(table)).toHaveLength(4);
    expect(table).toEqual({ ...QUESTION_SUICIDE_PAR_QUESTIONNAIRE });
  });

  it('chaque question existe au catalogue, avec au moins deux options lues', () => {
    // Les options sont LUES dans le catalogue (aucune phrase dans la structure
    // signée, [[D-251]]). Une question introuvable rendrait `[]` : ce cas le
    // dirait avant que le verrou ne se referme en silence.
    for (const question of SAFETY_QUESTIONNAIRE_V1) {
      const catalogue = questionDuCatalogue(question.idQuestionnaire, question.idQuestion);
      expect(catalogue, `${question.idQuestionnaire}.${question.idQuestion}`).toBeDefined();
      expect(question.options.length, question.idQuestionnaire).toBeGreaterThanOrEqual(2);
      expect(question.options).toEqual(catalogue?.options);
    }
  });

  it('la première option de chaque question dit non, et vaut 0', () => {
    expect(SAFETY_QUESTIONNAIRE_V1.map(q => q.options[0].v)).toEqual([0, 0, 0, 0]);
  });

  it('contre-épreuve : un libellé d’option retouché change le SHA, donc referme le verrou', () => {
    const retouchees = SAFETY_QUESTIONNAIRE_V1.map((question, index) => (index === 0
      ? { ...question, options: [{ v: 0, l: 'Non' }, ...question.options.slice(1)] }
      : question));
    const sha = (questions: unknown) => sha256(JSON.stringify({
      questions,
      conduite: CONDUITE_SECURITE_QUESTIONNAIRE,
      limitations: [
        LIMITATION_QUESTIONNAIRE_PROVENANCE,
        LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
        LIMITATION_QUESTIONNAIRE_ILLISIBLE,
      ],
    }));
    // Le calcul recopié ici est bien celui du module…
    expect(sha(SAFETY_QUESTIONNAIRE_V1)).toBe(SAFETY_QUESTIONNAIRE_SHA256);
    // …et une retouche le fait bouger.
    expect(sha(retouchees)).not.toBe(SAFETY_QUESTIONNAIRE_SHA256);
  });
});

function designerTable(): void {
  SAFETY_QUESTIONNAIRE_METADATA.validationExterne = false;
}

describe('verrou de signature — sens inverse, comme SAF-ANAM-01', () => {
  it('la table livrée est signée (déclaration du 2026-10-10, [[D-195]])', () => {
    expect(tableSecuriteQuestionnaireSignee()).toBe(true);
    expect(SAFETY_QUESTIONNAIRE_METADATA.shaPerimetre).toBe(SAFETY_QUESTIONNAIRE_SHA256);
  });

  it('table désignée : aucun constat, et la règle candidate seulement là où une réponse l’appelle', () => {
    designerTable();
    expect(tableSecuriteQuestionnaireSignee()).toBe(false);
    const positif = construireSafetyFindings([], [], reponsesSecuriteDeclarees([BDI_PLANS]));
    expect(positif.findings).toEqual([]);
    expect(positif.rules.filter(r => r.ruleId === REGLE_SECURITE_QUESTIONNAIRE)).toEqual([
      expect.objectContaining({ lifecycle: 'candidate' }),
    ]);
    const negatif = construireSafetyFindings([], [], reponsesSecuriteDeclarees([BDI_NON]));
    expect(negatif.rules.some(r => r.ruleId === REGLE_SECURITE_QUESTIONNAIRE)).toBe(false);
  });

  it('table désignée : une réponse illisible seule joint aussi la règle candidate (revue Codex de #1375, P2)', () => {
    designerTable();
    const { findings, rules, limitations } = construireSafetyFindings(
      [], [], reponsesSecuriteDeclarees([passation('REP-I', 'Q_NEU_01', {})]),
    );
    expect(findings).toEqual([]);
    expect(limitations).toEqual([]);
    expect(rules.filter(r => r.ruleId === REGLE_SECURITE_QUESTIONNAIRE)).toEqual([
      expect.objectContaining({ lifecycle: 'candidate' }),
    ]);
  });

  it('un sha périmé referme le verrou', () => {
    simulerSignature();
    expect(tableSecuriteQuestionnaireSignee()).toBe(true);
    SAFETY_QUESTIONNAIRE_METADATA.shaPerimetre = '0'.repeat(64);
    expect(tableSecuriteQuestionnaireSignee()).toBe(false);
  });

  it('une date non canonique referme le verrou', () => {
    simulerSignature();
    SAFETY_QUESTIONNAIRE_METADATA.dateValidation = '2026-10-10';
    expect(tableSecuriteQuestionnaireSignee()).toBe(false);
  });
});

describe('la réponse commande la production', () => {
  it('chaque option autre que la première produit un constat, la première aucun', () => {
    simulerSignature();
    for (const question of SAFETY_QUESTIONNAIRE_V1) {
      question.options.forEach((option, index) => {
        const reponses = reponsesSecuriteDeclarees([
          passation(`REP-${question.idQuestionnaire}-${option.v}`, question.idQuestionnaire, { [question.idQuestion]: option.v }),
        ]);
        const { findings } = construireSafetyFindings([], [], reponses);
        expect(findings, `${question.idQuestionnaire} = ${option.v}`).toHaveLength(index === 0 ? 0 : 1);
        if (index > 0) {
          expect(findings[0].rationale).toContain(`« ${option.l} »`);
          expect(findings[0].rationale).toContain(question.instrument);
        }
      });
    }
  });

  it('une valeur en chaîne numérique est lue comme le nombre', () => {
    simulerSignature();
    const reponses = reponsesSecuriteDeclarees([passation('REP-S', 'Q_NEU_02', { Q010: '6' })]);
    expect(reponses[0].lecture).toEqual(expect.objectContaining({ kind: 'option', v: 6, non: false }));
    expect(reponsesSecuriteDeclarees([passation('REP-Z', 'Q_NEU_02', { Q010: '0' })])[0].lecture)
      .toEqual(expect.objectContaining({ kind: 'option', non: true }));
  });

  it('une autre question mal formée n’efface pas la réponse de sécurité', () => {
    simulerSignature();
    const reponses = reponsesSecuriteDeclarees([passation('REP-M', 'Q_NEU_01', { B1: 'abc', B7: 3 })]);
    expect(construireSafetyFindings([], [], reponses).findings).toHaveLength(1);
  });

  it('un booléen n’est jamais lu comme une option (Number(true) vaudrait 1)', () => {
    const [reponse] = reponsesSecuriteDeclarees([passation('REP-T', 'Q_NEU_01', { B7: true })]);
    expect(reponse.lecture.kind).toBe('hors_options');
  });

  it('un questionnaire hors table est ignoré', () => {
    expect(reponsesSecuriteDeclarees([passation('REP-X', 'Q_STR_04', { B7: 3 })])).toEqual([]);
  });
});

describe('A1 — toute passation non invalidée compte', () => {
  it('deux passations positives font deux constats, d’identifiants distincts', () => {
    simulerSignature();
    const reponses = reponsesSecuriteDeclarees([BDI_PLANS, passation('REP-A', 'Q_NEU_01', { B7: 1 })]);
    const ids = construireSafetyFindings([], [], reponses).findings.map(f => f.findingId);
    expect(new Set(ids).size).toBe(2);
  });

  it('deux passations portant la MÊME réponse font deux constats', () => {
    simulerSignature();
    const reponses = reponsesSecuriteDeclarees([BDI_PLANS, passation('REP-B2', 'Q_NEU_01', { B7: 2 })]);
    expect(new Set(construireSafetyFindings([], [], reponses).findings.map(f => f.findingId)).size).toBe(2);
  });

  it('un « non » ultérieur ne lève rien', () => {
    simulerSignature();
    const plusTard = { ...BDI_NON, dateReponse: new Date('2026-10-09T09:00:00.000Z') };
    const { findings } = construireSafetyFindings([], [], reponsesSecuriteDeclarees([BDI_PLANS, plusTard]));
    expect(findings).toHaveLength(1);
  });

  it('une passation invalidée sort, drapeau de validité allumé ou non ; aucun autre statut ne retire', () => {
    simulerSignature();
    const invalide = { ...BDI_PLANS, statutValidite: 'INVALID' };
    for (const drapeau of ['1', undefined]) {
      if (drapeau) process.env.WN_ENABLE_VALIDITE_PASSATIONS = drapeau;
      else delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
      expect(construireSafetyFindings([], [], reponsesSecuriteDeclarees([invalide])).findings).toHaveLength(0);
      for (const statut of ['VALID', 'AMBIGUOUS', 'SUPERSEDED', 'HISTORICAL_ONLY', null]) {
        const ligne = { ...BDI_PLANS, statutValidite: statut };
        expect(construireSafetyFindings([], [], reponsesSecuriteDeclarees([ligne])).findings, `${statut}`).toHaveLength(1);
      }
    }
  });

  it('l’identifiant ne dépend pas de l’ordre de la base', () => {
    simulerSignature();
    const a = construireSafetyFindings([], [], reponsesSecuriteDeclarees([BDI_PLANS, passation('REP-A', 'Q_NEU_12', { IA9: 1 })]));
    const b = construireSafetyFindings([], [], reponsesSecuriteDeclarees([passation('REP-A', 'Q_NEU_12', { IA9: 1 }), BDI_PLANS]));
    expect(a).toEqual(b);
  });

  it('une valeur changée sur la même passation est un autre constat', () => {
    const [deux] = reponsesSecuriteDeclarees([BDI_PLANS]);
    const [trois] = reponsesSecuriteDeclarees([passation('REP-B', 'Q_NEU_01', { B7: 3 })]);
    expect(findingIdQuestionnaire(deux)).not.toBe(findingIdQuestionnaire(trois));
    expect(findingIdQuestionnaire(deux)).toMatch(/^safety:questionnaire:[0-9a-f]{16}$/);
  });
});

describe('A2 — illisible : limitation sans blocage ; hors options : constat', () => {
  it('réponse absente, nulle ou vide ⇒ aucun constat, une limitation par instrument', () => {
    simulerSignature();
    const reponses = reponsesSecuriteDeclarees([
      passation('REP-1', 'Q_NEU_01', { B1: 1 }),
      passation('REP-2', 'Q_NEU_01', { B7: null }),
      passation('REP-3', 'Q_NEU_01', { B7: '  ' }),
      passation('REP-4', 'Q_NEU_03', null),
    ]);
    const { findings, limitations } = construireSafetyFindings([], [], reponses);
    expect(findings).toEqual([]);
    expect(limitations).toEqual([
      expect.stringMatching(/^3 passation\(s\) de BDI /),
      expect.stringMatching(/^1 passation\(s\) de SIGH-SAD-SA /),
    ]);
  });

  it('valeur présente hors des options ⇒ constat qui le dit (fail-closed)', () => {
    simulerSignature();
    for (const valeur of [5, 'oui', true, [2]]) {
      const { findings } = construireSafetyFindings(
        [], [], reponsesSecuriteDeclarees([passation('REP-H', 'Q_NEU_02', { Q010: valeur })]),
      );
      expect(findings, JSON.stringify(valeur)).toHaveLength(1);
      expect(findings[0].limitations.some(l => l.includes('aucune option'))).toBe(true);
      // La valeur brute n'est jamais recopiée — ni rationale, ni limitations.
      expect(findings[0].rationale).toContain('valeur hors des options');
      const canari = construireSafetyFindings(
        [], [], reponsesSecuriteDeclarees([passation('REP-K', 'Q_NEU_02', { Q010: 'CANARI-7f3' })]),
      ).findings[0];
      expect(JSON.stringify(canari)).not.toContain('CANARI');
    }
  });
});

describe('empreinte — un dossier sans réponse positive ne change pas', () => {
  it('signée ou non : sans réponse, ou avec un « non », la sortie est celle d’avant le lot', () => {
    const avant = construireSafetyFindings(['Idées noires ou suicidaires'], [], []);
    expect(construireSafetyFindings(['Idées noires ou suicidaires'], [], reponsesSecuriteDeclarees([BDI_NON]))).toEqual(avant);
    simulerSignature();
    expect(construireSafetyFindings(['Idées noires ou suicidaires'], [], reponsesSecuriteDeclarees([BDI_NON]))).toEqual(avant);
  });

  it('une réponse illisible, elle, change la sortie (A2, conséquence acceptée le 2026-10-10)', () => {
    simulerSignature();
    const avant = construireSafetyFindings([], [], []);
    const illisible = construireSafetyFindings([], [], reponsesSecuriteDeclarees([passation('REP-I', 'Q_NEU_01', {})]));
    expect(illisible.findings).toEqual(avant.findings);
    expect(illisible.rules).toEqual(avant.rules);
    expect(illisible.limitations).not.toEqual(avant.limitations);
  });

  it('le troisième producteur vient APRÈS les deux autres', () => {
    simulerSignature();
    const { findings, rules } = construireSafetyFindings(
      ['Idées noires ou suicidaires'], [], reponsesSecuriteDeclarees([BDI_PLANS]),
    );
    expect(findings.map(f => estFindingQuestionnaire(f.findingId))).toEqual([false, true]);
    expect(rules.at(-1)?.ruleId).toBe(REGLE_SECURITE_QUESTIONNAIRE);
  });
});

describe('aucune mesure sur le constat (`DC-23`)', () => {
  it('confidence figée, provenance vide, aucune valeur numérique', () => {
    simulerSignature();
    const [finding] = construireSafetyFindings([], [], reponsesSecuriteDeclarees([BDI_PLANS])).findings;
    expect(finding.confidence).toBe('à_documenter');
    expect(finding.provenance).toEqual({ responseIds: [], needIds: [], clinicalObjectCodes: [] });
    expect(Object.values(finding).some(v => typeof v === 'number')).toBe(false);
  });
});

describe('levée par lettre — questionnaire oui, effet indésirable jamais', () => {
  it('une couverture lève un constat de questionnaire', () => {
    simulerSignature();
    const { findings } = construireSafetyFindings([], [], reponsesSecuriteDeclarees([BDI_PLANS]));
    const couverture = {
      idAdressage: 'ADR-1',
      idCorrespondance: 'COR-1',
      findingIds: [findings[0].findingId],
      acteLe: '2026-10-10T00:00:00.000Z',
    };
    expect(partitionnerConstatsAdresses(findings, [couverture]).adresses).toHaveLength(1);
    expect(constatsSecuriteOuverts([], [], reponsesSecuriteDeclarees([BDI_PLANS]), [couverture])).toEqual([]);
    // Une nouvelle passation positive n'est pas couverte par l'ancienne lettre.
    const ouverts = constatsSecuriteOuverts(
      [], [], reponsesSecuriteDeclarees([BDI_PLANS, passation('REP-D', 'Q_NEU_01', { B7: 1 })]), [couverture],
    );
    expect(ouverts).toHaveLength(1);
  });

  it('l’éligibilité ne se présume pas', () => {
    expect(estFindingAdressable('safety:questionnaire:0123456789abcdef')).toBe(true);
    expect(estFindingAdressable('safety:anamnese:0123456789abcdef')).toBe(true);
    expect(estFindingAdressable('safety:effet-indesirable:AER-1')).toBe(false);
    expect(estFindingAdressable(undefined)).toBe(false);
  });
});
