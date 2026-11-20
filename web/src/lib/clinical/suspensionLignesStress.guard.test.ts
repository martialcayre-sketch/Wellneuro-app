import { describe, expect, it, vi } from 'vitest';

// L'entrée publiée de la biologie, que lit `lignesSuspendues`, tire Prisma : jamais appelé ici.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { calculateScore } from '@/lib/questions';
import {
  GRILLES_INDICATIONS,
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_V1,
} from '@/lib/biology-library/indicationsBiologieV1';
import {
  cleClaimAdmissible,
  deriverStatutsBiologie,
  shaPerimetreBiologie,
  type EntreeStatutsBiologie,
} from '@/lib/biology-library/statuts';
import { evaluerContradictions } from './contradictionsEngine';
import { CONTRADICTIONS_RULES_V1 } from './contradictionsV1';
import { lignesSuspenduesPourRelecture } from './lignesSuspendues';
import { evaluerOrientationDetaillee, type ReponseOrientation } from './orientationEngine';
import { FENETRES_FRAICHEUR_ORIENTATION, ORIENTATION_RULES_V1 } from './orientationRulesV1';
import { FENETRES_ARRET, STOP_RULES_V1 } from './stopRulesV1';

// LES CINQ LIGNES DU STRESS SUSPENDUES POUR RELECTURE — [[D-543]].
//
// `R-STR-01`, `R-STR-02` (orientation), `STOP-STR` (arrêt), `C-STR`
// (contradictions) et `BIO-STR-01` (indications biologiques) ont le statut
// `suspendue`. Ce banc FIGE L'ABSENCE D'EFFET de ces cinq lignes sur les tables
// LIVRÉES : devant les entrées qui les allumaient, rien ne sort d'elles —
// aucune exploration, aucune extinction, aucune discordance, aucun bilan. Chaque
// bloc fait sa contre-épreuve : la ligne repassée `publiee` dans le seul test
// produit bien l'effet, preuve que l'entrée l'allumerait.
//
// Rétablir, corriger ou retirer une ligne est une décision propre : ce banc
// rougit alors, et c'est voulu.

const ATTENDUES = [
  { table: 'orientation', regleId: 'R-STR-01' },
  { table: 'orientation', regleId: 'R-STR-02' },
  { table: 'arret', regleId: 'STOP-STR' },
  { table: 'contradictions', regleId: 'C-STR' },
  { table: 'biologie', regleId: 'BIO-STR-01' },
];

const suspendues = (regles: ReadonlyArray<{ id: string; statut: string }>) =>
  regles.filter(regle => regle.statut === 'suspendue').map(regle => regle.id);

describe('D-543 — exactement cinq lignes suspendues, et elles seules', () => {
  it('chaque table ne suspend que ses lignes du stress', () => {
    expect(suspendues(ORIENTATION_RULES_V1)).toEqual(['R-STR-01', 'R-STR-02']);
    expect(suspendues(STOP_RULES_V1)).toEqual(['STOP-STR']);
    expect(suspendues(CONTRADICTIONS_RULES_V1)).toEqual(['C-STR']);
    expect(suspendues(INDICATIONS_BIOLOGIE_V1)).toEqual(['BIO-STR-01']);
  });

  it('le service sert ces cinq lignes, sans dépendre du dossier', () => {
    expect(lignesSuspenduesPourRelecture()).toEqual(ATTENDUES);
  });

  // La convergence lit la condition PSS-10 par les règles publiées ([[D-543]],
  // réponse A à `20261119-1302-a`) : plus aucune ne la porte.
  it('aucune règle d’orientation publiée ne lit la PSS-10', () => {
    const lisentPss10 = ORIENTATION_RULES_V1
      .filter(regle => regle.statut === 'publiee')
      .filter(regle => JSON.stringify(regle.declencheurs).includes('"Q_STR_02"'))
      .map(regle => regle.id);
    expect(lisentPss10).toEqual([]);
  });
});

// ── Orientation et arrêt : le dossier qui allumait R-STR-01, R-STR-02 et STOP-STR ──
describe('D-543 — orientation et arrêt, tables livrées', () => {
  const ITEMS_STR_01 = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
    'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B14',
    'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21',
  ];
  const ITEMS_DASS = Array.from({ length: 21 }, (_, i) => `Q${String(i + 1).padStart(3, '0')}`);
  const ITEMS_CUNGI = Array.from({ length: 11 }, (_, i) => `CU${i + 1}`);
  const aZero = (ids: string[]) => Object.fromEntries(ids.map(id => [id, 0]));
  const MAINTENANT = Date.parse('2026-08-14T12:00:00.000Z');

  let compteur = 0;
  function passation(idQuestionnaire: string, brutes: Record<string, number>, dateReponse = '2026-08-13T10:00:00.000Z'): ReponseOrientation {
    compteur += 1;
    return {
      idQuestionnaire,
      dateReponse,
      idReponse: `r-${compteur}`,
      statutValidite: 'VALID',
      scores: calculateScore(idQuestionnaire, brutes) as Record<string, unknown>,
    };
  }

  /**
   * Adaptation au stress perturbée, burn-out déclaré, PSS-10 défavorable, et
   * les trois instruments rassurants de STOP-STR datés de la veille — sous la
   * configuration du service (exclusion des passations, fenêtres réelles).
   */
  function dossier(regles = ORIENTATION_RULES_V1, reglesArret = STOP_RULES_V1, dateStr01?: string) {
    return {
      reponses: [
        passation('Q_MOD_01', {
          ADAPTATION_STRESS_Q001: 2,
          ADAPTATION_STRESS_Q002: 1,
          ADAPTATION_STRESS_Q003: 1,
          ADAPTATION_STRESS_Q004: 2,
          ADAPTATION_STRESS_Q005: 2,
        }),
        passation('Q_STR_04', aZero(ITEMS_DASS)),
        passation('Q_STR_03', aZero(ITEMS_CUNGI)),
        passation('Q_STR_01', aZero(ITEMS_STR_01), dateStr01),
        passation('Q_STR_02', { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5, P7: 5, P8: 5, P9: 5, P10: 5 }),
      ],
      idsQuestionnairesAssignes: [],
      regles,
      drapeaux: extraireDrapeauxAnamnese({ facteurs_declenchants: ['Stress aigu / burn-out'] }),
      reglesArret,
      exclureDejaRepondu: true,
      maintenantMs: MAINTENANT,
      fenetres: FENETRES_FRAICHEUR_ORIENTATION,
      fenetresArret: FENETRES_ARRET,
    };
  }

  const motifs = (resultat: ReturnType<typeof evaluerOrientationDetaillee>) =>
    resultat.recommandations.flatMap(reco => reco.motifs.map(motif => motif.regleId));

  it('aucune exploration ne sort de R-STR-01 ni de R-STR-02', () => {
    const resultat = evaluerOrientationDetaillee(dossier());
    expect(motifs(resultat)).not.toContain('R-STR-01');
    expect(motifs(resultat)).not.toContain('R-STR-02');
    // Contre-épreuve : repassées `publiee`, elles sortent du même dossier.
    const retablies = ORIENTATION_RULES_V1.map(regle =>
      regle.statut === 'suspendue' ? { ...regle, statut: 'publiee' as const } : regle,
    );
    const avec = motifs(evaluerOrientationDetaillee(dossier(retablies)));
    expect(avec).toContain('R-STR-01');
    expect(avec).toContain('R-STR-02');
  });

  // LE CŒUR DE `20261119-1635-a` : sans R-STR-01, la ligne BMS-10 n'est plus
  // portée que par R2-STR-03 — STOP-STR publiée l'aurait éteinte. Suspendue,
  // elle n'éteint rien, et la ligne reste servie.
  it('rien ne s’éteint : la ligne BMS-10 reste servie, portée par R2-STR-03 seule', () => {
    const resultat = evaluerOrientationDetaillee(dossier());
    expect(resultat.recommandations.every(reco => !reco.extinction)).toBe(true);
    const bms = resultat.recommandations.find(reco =>
      reco.cible.type === 'questionnaire' && reco.cible.questionnaireId === 'Q_STR_05');
    expect(bms?.motifs.map(motif => motif.regleId)).toEqual(['R2-STR-03']);
    // Contre-épreuve : STOP-STR repassée `publiee`, la même ligne s'éteint.
    const arretRetabli = STOP_RULES_V1.map(regle => ({ ...regle, statut: 'publiee' as const }));
    const avec = evaluerOrientationDetaillee(dossier(ORIENTATION_RULES_V1, arretRetabli));
    const bmsEteinte = avec.recommandations.find(reco =>
      reco.cible.type === 'questionnaire' && reco.cible.questionnaireId === 'Q_STR_05');
    expect(bmsEteinte?.extinction?.stopRuleId).toBe('STOP-STR');
  });

  it('suspendue, STOP-STR n’est pas non plus dite « non évaluée »', () => {
    const perime = evaluerOrientationDetaillee(dossier(ORIENTATION_RULES_V1, STOP_RULES_V1, '2026-08-01T10:00:00.000Z'));
    expect(perime.arretsNonEvalues).toEqual([]);
  });
});

// ── Contradictions : la discordance que C-STR signalait ──
describe('D-543 — contradictions, table livrée', () => {
  const sousScore = (id: string, total: number) => ({ id, label: id, total });
  const REPONSES: ReponseOrientation[] = [
    {
      idQuestionnaire: 'Q_MOD_01',
      dateReponse: '2026-08-10T09:00:00.000Z',
      idReponse: 'rep-mod-1',
      scores: { subScores: [sousScore('ADAPTATION_STRESS', 6)] },
    },
    {
      idQuestionnaire: 'Q_STR_04',
      dateReponse: '2026-08-10T09:30:00.000Z',
      idReponse: 'rep-dass-1',
      scores: { subScores: [sousScore('D', 2), sousScore('A', 2), sousScore('S', 5)] },
    },
  ];

  it('aucune discordance ne sort de C-STR', () => {
    // Sans `regles` : la table livrée, comme le service.
    expect(evaluerContradictions({ reponses: REPONSES })).toEqual([]);
    // Contre-épreuve : repassée `publiee`, la discordance est constatée.
    const retablie = CONTRADICTIONS_RULES_V1.map(regle => ({ ...regle, statut: 'publiee' as const }));
    expect(evaluerContradictions({ reponses: REPONSES, regles: retablie }).map(c => c.regleId)).toEqual(['C-STR']);
  });
});

// ── Biologie : le bilan de stress que BIO-STR-01 proposait ──
describe('D-543 — indications biologiques, table livrée', () => {
  const PSS10_DEFAVORABLE: ReponseOrientation = {
    idQuestionnaire: 'Q_STR_02',
    dateReponse: '2026-08-10T09:00:00.000Z',
    idReponse: 'rep-pss-1',
    statutValidite: 'VALID',
    scores: calculateScore('Q_STR_02', { P1: 5, P2: 5, P3: 5, P4: 5, P5: 5, P6: 5, P7: 5, P8: 5, P9: 5, P10: 5 }) as Record<string, unknown>,
  };

  function entree(regles = INDICATIONS_BIOLOGIE_V1, signature = INDICATIONS_BIOLOGIE_METADATA): EntreeStatutsBiologie {
    return {
      panels: [{ code: 'PANEL_STRESS_1', libelle: 'Stress', niveau: 'socle', objectif: null, actif: true, analytes: [] }],
      regles,
      grilles: GRILLES_INDICATIONS,
      signature,
      reponses: [PSS10_DEFAVORABLE],
      claimsAdmissibles: new Set(regles.flatMap(regle => regle.justificationClaims).map(cleClaimAdmissible)),
      dateReference: '2026-08-15T00:00:00.000Z',
    };
  }

  it('aucun bilan ne sort de BIO-STR-01, sous la signature livrée', () => {
    const resultat = deriverStatutsBiologie(entree());
    if (!resultat.ok) throw new Error(`abstention inattendue : ${resultat.motif}`);
    // Le panel de stress n'est porté par aucune autre règle : sans BIO-STR-01,
    // il ne fait aucune ligne.
    expect(INDICATIONS_BIOLOGIE_V1.filter(regle => regle.panelCode === 'PANEL_STRESS_1').map(regle => regle.id)).toEqual(['BIO-STR-01']);
    expect(resultat.lignes.filter(ligne => ligne.panelCode === 'PANEL_STRESS_1')).toEqual([]);
    // Contre-épreuve : repassée `publiee` (empreinte recalculée sur la table
    // retouchée), la règle propose le bilan au même dossier.
    const retablie = INDICATIONS_BIOLOGIE_V1.map(regle =>
      regle.id === 'BIO-STR-01' ? { ...regle, statut: 'publiee' as const } : regle,
    );
    const avec = deriverStatutsBiologie(entree(retablie, {
      ...INDICATIONS_BIOLOGIE_METADATA,
      shaPerimetre: shaPerimetreBiologie(retablie, GRILLES_INDICATIONS),
    }));
    if (!avec.ok) throw new Error(`abstention inattendue : ${avec.motif}`);
    const stress = avec.lignes.find(ligne => ligne.panelCode === 'PANEL_STRESS_1');
    expect(stress?.declencheurRempli).toBe(true);
  });
});
