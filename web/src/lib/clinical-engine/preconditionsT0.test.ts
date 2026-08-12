import { describe, expect, it, vi } from 'vitest';

// Le module ne touche PAS la base : le mock ne sert qu'à couper l'import
// transitif de `prisma` par `orientationService`, dont ce module réutilise
// `scoresRecalculesPourRaisonnement` pour ne pas recopier ses cinq fermetures.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { CATALOGUE_DEFINITIONS } from '../bibliotheque';
import {
  RIDEAU_T0,
  evaluerPreconditionsT0,
  messageRefusPreconditions,
  type EntreesPreconditionsT0,
  type PassationPourPreconditions,
} from './preconditionsT0';

// Les réponses brutes sont DÉRIVÉES DU CATALOGUE plutôt qu'écrites à la main :
// une définition qui gagne ou perd un item ne doit pas rendre ce banc vert par
// accident (un score partiel serait recalculé, mais plus complet).
function reponsesCompletes(idQuestionnaire: string): Record<string, unknown> {
  const definition = CATALOGUE_DEFINITIONS[idQuestionnaire];
  if (!definition) throw new Error(`Définition absente du catalogue : ${idQuestionnaire}`);
  const brutes: Record<string, unknown> = {};
  for (const section of (definition as { sections?: unknown[] }).sections ?? []) {
    const questions = (section as { questions?: unknown[] }).questions ?? [];
    for (const question of questions) {
      const q = question as { id: string; type?: string; min?: number; options?: { v: number }[] };
      if (q.options && q.options.length > 0) brutes[q.id] = q.options[0].v;
      else brutes[q.id] = q.min ?? 1;
    }
  }
  return brutes;
}

const LE_2026_08_01 = new Date('2026-08-01T09:00:00.000Z');
const LE_2026_08_05 = new Date('2026-08-05T09:00:00.000Z');

function passation(
  idQuestionnaire: string,
  surcharge: Partial<PassationPourPreconditions> = {},
): PassationPourPreconditions {
  return {
    idQuestionnaire,
    dateReponse: LE_2026_08_01,
    scoresJson: { rawAnswers: reponsesCompletes(idQuestionnaire) },
    statutValidite: 'VALID',
    ...surcharge,
  };
}

function rideauComplet(): PassationPourPreconditions[] {
  return RIDEAU_T0.map(id => passation(id));
}

function entrees(surcharge: Partial<EntreesPreconditionsT0> = {}): EntreesPreconditionsT0 {
  return {
    passations: rideauComplet(),
    anamnese: { motif_principal: 'Fatigue persistante depuis six mois.' },
    consultationValidee: true,
    synthese: { statut: 'Validee_Praticien', dateValidation: LE_2026_08_05 },
    contradictionsOuvertes: 0,
    ...surcharge,
  };
}

function dure(resultat: ReturnType<typeof evaluerPreconditionsT0>, id: string) {
  const condition = resultat.dures.find(c => c.id === id);
  if (!condition) throw new Error(`Condition dure absente : ${id}`);
  return condition;
}

describe('préconditions de confirmation T0 (D-052)', () => {
  it('le dossier de référence passe les trois conditions dures sans friction', () => {
    const resultat = evaluerPreconditionsT0(entrees());
    expect(resultat.bloquant).toBe(false);
    expect(resultat.dures.every(c => c.satisfaite)).toBe(true);
    expect(resultat.contournementsRequis).toEqual([]);
  });

  // Le défaut que le lot existe pour fermer : jusqu'ici un dossier vide se
  // confirmait, et l'écran y invitait explicitement.
  it('un dossier vide est bloquant', () => {
    const resultat = evaluerPreconditionsT0(entrees({
      passations: [],
      anamnese: null,
      consultationValidee: false,
      synthese: null,
    }));
    expect(resultat.bloquant).toBe(true);
    expect(resultat.dures.filter(c => !c.satisfaite)).toHaveLength(3);
  });

  it('chaque instrument du rideau manquant est nommé, un par un', () => {
    for (const idQuestionnaire of RIDEAU_T0) {
      const resultat = evaluerPreconditionsT0(entrees({
        passations: rideauComplet().filter(p => p.idQuestionnaire !== idQuestionnaire),
      }));
      expect(resultat.bloquant).toBe(true);
      expect(dure(resultat, 'rideau_t0').detail).toContain(idQuestionnaire);
    }
  });

  // Le seul des trois termes de la condition dure qui morde en production.
  it('une passation présente mais non cotable ne vaut pas une mesure', () => {
    const resultat = evaluerPreconditionsT0(entrees({
      passations: [
        ...rideauComplet().filter(p => p.idQuestionnaire !== 'Q_MOD_03'),
        passation('Q_MOD_03', { scoresJson: { total: 42 } }),
      ],
    }));
    expect(resultat.bloquant).toBe(true);
    expect(dure(resultat, 'rideau_t0').detail).toContain('sans résultat exploitable');
    expect(dure(resultat, 'rideau_t0').detail).toContain('Q_MOD_03');
  });

  it('un statut exclu du raisonnement écarte l’instrument, drapeau éteint compris', () => {
    // `statutExcluDuRaisonnement` ne dépend pas de WN_ENABLE_VALIDITE_PASSATIONS,
    // et c'est voulu : désigner une passation INVALID comme celle qui fait foi
    // serait faux même filtre éteint.
    const resultat = evaluerPreconditionsT0(entrees({
      passations: [
        ...rideauComplet().filter(p => p.idQuestionnaire !== 'Q_INF_03'),
        passation('Q_INF_03', { statutValidite: 'INVALID' }),
      ],
    }));
    expect(resultat.bloquant).toBe(true);
    expect(dure(resultat, 'rideau_t0').detail).toContain('Q_INF_03');
  });

  it('pas de repli sur une passation antérieure quand la dernière est inexploitable', () => {
    const resultat = evaluerPreconditionsT0(entrees({
      passations: [
        ...rideauComplet().filter(p => p.idQuestionnaire !== 'Q_MOD_01'),
        passation('Q_MOD_01', { dateReponse: LE_2026_08_01 }),
        passation('Q_MOD_01', { dateReponse: LE_2026_08_05, statutValidite: 'SUPERSEDED' }),
      ],
    }));
    expect(dure(resultat, 'rideau_t0').satisfaite).toBe(false);
  });

  it('le rideau s’évalue sans contrainte de fenêtre', () => {
    // Une passation très ancienne reste une passation : la fenêtre gouverne la
    // composition de l'épisode, pas la précondition (D-052).
    const resultat = evaluerPreconditionsT0(entrees({
      passations: RIDEAU_T0.map(id => passation(id, { dateReponse: new Date('2025-01-05T09:00:00.000Z') })),
    }));
    expect(dure(resultat, 'rideau_t0').satisfaite).toBe(true);
  });

  it('une anamnèse vide ne compte pas pour consignée', () => {
    const resultat = evaluerPreconditionsT0(entrees({ anamnese: {} }));
    expect(resultat.bloquant).toBe(true);
    expect(dure(resultat, 'anamnese_consignee').detail).toContain('motif principal');
  });

  it('sépare « aucune consultation validée » de « validée sans motif »', () => {
    const sansConsultation = evaluerPreconditionsT0(entrees({ consultationValidee: false, anamnese: null }));
    const sansMotif = evaluerPreconditionsT0(entrees({ anamnese: { taille: '170' } }));
    expect(dure(sansConsultation, 'anamnese_consignee').detail)
      .not.toBe(dure(sansMotif, 'anamnese_consignee').detail);
  });

  it('une synthèse non validée bloque, une synthèse corrigée passe', () => {
    const brouillon = evaluerPreconditionsT0(entrees({
      synthese: { statut: 'Brouillon_IA', dateValidation: LE_2026_08_05 },
    }));
    expect(dure(brouillon, 'synthese_validee').satisfaite).toBe(false);

    const corrigee = evaluerPreconditionsT0(entrees({
      synthese: { statut: 'Corrigee_Praticien', dateValidation: LE_2026_08_05 },
    }));
    expect(dure(corrigee, 'synthese_validee').satisfaite).toBe(true);
  });

  it('une synthèse validée sans date de validation ne passe pas pour datée', () => {
    const resultat = evaluerPreconditionsT0(entrees({
      synthese: { statut: 'Validee_Praticien', dateValidation: null },
    }));
    expect(dure(resultat, 'synthese_validee').satisfaite).toBe(false);
  });

  it('une synthèse antérieure à la dernière passation du rideau est périmée', () => {
    const resultat = evaluerPreconditionsT0(entrees({
      synthese: { statut: 'Validee_Praticien', dateValidation: new Date('2026-07-01T09:00:00.000Z') },
    }));
    expect(dure(resultat, 'synthese_validee').satisfaite).toBe(false);
    expect(dure(resultat, 'synthese_validee').detail).toContain('antérieure');
  });

  it('une passation HORS rideau plus récente ne périme pas la synthèse', () => {
    // La fraîcheur se juge sur le rideau, pas sur le dossier (D-052).
    const resultat = evaluerPreconditionsT0(entrees({
      passations: [
        ...rideauComplet(),
        passation('Q_SOM_09', { dateReponse: new Date('2026-08-20T09:00:00.000Z') }),
      ],
    }));
    expect(dure(resultat, 'synthese_validee').satisfaite).toBe(true);
  });

  it('une condition souple non satisfaite exige un contournement sans bloquer', () => {
    const resultat = evaluerPreconditionsT0(entrees({ contradictionsOuvertes: 2 }));
    expect(resultat.bloquant).toBe(false);
    expect(resultat.contournementsRequis).toEqual(['contradictions_ouvertes']);
  });

  it('une passation ambiguë du rideau est souple, jamais bloquante', () => {
    const resultat = evaluerPreconditionsT0(entrees({
      passations: [
        ...rideauComplet().filter(p => p.idQuestionnaire !== 'Q_ALI_01'),
        passation('Q_ALI_01', { statutValidite: 'AMBIGUOUS' }),
      ],
    }));
    expect(resultat.bloquant).toBe(false);
    expect(resultat.contournementsRequis).toContain('passation_ambigue');
  });

  it('le message de refus ne cite que les conditions dures manquantes', () => {
    const resultat = evaluerPreconditionsT0(entrees({ consultationValidee: false, anamnese: null }));
    const message = messageRefusPreconditions(resultat);
    expect(message).toContain('Aucune consultation validée');
    expect(message).not.toContain('contradiction');
  });
});
